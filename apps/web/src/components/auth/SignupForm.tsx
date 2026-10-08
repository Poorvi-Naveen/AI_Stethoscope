import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { User, Mail, Lock, UserPlus } from 'lucide-react'
import { signup } from '../../api/auth'
import { useDispatch } from 'react-redux'
import { setSession } from '../../store/authSlice'
import { Button, Input } from '../ui'

const schema = z
  .object({
    name: z.string().trim().min(1, 'Name is required.'),
    email: z.string().min(1, 'Email is required.').email('Enter a valid email address.'),
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    confirmPassword: z.string().min(1, 'Please confirm your password.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

type Values = z.infer<typeof schema>

export function SignupForm() {
  const [values, setValues] = useState<Values>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>({})
  const [loading, setLoading] = useState(false)

  const dispatch = useDispatch()
  const navigate = useNavigate()

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
      const session = await signup(parsed.data)
      dispatch(setSession(session))
      navigate('/dashboard', { replace: true })
    } catch (error: any) {
      setErrors({ email: error.message || 'Registration failed' })
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create clinician account</h1>
        <p className="mt-1.5 text-sm text-slate-500">Set up your StethAI decision workspace.</p>
      </div>

      <div className="mt-6 space-y-4">
        <Input
          label="Full Name"
          type="text"
          autoComplete="name"
          placeholder="Dr. Priya Nair"
          leftIcon={<User className="h-4 w-4" />}
          value={values.name}
          onChange={(e) => setValues({ ...values, name: e.target.value })}
          error={errors.name}
        />

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
          autoComplete="new-password"
          leftIcon={<Lock className="h-4 w-4" />}
          value={values.password}
          onChange={(e) => setValues({ ...values, password: e.target.value })}
          error={errors.password}
        />

        <Input
          label="Confirm Password"
          type="password"
          autoComplete="new-password"
          leftIcon={<Lock className="h-4 w-4" />}
          value={values.confirmPassword}
          onChange={(e) => setValues({ ...values, confirmPassword: e.target.value })}
          error={errors.confirmPassword}
        />
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={loading}
        iconRight={<UserPlus className="h-4 w-4" />}
        className="mt-6 w-full"
      >
        Register Clinician Account
      </Button>

      <p className="mt-6 text-center text-xs font-semibold text-slate-500">
        Already registered?{' '}
        <Link className="text-brand-700 hover:underline" to="/login">
          Sign in
        </Link>
      </p>
    </form>
  )
}
