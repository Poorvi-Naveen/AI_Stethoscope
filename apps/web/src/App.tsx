import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { supabase } from './api/supabaseClient'
import { setSession, clearSession } from './store/authSlice'
import { AppLayout } from './components/AppLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PatientDetailPage } from './pages/PatientDetailPage'
import { PatientsPage } from './pages/PatientsPage'
import { RecordPage } from './pages/RecordPage'
import { SignupPage } from './pages/SignupPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { AnalysisPage } from './pages/AnalysisPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { ReportPage } from './pages/ReportPage'
import { ReportsPage } from './pages/ReportsPage'
import { HistoryPage } from './pages/HistoryPage'

export default function App() {
  const dispatch = useDispatch()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        dispatch(setSession({ 
          user: { id: session.user.id, name: session.user.email || '', email: session.user.email || '', role: 'doctor' }, 
          token: session.access_token 
        }))
      } else {
        dispatch(clearSession())
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        dispatch(setSession({ 
          user: { id: session.user.id, name: session.user.email || '', email: session.user.email || '', role: 'doctor' }, 
          token: session.access_token 
        }))
      } else {
        dispatch(clearSession())
      }
    })

    return () => subscription.unsubscribe()
  }, [dispatch])

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />

        <Route path="/patients" element={<PatientsPage />} />
        <Route path="/patients/:id" element={<PatientDetailPage />} />
        <Route path="/patients/:id/analysis" element={<AnalysisPage />} />

        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/reports/:id" element={<ReportPage />} />

        <Route path="/record" element={<RecordPage />} />
        <Route path="/history" element={<HistoryPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFoundPage />} />

    </Routes>
  )
}