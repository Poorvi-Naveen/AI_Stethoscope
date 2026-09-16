export type PatientSex = 'female' | 'male' | 'other' | 'unknown'

/** Mirrors the `patients` table. UUID fields remain strings in the client. */
export interface Patient {
  id: string
  firstName: string
  lastName: string
  dateOfBirth: string
  sex: PatientSex
  medicalRecordNumber: string
  phone?: string | null
  email?: string | null
  address?: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
}
