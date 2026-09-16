import { Link } from 'react-router-dom'
import { FileText, Calendar, ChevronRight, Filter } from 'lucide-react'
import { PageHeader, Card, Badge, Button } from '../components/ui'
import { patients, predictions, recordings } from '../mocks'

export function ReportsPage() {
  const reports = patients.map((patient) => {
    const patientRecs = recordings.filter((r) => r.patientId === patient.id)
    const latestRec = patientRecs[0]
    const pred = latestRec ? predictions.find((p) => p.recordingId === latestRec.id) : null

    const diseaseLabel = pred?.label === 'murmur' ? 'Mitral Regurgitation' : pred?.label === 'abnormal' ? 'Airway Obstruction' : 'Healthy Normal'
    const riskLevel: 'low' | 'moderate' | 'high' = pred?.label === 'murmur' ? 'high' : pred?.label === 'abnormal' ? 'moderate' : 'low'

    return {
      id: patient.id,
      patientName: `${patient.firstName} ${patient.lastName}`,
      mrn: patient.medicalRecordNumber,
      date: latestRec ? new Date(latestRec.recordedAt).toISOString().split('T')[0] : '2026-07-28',
      disease: diseaseLabel,
      risk: riskLevel,
    }
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clinical Diagnostic Reports"
        subtitle="Access, inspect, print, and export AI-assisted clinical findings for patient consultations."
      />

      <div className="space-y-4">
        {reports.map((report) => {
          const badgeVariant =
            report.risk === 'high' ? 'danger' : report.risk === 'moderate' ? 'warning' : 'success'

          return (
            <Card
              key={report.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-brand-200 transition"
            >
              <div className="flex items-center gap-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 font-bold">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-sm sm:text-base">
                    {report.patientName}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500 flex items-center gap-2">
                    <span>MRN: {report.mrn}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Analyzed on {report.date}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-6 pt-3 border-t border-slate-100 sm:border-t-0 sm:pt-0">
                <div className="text-left sm:text-right">
                  <p className="text-xs font-bold text-slate-900">{report.disease}</p>
                  <Badge variant={badgeVariant} pulse={report.risk !== 'low'} className="mt-1">
                    {report.risk.toUpperCase()} RISK
                  </Badge>
                </div>

                <Link to={`/reports/${report.id}`}>
                  <Button variant="outline" size="sm" iconRight={<ChevronRight className="h-4 w-4" />}>
                    View Report
                  </Button>
                </Link>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}