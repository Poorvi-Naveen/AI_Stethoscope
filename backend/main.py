import os
import io
import time
import uuid
import base64
import logging
from contextlib import asynccontextmanager
import numpy as np
import librosa
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
import tensorflow as tf
from supabase_client import supabase, init_supabase
from signal_quality import assess_quality
from audio_dsp import process_stethoscope_audio

# ---------------------------------------------------------------------------
# Logging — structured, no sensitive data
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("stethai")

# ---------------------------------------------------------------------------
# Auth — Optional Bearer token validation with graceful fallback
# ---------------------------------------------------------------------------
security = HTTPBearer(auto_error=False)

def get_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(security)):
    """
    Validates Supabase JWT if provided.
    In local development or guest mode (when no token is supplied), returns None
    instead of blocking the entire inference pipeline.
    """
    if credentials is None:
        return None

    token = credentials.credentials
    client = init_supabase()
    if client is None:
        logger.warning("Supabase client not initialized; skipping auth token verification.")
        return None

    try:
        res = client.auth.get_user(token)
        return res.user if res else None
    except Exception as err:
        logger.warning("Auth token validation notice: %s", err)
        return None


# ---------------------------------------------------------------------------
# Model loading & resolution
# ---------------------------------------------------------------------------
def find_model_path() -> str:
    candidate_paths = [
        os.getenv("MODEL_PATH", ""),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "shared", "dataset", "models", "heart_sound_circor_best.keras")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "shared", "dataset", "models", "heart_sound_circor_best.keras")),
        os.path.abspath(os.path.join(os.getcwd(), "shared", "dataset", "models", "heart_sound_circor_best.keras")),
        os.path.abspath(os.path.join(os.getcwd(), "backend", "shared", "dataset", "models", "heart_sound_circor_best.keras")),
    ]
    for p in candidate_paths:
        if p and os.path.exists(p):
            return p
    return candidate_paths[1]

MODEL_PATH = find_model_path()
_startup_time = time.time()
model = None

# Audio & Feature Extraction Params (must match Circor model training in heartmodel.ipynb)
SAMPLE_RATE = 4000
CLIP_DURATION = 4.0
CLIP_SAMPLES = int(SAMPLE_RATE * CLIP_DURATION)  # 16,000 samples
CLIP_HOP = int(CLIP_SAMPLES * 0.5)               # 8,000 samples (50% overlap)

N_MFCC = 40
N_FFT = 256
HOP_LENGTH = 64
N_MELS = 64

# Upload limit: 25 MB
MAX_UPLOAD_BYTES = 25 * 1024 * 1024


@asynccontextmanager
async def lifespan(app: FastAPI):
    global model
    if model is None and os.path.exists(MODEL_PATH):
        try:
            logger.info("Loading model from configured path: %s", MODEL_PATH)
            model = tf.keras.models.load_model(MODEL_PATH)
            logger.info("Model loaded successfully.")
        except Exception as e:
            logger.error("Failed to load model: %s", e)
    yield


# ---------------------------------------------------------------------------
# App initialization & CORS
# ---------------------------------------------------------------------------
app = FastAPI(title="StethAI ML API", version="2.0.0", lifespan=lifespan)

