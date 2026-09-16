import os
import io
import time
import numpy as np
import librosa
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import tensorflow as tf

app = FastAPI(title="StethAI ML API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For dev purposes, allow all
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "shared", "dataset", "models", "heart_sound_circor_best.keras"))

# Load model globally
model = None

# Audio & Feature Extraction Params
SAMPLE_RATE = 4000
CLIP_DURATION = 4.0
CLIP_SAMPLES = int(SAMPLE_RATE * CLIP_DURATION)

N_MFCC = 40
N_FFT = 256
HOP_LENGTH = 64
N_MELS = 64

@app.on_event("startup")
async def load_model():
    global model
    if os.path.exists(MODEL_PATH):
        print(f"Loading model from {MODEL_PATH}")
        model = tf.keras.models.load_model(MODEL_PATH)
        print("Model loaded successfully.")
    else:
        print(f"Warning: Model not found at {MODEL_PATH}")

def load_clip(audio_bytes: bytes) -> np.ndarray:
    # Use librosa to load from bytes (wrapped in io.BytesIO)
    with io.BytesIO(audio_bytes) as audio_file:
        y, _ = librosa.load(audio_file, sr=SAMPLE_RATE, mono=True)
        
    if len(y) < CLIP_SAMPLES:
        y = np.pad(y, (0, CLIP_SAMPLES - len(y)))
    else:
        y = y[:CLIP_SAMPLES]
        
    peak = np.max(np.abs(y)) + 1e-8
    return (y / peak).astype(np.float32)

def extract_features(y: np.ndarray, sr: int = SAMPLE_RATE) -> np.ndarray:
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=N_MFCC, n_fft=N_FFT,
                                 hop_length=HOP_LENGTH, n_mels=N_MELS)
    delta = librosa.feature.delta(mfcc)
    delta2 = librosa.feature.delta(mfcc, order=2)

    stacked = np.concatenate([mfcc, delta, delta2], axis=0)

    mean = stacked.mean(axis=1, keepdims=True)
    std = stacked.std(axis=1, keepdims=True) + 1e-8
    stacked = (stacked - mean) / std

    return stacked[..., np.newaxis].astype(np.float32)


@app.post("/api/predict/heart")
async def predict_heart(audio: UploadFile = File(...)):
    if not model:
        raise HTTPException(status_code=503, detail="Model is not loaded")
        
    if not audio.content_type.startswith('audio/'):
        # Sometimes wav files might be application/octet-stream, but let's allow it for now if we can read it.
        pass

    start_time = time.time()
    
    try:
        contents = await audio.read()
        y = load_clip(contents)
        X = extract_features(y)
        
        # Add batch dimension
        X_batch = np.expand_dims(X, axis=0)
        
        # Predict
        predictions = model.predict(X_batch, verbose=0)
        
        # Unpack predictions
        # Model outputs: [sound_type (None, 2), safety_status (None, 1)]
        sound_type_probs = predictions[0][0] # shape (2,)
        safety_status_prob = predictions[1][0][0] # shape ()
        
        # Classes: 0: absent (normal), 1: present (murmur)
        prob_absent = float(sound_type_probs[0])
        prob_present = float(sound_type_probs[1])
        
        # We classify based on max probability
        predicted_label = "murmur" if prob_present > prob_absent else "normal"
        confidence = float(max(prob_absent, prob_present))
        
        inference_ms = int((time.time() - start_time) * 1000)
        
        return {
            "label": predicted_label,
            "confidence": confidence,
            "probabilities": {
                "normal": prob_absent,
                "murmur": prob_present,
                "artifact": 0.0 # Placeholder
            },
            "safetyStatus": float(safety_status_prob), # 1 = Safe (normal), 0 = Not Safe (murmur)
            "inferenceMs": inference_ms,
            "modelName": "heart_sound_circor",
            "modelVersion": "best"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing audio: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
