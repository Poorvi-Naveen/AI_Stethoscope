import os
import io
import time
import logging
import numpy as np
import librosa
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
import tensorflow as tf
from supabase_client import supabase, init_supabase
import uuid
from signal_quality import assess_quality

# ---------------------------------------------------------------------------
# Logging — structured, no sensitive data
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("stethai")

# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials

    # Ensure Supabase client is initialized
    client = init_supabase()
    if client is None:
        raise HTTPException(status_code=503, detail="Backend configuration missing: Supabase not initialized")

    try:
        res = client.auth.get_user(token)
        if not res.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return res.user
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")


# ---------------------------------------------------------------------------
# CORS — restrict to known origins via env var in production
# ---------------------------------------------------------------------------
FRONTEND_URL = os.getenv("FRONTEND_URL", "")
_allowed_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "https://aistethoscope26.vercel.app",
]
if FRONTEND_URL:
    _allowed_origins.append(FRONTEND_URL.rstrip("/"))

app = FastAPI(title="StethAI ML API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Model
# ---------------------------------------------------------------------------
MODEL_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "shared", "dataset", "models", "heart_sound_circor_best.keras")
)
_startup_time = time.time()

# Load model globally at startup
model = None

# Audio & Feature Extraction Params
SAMPLE_RATE = 4000
CLIP_DURATION = 4.0
CLIP_SAMPLES = int(SAMPLE_RATE * CLIP_DURATION)

N_MFCC = 40
N_FFT = 256
HOP_LENGTH = 64
N_MELS = 64

# Upload limit: 10 MB
MAX_UPLOAD_BYTES = 10 * 1024 * 1024


@app.on_event("startup")
async def load_model():
    global model
    if os.path.exists(MODEL_PATH):
        logger.info("Loading model from configured path…")
        model = tf.keras.models.load_model(MODEL_PATH)
        logger.info("Model loaded successfully.")
    else:
        logger.warning("Model file not found — prediction endpoint will return 503.")


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
# Feature extraction helpers (unchanged from original)
# ---------------------------------------------------------------------------
def load_clip(audio_bytes: bytes):
    """Decode audio. Returns (normalised_clip_for_model, quality_report).

    Quality is assessed on the RAW waveform, before peak-normalisation,
    because normalisation would hide a silent or very noisy recording.
    """
    with io.BytesIO(audio_bytes) as audio_file:
        y, _ = librosa.load(audio_file, sr=SAMPLE_RATE, mono=True)

    if len(y) < CLIP_SAMPLES:
        y = np.pad(y, (0, CLIP_SAMPLES - len(y)))
    else:
        y = y[:CLIP_SAMPLES]

    quality = assess_quality(y, SAMPLE_RATE)

    peak = np.max(np.abs(y)) + 1e-8
    return (y / peak).astype(np.float32), quality

def extract_features(y: np.ndarray, sr: int = SAMPLE_RATE) -> np.ndarray:
    """Stack MFCCs, delta, and delta-delta; zero-mean / unit-variance normalise."""
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=N_MFCC, n_fft=N_FFT,
                                 hop_length=HOP_LENGTH, n_mels=N_MELS)
    delta = librosa.feature.delta(mfcc)
    delta2 = librosa.feature.delta(mfcc, order=2)

    stacked = np.concatenate([mfcc, delta, delta2], axis=0)

    mean = stacked.mean(axis=1, keepdims=True)
    std = stacked.std(axis=1, keepdims=True) + 1e-8
    stacked = (stacked - mean) / std

    return stacked[..., np.newaxis].astype(np.float32)


# ---------------------------------------------------------------------------
# Prediction endpoint
# ---------------------------------------------------------------------------
@app.post("/api/predict/heart")
async def predict_heart(
    audio: UploadFile = File(...),
    patient_id: str = Form(...),
    user=Depends(get_current_user),
):
    if not model:
        raise HTTPException(status_code=503, detail="Model is not loaded. Please try again shortly.")

    start_time = time.time()

    try:
        # --- File-size guard (read up to limit + 1 byte to detect oversized files) ---
        contents = await audio.read(MAX_UPLOAD_BYTES + 1)
        if len(contents) > MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"Audio file exceeds the {MAX_UPLOAD_BYTES // (1024 * 1024)} MB limit."
            )

        # --- Feature extraction ---
        y, quality = load_clip(contents)
        if not quality.ok:
            # Reject noisy/silent/clipped recordings instead of guessing.
            # Nothing is stored and no report is created.
            raise HTTPException(status_code=422, detail=quality.message)
        X = extract_features(y)

        # Add batch dimension
        X_batch = np.expand_dims(X, axis=0)

        # --- Inference ---
        predictions = model.predict(X_batch, verbose=0)

        # Model outputs: [sound_type (None, 2), safety_status (None, 1)]
        sound_type_probs = predictions[0][0]   # shape (2,)
        safety_status_prob = predictions[1][0][0]  # shape ()

        # Classes: 0 → absent (normal), 1 → present (murmur)
        prob_absent = float(sound_type_probs[0])
        prob_present = float(sound_type_probs[1])

        predicted_label = "murmur" if prob_present > prob_absent else "normal"
        confidence = float(max(prob_absent, prob_present))

        # --- Upload to Supabase Storage ---
        content_type = audio.content_type or "audio/wav"
        storage_path = f"recordings/{patient_id}/{uuid.uuid4()}.wav"

        client = init_supabase()
        if client is None:
            raise HTTPException(status_code=503, detail="Backend configuration missing: Supabase not initialized")

        client.storage.from_("audio_recordings").upload(
            storage_path, contents, {"content-type": content_type}
        )


        # --- Insert report into Database ---
        report_data = {
            "patient_id": patient_id,
            "user_id": user.id,
            "sound_type": predicted_label,
            "prediction_confidence": confidence,
            "storage_path": storage_path,
            "notes": "Generated by ML inference",
        }
        client = init_supabase()
        if client is None:
            raise HTTPException(status_code=503, detail="Backend configuration missing: Supabase not initialized")

        report_res = client.table("reports").insert(report_data).execute()
        report_id = report_res.data[0]["id"] if report_res.data else None

        inference_ms = int((time.time() - start_time) * 1000)
        logger.info("Prediction complete: label=%s confidence=%.3f ms=%d", predicted_label, confidence, inference_ms)

        return {
            "id": report_id,
            "label": predicted_label,
            "confidence": confidence,
            "probabilities": {
                "normal": prob_absent,
                "murmur": prob_present,
                "artifact": 0.0,  # Placeholder
            },
            "safetyStatus": float(safety_status_prob),
            "inferenceMs": inference_ms,
            "modelName": "heart_sound_circor",
            "modelVersion": "best",
            "storagePath": storage_path,
            "signalQuality": quality.to_dict(),
        }

    except HTTPException:
        raise
    except Exception as exc:
        # Log the real error server-side; return a safe message to the client
        logger.error("Audio processing error: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Audio processing failed. Please check the file format and try again.")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
