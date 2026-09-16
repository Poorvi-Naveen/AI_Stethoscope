import type { Diagnosis, Patient, Prediction, Recording } from '../types'

export const patients: Patient[] = [
  { id: 'pat-001', firstName: 'Maya', lastName: 'Shah', dateOfBirth: '1985-04-12', sex: 'female', medicalRecordNumber: 'MRN-10482', phone: '+91 98765 43210', email: 'maya.shah@example.test', notes: 'Family history of mitral valve disease.', createdAt: '2026-07-08T09:15:00Z', updatedAt: '2026-07-28T10:10:00Z' },
  { id: 'pat-002', firstName: 'Arjun', lastName: 'Mehta', dateOfBirth: '1969-11-03', sex: 'male', medicalRecordNumber: 'MRN-10483', phone: '+91 98111 22233', email: null, notes: 'Hypertension controlled with medication.', createdAt: '2026-07-10T11:30:00Z', updatedAt: '2026-07-26T08:40:00Z' },
  { id: 'pat-003', firstName: 'Sofia', lastName: "D'Souza", dateOfBirth: '1998-08-21', sex: 'female', medicalRecordNumber: 'MRN-10484', phone: '+91 98220 11223', email: 'sofia.dsouza@example.test', notes: null, createdAt: '2026-07-17T13:00:00Z', updatedAt: '2026-07-25T15:20:00Z' },
  { id: 'pat-004', firstName: 'Rohan', lastName: 'Kapoor', dateOfBirth: '2012-02-08', sex: 'male', medicalRecordNumber: 'MRN-10485', phone: '+91 99300 11002', email: null, notes: 'Pediatric follow-up; accompanied by parent.', createdAt: '2026-07-20T09:45:00Z', updatedAt: '2026-07-29T07:10:00Z' },
]

export const recordings: Recording[] = [
  { id: 'rec-001', patientId: 'pat-001', recordedAt: '2026-07-28T10:05:00Z', durationSeconds: 24, auscultationSite: 'mitral', storageUrl: null, status: 'completed', deviceName: 'StethAI One', sampleRateHz: 4000, createdAt: '2026-07-28T10:05:00Z' },
  { id: 'rec-002', patientId: 'pat-001', recordedAt: '2026-07-28T10:08:00Z', durationSeconds: 22, auscultationSite: 'aortic', storageUrl: null, status: 'completed', deviceName: 'StethAI One', sampleRateHz: 4000, createdAt: '2026-07-28T10:08:00Z' },
  { id: 'rec-003', patientId: 'pat-002', recordedAt: '2026-07-26T08:30:00Z', durationSeconds: 30, auscultationSite: 'aortic', storageUrl: null, status: 'completed', deviceName: 'StethAI One', sampleRateHz: 4000, createdAt: '2026-07-26T08:30:00Z' },
  { id: 'rec-004', patientId: 'pat-003', recordedAt: '2026-07-25T15:15:00Z', durationSeconds: 18, auscultationSite: 'pulmonic', storageUrl: null, status: 'completed', deviceName: 'StethAI One', sampleRateHz: 4000, createdAt: '2026-07-25T15:15:00Z' },
  { id: 'rec-005', patientId: 'pat-004', recordedAt: '2026-07-29T07:00:00Z', durationSeconds: 20, auscultationSite: 'tricuspid', storageUrl: null, status: 'processing', deviceName: 'StethAI One', sampleRateHz: 4000, createdAt: '2026-07-29T07:00:00Z' },
]

export const predictions: Prediction[] = [
  { id: 'pred-001', recordingId: 'rec-001', modelName: 'CardioNet', modelVersion: '1.2.0', label: 'murmur', confidence: 0.94, probabilities: { normal: 0.04, murmur: 0.94, artifact: 0.02 }, inferenceMs: 218, createdAt: '2026-07-28T10:05:04Z' },
  { id: 'pred-002', recordingId: 'rec-002', modelName: 'CardioNet', modelVersion: '1.2.0', label: 'normal', confidence: 0.88, probabilities: { normal: 0.88, murmur: 0.09, artifact: 0.03 }, inferenceMs: 202, createdAt: '2026-07-28T10:08:04Z' },
  { id: 'pred-003', recordingId: 'rec-003', modelName: 'CardioNet', modelVersion: '1.2.0', label: 'murmur', confidence: 0.81, probabilities: { normal: 0.16, murmur: 0.81, artifact: 0.03 }, inferenceMs: 214, createdAt: '2026-07-26T08:30:04Z' },
  { id: 'pred-004', recordingId: 'rec-004', modelName: 'CardioNet', modelVersion: '1.2.0', label: 'normal', confidence: 0.97, probabilities: { normal: 0.97, murmur: 0.01, artifact: 0.02 }, inferenceMs: 197, createdAt: '2026-07-25T15:15:04Z' },
]

export const diagnoses: Diagnosis[] = [
  { id: 'dx-001', patientId: 'pat-001', recordingId: 'rec-001', code: 'I34.0', name: 'Mitral valve regurgitation', status: 'suspected', clinicalNotes: 'Refer for echocardiogram.', diagnosedBy: 'Dr. Priya Nair', diagnosedAt: '2026-07-28T10:20:00Z', createdAt: '2026-07-28T10:20:00Z', updatedAt: '2026-07-28T10:20:00Z' },
  { id: 'dx-002', patientId: 'pat-002', recordingId: 'rec-003', code: 'R01.1', name: 'Cardiac murmur, unspecified', status: 'suspected', clinicalNotes: 'Compare with prior echo.', diagnosedBy: 'Dr. Priya Nair', diagnosedAt: '2026-07-26T08:45:00Z', createdAt: '2026-07-26T08:45:00Z', updatedAt: '2026-07-26T08:45:00Z' },
  { id: 'dx-003', patientId: 'pat-004', recordingId: null, code: null, name: 'Innocent murmur', status: 'confirmed', clinicalNotes: 'Routine annual review.', diagnosedBy: 'Dr. Amit Rao', diagnosedAt: '2026-07-29T07:25:00Z', createdAt: '2026-07-29T07:25:00Z', updatedAt: '2026-07-29T07:25:00Z' },
]

export const getPatient = (id: string) => patients.find((patient) => patient.id === id)
export const patientRecordings = (patientId: string) => recordings.filter((recording) => recording.patientId === patientId)
export const patientDiagnoses = (patientId: string) => diagnoses.filter((diagnosis) => diagnosis.patientId === patientId)
export const recordingPrediction = (recordingId: string) => predictions.find((prediction) => prediction.recordingId === recordingId)
