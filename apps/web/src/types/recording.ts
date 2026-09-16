export type RecordingStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type AuscultationSite = 'aortic' | 'pulmonic' | 'tricuspid' | 'mitral' | 'posterior'

/** Mirrors the `recordings` table; storageUrl can be a signed URL supplied by the API. */
export interface Recording {
  id: string
  patientId: string
  recordedAt: string
  durationSeconds: number
  auscultationSite: AuscultationSite
  storageUrl?: string | null
  status: RecordingStatus
  deviceName?: string | null
  sampleRateHz?: number | null
  createdAt: string
}
