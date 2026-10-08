import type { Patient } from '../types'
import { supabase } from './supabaseClient'

export type CreatePatientInput = Pick<Patient, 'firstName' | 'lastName' | 'sex' | 'phone' | 'address'> & {
  age: number
}

export async function getPatients(): Promise<Patient[]> {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching patients:', error)
    return []
  }

  return data.map(p => ({
    id: p.id,
    firstName: p.first_name,
    lastName: p.last_name,
    dateOfBirth: new Date(new Date().getFullYear() - (p.age || 0), 0, 1).toISOString(),
    sex: p.gender || 'unknown',
    medicalRecordNumber: `MRN-${p.id.substring(0,5)}`,
    phone: null,
    email: '',
    address: null,
    notes: p.medical_history || '',
    createdAt: p.created_at,
    updatedAt: p.created_at,
  }))
}

export async function createPatient(input: CreatePatientInput): Promise<Patient> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('patients')
    .insert([
      {
        user_id: user.id,
        first_name: input.firstName,
        last_name: input.lastName,
        age: input.age,
        gender: input.sex,
        medical_history: 'Newly created patient profile.'
      }
    ])
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return {
    id: data.id,
    firstName: data.first_name,
    lastName: data.last_name,
    dateOfBirth: new Date(new Date().getFullYear() - (data.age || 0), 0, 1).toISOString(),
    sex: data.gender || 'unknown',
    medicalRecordNumber: `MRN-${data.id.substring(0,5)}`,
    phone: null,
    email: '',
    address: null,
    notes: data.medical_history || '',
    createdAt: data.created_at,
    updatedAt: data.created_at,
  }
}
