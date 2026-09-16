// apps/web/src/components/patients/PatientForm.tsx
import { z } from 'zod'
import type { PatientSex } from '../../types'

export const patientFormSchema = z.object({ firstName: z.string().trim().min(1, 'First name is required.'), lastName: z.string().trim().min(1, 'Last name is required.'), sex: z.enum(['female', 'male', 'other', 'unknown']), age: z.coerce.number().int().min(1, 'Enter a valid age.').max(130, 'Enter a valid age.'), phone: z.string().trim().min(1, 'Phone is required.'), address: z.string().trim().min(1, 'Address is required.') })
export type PatientFormValues = z.infer<typeof patientFormSchema>
export const emptyPatientForm: PatientFormValues = { firstName: '', lastName: '', sex: 'unknown', age: 0, phone: '', address: '' }
type Props = { value: PatientFormValues; errors?: Partial<Record<keyof PatientFormValues, string>>; onChange: (value: PatientFormValues) => void }
export function PatientForm({ value, errors = {}, onChange }: Props) {
  const input = 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100'
  const field = (key: keyof PatientFormValues, label: string, type = 'text') => <label className="block text-sm font-medium">{label}<input className={input} type={type} value={value[key]} onChange={(e) => onChange({ ...value, [key]: type === 'number' ? e.target.valueAsNumber : e.target.value })} />{errors[key] && <span className="mt-1 block text-xs text-red-600">{errors[key]}</span>}</label>
  return <div className="grid gap-4 sm:grid-cols-2">{field('firstName', 'First name')}{field('lastName', 'Last name')}<label className="block text-sm font-medium">Gender<select className={input} value={value.sex} onChange={(e) => onChange({ ...value, sex: e.target.value as PatientSex })}>{['unknown', 'female', 'male', 'other'].map((option) => <option key={option} value={option}>{option[0].toUpperCase() + option.slice(1)}</option>)}</select></label>{field('age', 'Age', 'number')}<div className="sm:col-span-2">{field('phone', 'Phone', 'tel')}</div><div className="sm:col-span-2"><label className="block text-sm font-medium">Address<input className={input} value={value.address} onChange={(e) => onChange({ ...value, address: e.target.value })} />{errors.address && <span className="mt-1 block text-xs text-red-600">{errors.address}</span>}</label></div></div>
}
