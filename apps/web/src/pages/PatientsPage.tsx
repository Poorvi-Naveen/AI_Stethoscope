import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Plus, User, Mic, FileText, ChevronRight } from 'lucide-react'
import { patientDiagnoses, patientRecordings, patients } from '../mocks'
import { PageHeader, Card, Input, Button, Badge } from '../components/ui'

export function PatientsPage() {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredPatients = patients.filter((patient) => {
    const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase()
    const mrn = patient.medicalRecordNumber.toLowerCase()
    const term = searchTerm.toLowerCase()
    return fullName.includes(term) || mrn.includes(term)
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patient Directory"
        subtitle="Search, manage, and review active clinical records and screening histories."
        action={
          <Link to="/record">
            <Button variant="primary" icon={<Plus className="h-4 w-4" />}>
              Add Patient & Record
            </Button>
          </Link>
        }
      />

      {/* Filter bar */}
      <div className="flex items-center gap-4 max-w-md">
        <Input
          placeholder="Search by patient name or MRN..."
          leftIcon={<Search className="h-4 w-4" />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Patients Table Card */}
      <Card className="overflow-hidden p-0 border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3.5">Patient Name</th>
                <th className="px-6 py-3.5">MRN ID</th>
                <th className="px-6 py-3.5">Demographics</th>
                <th className="px-6 py-3.5">Recordings</th>
                <th className="px-6 py-3.5">Latest Clinical Diagnosis</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredPatients.map((patient) => {
                const diagnosis = patientDiagnoses(patient.id)[0]
                const recordingCount = patientRecordings(patient.id).length
                const age = new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()

                return (
                  <tr key={patient.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <Link
                        className="font-bold text-slate-900 hover:text-brand-700 transition"
                        to={`/patients/${patient.id}`}
                      >
                        {patient.firstName} {patient.lastName}
                      </Link>
                      <p className="text-xs text-slate-500">{patient.email || 'No email registered'}</p>
                    </td>

                    <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-600">
                      {patient.medicalRecordNumber}
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-600 capitalize">
                      {age} yrs · {patient.sex}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-slate-700">
                        <Mic className="h-3.5 w-3.5 text-brand-600" />
                        <span>{recordingCount} tracks</span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {diagnosis ? (
                        <Badge variant={diagnosis.status === 'confirmed' ? 'success' : 'warning'}>
                          {diagnosis.name}
                        </Badge>
                      ) : (
                        <span className="text-xs text-slate-400">No diagnosis logged</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <Link to={`/patients/${patient.id}`}>
                        <Button variant="ghost" size="sm" iconRight={<ChevronRight className="h-4 w-4" />}>
                          Details
                        </Button>
                      </Link>
                    </td>
                  </tr>
                )
              })}

              {filteredPatients.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-slate-500">
                    No matching patient records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
