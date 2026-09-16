import { Link } from 'react-router-dom'
import { ArrowLeft, KeyRound } from 'lucide-react'
import { AuthLayout } from '../components/AuthLayout'
import { Button } from '../components/ui'

export function ForgotPasswordPage() {
  return (
    <AuthLayout>
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl border border-slate-100">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700">
            <KeyRound className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reset password</h1>
        </div>
        <p className="mt-4 text-sm text-slate-500 leading-relaxed">
          Password recovery notifications will be activated once your hospital LDAP / Auth backend connection is established.
        </p>
        <Link to="/login" className="mt-6 block">
          <Button variant="primary" className="w-full" icon={<ArrowLeft className="h-4 w-4" />}>
            Return to Sign In
          </Button>
        </Link>
      </section>
    </AuthLayout>
  )
}
