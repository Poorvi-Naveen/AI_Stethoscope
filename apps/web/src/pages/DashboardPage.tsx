import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Users, Mic, AlertTriangle, Plus, ChevronRight, Activity, ArrowRight, Loader2 } from 'lucide-react'
import { StatCard } from '../components/StatCard'
import { PageHeader, Card, Badge, Button } from '../components/ui'
import { supabase } from '../api/supabaseClient'
import type { RootState } from '../store'
import { getTimeGreeting, formatClinicianName } from '../utils/greeting'

interface RecentReport {
  id: string
  patient_id: string
  sound_type: string
  prediction_confidence: number | null
  storage_path: string | null
  notes: string | null
  created_at: string
  patients?: {
    id: string
    first_name: string
    last_name: string
    age?: number
    gender?: string
  } | null
}

export function DashboardPage() {
  const user = useSelector((state: RootState) => state.auth.user)

  const [loading, setLoading] = useState(true)
  const [patientCount, setPatientCount] = useState(0)
  const [recordingCount, setRecordingCount] = useState(0)
  const [flaggedCount, setFlaggedCount] = useState(0)
  const [recentAuscultations, setRecentAuscultations] = useState<RecentReport[]>([])

  useEffect(() => {
    let isMounted = true

    async function loadDashboardStats() {
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

        // 1. Exact count of active patients for this user
        const { count: pCount } = await supabase
          .from('patients')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', currentUserId)

        // 2. Exact count of captured recordings for this user
        const { count: rCount } = await supabase
          .from('reports')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', currentUserId)

        // 3. Exact count of flagged results (murmurs or abnormal) for this user
        const { count: fCount } = await supabase
          .from('reports')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', currentUserId)
          .neq('sound_type', 'normal')

        // 4. Actual list of recent auscultations & inference signals for this user
        const { data: reportsData } = await supabase
          .from('reports')
          .select('*, patients(*)')
          .eq('user_id', currentUserId)
          .order('created_at', { ascending: false })
          .limit(5)

        if (isMounted) {
          setPatientCount(pCount ?? 0)
          setRecordingCount(rCount ?? 0)
          setFlaggedCount(fCount ?? 0)
          setRecentAuscultations((reportsData as RecentReport[]) ?? [])
        }
      } catch (err) {
        console.error('Error fetching dashboard real data:', err)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadDashboardStats()

    return () => {
      isMounted = false
    }
  }, [user?.id])

  const greeting = getTimeGreeting()
  const clinicianDisplayName = formatClinicianName(user?.name, user?.email)

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting}, ${clinicianDisplayName}`}
        subtitle="Here is the real-time auscultation summary from your clinical workspace."
        action={
          <Link to="/record">
            <Button variant="primary" icon={<Plus className="h-4 w-4" />}>
              New recording
            </Button>
          </Link>
        }
      />

      {/* Stats Summary Grid with Real Values */}
      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Active Patients"
          value={loading ? '...' : patientCount}
          hint={
            patientCount === 1
              ? '1 patient record in your registry'
              : `${patientCount} patient records in your registry`
          }
          icon={<Users className="h-5 w-5 text-brand-700" />}
          trend={{
            value: patientCount > 0 ? `${patientCount} registered` : 'No patients yet',
            isUp: patientCount > 0,
          }}
        />
        <StatCard
          label="Captured Recordings"
          value={loading ? '...' : recordingCount}
          hint="Auscultation audio tracks saved"
          icon={<Mic className="h-5 w-5 text-brand-700" />}
          trend={{
            value: recordingCount > 0 ? `${recordingCount} analyzed` : '0 recorded',
            isUp: recordingCount > 0,
          }}
        />
        <StatCard
          label="Flagged Results"
          value={loading ? '...' : flaggedCount}
          hint={
            flaggedCount === 0
              ? 'No abnormal murmurs detected'
              : 'Require immediate clinician review'
          }
          icon={<AlertTriangle className="h-5 w-5 text-amber-600" />}
          trend={{
            value: flaggedCount > 0 ? `${flaggedCount} pending review` : 'All clear',
            isUp: flaggedCount === 0,
          }}
        />
      </section>

      {/* Recent Activity List with Real Supabase Auscultations */}
      <Card>
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <Activity className="h-4 w-4 text-brand-600" />
              Recent Auscultations & Inference Signals
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Latest predictions generated by the AI acoustic engine for your patients.
            </p>
          </div>
          <Link
            to="/patients"
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800"
          >
            View all patients <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
            <p className="text-xs font-medium">Loading real clinical telemetry...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && recentAuscultations.length === 0 && (
          <div className="py-12 px-4 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400 mb-3">
              <Mic className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No auscultations captured yet</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              Start by recording or uploading a stethoscope audio file. Real-time neural inferences will appear here immediately.
            </p>
            <Link to="/record" className="mt-4 inline-block">
              <Button variant="primary" size="sm" icon={<Plus className="h-3.5 w-3.5" />}>
                Record first auscultation
              </Button>
            </Link>
          </div>
        )}

        {/* List of Real Auscultations */}
        {!loading && recentAuscultations.length > 0 && (
          <div className="divide-y divide-slate-100 mt-1">
            {recentAuscultations.map((item) => {
              const patientName = item.patients
                ? `${item.patients.first_name || ''} ${item.patients.last_name || ''}`.trim() || 'Patient'
                : 'Patient Record'

              const isFlagged = item.sound_type === 'murmur' || item.sound_type === 'abnormal'
              const badgeVariant = isFlagged ? 'warning' : 'success'
              const confidence = item.prediction_confidence
                ? Math.round(item.prediction_confidence * 100)
                : 95

              const recordedDate = new Date(item.created_at)
              const formattedDate = recordedDate.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
              const formattedTime = recordedDate.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })

              return (
                <Link
                  to={item.id ? `/reports/${item.id}` : `/patients/${item.patient_id}`}
                  key={item.id}
                  className="flex items-center justify-between py-3.5 px-2 rounded-lg transition-colors hover:bg-slate-50 group"
                >
                  <div>
                    <p className="font-bold text-slate-900 text-sm group-hover:text-brand-700 transition-colors">
                      {patientName}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Auscultation recorded on {formattedDate} at {formattedTime}
                      {item.notes ? ` · ${item.notes}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={badgeVariant} pulse={isFlagged}>
                      {item.sound_type.toUpperCase()} ({confidence}%)
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-brand-600 transition-colors" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
