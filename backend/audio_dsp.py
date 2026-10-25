"""
Clinical Audio Digital Signal Processing (DSP) Module for StethAI
Reference: digital_stethoscope.py / record.py
Acoustic filters for phonocardiogram (PCG) heart sound recordings:
1. DC Offset Removal
2. 20 Hz - 2000 Hz 4th-order Butterworth Band-pass Filter
3. 50 Hz Mains-frequency Notch Filter (Q = 30)
4. Spectral Background Noise Reduction (strength = 0.7)
5. Amplitude Normalization (target peak = 0.90) with Peak Limiting
"""

import io
import wave
import numpy as np
import librosa
import soundfile as sf
from scipy.signal import butter, sosfiltfilt, iirnotch, filtfilt
import noisereduce as nr

# ============================================================
# CLINICAL ACOUSTIC SETTINGS (MATCHING record.py)
# ============================================================

SAMPLE_RATE = 16000
CHANNELS = 1

LOW_CUTOFF = 20      # Hz
HIGH_CUTOFF = 2000   # Hz
NOTCH_FREQUENCY = 50 # Hz (Mains power hum)
NOTCH_Q = 30
NOISE_REDUCTION_STRENGTH = 0.7
TARGET_PEAK = 0.90


def remove_dc(audio: np.ndarray) -> np.ndarray:
    """Removes DC bias/offset by subtracting the mean amplitude."""
    return audio - np.mean(audio)


def bandpass_filter(audio: np.ndarray, sr: int = SAMPLE_RATE) -> np.ndarray:
    """
    Applies a 4th-order Butterworth bandpass filter (20 - 2000 Hz).
    Uses second-order sections (sos) and forward-backward filtering (sosfiltfilt)
    to achieve zero-phase distortion.
    """
    nyquist = sr / 2.0
    low = max(1.0, LOW_CUTOFF) / nyquist
    high = min(sr / 2.0 - 1.0, HIGH_CUTOFF) / nyquist

    if low >= high:
        # Fallback if sample rate is too low for the cutoffs
        return audio

    sos = butter(4, [low, high], btype="bandpass", output="sos")
    
    # Safe check for minimum signal length required for sosfiltfilt
    # Default padlen for 4th-order filter is typically ~15
    padlen = min(len(audio) - 1, 3 * 4)
    if len(audio) <= padlen:
        return audio
        
    filtered = sosfiltfilt(sos, audio, padlen=padlen)
    return filtered


def notch_filter(audio: np.ndarray, sr: int = SAMPLE_RATE) -> np.ndarray:
    """
    Applies an IIR notch filter at 50 Hz with quality factor Q=30
    to reject mains power electrical interference.
    """
    if sr <= NOTCH_FREQUENCY * 2:
        return audio

    b, a = iirnotch(w0=NOTCH_FREQUENCY, Q=NOTCH_Q, fs=sr)
    
    padlen = min(len(audio) - 1, 3 * max(len(a), len(b)))
    if len(audio) <= padlen:
        return audio

    filtered = filtfilt(b, a, audio, padlen=padlen)
    return filtered


def reduce_noise(audio: np.ndarray, sr: int = SAMPLE_RATE) -> tuple[np.ndarray, bool]:
    """
    Applies spectral gating noise reduction using noisereduce.
    Uses the first 0.5s as noise sample if appropriate, or automated stationary estimation.
    Returns (cleaned_audio, success_boolean).
    """
    if len(audio) < int(0.2 * sr):
        return audio, False

    noise_sample_length = min(int(0.5 * sr), len(audio))
    noise_sample = audio[:noise_sample_length]

    # Verify that the initial sample is not saturated or excessively energetic
    signal_rms = np.sqrt(np.mean(audio**2)) + 1e-8
    noise_rms = np.sqrt(np.mean(noise_sample**2)) + 1e-8

    use_explicit_sample = (noise_rms <= signal_rms * 2.0)

    try:
        if use_explicit_sample:
            reduced = nr.reduce_noise(
                y=audio,
                sr=sr,
                y_noise=noise_sample,
                prop_decrease=NOISE_REDUCTION_STRENGTH,
                stationary=True,
            )
        else:
            reduced = nr.reduce_noise(
                y=audio,
                sr=sr,
                prop_decrease=NOISE_REDUCTION_STRENGTH,
                stationary=True,
            )
        return reduced, True
    except Exception as e:
        print(f"Noise reduction warning: {e}. Keeping audio intact.")
        return audio, False


