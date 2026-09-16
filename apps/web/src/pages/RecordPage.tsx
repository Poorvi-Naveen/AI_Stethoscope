import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, User, Mic } from 'lucide-react'
import {
  patientFormSchema,
  PatientForm,
  emptyPatientForm,
  type PatientFormValues,
} from '../components/patients/PatientForm'
import { AudioUploadCard } from '../components/recording/AudioUploadCard'
import { MedicalDetailsSection, type MedicalDetails } from '../components/recording/MedicalDetailsSection'
import { RecordAudio } from '../components/recording/RecordAudio'
import { createPatient } from '../api/patients'
import { createRecording } from '../api/recordings'
import { PageHeader, Card, Button, useToast } from '../components/ui'

export function RecordPage() {
  const [patient, setPatient] = useState<PatientFormValues>(emptyPatientForm)
  const [medical, setMedical] = useState<MedicalDetails>({ symptoms: [], additionalNotes: '' })
  const [file, setFile] = useState<File | null>(null)
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null)
  const [errors, setErrors] = useState<Partial<Record<keyof PatientFormValues, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const navigate = useNavigate()
  const { showToast } = useToast()

  const audio = file ?? recordedAudio
  const isReady = patientFormSchema.safeParse(patient).success && Boolean(audio)

  const analyze = async (event: FormEvent) => {
    event.preventDefault()
    const parsed = patientFormSchema.safeParse(patient)

    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])
        )
      )
      showToast('Please fill all required patient details.', 'error')
      return
    }

    if (!audio) {
      showToast('Please record or upload an auscultation audio file.', 'warning')
      return
    }

    setIsSubmitting(true)
    try {
      showToast('Creating patient record & processing audio...', 'info')
      const created = await createPatient(parsed.data)
      await createRecording(created.id, audio)

      navigate(`/patients/${created.id}/analysis`, {
        state: { patientData: parsed.data, medicalDetails: medical },
      })
    } catch {
      showToast('Failed to start analysis session.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={analyze} className="space-y-6">
      <PageHeader
        title="New Patient & Auscultation Recording"
        subtitle="Register patient demographics, capture or upload stethoscope audio, then trigger neural network analysis."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Left Column: Demographics & Symptoms */}
        <div className="space-y-6">
          <Card>
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <User className="h-4 w-4 text-brand-700" />
              <h2 className="font-bold text-slate-900 text-sm">Patient Demographics</h2>
            </div>
            <PatientForm value={patient} errors={errors} onChange={setPatient} />
          </Card>

          <MedicalDetailsSection value={medical} onChange={setMedical} />
        </div>

        {/* Right Column: Audio Capture / Upload */}
        <div className="space-y-6">
          <Card>
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <Mic className="h-4 w-4 text-brand-700" />
              <h2 className="font-bold text-slate-900 text-sm">Audio Acquisition</h2>
            </div>
            <div className="space-y-6">
              <RecordAudio
                audio={recordedAudio}
                onAudioChange={(blob) => {
                  setRecordedAudio(blob)
                  if (blob) setFile(null)
                }}
              />

              <div className="relative text-center text-xs text-slate-400 before:absolute before:left-0 before:top-1/2 before:h-px before:w-full before:bg-slate-200">
                <span className="relative bg-white px-3 font-semibold uppercase tracking-wider text-slate-400">
                  OR UPLOAD FILE
                </span>
              </div>

              <AudioUploadCard
                file={file}
                onFileChange={(selected) => {
                  setFile(selected)
                  if (selected) setRecordedAudio(null)
                }}
              />
            </div>
          </Card>
        </div>
      </div>

      {/* Footer Action */}
      <div className="flex flex-col items-end pt-4 border-t border-slate-200">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={!isReady}
          isLoading={isSubmitting}
          iconRight={<Sparkles className="h-4 w-4" />}
        >
          Run AI Acoustic Analysis
        </Button>
        {!isReady && (
          <p className="mt-2 text-xs font-medium text-slate-500">
            Complete required patient fields (First Name, Last Name, Age) and record/upload an audio track to activate analysis.
          </p>
        )}
      </div>
    </form>
  )
}
