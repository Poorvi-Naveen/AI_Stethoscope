import type { Patient } from '../types'
import { patients } from '../mocks/data'

export type CreatePatientInput = Pick<Patient, 'firstName' | 'lastName' | 'sex' | 'phone' | 'address'> & {
  age: number
}

/** API seam: replace this mock with the POST /patients call when the backend ML model is connected. */
export async function createPatient(input: CreatePatientInput): Promise<Patient> {
  // Simulate network latency for agile frontend testing
  await new Promise((resolve) => setTimeout(resolve, 400))

  const now = new Date().toISOString()
  const newPatient: Patient = {
    id: `pat-${crypto.randomUUID().substring(0, 8)}`,
    firstName: input.firstName,
    lastName: input.lastName,
    dateOfBirth: new Date(new Date().getFullYear() - input.age, 0, 1).toISOString(),
    sex: input.sex,
    medicalRecordNumber: `MRN-${Math.floor(10000 + Math.random() * 89999)}`,
    phone: input.phone || null,
    email: `${input.firstName.toLowerCase()}.${input.lastName.toLowerCase()}@example.test`,
    address: input.address || null,
    notes: 'Newly created patient profile via stethoscope recording workflow.',
    createdAt: now,
    updatedAt: now,
  }

  // Prepend to mock patients list for dynamic UI updates
  patients.unshift(newPatient)
  return newPatient
}
