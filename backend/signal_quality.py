"""
Signal-quality gate for heart-sound recordings.

Purpose: decide whether a recording is usable BEFORE it reaches the model.
A noisy recording should be rejected / re-recorded, never silently reported
as "normal".

Only numpy is required. Thresholds are heuristics and should be tuned on
real stethoscope recordings from your hardware (see the constants below).
"""
from dataclasses import dataclass, asdict
import numpy as np

# --- Tunable thresholds -------------------------------------------------
MIN_PEAK = 0.005             # below this the stethoscope is essentially silent
MAX_CLIPPED_FRACTION = 0.01  # >1% samples at full scale => clipping
LOW_BAND_HZ = (20.0, 400.0)  # where most S1/S2 + murmur energy lives
MIN_LOW_BAND_RATIO = 0.50    # < 50% of energy in 20-400 Hz => broadband noise
MIN_ENVELOPE_DYNAMIC_DB = 4.0  # heartbeats are bursty; flat envelope => noise
FRAME_MS = 50


@dataclass
class QualityReport:
    ok: bool
    reason: str | None       # machine-readable: silent|clipped|noisy|no_heartbeat
    message: str             # user-facing text
    peak: float
    clipped_fraction: float
    low_band_ratio: float
    envelope_dynamic_db: float

    def to_dict(self) -> dict:
        d = asdict(self)
        for k, v in d.items():
            if isinstance(v, float):
                d[k] = round(v, 4)
        return d


def assess_quality(y: np.ndarray, sr: int) -> QualityReport:
    """`y` must be the RAW (un-normalised) mono waveform in [-1, 1]."""
    y = np.asarray(y, dtype=np.float32)
    if y.size == 0:
        return QualityReport(False, "silent", "Recording is empty.", 0.0, 0.0, 0.0, 0.0)

    peak = float(np.max(np.abs(y)))
    clipped = float(np.mean(np.abs(y) >= 0.99))

    # Band-energy ratio (Hann-windowed FFT over the whole clip)
    spec = np.abs(np.fft.rfft(y * np.hanning(y.size))) ** 2
    freqs = np.fft.rfftfreq(y.size, d=1.0 / sr)
    total = float(spec[freqs >= 5.0].sum()) + 1e-12
    band = (freqs >= LOW_BAND_HZ[0]) & (freqs <= LOW_BAND_HZ[1])
    low_ratio = float(spec[band].sum() / total)

    # Envelope dynamics: 90th vs 10th percentile of short-frame RMS (dB)
    frame = max(1, int(sr * FRAME_MS / 1000))
    n = y.size // frame
    if n >= 4:
        rms = np.sqrt(np.mean(y[: n * frame].reshape(n, frame) ** 2, axis=1)) + 1e-9
        dyn_db = float(20 * np.log10(np.percentile(rms, 90) / np.percentile(rms, 10)))
    else:
        dyn_db = 0.0

    def report(ok, reason, msg):
        return QualityReport(ok, reason, msg, peak, clipped, low_ratio, dyn_db)

    if peak < MIN_PEAK:
        return report(False, "silent",
                      "No signal detected. Check stethoscope contact and microphone, then re-record.")
    if clipped > MAX_CLIPPED_FRACTION:
        return report(False, "clipped",
                      "Recording is distorted (clipping). Lower the gain and re-record.")
    if low_ratio < MIN_LOW_BAND_RATIO:
        return report(False, "noisy",
                      "Recording is too noisy to analyse. Hold the stethoscope firmly, "
                      "reduce movement and background noise, then re-record.")
    if dyn_db < MIN_ENVELOPE_DYNAMIC_DB:
        return report(False, "no_heartbeat",
                      "No clear heartbeat pattern found. Reposition the stethoscope and re-record.")
    return report(True, None, "Signal quality acceptable.")
