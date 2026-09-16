import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Eye, Download, User, Calendar, Filter } from 'lucide-react'
import { PageHeader, Card, Input, Select, Badge, Button, useToast } from '../components/ui'
import { patients, predictions, recordings } from '../mocks'

const historyGroups = [
  {
    dateLabel: 'Today - 30 July 2026',
    records: [
      { id: 'rec-101', patientId: 'pat-001', name: 'Maya Shah', disease: 'Mitral Regurgitation', confidence: 94, time: '10:05 AM', risk: 'high' },
      { id: 'rec-105', patientId: 'pat-004', name: 'Rohan Kapoor', disease: 'Pediatric Normal', confidence: 89, time: '07:00 AM', risk: 'low' },
    ],
  },
  {
    dateLabel: 'Earlier This Week - 28 July 2026',
    records: [
      { id: 'rec-102', patientId: 'pat-001', name: 'Maya Shah', disease: 'Healthy Aortic', confidence: 88, time: '10:08 AM', risk: 'low' },
      { id: 'rec-103', patientId: 'pat-002', name: 'Arjun Mehta', disease: 'Cardiac Murmur', confidence: 81, time: '08:30 AM', risk: 'high' },
    ],
  },
  {
    dateLabel: '25 July 2026',
    records: [
      { id: 'rec-104', patientId: 'pat-003', name: "Sofia D'Souza", disease: 'Normal Pulmonic', confidence: 97, time: '03:15 PM', risk: 'low' },
    ],
  },
]

export function HistoryPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDisease, setSelectedDisease] = useState('All')
  const { showToast } = useToast()

  const downloadSummary = (patientName: string) => {
    showToast(`Downloading historical screening file for ${patientName}...`, 'info')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Screening History Audit Log"
        subtitle="Historical timeline of all processed auscultations and inference results."
        action={
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={selectedDisease}
              onChange={(e) => setSelectedDisease(e.target.value)}
              className="h-10 text-xs font-semibold"
            >
              <option value="All">All Diagnoses</option>
              <option value="Mitral">Mitral Regurgitation</option>
              <option value="Murmur">Cardiac Murmur</option>
              <option value="Healthy">Healthy / Normal</option>
            </Select>

            <Input
              placeholder="Search patient name..."
              leftIcon={<Search className="h-4 w-4" />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 sm:w-64"
            />
          </div>
        }
      />

      {/* History Timeline */}
      <div className="space-y-6">
        {historyGroups.map((group) => {
          const filteredRecords = group.records.filter((rec) => {
            const matchesName = rec.name.toLowerCase().includes(searchTerm.toLowerCase())
            const matchesDisease =
              selectedDisease === 'All' ||
              rec.disease.toLowerCase().includes(selectedDisease.toLowerCase())
            return matchesName && matchesDisease
          })

          if (filteredRecords.length === 0) return null

          return (
            <div key={group.dateLabel} className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-brand-600" />
                {group.dateLabel}
              </h3>

              <div className="space-y-3">
                {filteredRecords.map((record) => {
                  const badgeVariant =
                    record.risk === 'high'
                      ? 'danger'
                      : record.risk === 'moderate'
                      ? 'warning'
                      : 'success'

                  return (
                    <Card
                      key={record.id}
                      className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between hover:border-brand-200 transition"
                    >
                      {/* Patient Info */}
                      <div className="flex items-center gap-3.5 sm:w-1/3">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 font-bold text-xs">
                          {record.name.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{record.name}</p>
                          <p className="text-xs text-slate-500">Screening Time: {record.time}</p>
                        </div>
                      </div>

                      {/* Diagnostic & Confidence */}
                      <div className="flex items-center justify-between sm:w-1/3">
                        <div>
                          <Badge variant={badgeVariant} pulse={record.risk === 'high'}>
                            {record.disease}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-mono font-bold text-slate-800">
                            {record.confidence}%
                          </p>
                          <p className="text-[10px] text-slate-400">Model Score</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-2 sm:w-1/3">
                        <Link to={`/reports/${record.patientId}`}>
                          <Button variant="ghost" size="sm" icon={<Eye className="h-4 w-4" />}>
                            View Report
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadSummary(record.name)}
                          icon={<Download className="h-4 w-4" />}
                        />
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}