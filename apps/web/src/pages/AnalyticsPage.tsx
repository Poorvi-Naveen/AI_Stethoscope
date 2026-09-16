import { useMemo, useState } from 'react'
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
import { Download, TrendingUp, Activity, Award, Clock, AlertTriangle } from 'lucide-react'
import { StatCard } from '../components/StatCard'
import { PageHeader, Card, Select, Button, useToast } from '../components/ui'

const monthly = [
  { day: 'Jul 1', screenings: 4 },
  { day: 'Jul 5', screenings: 8 },
  { day: 'Jul 10', screenings: 6 },
  { day: 'Jul 15', screenings: 13 },
  { day: 'Jul 20', screenings: 11 },
  { day: 'Jul 25', screenings: 17 },
  { day: 'Jul 30', screenings: 15 },
]

const diseaseDistribution = [
  { name: 'Normal / Healthy', value: 48, color: '#0d9488' },
  { name: 'Cardiac Murmur', value: 24, color: '#f59e0b' },
  { name: 'Airway Obstruction', value: 16, color: '#f97316' },
  { name: 'High Risk Artifact', value: 12, color: '#ef4444' },
]

export function AnalyticsPage() {
  const [range, setRange] = useState('This Month')
  const { showToast } = useToast()

  const stats = useMemo(
    () => (range === 'This Week' ? ['32', '8', '5', '89%'] : ['124', '30', '20', '94%']),
    [range]
  )

  const exportCsv = () => {
    const rows = [
      'date,total_screenings,murmurs,obstructions',
      ...monthly.map(
        (row) =>
          `2026-07-${row.day},${row.screenings},${Math.round(row.screenings * 0.24)},${Math.round(
            row.screenings * 0.16
          )}`
      ),
    ]
    const url = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'stethai-analytics-export.csv'
    anchor.click()
    URL.revokeObjectURL(url)
    showToast('Analytics CSV exported successfully.', 'success')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Screening Analytics & Model Performance"
        subtitle="Auscultation volume trends, diagnostic distribution, and neural network confidence metrics."
        action={
          <div className="flex items-center gap-3">
            <Select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="h-10 text-xs font-semibold"
            >
              <option value="This Week">This Week</option>
              <option value="This Month">This Month</option>
              <option value="This Quarter">This Quarter</option>
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

      {/* Top Stat Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Screenings"
          value={stats[0]}
          hint={`Auscultations (${range})`}
          icon={<Activity className="h-5 w-5 text-brand-700" />}
          trend={{ value: '+14% vs last period', isUp: true }}
        />
        <StatCard
          label="Cardiac Murmur Cases"
          value={stats[1]}
          hint="Flagged by acoustic model"
          icon={<AlertTriangle className="h-5 w-5 text-amber-600" />}
          trend={{ value: '24% of total', isUp: false }}
        />
        <StatCard
          label="Airway Obstructions"
          value={stats[2]}
          hint="Respiratory anomalies"
          icon={<TrendingUp className="h-5 w-5 text-brand-700" />}
          trend={{ value: '16% of total', isUp: false }}
        />
        <StatCard
          label="Mean Model Confidence"
          value={stats[3]}
          hint="Across completed runs"
          icon={<Award className="h-5 w-5 text-emerald-600" />}
          trend={{ value: 'High precision', isUp: true }}
        />
      </section>

      {/* Charts Grid */}
      <section className="grid gap-6 lg:grid-cols-5">
        {/* Line Chart */}
        <Card className="h-88 lg:col-span-3 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
            <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-brand-700" />
              Auscultation Volume Over Time
            </h2>
            <span className="text-xs font-semibold text-slate-400">Daily Screenings</span>
          </div>
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthly}>
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
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
                  stroke="#0f766e"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#0f766e' }}
                  activeDot={{ r: 6, fill: '#14b8a6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Donut Chart */}
        <Card className="h-88 lg:col-span-2 flex flex-col justify-between">
          <div className="border-b border-slate-100 pb-3 mb-2">
            <h2 className="font-bold text-slate-900 text-sm">Diagnostic Classification Breakdown</h2>
            <p className="text-xs text-slate-500">Distribution across clinical categories</p>
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
                {item.name}
              </span>
            ))}
          </div>
        </Card>
      </section>

      {/* Bottom Benchmarks */}
      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Avg. Recording Duration"
          value="22 sec"
          hint="Standard audio sample length"
          icon={<Clock className="h-5 w-5 text-brand-700" />}
        />
        <StatCard
          label="High Risk Flagged Cases"
          value="9"
          hint="Require immediate doctor follow-up"
          icon={<AlertTriangle className="h-5 w-5 text-rose-600" />}
        />
        <StatCard
          label="Validation Benchmark"
          value="94.2%"
          hint="Model accuracy vs echo ground truth"
          icon={<Award className="h-5 w-5 text-emerald-600" />}
        />
      </section>
    </div>
  )
}
