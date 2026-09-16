import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Mail, Lock, LogIn } from 'lucide-react'
import { login } from '../../api/auth'
import { useDispatch } from 'react-redux'
import { setSession } from '../../store/authSlice'
import { Button, Input } from '../ui'

const schema = z.object({
  email: z.string().min(1, 'Email is required.').email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
  rememberMe: z.boolean(),
})

type Values = z.infer<typeof schema>

export function LoginForm() {
  const [values, setValues] = useState<Values>({
    email: 'dr.priya@stethai.test',
    password: 'password123',
    rememberMe: true,
  })
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>({})
  const [loading, setLoading] = useState(false)

  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const parsed = schema.safeParse(values)

    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])
        )
      )
      return
    }

    setLoading(true)
    try {
      const session = await login(parsed.data)
      dispatch(setSession(session))
      const fromPath =
        (location.state as { from?: { pathname?: string } })?.from?.pathname ?? '/dashboard'
      navigate(fromPath, { replace: true })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      className="w-full max-w-md rounded-2xl bg-white p-7 shadow-xl border border-slate-100 sm:p-9"
      noValidate
      onSubmit={submit}
    >
      <div className="text-center sm:text-left">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Welcome back</h1>
        <p className="mt-1.5 text-sm text-slate-500">Sign in to your StethAI decision workspace.</p>
      </div>

      <div className="mt-6 space-y-4">
        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="name@hospital.org"
          leftIcon={<Mail className="h-4 w-4" />}
          value={values.email}
          onChange={(e) => setValues({ ...values, email: e.target.value })}
          error={errors.email}
        />

        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          leftIcon={<Lock className="h-4 w-4" />}
          value={values.password}
          onChange={(e) => setValues({ ...values, password: e.target.value })}
          error={errors.password}
        />

        <div className="flex items-center justify-between text-xs">
          <label className="flex items-center gap-2 font-medium text-slate-600 cursor-pointer select-none">
            <input
              checked={values.rememberMe}
              onChange={(e) => setValues({ ...values, rememberMe: e.target.checked })}
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 accent-brand-700 focus:ring-brand-500"
            />
            Remember credentials
          </label>
          <Link
            className="font-semibold text-brand-700 hover:text-brand-800 transition"
            to="/forgot-password"
          >
            Forgot password?
          </Link>
        </div>
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={loading}
        iconRight={<LogIn className="h-4 w-4" />}
        className="mt-6 w-full"
      >
        Sign in
      </Button>

      <p className="mt-6 text-center text-xs font-semibold text-slate-500">
        Don't have an account?{' '}
        <Link className="text-brand-700 hover:underline" to="/signup">
          Register new doctor account
        </Link>
      </p>
    </form>
  )
}
