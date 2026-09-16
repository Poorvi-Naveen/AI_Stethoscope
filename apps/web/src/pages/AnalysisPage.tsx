import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FileText, Sparkles } from 'lucide-react'
import {
  AnalysisStepList,
  AudioWaveformPlayer,
  ExplainabilitySection,
  PredictionCard,
  ProbabilityBreakdown,
  type AnalysisResponse,
} from '../components/analysis/AnalysisComponents'
import { PageHeader, Button } from '../components/ui'
import { predictions } from '../mocks/data'

export function AnalysisPage() {
  const { id } = useParams()
  const [step, setStep] = useState(1)
  const ready = step >= 5

  useEffect(() => {
    if (step >= 5) return
    const timer = window.setTimeout(() => setStep((current) => current + 1), 1000)
    return () => window.clearTimeout(timer)
  }, [step])

  // Get prediction from store, or fallback to latest
  const predData = predictions.find((p) => p.recordingId === id) || predictions[0]

  const response: AnalysisResponse = {
    prediction: predData?.label === 'murmur' ? 'Murmur Detected' : 'Normal Heart Sound',
    confidence: predData ? Math.round(predData.confidence * 100) : 95,
    riskLevel: predData?.label === 'murmur' ? 'high' : 'low',
    probabilities: predData ? {
      normal: Math.round(predData.probabilities.normal * 100),
      murmur: Math.round(predData.probabilities.murmur * 100),
    } : { normal: 95, murmur: 5 },
    detectedFeatures: predData?.label === 'murmur' ? [
      'Systolic ejection murmur',
      'High-frequency mid-pitched elements',
      'Abnormal S1/S2 intervals',
    ] : [
      'Normal S1 and S2 sounds',
      'Clear systolic and diastolic intervals',
      'No added sounds',
    ],
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={ready ? 'Auscultation Analysis Complete' : 'AI Processing Pipeline Running...'}
        subtitle={
          ready
            ? 'Neural network analysis finished. Review diagnostic impression and differential probabilities.'
            : 'Extracting audio feature matrices and calculating classification confidence.'
        }
        action={
          ready ? (
            <Link to={`/reports/${id || 'pat-001'}`}>
              <Button variant="primary" icon={<FileText className="h-4 w-4" />}>
                Open Clinical Report
              </Button>
            </Link>
          ) : (
            <div className="flex items-center gap-2 rounded-full bg-brand-50 px-3.5 py-1.5 text-xs font-semibold text-brand-800 border border-brand-200">
              <Sparkles className="h-3.5 w-3.5 animate-spin text-brand-600" />
              <span>Inferring Acoustic Vectors</span>
            </div>
          )
        }
      />

      {/* Main Grid Layout */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Stepper Side */}
        <div className="lg:col-span-4">
          <AnalysisStepList step={step} progress={ready ? 100 : step * 20} />
        </div>

        {/* Player & Results Side */}
        <div className="space-y-6 lg:col-span-8">
          <AudioWaveformPlayer />

          <div className="grid gap-6 sm:grid-cols-2">
            <PredictionCard result={response} />
            <ProbabilityBreakdown probabilities={response.probabilities} />
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <ExplainabilitySection
        prediction={response.prediction}
        features={response.detectedFeatures}
      />
    </div>
  )
}