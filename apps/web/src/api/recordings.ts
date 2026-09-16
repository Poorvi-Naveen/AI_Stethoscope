import type { Recording, Prediction } from '../types'
import { recordings, predictions } from '../mocks/data'

export async function createRecording(patientId: string, audio: Blob): Promise<Recording> {
  const formData = new FormData()
  formData.append('audio', audio, 'audio.wav')

  const response = await fetch('/api/predict/heart', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Failed to analyze audio: ${response.statusText}. Details: ${errorBody}`)
  }

  const result = await response.json()

  const now = new Date().toISOString()
  const recordingId = `rec-${crypto.randomUUID().substring(0, 8)}`

  const newRecording: Recording = {
    id: recordingId,
    patientId,
    recordedAt: now,
    durationSeconds: 15,
    auscultationSite: 'mitral',
    storageUrl: URL.createObjectURL(audio),
    status: 'completed',
    deviceName: 'StethAI Digital Sensor',
    sampleRateHz: 4000,
    createdAt: now,
  }

  const newPrediction: Prediction = {
    id: `pred-${crypto.randomUUID().substring(0, 8)}`,
    recordingId: recordingId,
    modelName: result.modelName || 'CardioNet-ResNet',
    modelVersion: result.modelVersion || '1.4.0',
    label: result.label,
    confidence: result.confidence,
    probabilities: result.probabilities,
    inferenceMs: result.inferenceMs,
    createdAt: now,
  }

  recordings.unshift(newRecording)
  predictions.unshift(newPrediction)

  return newRecording
}
