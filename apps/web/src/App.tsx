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
    const syncUserSession = async (session: any) => {
      if (!session?.user) {
        dispatch(clearSession())
        return
      }

      let name = session.user.user_metadata?.name || session.user.user_metadata?.full_name
      if (!name) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', session.user.id)
            .maybeSingle()
          if (profile && (profile.first_name || profile.last_name)) {
            name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
          }
        } catch (err) {
          console.error('Failed to load clinician profile:', err)
        }
      }

      if (!name && session.user.email) {
        const local = session.user.email.split('@')[0]
        name = local.charAt(0).toUpperCase() + local.slice(1)
      }

      dispatch(
        setSession({
          user: {
            id: session.user.id,
            name: name || 'Doctor',
            email: session.user.email || '',
            role: 'doctor',
          },
          token: session.access_token,
        })
      )
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      syncUserSession(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      syncUserSession(session)
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