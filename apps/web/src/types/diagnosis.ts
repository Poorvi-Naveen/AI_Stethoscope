// apps/web/src/types/diagnosis.ts
export type DiagnosisStatus = 'suspected' | 'confirmed' | 'ruled_out'

/** Clinician-entered interpretation associated with a patient and optionally a recording. */
export interface Diagnosis {
  id: string
  patientId: string
  recordingId?: string | null
  code?: string | null
  name: string
  status: DiagnosisStatus
  clinicalNotes?: string | null
  diagnosedBy?: string | null
  diagnosedAt: string
  createdAt: string
  updatedAt: string
}
