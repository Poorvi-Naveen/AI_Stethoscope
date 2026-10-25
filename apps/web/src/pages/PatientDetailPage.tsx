import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Plus, Mic, FileText, Calendar, Phone, Mail, Activity, ArrowLeft, Loader2 } from 'lucide-react'
import { getPatientById } from '../api/patients'
import { getPatient as getMockPatient, patientDiagnoses as getMockDiagnoses, patientRecordings as getMockRecordings, recordingPrediction as getMockPrediction } from '../mocks'
import { supabase } from '../api/supabaseClient'
import { PageHeader, Card, Button, Badge } from '../components/ui'
import type { Patient } from '../types'

interface PatientReport {
  id: string
  patient_id: string
  sound_type: string
  prediction_confidence: number | null
  storage_path?: string | null
  notes?: string | null
  created_at: string
}

export function PatientDetailPage() {
  const { id } = useParams()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [reports, setReports] = useState<PatientReport[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadPatientDetails() {
      if (!id) {
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        // 1. Try fetching from Supabase database
        const dbPatient = await getPatientById(id)

        if (dbPatient && isMounted) {
          setPatient(dbPatient)

          // Fetch reports from Supabase for this patient
          const { data: dbReports } = await supabase
            .from('reports')
            .select('*')
            .eq('patient_id', id)
            .order('created_at', { ascending: false })

          setReports((dbReports as PatientReport[]) || [])
        } else {
          // Fallback to mock data if not found in DB (e.g. for mock patient IDs)
          const mockP = getMockPatient(id)
          if (mockP && isMounted) {
            setPatient(mockP)
            const mockRecs = getMockRecordings(mockP.id)
            const mappedReports: PatientReport[] = mockRecs.map((rec) => {
              const pred = getMockPrediction(rec.id)
              return {
                id: rec.id,
                patient_id: rec.patientId,
                sound_type: pred?.label || 'normal',
                prediction_confidence: pred?.confidence || 0.9,
                storage_path: rec.storageUrl,
                notes: `Captured at ${rec.auscultationSite} site (${rec.deviceName})`,
                created_at: rec.recordedAt,
              }
            })
            setReports(mappedReports)
          }
        }
      } catch (err) {
        console.error('Error loading patient details:', err)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadPatientDetails()

    return () => {
      isMounted = false
    }
  }, [id])

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-500 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        <p className="text-sm font-medium">Loading patient clinical record...</p>
      </div>
    )
  }

  if (!patient) {
    return (
      <Card className="max-w-md mx-auto text-center py-12">
        <h1 className="text-xl font-bold text-slate-900">Patient Profile Not Found</h1>
        <p className="mt-2 text-sm text-slate-500">
          The requested patient record was not found in your clinical directory.
        </p>
        <Link to="/patients" className="mt-6 inline-block">
          <Button variant="outline" icon={<ArrowLeft className="h-4 w-4" />}>
            Back to Patients List
          </Button>
        </Link>
      </Card>
    )
  }

  const birthDate = new Date(patient.dateOfBirth)
  const age =
    !isNaN(birthDate.getTime()) && birthDate.getFullYear() > 1900
      ? new Date().getFullYear() - birthDate.getFullYear()
      : 'N/A'

  return (
    <div className="space-y-6">
      <PageHeader
        backTo="/patients"
        backLabel="All Patients"
        title={`${patient.firstName} ${patient.lastName}`}
        subtitle={`MRN: ${patient.medicalRecordNumber} · ${age !== 'N/A' ? `${age} years old · ` : ''}${patient.sex.toUpperCase()} · Registered ${new Date(patient.createdAt).toLocaleDateString()}`}
        action={
          <Link to="/record">
            <Button variant="primary" icon={<Plus className="h-4 w-4" />}>
              New Recording
            </Button>
          </Link>
        }
      />

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 Columns: Auscultation Recordings History */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-brand-700" />
                <h2 className="font-bold text-slate-900 text-sm">Auscultation Tracks & AI Findings</h2>
              </div>
              <Badge variant="brand">{reports.length} Recordings</Badge>
            </div>

            <div className="divide-y divide-slate-100">
              {reports.map((report) => {
                const isFlagged = report.sound_type === 'murmur' || report.sound_type === 'abnormal'
                const confidence = report.prediction_confidence
                  ? Math.round(report.prediction_confidence * 100)
                  : 95
                const recordedDate = new Date(report.created_at)

                return (
                  <div
                    key={report.id}
                    className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 capitalize">
                          Auscultation Track
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          ({report.storage_path ? 'Audio Stored' : 'Live Inference'})
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Recorded on {recordedDate.toLocaleDateString()} at{' '}
                        {recordedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {report.notes ? ` · ${report.notes}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 sm:text-right">
                      <div>
                        <Badge variant={isFlagged ? 'warning' : 'success'} pulse={isFlagged}>
                          {report.sound_type.toUpperCase()} ({confidence}%)
                        </Badge>
                        <p className="mt-1 text-[11px] text-slate-400 font-mono">
                          Model: heart_sound_circor (ML)
                        </p>
                      </div>

                      <Link to={`/reports/${report.id}`}>
                        <Button variant="outline" size="sm" icon={<FileText className="h-3.5 w-3.5" />}>
                          Report
                        </Button>
                      </Link>
                    </div>
                  </div>
                )
              })}

              {reports.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-500">
                  <p>No stethoscope recordings captured for this patient yet.</p>
                  <Link to="/record" className="mt-3 inline-block">
                    <Button variant="outline" size="sm" icon={<Plus className="h-3 w-3" />}>
                      Record Auscultation Track
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Sidebar: Patient Metadata & Clinical Notes */}
        <div className="space-y-6">
          <Card>
            <h2 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3 mb-3">
              Patient Record Info
            </h2>
            <div className="space-y-2.5 text-xs text-slate-600 font-medium">
              <div className="flex items-center gap-2.5">
                <Calendar className="h-4 w-4 text-brand-600 shrink-0" />
                <span>Registered: {new Date(patient.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Activity className="h-4 w-4 text-brand-600 shrink-0" />
                <span>MRN Identifier: {patient.medicalRecordNumber}</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2">
                Clinical Medical History
              </h3>
              <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed">
                {patient.notes || 'Newly created patient profile in clinical registry.'}
              </p>
            </div>
          </Card>

          <Card>
            <h2 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3 mb-3">
              Clinical Assessment Status
            </h2>
            <div className="space-y-3">
              {reports.length > 0 ? (
                <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-900">Latest Impression</p>
                    <Badge
                      variant={
                        reports[0].sound_type === 'murmur' || reports[0].sound_type === 'abnormal'
                          ? 'warning'
                          : 'success'
                      }
                    >
                      {reports[0].sound_type === 'murmur'
                        ? 'Murmur Detected'
                        : reports[0].sound_type === 'abnormal'
                        ? 'Abnormal Finding'
                        : 'Normal Auscultation'}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-slate-600 border-t border-slate-200/60 pt-2">
                    {reports[0].sound_type === 'murmur'
                      ? 'Cardiac acoustic signal demonstrates murmur characteristics. Clinical echocardiogram correlation recommended.'
                      : 'Acoustic waveform shows regular S1 and S2 heart sounds with no prominent murmur artifacts.'}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-500">No auscultation assessments logged yet.</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
