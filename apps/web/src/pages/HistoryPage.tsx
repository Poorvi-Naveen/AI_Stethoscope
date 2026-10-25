import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Search, Eye, Download, Calendar, Mic, Loader2, Plus, History } from 'lucide-react'
import { PageHeader, Card, Input, Select, Badge, Button, useToast } from '../components/ui'
import { supabase } from '../api/supabaseClient'
import type { RootState } from '../store'

interface HistoryItem {
  id: string
  patientId: string
  patientName: string
  mrn: string
  soundType: string
  confidence: number
  risk: 'high' | 'moderate' | 'low'
  diseaseLabel: string
  createdAt: string
  time: string
  dateLabel: string
  storagePath?: string | null
  notes?: string | null
}

function formatDateHeader(dateStr: string): string {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  const dateOptions: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }

  if (d.toDateString() === today.toDateString()) {
    return `Today - ${d.toLocaleDateString(undefined, dateOptions)}`
  }
  if (d.toDateString() === yesterday.toDateString()) {
    return `Yesterday - ${d.toLocaleDateString(undefined, dateOptions)}`
  }
  return d.toLocaleDateString(undefined, dateOptions)
}

export function HistoryPage() {
  const user = useSelector((state: RootState) => state.auth.user)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDisease, setSelectedDisease] = useState('All')
  const [reports, setReports] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const { showToast } = useToast()

  useEffect(() => {
    let isMounted = true

    async function loadScreeningHistory() {
      setLoading(true)
      try {
        let currentUserId = user?.id
        if (!currentUserId) {
          const { data: { user: authUser } } = await supabase.auth.getUser()
          currentUserId = authUser?.id
        }

        if (!currentUserId) {
          if (isMounted) setLoading(false)
          return
        }

        const { data, error } = await supabase
          .from('reports')
          .select('*, patients(*)')
          .eq('user_id', currentUserId)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching screening history:', error)
          if (isMounted) setLoading(false)
          return
        }

        const mapped: HistoryItem[] = (data || []).map((row: any) => {
          const patient = row.patients || {}
          const firstName = patient.first_name || 'Patient'
          const lastName = patient.last_name || ''
          const patientId = row.patient_id || patient.id || 'unknown'
          const patientName = `${firstName} ${lastName}`.trim() || 'Patient'
          const createdDate = row.created_at ? new Date(row.created_at) : new Date()

          const soundType = (row.sound_type || 'normal').toLowerCase()
          let diseaseLabel = 'Healthy Normal'
          let risk: 'high' | 'moderate' | 'low' = 'low'

          if (soundType === 'murmur') {
            diseaseLabel = 'Cardiac Murmur'
            risk = 'high'
          } else if (soundType === 'abnormal') {
            diseaseLabel = 'Abnormal Acoustic Signal'
            risk = 'moderate'
          }

          const confidence = row.prediction_confidence
            ? Math.round(row.prediction_confidence * 100)
            : 95

          return {
            id: row.id,
            patientId,
            patientName,
            mrn: `MRN-${patientId.substring(0, 5).toUpperCase()}`,
            soundType,
            confidence,
            risk,
            diseaseLabel,
            createdAt: row.created_at || new Date().toISOString(),
            time: createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            dateLabel: formatDateHeader(row.created_at || new Date().toISOString()),
            storagePath: row.storage_path,
            notes: row.notes,
          }
        })

        if (isMounted) {
          setReports(mapped)
        }
      } catch (err) {
        console.error('Error in loadScreeningHistory:', err)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadScreeningHistory()

    return () => {
      isMounted = false
    }
  }, [user?.id])

  // Filter items based on search and diagnosis selection
  const filteredReports = useMemo(() => {
    return reports.filter((rec) => {
      const matchesSearch =
        rec.patientName.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        rec.mrn.toLowerCase().includes(searchTerm.toLowerCase().trim())

      let matchesFilter = true
      if (selectedDisease === 'Murmur') {
        matchesFilter = rec.soundType === 'murmur'
      } else if (selectedDisease === 'Healthy') {
        matchesFilter = rec.soundType === 'normal'
      } else if (selectedDisease === 'Abnormal') {
        matchesFilter = rec.soundType === 'abnormal'
      }

      return matchesSearch && matchesFilter
    })
  }, [reports, searchTerm, selectedDisease])

  // Group filtered reports by date header
  const historyGroups = useMemo(() => {
    const groups: { dateLabel: string; records: HistoryItem[] }[] = []
    const groupMap = new Map<string, HistoryItem[]>()

    for (const item of filteredReports) {
      if (!groupMap.has(item.dateLabel)) {
        groupMap.set(item.dateLabel, [])
        groups.push({ dateLabel: item.dateLabel, records: groupMap.get(item.dateLabel)! })
      }
      groupMap.get(item.dateLabel)!.push(item)
    }

    return groups
  }, [filteredReports])

  const downloadSummary = (record: HistoryItem) => {
    const summary = [
      `STETHAI CLINICAL SCREENING AUDIT LOG`,
      `===================================`,
      `Record ID: ${record.id}`,
      `Screening Timestamp: ${record.dateLabel} at ${record.time}`,
      `Patient Name: ${record.patientName}`,
      `Medical Record Number: ${record.mrn}`,
      `AI Finding: ${record.diseaseLabel}`,
      `Sound Category: ${record.soundType.toUpperCase()}`,
      `Model Confidence Score: ${record.confidence}%`,
      `Risk Assessment: ${record.risk.toUpperCase()}`,
      `Storage Path: ${record.storagePath || 'Live analysis stream'}`,
      `Clinician Notes: ${record.notes || 'None recorded'}`,
      `Generated by: StethAI Clinical Workspace`,
    ].join('\n')

    const blob = new Blob([summary], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `screening-audit-${record.patientName.replace(/\s+/g, '_')}-${record.id.slice(0, 8)}.txt`
    anchor.click()
    URL.revokeObjectURL(url)
    showToast(`Audit log exported for ${record.patientName}.`, 'success')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Screening History Audit Log"
        subtitle="Historical timeline of all processed auscultations and inference results from your clinical workspace."
        action={
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={selectedDisease}
              onChange={(e) => setSelectedDisease(e.target.value)}
              className="h-10 text-xs font-semibold"
            >
              <option value="All">All Findings</option>
              <option value="Murmur">Cardiac Murmur</option>
              <option value="Healthy">Healthy / Normal</option>
              <option value="Abnormal">Abnormal Signal</option>
            </Select>

            <Input
              placeholder="Search patient name or MRN..."
              leftIcon={<Search className="h-4 w-4" />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 sm:w-64"
            />
          </div>
        }
      />

      {/* Loading State */}
      {loading && (
        <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-brand-600" />
          <p className="text-sm font-medium">Loading screening audit history...</p>
        </div>
      )}

      {/* Empty State: No Screenings at all */}
      {!loading && reports.length === 0 && (
        <Card className="py-16 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-slate-100 text-slate-400 mb-3">
            <History className="h-7 w-7" />
          </div>
          <h2 className="text-base font-bold text-slate-900">No screening history found</h2>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            You haven't performed any auscultation screenings yet. Recorded heart sound analyses and AI inference audit trails will appear here automatically.
          </p>
          <Link to="/record" className="mt-4 inline-block">
            <Button variant="primary" size="sm" icon={<Plus className="h-4 w-4" />}>
              Record First Auscultation
            </Button>
          </Link>
        </Card>
      )}

      {/* Filtered Empty State */}
      {!loading && reports.length > 0 && historyGroups.length === 0 && (
        <Card className="py-12 text-center text-slate-500 text-sm">
          <p className="font-semibold text-slate-800">No matching screening records found</p>
          <p className="text-xs text-slate-400 mt-1">
            Try adjusting your search query or diagnosis filter.
          </p>
        </Card>
      )}

      {/* History Timeline */}
      {!loading && historyGroups.length > 0 && (
        <div className="space-y-6">
          {historyGroups.map((group) => (
            <div key={group.dateLabel} className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-brand-600" />
                {group.dateLabel}
              </h2>

              <div className="space-y-3">
                {group.records.map((record) => {
                  const badgeVariant =
                    record.risk === 'high'
                      ? 'danger'
                      : record.risk === 'moderate'
                      ? 'warning'
                      : 'success'

                  const initials = record.patientName
                    .split(/\s+/)
                    .filter(Boolean)
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase() || 'PT'

                  return (
                    <Card
                      key={record.id}
                      className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between hover:border-brand-200 transition"
                    >
                      {/* Patient Info */}
                      <div className="flex items-center gap-3.5 sm:w-1/3">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 font-bold text-xs">
                          {initials}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{record.patientName}</p>
                          <p className="text-xs text-slate-500">
                            {record.mrn} · Time: {record.time}
                          </p>
                        </div>
                      </div>

                      {/* Diagnostic & Confidence */}
                      <div className="flex items-center justify-between sm:w-1/3">
                        <div>
                          <Badge variant={badgeVariant} pulse={record.risk === 'high'}>
                            {record.diseaseLabel}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-mono font-bold text-slate-800">
                            {record.confidence}%
                          </p>
                          <p className="text-[10px] text-slate-400">Confidence</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-2 sm:w-1/3">
                        <Link to={`/reports/${record.id}`}>
                          <Button variant="ghost" size="sm" icon={<Eye className="h-4 w-4" />}>
                            View Report
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadSummary(record)}
                          icon={<Download className="h-4 w-4" />}
                          title="Download audit log"
                        />
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}