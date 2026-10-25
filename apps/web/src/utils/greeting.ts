export function getTimeGreeting(date = new Date()): string {
  const hour = date.getHours()
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function formatClinicianName(name?: string | null, email?: string | null): string {
  let clean = (name || '').trim()

  // If empty or looks like an email or generic "doctor", derive from email
  if (!clean || clean.includes('@') || clean.toLowerCase() === 'doctor') {
    if (email && email.includes('@')) {
      const local = email.split('@')[0]
      clean = local.charAt(0).toUpperCase() + local.slice(1)
    } else {
      clean = 'Doctor'
    }
  }

  // If already starts with "dr." or "dr ", normalize it
  if (/^dr\.?\s+/i.test(clean)) {
    return clean.replace(/^dr\.?\s+/i, 'Dr. ')
  }

  return `Dr. ${clean}`
}

export function getClinicianInitials(name?: string | null, email?: string | null): string {
  const clinician = formatClinicianName(name, email).replace(/^Dr\.\s*/i, '').trim()
  if (!clinician) return 'DR'
  const parts = clinician.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return clinician.slice(0, 2).toUpperCase()
}
