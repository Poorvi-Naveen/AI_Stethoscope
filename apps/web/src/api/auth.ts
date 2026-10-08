import type { AuthSession } from '../types'
import { supabase } from './supabaseClient'

export interface LoginInput { email: string; password: string; rememberMe: boolean }
export interface SignupInput { name: string; email: string; password: string }

export async function login(input: LoginInput): Promise<AuthSession> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  })

  if (error) throw new Error(error.message)
  if (!data.session) throw new Error('No session returned')

  // Ensure profile exists (upsert)
  const name = data.user.user_metadata?.name || data.user.email || 'Dr. Doctor'
  await supabase.from('profiles').upsert([{ 
    id: data.user.id, 
    first_name: name.split(' ')[0],
    last_name: name.split(' ').slice(1).join(' ') || ''
  }])

  // We rely on Supabase's built-in session persistence
  return { 
    user: { 
      id: data.user.id, 
      name: data.user.user_metadata?.name || data.user.email, 
      email: data.user.email || '', 
      role: 'doctor' 
    }, 
    token: data.session.access_token 
  }
}

export async function signup(input: SignupInput): Promise<AuthSession> {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        name: input.name,
      }
    }
  })

  if (error) throw new Error(error.message)
  if (!data.session || !data.user) throw new Error('No session returned. Check your email for confirmation link if required.')

  // Ensure profile exists
  await supabase.from('profiles').upsert([{ 
    id: data.user.id, 
    first_name: input.name.split(' ')[0],
    last_name: input.name.split(' ').slice(1).join(' ')
  }])

  return { 
    user: { 
      id: data.user.id, 
      name: input.name, 
      email: data.user.email || '', 
      role: 'doctor' 
    }, 
    token: data.session.access_token 
  }
}

export async function logout() { 
  await supabase.auth.signOut()
}
