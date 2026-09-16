import { Link } from 'react-router-dom'
import { Home, AlertCircle } from 'lucide-react'
import { Card, Button } from '../components/ui'

export function NotFoundPage() {
  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 p-5">
      <Card className="max-w-md w-full text-center py-10 px-8 shadow-xl">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-amber-600 mb-4">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">404 - Page Not Found</h1>
        <p className="mt-2 text-sm text-slate-500">
          The clinical view or resource URL you are looking for does not exist.
        </p>
        <Link to="/dashboard" className="mt-6 block">
          <Button variant="primary" className="w-full" icon={<Home className="h-4 w-4" />}>
            Return to Clinical Dashboard
          </Button>
        </Link>
      </Card>
    </div>
  )
}
