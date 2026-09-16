import { useState } from 'react'
import { User, Play, Pause, CheckCircle2, FileCheck2, Volume2 } from 'lucide-react'
import type { Patient } from '../../types'
import { Card, Badge, Button } from '../ui'

export function PatientSummaryCard({ patient }: { patient: Patient }) {
  const age = new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()

  return (
    <Card className="flex items-center gap-4">
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-100 text-lg font-bold text-brand-800 shadow-xs">
        {patient.firstName[0]}
        {patient.lastName[0]}
      </div>
      <div>
        <h2 className="text-lg font-bold text-slate-900">
          {patient.firstName} {patient.lastName}
        </h2>
        <p className="mt-0.5 text-xs font-semibold text-slate-500">
          MRN: {patient.medicalRecordNumber} · {age} yrs · <span className="capitalize">{patient.sex}</span>
        </p>
      </div>
    </Card>
  )
}

export function DiagnosisCard({
  disease = 'Awaiting Analysis',
  confidence = 0,
  risk = 'low',

}: {
  disease?: string
  confidence?: number
  risk?: 'low' | 'moderate' | 'high'
}) {
  const badgeVariant = risk === 'high' ? 'danger' : risk === 'moderate' ? 'warning' : 'success'

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <FileCheck2 className="h-4 w-4 text-brand-700" />
          AI Diagnostic Impression
        </p>
        <Badge variant={badgeVariant} pulse>
          {risk} risk
        </Badge>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">{disease}</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {confidence}% Neural Net Confidence
          </p>
        </div>
      </div>
    </Card>
  )
}

export function RecommendationList() {
  const items = [
    'Review reported clinical symptoms and medical history alongside AI inference.',
    'Consider spirometry or echocardiography to evaluate physiological obstruction.',
    'Schedule a follow-up review within two weeks or as symptoms dictate.',
  ]

  return (
    <Card>
      <h2 className="font-bold text-slate-900 text-sm mb-3">Clinical Care Recommendations</h2>
      <ul className="space-y-2.5">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-2.5 text-xs font-medium text-slate-700">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-600 mt-0.5" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export function AudioPlayerCompact() {
  const [isPlaying, setIsPlaying] = useState(false)

  return (
    <Card>
      <div className="flex items-center gap-3">
        <Button
          variant="primary"
          onClick={() => setIsPlaying(!isPlaying)}
          className="h-10 w-10 p-0 rounded-full shrink-0 shadow-xs"
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span className="flex items-center gap-1">
              <Volume2 className="h-3.5 w-3.5 text-brand-700" /> Auscultation Track
            </span>
            <span className="font-mono text-slate-400">00:20</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full bg-brand-600 transition-all duration-300 ${
                isPlaying ? 'w-2/3' : 'w-1/3'
              }`}
            />
          </div>
        </div>
      </div>
    </Card>
  )
}
