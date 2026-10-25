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

  // Resolve clinician name without overwriting existing profile data
  let resolvedName = data.user.user_metadata?.name || data.user.user_metadata?.full_name
  if (!resolvedName) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', data.user.id)
      .maybeSingle()
    if (profile && (profile.first_name || profile.last_name)) {
      resolvedName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
    }
  }

  if (!resolvedName && data.user.email) {
    const local = data.user.email.split('@')[0]
    resolvedName = local.charAt(0).toUpperCase() + local.slice(1)
  }

  // Ensure profile exists if none was found
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', data.user.id)
    .maybeSingle()

  if (!existingProfile && resolvedName) {
    const parts = resolvedName.split(/\s+/)
    await supabase.from('profiles').insert([{ 
      id: data.user.id, 
      first_name: parts[0] || 'Clinician',
      last_name: parts.slice(1).join(' ') || ''
    }])
  }

  return { 
    user: { 
      id: data.user.id, 
      name: resolvedName || 'Doctor', 
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
