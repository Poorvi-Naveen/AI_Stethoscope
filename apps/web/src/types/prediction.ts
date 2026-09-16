export type PredictionLabel = 'normal' | 'murmur' | 'artifact' | 'abnormal'

/** One model inference, suitable for direct mapping from a backend prediction response. */
export interface Prediction {
  id: string
  recordingId: string
  modelName: string
  modelVersion: string
  label: PredictionLabel
  confidence: number
  probabilities?: Record<string, number> | null
  inferenceMs?: number | null
  createdAt: string
}