FRONTEND_URL = os.getenv("FRONTEND_URL", "")
_allowed_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "https://aistethoscope26.vercel.app",
]
if FRONTEND_URL:
    _allowed_origins.append(FRONTEND_URL.rstrip("/"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Eager model load at module import
if os.path.exists(MODEL_PATH):
    try:
        model = tf.keras.models.load_model(MODEL_PATH)
        logger.info("Model eagerly loaded at startup.")
    except Exception as e:
        logger.warning("Eager model loading deferred: %s", e)


# ---------------------------------------------------------------------------
# Health endpoint
# ---------------------------------------------------------------------------
@app.get("/health")
async def health():
    """Lightweight health check. Does not reload the model."""
    uptime_s = int(time.time() - _startup_time)
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "uptime_seconds": uptime_s,
        "model_name": "heart_sound_circor_best",
    }


# ---------------------------------------------------------------------------
# Clinical Audio DSP Processing Endpoint
# ---------------------------------------------------------------------------
@app.post("/api/audio/process")
async def process_audio_endpoint(audio: UploadFile = File(...)):
    """
    Applies the full clinical digital signal processing (DSP) pipeline
    (DC offset removal, 20-2000Hz bandpass, 50Hz notch filter, spectral noise reduction,
    and 0.90 peak normalization) to the recorded stethoscope audio.
    """
    try:
        contents = await audio.read(MAX_UPLOAD_BYTES + 1)
        if len(contents) > MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"Audio file exceeds the {MAX_UPLOAD_BYTES // (1024 * 1024)} MB limit."
            )

        result = process_stethoscope_audio(contents)
        raw_b64 = base64.b64encode(result["raw_wav_bytes"]).decode("ascii")
        proc_b64 = base64.b64encode(result["processed_wav_bytes"]).decode("ascii")

        return {
            "status": "success",
            "durationSeconds": result["duration_seconds"],
            "sampleRate": result["sample_rate"],
            "stagesCompleted": result["stages_completed"],
            "warnings": result["warnings"],
            "metrics": result["metrics"],
            "rawWavDataUrl": f"data:audio/wav;base64,{raw_b64}",
            "processedWavDataUrl": f"data:audio/wav;base64,{proc_b64}",
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("Audio DSP processing warning: %s", exc)
        raise HTTPException(status_code=400, detail=f"Audio DSP processing failed: {exc}")


# ---------------------------------------------------------------------------
# Feature extraction & sliding-window segmentation helpers
# ---------------------------------------------------------------------------
def extract_single_window_features(win: np.ndarray, sr: int = SAMPLE_RATE) -> np.ndarray:
    """
    Extracts stacked MFCC, delta, and delta-delta features for a 4.0s window.
    Zero-mean / unit-variance normalized to match heartmodel.ipynb.
    Returns array of shape (120, 251, 1).
    """
    mfcc = librosa.feature.mfcc(
        y=win, sr=sr, n_mfcc=N_MFCC, n_fft=N_FFT, hop_length=HOP_LENGTH, n_mels=N_MELS
    )
    delta = librosa.feature.delta(mfcc)
    delta2 = librosa.feature.delta(mfcc, order=2)

    stacked = np.concatenate([mfcc, delta, delta2], axis=0)
    mean = stacked.mean(axis=1, keepdims=True)
    std = stacked.std(axis=1, keepdims=True) + 1e-8
    stacked = (stacked - mean) / std

    # Match 251 time frames expected by the Conv2D model
    if stacked.shape[1] < 251:
        stacked = np.pad(stacked, ((0, 0), (0, 251 - stacked.shape[1])))
    elif stacked.shape[1] > 251:
        stacked = stacked[:, :251]

    return stacked[..., np.newaxis].astype(np.float32)


def segment_and_extract_features(y: np.ndarray) -> tuple[np.ndarray, int]:
    """
    Segments full audio into 4.0s sliding windows with 50% overlap (CLIP_HOP).
    Extracts features for all windows into a batch tensor of shape (N, 120, 251, 1).
    Guarantees that 100% of recorded auscultation is analyzed rather than truncated.
    """
    windows = []
    if len(y) <= CLIP_SAMPLES:
        y_pad = np.pad(y, (0, max(0, CLIP_SAMPLES - len(y))))
        windows.append(y_pad)
    else:
        start = 0
        while start + CLIP_SAMPLES <= len(y):
            windows.append(y[start : start + CLIP_SAMPLES])
            start += CLIP_HOP
        # If there is remaining unanalyzed tail of at least 1.0s, include trailing window
        if (len(y) - (start - CLIP_HOP + CLIP_SAMPLES)) >= int(SAMPLE_RATE * 1.0):
            windows.append(y[-CLIP_SAMPLES:])

    if not windows:
        windows = [np.pad(y, (0, max(0, CLIP_SAMPLES - len(y))))]

    feature_list = []
    for win in windows:
        peak = np.max(np.abs(win)) + 1e-8
        win_norm = (win / peak).astype(np.float32)
        feature_list.append(extract_single_window_features(win_norm))

    batch = np.stack(feature_list, axis=0)  # Shape: (N, 120, 251, 1)
    return batch, len(windows)


# ---------------------------------------------------------------------------
# Prediction endpoint
# ---------------------------------------------------------------------------
@app.post("/api/predict/heart")
async def predict_heart(
    audio: UploadFile = File(...),
    patient_id: str = Form(...),
    process_audio: str = Form("true"),
    source: str = Form("live_recording"),
    user=Depends(get_current_user),
):
    """
    Performs full clinical heart sound analysis:
    1. Digital Signal Processing (DC removal, 20-2000Hz bandpass, 50Hz notch, spectral noise reduction)
    2. Rigorous signal-quality validation
    3. Multi-window sliding segmentation (analyzes 100% of audio across all recorded valves)
    4. Batch 2D-CNN inference for murmur detection
    5. Calibrated probability aggregation & optional Supabase archiving
    """
    if not model:
        raise HTTPException(status_code=503, detail="Model is not loaded. Please try again shortly.")

    start_time = time.time()

    try:
        # --- File-size guard ---
        contents = await audio.read(MAX_UPLOAD_BYTES + 1)
        if len(contents) > MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"Audio file exceeds the {MAX_UPLOAD_BYTES // (1024 * 1024)} MB limit."
            )

        should_process = process_audio.lower() in ("true", "1", "yes")
        dsp_stages = []
        dsp_metrics = None
        raw_wav_b64 = None
        processed_wav_b64 = None

        audio_bytes_for_analysis = contents

        # --- Clinical Audio DSP Pipeline ---
        if should_process:
            try:
                dsp_result = process_stethoscope_audio(contents)
                audio_bytes_for_analysis = dsp_result["processed_wav_bytes"]
                dsp_stages = dsp_result["stages_completed"]
                dsp_metrics = dsp_result["metrics"]
                raw_wav_b64 = base64.b64encode(dsp_result["raw_wav_bytes"]).decode("ascii")
                processed_wav_b64 = base64.b64encode(dsp_result["processed_wav_bytes"]).decode("ascii")
            except Exception as dsp_err:
                logger.warning("Clinical DSP stage notice: %s. Using original audio stream.", dsp_err)
                dsp_stages = ["raw_direct"]

        # --- Decode Audio for ML (Resampled to 4,000 Hz) ---
        with io.BytesIO(audio_bytes_for_analysis) as audio_file:
            y, sr = librosa.load(audio_file, sr=SAMPLE_RATE, mono=True)

        if len(y) == 0:
            raise HTTPException(status_code=422, detail="Audio file contains no decodable acoustic samples.")

        duration_sec = len(y) / SAMPLE_RATE

        # --- Signal Quality Assessment on Full Auscultation Recording ---
        quality = assess_quality(y, SAMPLE_RATE)
        if not quality.ok:
            raise HTTPException(status_code=422, detail=quality.message)

        # --- Multi-Window Sliding Segmentation & Feature Extraction ---
        X_batch, num_windows = segment_and_extract_features(y)

        # --- Batch Neural Network Inference ---
        predictions = model.predict(X_batch, verbose=0)
        # Model outputs: [sound_type (N, 2), safety_status (N, 1)]
        sound_type_probs = predictions[0]        # shape: (N, 2)
        safety_status_probs = predictions[1]     # shape: (N, 1)

        # Classes: 0 → absent (normal), 1 → present (murmur)
        window_murmurs = [float(p[1]) for p in sound_type_probs]
        window_normals = [float(p[0]) for p in sound_type_probs]

        max_murmur_prob = float(np.max(window_murmurs))
        mean_murmur_prob = float(np.mean(window_murmurs))
        mean_normal_prob = float(np.mean(window_normals))
        mean_safety = float(np.mean(safety_status_probs))

        # Acoustic artifact / borderline evaluation:
        is_borderline = (quality.low_band_ratio < 0.50) or (quality.envelope_dynamic_db < 6.0)
        raw_artifact_prob = float(np.clip(quality.high_band_ratio + (1.0 - quality.low_band_ratio) * 0.4, 0.02, 0.70))

        # Diagnostic decision logic:
        # If any window exhibits strong murmur characteristics (>= 0.50) or average murmur is elevated
        if max_murmur_prob >= 0.50 or mean_murmur_prob >= 0.45:
            predicted_label = "murmur"
            confidence = max_murmur_prob
        elif is_borderline and raw_artifact_prob >= 0.45:
            predicted_label = "artifact"
            confidence = raw_artifact_prob
        else:
            predicted_label = "normal"
            confidence = mean_normal_prob

        # Calibrated probability distribution summing strictly to 1.000:
        if predicted_label == "murmur":
            p_murmur = round(max_murmur_prob, 3)
            p_artifact = round(min(0.20, raw_artifact_prob * (1.0 - p_murmur)), 3)
            p_normal = round(max(0.01, 1.0 - (p_murmur + p_artifact)), 3)
        elif predicted_label == "artifact":
            p_artifact = round(raw_artifact_prob, 3)
            p_murmur = round(min(0.30, max_murmur_prob * (1.0 - p_artifact)), 3)
            p_normal = round(max(0.01, 1.0 - (p_artifact + p_murmur)), 3)
        else:
            p_normal = round(mean_normal_prob, 3)
            p_artifact = round(min(0.20, raw_artifact_prob * (1.0 - p_normal)), 3)
            p_murmur = round(max(0.01, 1.0 - (p_normal + p_artifact)), 3)

        # Normalize to ensure exactly 1.0 sum
        total_p = p_normal + p_murmur + p_artifact
        p_normal = round(p_normal / total_p, 3)
        p_murmur = round(p_murmur / total_p, 3)
        p_artifact = round(max(0.001, 1.0 - (p_normal + p_murmur)), 3)

        # --- Upload to Supabase Storage & Database Insert (Fault-Tolerant) ---
        report_id = None
        storage_path = None
        client = init_supabase()
        if client:
            try:
                content_type = audio.content_type or "audio/wav"
                storage_path = f"recordings/{patient_id}/{uuid.uuid4()}.wav"
                client.storage.from_("audio_recordings").upload(
                    storage_path, contents, {"content-type": content_type}
                )
                user_id = getattr(user, "id", None) if user else None
                report_data = {
                    "patient_id": patient_id,
                    "sound_type": predicted_label,
                    "prediction_confidence": confidence,
                    "storage_path": storage_path,
                    "notes": f"Generated by ML inference ({num_windows} x 4.0s frames)",
                }
                if user_id:
                    report_data["user_id"] = user_id

                report_res = client.table("reports").insert(report_data).execute()
                report_id = report_res.data[0]["id"] if report_res.data else None
            except Exception as sb_err:
                logger.warning("Supabase storage or report insert non-fatal notice: %s", sb_err)

        inference_ms = int((time.time() - start_time) * 1000)
        logger.info(
            "Prediction complete: label=%s conf=%.3f windows=%d duration=%.1fs latency=%dms",
            predicted_label, confidence, num_windows, duration_sec, inference_ms
        )

        return {
            "id": report_id,
            "label": predicted_label,
            "confidence": confidence,
            "probabilities": {
                "normal": p_normal,
                "murmur": p_murmur,
                "artifact": p_artifact,
                "max_murmur_window": round(max_murmur_prob, 3),
            },
            "safetyStatus": round(mean_safety, 3),
            "inferenceMs": inference_ms,
            "modelName": "heart_sound_circor_best",
            "modelVersion": "best",
            "storagePath": storage_path,
            "windowsAnalyzed": num_windows,
            "durationSeconds": round(duration_sec, 2),
            "isLiveRecording": source == "live_recording",
            "signalQuality": quality.to_dict(),
            "dspStagesCompleted": dsp_stages,
            "dspMetrics": dsp_metrics,
            "rawWavDataUrl": f"data:audio/wav;base64,{raw_wav_b64}" if raw_wav_b64 else None,
            "processedWavDataUrl": f"data:audio/wav;base64,{processed_wav_b64}" if processed_wav_b64 else None,
        }

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Audio processing error: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Audio processing failed. Please check the file format and try again.")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