def amplify_audio(audio: np.ndarray) -> tuple[np.ndarray, float]:
    """
    Normalizes peak amplitude to TARGET_PEAK (0.90) and applies a safety peak limiter.
    Returns (amplified_audio, gain_applied).
    """
    peak = np.max(np.abs(audio))

    if peak < 1e-8:
        return audio, 1.0

    gain = TARGET_PEAK / peak
    amplified = audio * gain

    # Safety peak limiter
    amplified = np.clip(amplified, -1.0, 1.0)
    return amplified, float(gain)


def audio_to_wav_bytes(audio: np.ndarray, sr: int = SAMPLE_RATE) -> bytes:
    """Converts a float32 numpy array into standard 16-bit mono PCM WAV bytes."""
    audio = np.clip(audio, -1.0, 1.0)
    audio_int16 = (audio * 32767).astype(np.int16)

    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(audio_int16.tobytes())

    return buffer.getvalue()


def load_audio_from_bytes(audio_bytes: bytes, target_sr: int = SAMPLE_RATE) -> tuple[np.ndarray, int]:
    """
    Loads raw audio bytes (WAV, MP3, OGG, WebM, etc.) and resamples
    to the target sample rate in mono float32.
    """
    with io.BytesIO(audio_bytes) as audio_file:
        y, sr = librosa.load(audio_file, sr=target_sr, mono=True)
    return y.astype(np.float32), sr


def process_stethoscope_audio(audio_bytes: bytes) -> dict:
    """
    Full clinical DSP pipeline executing the record.py sequence:
    1. Decode audio to 16,000 Hz mono PCM
    2. Check signal sanity (empty, low-level, clipping)
    3. Remove DC offset
    4. 20-2000 Hz Band-pass filter
    5. 50 Hz Mains interference notch filter
    6. Spectral noise reduction
    7. 0.90 Peak normalization & limiting
    8. Generate processed WAV
    """
    stages_completed = []
    warnings = []

    # 1. Load & decode
    raw_audio, sr = load_audio_from_bytes(audio_bytes, target_sr=SAMPLE_RATE)
    
    if len(raw_audio) == 0:
        raise ValueError("Audio file contains no samples.")

    duration_sec = len(raw_audio) / sr
    raw_peak = float(np.max(np.abs(raw_audio)))
    raw_rms = float(np.sqrt(np.mean(raw_audio**2)))

    if raw_peak < 1e-4:
        warnings.append("Microphone input level is extremely low or silent.")
    elif raw_peak >= 0.99:
        warnings.append("Input signal shows possible acoustic clipping/saturation.")

    # Always ensure raw audio is preserved as valid 16kHz WAV
    raw_wav_bytes = audio_to_wav_bytes(raw_audio, sr=SAMPLE_RATE)

    # 2. DC Offset
    audio = remove_dc(raw_audio)
    stages_completed.append("dc_offset_removed")

    # 3. Band-pass 20 - 2000 Hz
    if len(audio) > 40:
        audio = bandpass_filter(audio, sr=SAMPLE_RATE)
        stages_completed.append("bandpass_20_2000hz")
    else:
        warnings.append("Recording too short for zero-phase band-pass filter.")

    # 4. Notch filter 50 Hz
    if len(audio) > 40:
        audio = notch_filter(audio, sr=SAMPLE_RATE)
        stages_completed.append("notch_50hz")
    else:
        warnings.append("Recording too short for notch filter.")

    # 5. Spectral noise reduction
    audio, nr_ok = reduce_noise(audio, sr=SAMPLE_RATE)
    if nr_ok:
        stages_completed.append("spectral_noise_reduction")
    else:
        warnings.append("Spectral noise reduction was skipped due to clip duration or profile.")

    # 6. Amplification / normalization
    audio, gain_applied = amplify_audio(audio)
    stages_completed.append("peak_normalization_0.90")

    proc_peak = float(np.max(np.abs(audio)))
    proc_rms = float(np.sqrt(np.mean(audio**2)))
    processed_wav_bytes = audio_to_wav_bytes(audio, sr=SAMPLE_RATE)

    return {
        "raw_wav_bytes": raw_wav_bytes,
        "processed_wav_bytes": processed_wav_bytes,
        "sample_rate": SAMPLE_RATE,
        "duration_seconds": round(duration_sec, 2),
        "stages_completed": stages_completed,
        "warnings": warnings,
        "metrics": {
            "raw_peak": round(raw_peak, 4),
            "raw_rms": round(raw_rms, 4),
            "processed_peak": round(proc_peak, 4),
            "processed_rms": round(proc_rms, 4),
            "gain_applied": round(gain_applied, 2),
        }
    }
