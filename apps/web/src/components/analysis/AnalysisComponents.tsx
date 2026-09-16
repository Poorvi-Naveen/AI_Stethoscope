import { useState, useEffect } from 'react'
import { Play, Pause, Check, Activity, ShieldAlert, Sparkles, Volume2 } from 'lucide-react'
import { Card, Badge, Button } from '../ui'

export type AnalysisResponse = {
  prediction: string
  confidence: number
  riskLevel: 'low' | 'moderate' | 'high'
  probabilities: Record<string, number>
  detectedFeatures: string[]
}

export function AnalysisStepList({ step, progress = 94 }: { step: number; progress?: number }) {
  const names = [
    'Preprocessing Audio',
    'Extracting Features (MFCC)',
    'Removing Noise',
    'Running AI Model',
    'Generating Prediction',
  ]

  return (
    <Card className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Activity className="h-4 w-4 text-brand-600" />
          Processing Pipeline
        </h2>
        <Badge variant={step >= 5 ? 'success' : 'brand'} pulse={step < 5}>
          {step >= 5 ? 'Complete' : 'In Progress'}
        </Badge>
      </div>

      <ol className="space-y-4">
        {names.map((name, index) => {
          const isDone = index < step
          const isCurrent = index === step

          return (
            <li key={name} className="flex items-center gap-3 text-sm">
              <span
                className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold transition-all duration-300 ${
                  isDone
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : isCurrent
                    ? 'border-2 border-brand-600 bg-brand-50 text-brand-700 animate-pulse'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {isDone ? <Check className="h-4 w-4 stroke-[3]" /> : index + 1}
              </span>
              <span
                className={`font-semibold ${
                  isDone
                    ? 'text-slate-900'
                    : isCurrent
                    ? 'text-brand-800'
                    : 'text-slate-400'
                }`}
              >
                {name}
              </span>
            </li>
          )
        })}
      </ol>

      {/* Progress Bar */}
      <div className="pt-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1.5">
          <span>Overall Confidence</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-600 to-teal-400 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </Card>
  )
}

export function AudioWaveformPlayer({ audioUrl }: { audioUrl?: string }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackTime, setPlaybackTime] = useState(0)
  const duration = 12

  useEffect(() => {
    let interval: number | undefined
    if (isPlaying) {
      interval = window.setInterval(() => {
        setPlaybackTime((prev) => {
          if (prev >= duration) {
            setIsPlaying(false)
            return 0
          }
          return prev + 1
        })
      }, 1000)
    }
    return () => window.clearInterval(interval)
  }, [isPlaying, duration])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Card className="bg-gradient-to-br from-white via-slate-50 to-brand-50/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-brand-700" />
          <h2 className="font-bold text-slate-800 text-sm">Auscultation Audio Visualizer</h2>
        </div>
        <span className="text-xs font-mono font-semibold text-slate-500">
          {formatTime(playbackTime)} / {formatTime(duration)}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <Button
          variant="primary"
          onClick={() => setIsPlaying(!isPlaying)}
          aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
          className="rounded-full h-11 w-11 p-0 shrink-0 shadow-md"
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
        </Button>

        {/* Waveform graphic */}
        <div className="flex h-14 flex-1 items-center gap-1.5 overflow-hidden rounded-xl bg-slate-900/90 px-4 shadow-inner">
          {Array.from({ length: 48 }, (_, index) => {
            const heightPercentage = Math.max(15, (index * 17 + (isPlaying ? playbackTime * 13 : 0)) % 100)
            const active = (index / 48) * duration <= playbackTime
            return (
              <span
                key={index}
                className={`w-1 rounded-full transition-all duration-200 ${
                  active
                    ? 'bg-gradient-to-t from-brand-400 to-teal-300 shadow-xs'
                    : 'bg-slate-700 hover:bg-slate-500'
                }`}
                style={{ height: `${heightPercentage}%` }}
              />
            )
          })}
        </div>
      </div>
    </Card>
  )
}

export function PredictionCard({ result }: { result: AnalysisResponse }) {
  const badgeVariants = {
    high: 'danger' as const,
    moderate: 'warning' as const,
    low: 'success' as const,
  }

  return (
    <Card className="flex flex-col justify-between border-slate-200 shadow-sm hover:shadow-md transition">
      <div>
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">AI Diagnostic Output</p>
          <Sparkles className="h-4 w-4 text-brand-600" />
        </div>
        <h2 className="mt-3 text-3xl font-black text-slate-900 tracking-tight">{result.prediction}</h2>
      </div>

      <div className="mt-6 flex items-end justify-between border-t border-slate-100 pt-4">
        <div>
          <p className="text-xs font-semibold text-slate-400">Model Confidence</p>
          <p className="text-2xl font-bold text-slate-900">{result.confidence}%</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold text-slate-400 mb-1">Assessed Risk</p>
          <Badge variant={badgeVariants[result.riskLevel]} pulse>
            {result.riskLevel} Risk
          </Badge>
        </div>
      </div>
    </Card>
  )
}

export function ProbabilityBreakdown({ probabilities }: Pick<AnalysisResponse, 'probabilities'>) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <h2 className="font-bold text-slate-900 text-sm">Differential Probability</h2>
      <div className="mt-4 space-y-3">
        {Object.entries(probabilities).map(([name, value]) => (
          <div key={name} className="flex items-center gap-3">
            <span className="w-20 text-xs font-semibold capitalize text-slate-700">{name}</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-brand-600 transition-all duration-700"
                style={{ width: `${value}%` }}
              />
            </div>
            <span className="w-9 text-right text-xs font-mono font-bold text-slate-800">{value}%</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function ExplainabilitySection({
  prediction,
  features,
}: {
  prediction: string
  features: string[]
}) {
  return (
    <Card className="grid gap-6 md:grid-cols-3 md:items-center border-slate-200 bg-white">
      <div className="md:col-span-2 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-brand-600" />
          <h2 className="text-lg font-bold text-slate-900">Explainable AI Highlights: {prediction}</h2>
        </div>
        <p className="text-xs text-slate-500">Key acoustic feature vectors extracted from spectral analysis:</p>

        <div className="grid gap-2.5 sm:grid-cols-2 pt-2">
          {features.map((feature) => (
            <div key={feature} className="flex items-center gap-2.5 rounded-lg bg-slate-50 p-2.5 text-xs font-semibold text-slate-700 border border-slate-100">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                <Check className="h-3.5 w-3.5 stroke-[3]" />
              </span>
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center border-t border-slate-100 pt-4 md:border-t-0 md:pt-0">
        <LungIllustration />
      </div>
    </Card>
  )
}

export function LungIllustration() {
  return (
    <div className="relative grid place-items-center">
      <svg viewBox="0 0 240 150" className="h-36 w-full max-w-xs drop-shadow-sm" aria-label="Lung illustration">
        <path
          d="M118 35v78M114 40C85 30 60 51 58 94c-1 29 20 39 42 24 12-8 18-24 18-43M122 40c29-10 54 11 56 54 1 29-20 39-42 24-12-8-18-24-18-43"
          fill="#f0fdfa"
          stroke="#0f766e"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}