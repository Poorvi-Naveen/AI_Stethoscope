import type { Patient } from '../types'
import { supabase } from './supabaseClient'

export type CreatePatientInput = Pick<Patient, 'firstName' | 'lastName' | 'sex' | 'phone' | 'address'> & {
  age: number
}

function mapDatabasePatient(p: any): Patient {
  const birthYear = new Date().getFullYear() - (p.age || 0)
  return {
    id: p.id,
    firstName: p.first_name || 'Patient',
    lastName: p.last_name || '',
    dateOfBirth: new Date(birthYear, 0, 1).toISOString(),
    sex: p.gender || 'unknown',
    medicalRecordNumber: `MRN-${(p.id || '').substring(0, 5).toUpperCase()}`,
    phone: null,
    email: '',
    address: null,
    notes: p.medical_history || '',
    createdAt: p.created_at || new Date().toISOString(),
    updatedAt: p.created_at || new Date().toISOString(),
  }
}

export async function getPatients(userId?: string): Promise<Patient[]> {
  try {
    let resolvedUserId = userId
    if (!resolvedUserId) {
      const { data: { user } } = await supabase.auth.getUser()
      resolvedUserId = user?.id
    }

    let query = supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false })

    if (resolvedUserId) {
      query = query.eq('user_id', resolvedUserId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching patients for user:', error)
      return []
    }

    return (data || []).map(mapDatabasePatient)
  } catch (err) {
    console.error('Unexpected error fetching patients:', err)
    return []
  }
}

export async function getPatientById(id: string): Promise<Patient | null> {
  try {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error || !data) {
      console.error('Error fetching patient by id:', error)
      return null
    }

    return mapDatabasePatient(data)
  } catch (err) {
    console.error('Unexpected error fetching patient by id:', err)
    return null
  }
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
        medical_history: 'Newly created patient profile.',
      },
    ])
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return mapDatabasePatient(data)
}
