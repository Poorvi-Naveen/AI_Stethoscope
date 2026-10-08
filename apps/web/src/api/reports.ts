import { supabase } from './supabaseClient'
import { getPatients } from './patients'

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
}

export async function getReports(): Promise<ReportItem[]> {
  const { data: reportsData, error: reportsError } = await supabase
    .from('reports')
    .select('*, patients(*)')
    .order('created_at', { ascending: false })

  if (reportsError) {
    console.error('Error fetching reports:', reportsError)
    return []
  }

  return reportsData.map((report) => {
    const patient = report.patients
    
    // Map sound_type to display string
    const diseaseLabel = report.sound_type === 'murmur' ? 'Mitral Regurgitation' : report.sound_type === 'abnormal' ? 'Airway Obstruction' : 'Healthy Normal'
    const riskLevel: 'low' | 'moderate' | 'high' = report.sound_type === 'murmur' ? 'high' : report.sound_type === 'abnormal' ? 'moderate' : 'low'

    return {
      id: report.id,
      patientId: patient.id,
      patientName: `${patient.first_name} ${patient.last_name}`,
      mrn: `MRN-${patient.id.substring(0,5)}`,
      date: new Date(report.created_at).toISOString().split('T')[0],
      disease: diseaseLabel,
      risk: riskLevel,
      confidence: report.prediction_confidence ? Math.round(report.prediction_confidence * 100) : 95
    }
  })
}

export async function getReport(id: string): Promise<ReportItem | null> {
  const { data: report, error } = await supabase
    .from('reports')
    .select('*, patients(*)')
    .eq('id', id)
    .single()

  if (error || !report) {
    console.error('Error fetching report:', error)
    return null
  }

  const patient = report.patients
  const diseaseLabel = report.sound_type === 'murmur' ? 'Murmur Detected' : report.sound_type === 'abnormal' ? 'Airway Obstruction' : 'Normal Heart Sound'
  const riskLevel: 'low' | 'moderate' | 'high' = report.sound_type === 'murmur' ? 'high' : report.sound_type === 'abnormal' ? 'moderate' : 'low'

  return {
    id: report.id,
    patientId: patient.id,
    patientName: `${patient.first_name} ${patient.last_name}`,
    patientFirstName: patient.first_name,
    patientLastName: patient.last_name,
    mrn: `MRN-${patient.id.substring(0,5)}`,
    age: patient.age || 0,
    gender: patient.gender || 'unknown',
    date: new Date(report.created_at).toISOString().split('T')[0],
    disease: diseaseLabel,
    risk: riskLevel,
    confidence: report.prediction_confidence ? Math.round(report.prediction_confidence * 100) : 95
  }
}
