import { Link, useParams } from 'react-router-dom'
import { Plus, Mic, FileText, Calendar, Phone, Mail, Activity, ArrowLeft } from 'lucide-react'
import { getPatient, patientDiagnoses, patientRecordings, recordingPrediction } from '../mocks'
import { PageHeader, Card, Button, Badge } from '../components/ui'

export function PatientDetailPage() {
  const { id } = useParams()
  const patient = getPatient(id ?? '')

  if (!patient) {
    return (
      <Card className="max-w-md mx-auto text-center py-12">
        <h1 className="text-xl font-bold text-slate-900">Patient Profile Not Found</h1>
        <p className="mt-2 text-sm text-slate-500">
          The requested patient ID does not match any record in our database.
        </p>
        <Link to="/patients" className="mt-6 inline-block">
          <Button variant="outline" icon={<ArrowLeft className="h-4 w-4" />}>
            Back to Patients List
          </Button>
        </Link>
      </Card>
    )
  }

  const recordings = patientRecordings(patient.id)
  const diagnoses = patientDiagnoses(patient.id)
  const age = new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()

  return (
    <div className="space-y-6">
      <PageHeader
        backTo="/patients"
        backLabel="All Patients"
        title={`${patient.firstName} ${patient.lastName}`}
        subtitle={`MRN: ${patient.medicalRecordNumber} · ${age} years old · ${patient.sex.toUpperCase()} · Born ${new Date(patient.dateOfBirth).toLocaleDateString()}`}
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
                <h2 className="font-bold text-slate-900 text-sm">Auscultation Tracks & Inference</h2>
              </div>
              <Badge variant="brand">{recordings.length} Recordings</Badge>
            </div>

            <div className="divide-y divide-slate-100">
              {recordings.map((recording) => {
                const prediction = recordingPrediction(recording.id)
                const isFlagged = prediction?.label === 'murmur' || prediction?.label === 'abnormal'

                return (
                  <div key={recording.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 capitalize">
                          {recording.auscultationSite} Site
                        </span>
                        <span className="text-xs text-slate-400 font-mono">({recording.deviceName || 'StethAI device'})</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(recording.recordedAt).toLocaleString()} · Duration {recording.durationSeconds}s
                      </p>
                    </div>

                    <div className="flex items-center gap-3 sm:text-right">
                      {prediction ? (
                        <div>
                          <Badge variant={isFlagged ? 'warning' : 'success'} pulse={isFlagged}>
                            {prediction.label.toUpperCase()} ({Math.round(prediction.confidence * 100)}%)
                          </Badge>
                          <p className="mt-1 text-[11px] text-slate-400 font-mono">
                            Model: {prediction.modelName} v{prediction.modelVersion}
                          </p>
                        </div>
                      ) : (
                        <Badge variant="neutral">{recording.status}</Badge>
                      )}

                      <Link to={`/reports/${patient.id}`}>
                        <Button variant="outline" size="sm" icon={<FileText className="h-3.5 w-3.5" />}>
                          Report
                        </Button>
                      </Link>
                    </div>
                  </div>
                )
              })}

              {recordings.length === 0 && (
                <p className="py-6 text-center text-xs text-slate-500">
                  No stethoscope recordings captured for this patient yet.
                </p>
              )}
            </div>
          </Card>
        </div>

        {/* Right Sidebar: Patient Metadata & Diagnoses */}
        <div className="space-y-6">
          <Card>
            <h2 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3 mb-3">
              Patient Contact Info
            </h2>
            <div className="space-y-2.5 text-xs text-slate-600 font-medium">
              <div className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-brand-600 shrink-0" />
                <span>{patient.phone || 'No phone registered'}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-brand-600 shrink-0" />
                <span>{patient.email || 'No email registered'}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Calendar className="h-4 w-4 text-brand-600 shrink-0" />
                <span>Registered: {new Date(patient.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2">
                Clinical Notes
              </h3>
              <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed">
                {patient.notes || 'No patient clinical notes recorded.'}
              </p>
            </div>
          </Card>

          <Card>
            <h2 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3 mb-3">
              Logged Diagnoses
            </h2>
            <div className="space-y-3">
              {diagnoses.map((diagnosis) => (
                <div key={diagnosis.id} className="rounded-xl bg-slate-50 p-3.5 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-900">{diagnosis.name}</p>
                    <Badge variant={diagnosis.status === 'confirmed' ? 'success' : 'warning'}>
                      {diagnosis.status}
                    </Badge>
                  </div>
                  {diagnosis.code && (
                    <p className="mt-1 text-[11px] font-mono text-slate-500">ICD Code: {diagnosis.code}</p>
                  )}
                  {diagnosis.clinicalNotes && (
                    <p className="mt-2 text-xs text-slate-600 border-t border-slate-200/60 pt-2">
                      {diagnosis.clinicalNotes}
                    </p>
                  )}
                </div>
              ))}

              {diagnoses.length === 0 && (
                <p className="text-xs text-slate-500">No diagnoses logged.</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
