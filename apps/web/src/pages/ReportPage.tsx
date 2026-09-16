import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { jsPDF } from 'jspdf'
import { Printer, Share2, Download, Save, ShieldCheck, FileEdit } from 'lucide-react'
import { getPatient, patientRecordings, recordingPrediction } from '../mocks'
import {
  AudioPlayerCompact,
  DiagnosisCard,
  PatientSummaryCard,
  RecommendationList,
} from '../components/report/ReportComponents'
import { PageHeader, Card, Button, Textarea, Badge, useToast } from '../components/ui'

export function ReportPage() {
  const { id } = useParams()
  const { showToast } = useToast()

  const patient = getPatient(id ?? '') ?? getPatient('pat-001')!
  const recordingsForPatient = patientRecordings(patient.id)
  const latestRecording = recordingsForPatient[0]
  const predictionData = latestRecording ? recordingPrediction(latestRecording.id) : null

  const disease = predictionData?.label === 'murmur' ? 'Murmur Detected' : 'Normal Heart Sound'
  const confidence = predictionData ? Math.round(predictionData.confidence * 100) : 95
  const risk = predictionData?.label === 'murmur' ? 'high' : 'low'

  const [notes, setNotes] = useState(
    'Discussed findings with patient. Recommend spirometry assessment, acoustic follow-up, and clinical re-evaluation within two weeks.'
  )
  const [status, setStatus] = useState<'Saved' | 'Unsaved'>('Saved')

  const saveNotes = () => {
    setStatus('Saved')
    showToast('Clinician notes saved to patient record.', 'success')
  }

  const exportPdf = () => {
    const doc = new jsPDF()
    doc.setFontSize(22)
    doc.text('StethAI Diagnostic Report', 20, 20)

    doc.setFontSize(12)
    doc.text(`Patient: ${patient.firstName} ${patient.lastName} (MRN: ${patient.medicalRecordNumber})`, 20, 36)
    doc.text(`AI Diagnostic Impression: ${disease}`, 20, 46)
    doc.text(`Confidence Score: ${confidence}%`, 20, 54)
    doc.text(`Assessed Risk Level: ${risk.charAt(0).toUpperCase() + risk.slice(1)}`, 20, 62)

    doc.text('Clinician Notes:', 20, 76)
    doc.text(notes, 20, 84, { maxWidth: 170 })

    doc.save(`stethai-report-${patient.id}.pdf`)
    showToast('Downloaded PDF clinical report.', 'success')
  }

  const shareReport = async () => {
    const link = `${window.location.origin}/reports/${patient.id}`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'StethAI Diagnostic Report', url: link })
      } catch {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(link)
      showToast('Report link copied to clipboard.', 'info')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        backTo="/reports"
        backLabel="All Reports"
        title="Clinical Diagnostic Report"
        subtitle={`Generated for ${patient.firstName} ${patient.lastName} (${patient.medicalRecordNumber})`}
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="md"
              onClick={() => window.print()}
              icon={<Printer className="h-4 w-4" />}
            >
              Print
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={shareReport}
              icon={<Share2 className="h-4 w-4" />}
            >
              Share
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={exportPdf}
              icon={<Download className="h-4 w-4" />}
            >
              Download PDF
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main 2 Columns */}
        <div className="space-y-6 lg:col-span-2">
          <PatientSummaryCard patient={patient} />
          <DiagnosisCard disease={disease} confidence={confidence} risk={risk as 'low' | 'moderate' | 'high'} />
          <RecommendationList />

          <Card>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <FileEdit className="h-4 w-4 text-brand-700" />
                Attending Doctor Observations
              </h2>
              <Badge variant={status === 'Saved' ? 'success' : 'warning'}>{status}</Badge>
            </div>

            <Textarea
              rows={6}
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value)
                setStatus('Unsaved')
              }}
              helperText="Notes are automatically attached to PDF exports and saved to patient electronic records."
            />

            <div className="mt-4 flex justify-end">
              <Button
                variant="primary"
                onClick={saveNotes}
                icon={<Save className="h-4 w-4" />}
              >
                Save Notes
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          <AudioPlayerCompact />

          <Card className="space-y-3 bg-gradient-to-br from-white to-brand-50/30">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-sm">Report Validation</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              This report contains AI inference outputs. All predictions must be validated by a licensed physician before clinical decision-making.
            </p>
            <div className="pt-2 border-t border-slate-100 text-[11px] font-mono text-slate-400">
              Audit ID: SHA256-RPT-{(Math.random() * 1000000).toFixed(0)}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

