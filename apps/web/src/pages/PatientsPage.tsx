import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Search, Plus, Mic, ChevronRight, UserPlus, Users, Loader2 } from 'lucide-react'
import { PageHeader, Card, Input, Button, Badge } from '../components/ui'
import { getPatients } from '../api/patients'
import { supabase } from '../api/supabaseClient'
import type { Patient } from '../types'
import type { RootState } from '../store'

interface PatientReportSummary {
  id: string
  patient_id: string
  sound_type: string
  prediction_confidence: number | null
  created_at: string
}

export function PatientsPage() {
  const user = useSelector((state: RootState) => state.auth.user)
  const [searchTerm, setSearchTerm] = useState('')
  const [patients, setPatients] = useState<Patient[]>([])
  const [reportsMap, setReportsMap] = useState<Record<string, PatientReportSummary[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadUserPatients() {
      setLoading(true)
      try {
        let currentUserId = user?.id
        if (!currentUserId) {
          const { data: { user: authUser } } = await supabase.auth.getUser()
          currentUserId = authUser?.id
        }

        if (!currentUserId) {
          if (isMounted) setLoading(false)
          return
        }

        // Fetch patients belonging to this user
        const patientsData = await getPatients(currentUserId)

        // Fetch reports belonging to this user to map recordings and findings
        const { data: reportsData } = await supabase
          .from('reports')
          .select('id, patient_id, sound_type, prediction_confidence, created_at')
          .eq('user_id', currentUserId)
          .order('created_at', { ascending: false })

        const map: Record<string, PatientReportSummary[]> = {}
        if (reportsData) {
          for (const rep of reportsData as PatientReportSummary[]) {
            if (!map[rep.patient_id]) {
              map[rep.patient_id] = []
            }
            map[rep.patient_id].push(rep)
          }
        }

        if (isMounted) {
          setPatients(patientsData)
          setReportsMap(map)
        }
      } catch (err) {
        console.error('Error loading patients from database:', err)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadUserPatients()

    return () => {
      isMounted = false
    }
  }, [user?.id])

  const filteredPatients = patients.filter((patient) => {
    const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase()
    const mrn = patient.medicalRecordNumber.toLowerCase()
    const term = searchTerm.toLowerCase().trim()
    return fullName.includes(term) || mrn.includes(term)
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patient Directory"
        subtitle="Search, manage, and review active clinical records and screening histories in your workspace."
        action={
          <Link to="/record">
            <Button variant="primary" icon={<Plus className="h-4 w-4" />}>
              Add Patient & Record
            </Button>
          </Link>
        }
      />

      {/* Filter and stats bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="max-w-md w-full">
          <Input
            placeholder="Search by patient name or MRN..."
            leftIcon={<Search className="h-4 w-4" />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="text-xs font-semibold text-slate-500 self-center sm:self-auto">
          {loading ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-600" /> Loading registry...
            </span>
          ) : (
            <span>{patients.length} registered {patients.length === 1 ? 'patient' : 'patients'} for your account</span>
          )}
        </div>
      </div>

      {/* Patients Table Card */}
      <Card className="overflow-hidden p-0 border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3.5">Patient Name</th>
                <th className="px-6 py-3.5">MRN ID</th>
                <th className="px-6 py-3.5">Demographics</th>
                <th className="px-6 py-3.5">Recordings</th>
                <th className="px-6 py-3.5">Latest Clinical Diagnosis</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredPatients.map((patient) => {
                const patientReports = reportsMap[patient.id] || []
                const recordingCount = patientReports.length
                const latestReport = patientReports[0]
                const age = new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()

                let diagnosisLabel = 'No auscultations yet'
                let badgeVariant: 'warning' | 'success' | 'neutral' = 'neutral'
                let isPulse = false

                if (latestReport) {
                  if (latestReport.sound_type === 'murmur') {
                    diagnosisLabel = 'Murmur Detected'
                    badgeVariant = 'warning'
                    isPulse = true
                  } else if (latestReport.sound_type === 'abnormal') {
                    diagnosisLabel = 'Abnormal Finding'
                    badgeVariant = 'warning'
                    isPulse = true
                  } else {
                    diagnosisLabel = 'Normal Heart Sound'
                    badgeVariant = 'success'
                  }
                }

                return (
                  <tr key={patient.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <Link
                        className="font-bold text-slate-900 hover:text-brand-700 transition"
                        to={`/patients/${patient.id}`}
                      >
                        {patient.firstName} {patient.lastName}
                      </Link>
                      <p className="text-xs text-slate-500">
                        Registered {new Date(patient.createdAt).toLocaleDateString()}
                      </p>
                    </td>

                    <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-600">
                      {patient.medicalRecordNumber}
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-600 capitalize">
                      {age > 0 ? `${age} yrs` : 'Age N/A'} · {patient.sex}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-slate-700">
                        <Mic className="h-3.5 w-3.5 text-brand-600" />
                        <span>{recordingCount} {recordingCount === 1 ? 'track' : 'tracks'}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <Badge variant={badgeVariant} pulse={isPulse}>
                        {diagnosisLabel}
                      </Badge>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <Link to={`/patients/${patient.id}`}>
                        <Button variant="ghost" size="sm" iconRight={<ChevronRight className="h-4 w-4" />}>
                          Details
                        </Button>
                      </Link>
                    </td>
                  </tr>
                )
              })}

              {/* Loading State */}
              {loading && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
                      <span>Loading patients from database...</span>
                    </div>
                  </td>
                </tr>
              )}

              {/* Empty State */}
              {!loading && filteredPatients.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-slate-500">
                    <div className="max-w-sm mx-auto flex flex-col items-center justify-center gap-3">
                      <div className="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400">
                        <Users className="h-6 w-6" />
                      </div>
                      <p className="font-bold text-slate-900 text-base">
                        {searchTerm ? 'No matching patients found' : 'No patients registered yet'}
                      </p>
                      <p className="text-xs text-slate-500 text-center">
                        {searchTerm
                          ? `No patient records matched "${searchTerm}". Try another query.`
                          : 'You currently have no patient records in the database. Add your first patient to begin capturing auscultations.'}
                      </p>
                      {!searchTerm && (
                        <Link to="/record" className="mt-2">
                          <Button variant="primary" size="sm" icon={<UserPlus className="h-4 w-4" />}>
                            Add Patient & Record
                          </Button>
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
