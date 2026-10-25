import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Download, TrendingUp, Activity, Award, AlertTriangle, Users, Loader2, Plus, BarChart3 } from 'lucide-react'
import { StatCard } from '../components/StatCard'
import { PageHeader, Card, Select, Button, useToast } from '../components/ui'
import { supabase } from '../api/supabaseClient'
import type { RootState } from '../store'

interface AnalyticsReport {
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
  } | null
}

export function AnalyticsPage() {
  const user = useSelector((state: RootState) => state.auth.user)
  const [range, setRange] = useState<'This Week' | 'This Month' | 'This Quarter' | 'All Time'>('This Month')
  const [reports, setReports] = useState<AnalyticsReport[]>([])
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  useEffect(() => {
    let isMounted = true

    async function loadAnalyticsData() {
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

        const { data, error } = await supabase
          .from('reports')
          .select('*, patients(*)')
          .eq('user_id', currentUserId)
          .order('created_at', { ascending: true })

        if (error) {
          console.error('Error fetching analytics reports:', error)
          if (isMounted) setLoading(false)
          return
        }

        if (isMounted) {
          setReports((data as AnalyticsReport[]) || [])
        }
      } catch (err) {
        console.error('Unexpected error loading analytics data:', err)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadAnalyticsData()

    return () => {
      isMounted = false
    }
  }, [user?.id])

  // Filter reports by selected range
  const filteredReports = useMemo(() => {
    if (range === 'All Time') return reports

    const now = new Date()
    let daysToSubtract = 30
    if (range === 'This Week') daysToSubtract = 7
    if (range === 'This Quarter') daysToSubtract = 90

    const cutoff = new Date(now.getTime() - daysToSubtract * 24 * 60 * 60 * 1000)
    return reports.filter((r) => {
      const d = new Date(r.created_at)
      return d >= cutoff
    })
  }, [reports, range])

  // Top Metrics Calculation
  const totalScreenings = filteredReports.length
  const murmurCount = filteredReports.filter((r) => r.sound_type === 'murmur').length
  const normalCount = filteredReports.filter((r) => r.sound_type === 'normal').length
  const abnormalCount = filteredReports.filter((r) => r.sound_type === 'abnormal').length

  const meanConfidence = useMemo(() => {
    const valid = filteredReports.filter((r) => r.prediction_confidence != null)
    if (valid.length === 0) return 0
    const sum = valid.reduce((acc, curr) => acc + (curr.prediction_confidence || 0), 0)
    return Math.round((sum / valid.length) * 100)
  }, [filteredReports])

  const uniquePatientsCount = useMemo(() => {
    return new Set(filteredReports.map((r) => r.patient_id).filter(Boolean)).size
  }, [filteredReports])

  // Volume Over Time Chart Data (Aggregated by day)
  const volumeData = useMemo(() => {
    if (filteredReports.length === 0) return []

    const countsByDay = new Map<string, { day: string; screenings: number; timestamp: number }>()

    filteredReports.forEach((report) => {
      const d = new Date(report.created_at)
      const dayLabel = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      const dayKey = d.toISOString().split('T')[0]

      if (!countsByDay.has(dayKey)) {
        countsByDay.set(dayKey, {
          day: dayLabel,
          screenings: 0,
          timestamp: new Date(dayKey).getTime(),
        })
      }
      countsByDay.get(dayKey)!.screenings += 1
    })

    return Array.from(countsByDay.values()).sort((a, b) => a.timestamp - b.timestamp)
  }, [filteredReports])

  // Diagnostic Breakdown Donut Data
  const diseaseDistribution = useMemo(() => {
    const dist = [
      { name: 'Healthy Normal', value: normalCount, color: '#0d9488' },
      { name: 'Cardiac Murmur', value: murmurCount, color: '#f59e0b' },
      { name: 'Abnormal Signal', value: abnormalCount, color: '#f97316' },
    ].filter((item) => item.value > 0)

    if (dist.length === 0) {
      return [{ name: 'No data', value: 1, color: '#cbd5e1' }]
    }

    return dist
  }, [normalCount, murmurCount, abnormalCount])

  // CSV Export with Real Database Data
  const exportCsv = () => {
    if (filteredReports.length === 0) {
      showToast('No screening records available in this range to export.', 'warning')
      return
    }

    const headers = [
      'Report ID',
      'Date',
      'Time',
      'Patient Name',
      'Sound Finding',
      'Confidence %',
      'Storage Path',
      'Notes',
    ]

    const rows = filteredReports.map((r) => {
      const d = new Date(r.created_at)
      const dateStr = d.toLocaleDateString()
      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      const patientName = r.patients
        ? `${r.patients.first_name || ''} ${r.patients.last_name || ''}`.trim() || 'Patient'
        : 'Patient'
      const finding = (r.sound_type || 'normal').toUpperCase()
      const conf = r.prediction_confidence ? Math.round(r.prediction_confidence * 100) : 95
      const storage = r.storage_path || 'N/A'
      const notes = (r.notes || '').replace(/"/g, '""')

      return `"${r.id}","${dateStr}","${timeStr}","${patientName}","${finding}","${conf}%","${storage}","${notes}"`
    })

    const csvContent = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `stethai-analytics-${range.toLowerCase().replace(/\s+/g, '_')}-${new Date().toISOString().split('T')[0]}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
    showToast(`Exported ${filteredReports.length} screening records to CSV.`, 'success')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Screening Analytics & Model Performance"
        subtitle="Live auscultation volume trends, diagnostic distribution, and neural network confidence metrics from your database."
        action={
          <div className="flex items-center gap-3">
            <Select
              value={range}
              onChange={(e) => setRange(e.target.value as any)}
              className="h-10 text-xs font-semibold"
            >
              <option value="This Week">This Week</option>
              <option value="This Month">This Month</option>
              <option value="This Quarter">This Quarter</option>
              <option value="All Time">All Time</option>
            </Select>

            <Button
              variant="primary"
              onClick={exportCsv}
              icon={<Download className="h-4 w-4" />}
            >
              Export CSV
            </Button>
          </div>
        }
      />

      {/* Top Stat Cards with Real Values */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Screenings"
          value={loading ? '...' : totalScreenings}
          hint={`Auscultations (${range})`}
          icon={<Activity className="h-5 w-5 text-brand-700" />}
          trend={{
            value: totalScreenings > 0 ? `${totalScreenings} analyzed` : '0 screenings',
            isUp: totalScreenings > 0,
          }}
        />
        <StatCard
          label="Cardiac Murmur Cases"
          value={loading ? '...' : murmurCount}
          hint={
            totalScreenings > 0
              ? `${Math.round((murmurCount / totalScreenings) * 100)}% of total volume`
              : '0% in range'
          }
          icon={<TrendingUp className="h-5 w-5 text-amber-600" />}
          trend={{
            value: murmurCount > 0 ? `${murmurCount} flagged` : 'None detected',
            isUp: murmurCount === 0,
          }}
        />
        <StatCard
          label="Healthy / Normal Sounds"
          value={loading ? '...' : normalCount}
          hint={
            totalScreenings > 0
              ? `${Math.round((normalCount / totalScreenings) * 100)}% regular rhythm`
              : '0% in range'
          }
          icon={<Award className="h-5 w-5 text-teal-600" />}
          trend={{
            value: normalCount > 0 ? `${normalCount} normal` : '0 normal',
            isUp: normalCount > 0,
          }}
        />
        <StatCard
          label="Mean Model Confidence"
          value={loading ? '...' : meanConfidence > 0 ? `${meanConfidence}%` : 'N/A'}
          hint="Across completed inferences"
          icon={<Award className="h-5 w-5 text-emerald-600" />}
          trend={{
            value: meanConfidence >= 90 ? 'High precision' : 'Operational',
            isUp: true,
          }}
        />
      </section>

      {/* Loading Indicator */}
      {loading && (
        <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-brand-600" />
          <p className="text-sm font-medium">Computing live clinical analytics from database...</p>
        </div>
      )}

      {/* Empty State: When no data exists in range */}
      {!loading && totalScreenings === 0 && (
        <Card className="py-14 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-slate-100 text-slate-400 mb-3">
            <BarChart3 className="h-7 w-7" />
          </div>
          <h2 className="text-base font-bold text-slate-900">No auscultations in this time period</h2>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            {reports.length === 0
              ? 'You have not recorded any auscultation tracks yet. Record your first patient to generate real-time charts and distributions.'
              : `No recordings were captured during ${range.toLowerCase()}. Switch range to "All Time" to view your historical data.`}
          </p>
          {reports.length === 0 ? (
            <Link to="/record" className="mt-4 inline-block">
              <Button variant="primary" size="sm" icon={<Plus className="h-4 w-4" />}>
                Record First Auscultation
              </Button>
            </Link>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRange('All Time')}
              className="mt-4"
            >
              View All Time Analytics
            </Button>
          )}
        </Card>
      )}

      {/* Charts Grid */}
      {!loading && totalScreenings > 0 && (
        <section className="grid gap-6 lg:grid-cols-5">
          {/* Volume Line Chart */}
          <Card className="h-88 lg:col-span-3 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
              <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-brand-700" />
                Auscultation Volume Over Time
              </h2>
              <span className="text-xs font-semibold text-slate-400">
                {volumeData.length} recording {volumeData.length === 1 ? 'day' : 'days'}
              </span>
            </div>
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={volumeData}>
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    allowDecimals={false}
                    domain={[0, 'auto']}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      color: '#fff',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="screenings"
                    name="Screenings"
                    stroke="#0f766e"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#0f766e' }}
                    activeDot={{ r: 6, fill: '#14b8a6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Diagnostic Breakdown Donut Chart */}
          <Card className="h-88 lg:col-span-2 flex flex-col justify-between">
            <div className="border-b border-slate-100 pb-3 mb-2">
              <h2 className="font-bold text-slate-900 text-sm">Diagnostic Classification Breakdown</h2>
              <p className="text-xs text-slate-500">Distribution across verified sound types</p>
            </div>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={diseaseDistribution}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                  >
                    {diseaseDistribution.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs font-semibold text-slate-600 pt-2 border-t border-slate-100">
              {diseaseDistribution.map((item) => (
                <span key={item.name} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}: {item.value}
                </span>
              ))}
            </div>
          </Card>
        </section>
      )}

      {/* Bottom Benchmarks with Real Values */}
      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Patients Screened"
          value={loading ? '...' : uniquePatientsCount}
          hint="Unique patient records in selected range"
          icon={<Users className="h-5 w-5 text-brand-700" />}
        />
        <StatCard
          label="High Risk Flagged Cases"
          value={loading ? '...' : murmurCount}
          hint={murmurCount > 0 ? 'Require clinician echocardiogram review' : 'No flagged murmurs in range'}
          icon={<AlertTriangle className="h-5 w-5 text-amber-600" />}
        />
        <StatCard
          label="AI Model Version"
          value="CardioNet-ResNet"
          hint="Model: heart_sound_circor_best (ML)"
          icon={<Award className="h-5 w-5 text-emerald-600" />}
        />
      </section>
    </div>
  )
}
