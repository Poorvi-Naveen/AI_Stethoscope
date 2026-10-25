import { supabase } from './supabaseClient'

export interface ReportItem {
  id: string; // the actual report id
  patientId: string;
  patientName: string;
  patientFirstName: string;
  patientLastName: string;
  mrn: string;
  age: number;
  gender: string;
  date: string;
  disease: string;
  risk: 'low' | 'moderate' | 'high';
  confidence: number;
  soundType?: string;
  storagePath?: string;
  notes?: string;
}

export async function getReports(userId?: string): Promise<ReportItem[]> {
  try {
    let resolvedUserId = userId
    if (!resolvedUserId) {
      const { data: { user } } = await supabase.auth.getUser()
      resolvedUserId = user?.id
    }

    let query = supabase
      .from('reports')
      .select('*, patients(*)')
      .order('created_at', { ascending: false })

    if (resolvedUserId) {
      query = query.eq('user_id', resolvedUserId)
    }

    const { data: reportsData, error: reportsError } = await query

    if (reportsError) {
      console.error('Error fetching reports:', reportsError)
      return []
    }

    return (reportsData || []).map((report: any) => {
      const patient = report.patients || {}
      const firstName = patient.first_name || 'Patient'
      const lastName = patient.last_name || ''
      const patientId = report.patient_id || patient.id || 'unknown'

      // Map sound_type to display string
      const diseaseLabel =
        report.sound_type === 'murmur'
          ? 'Mitral Regurgitation'
          : report.sound_type === 'abnormal'
          ? 'Airway Obstruction'
          : 'Healthy Normal'

      const riskLevel: 'low' | 'moderate' | 'high' =
        report.sound_type === 'murmur'
          ? 'high'
          : report.sound_type === 'abnormal'
          ? 'moderate'
          : 'low'

      return {
        id: report.id,
        patientId,
        patientName: `${firstName} ${lastName}`.trim(),
        patientFirstName: firstName,
        patientLastName: lastName,
        mrn: `MRN-${patientId.substring(0, 5).toUpperCase()}`,
        age: patient.age || 0,
        gender: patient.gender || 'unknown',
        date: report.created_at
          ? new Date(report.created_at).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        disease: diseaseLabel,
        risk: riskLevel,
        confidence: report.prediction_confidence
          ? Math.round(report.prediction_confidence * 100)
          : 95,
        soundType: report.sound_type,
        storagePath: report.storage_path,
        notes: report.notes,
      }
    })
  } catch (err) {
    console.error('Unexpected error fetching reports:', err)
    return []
  }
}

export async function getReport(id: string): Promise<ReportItem | null> {
  try {
    const { data: report, error } = await supabase
      .from('reports')
      .select('*, patients(*)')
      .eq('id', id)
      .maybeSingle()

    if (error || !report) {
      console.error('Error fetching report:', error)
      return null
    }

    const patient = report.patients || {}
    const firstName = patient.first_name || 'Patient'
    const lastName = patient.last_name || ''
    const patientId = report.patient_id || patient.id || 'unknown'

    const diseaseLabel =
      report.sound_type === 'murmur'
        ? 'Murmur Detected'
        : report.sound_type === 'abnormal'
        ? 'Airway Obstruction'
        : 'Normal Heart Sound'

    const riskLevel: 'low' | 'moderate' | 'high' =
      report.sound_type === 'murmur'
        ? 'high'
        : report.sound_type === 'abnormal'
        ? 'moderate'
        : 'low'

    return {
      id: report.id,
      patientId,
      patientName: `${firstName} ${lastName}`.trim(),
      patientFirstName: firstName,
      patientLastName: lastName,
      mrn: `MRN-${patientId.substring(0, 5).toUpperCase()}`,
      age: patient.age || 0,
      gender: patient.gender || 'unknown',
      date: report.created_at
        ? new Date(report.created_at).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      disease: diseaseLabel,
      risk: riskLevel,
      confidence: report.prediction_confidence
        ? Math.round(report.prediction_confidence * 100)
        : 95,
      soundType: report.sound_type,
      storagePath: report.storage_path,
      notes: report.notes,
    }
  } catch (err) {
    console.error('Unexpected error fetching report by id:', err)
    return null
  }
}
