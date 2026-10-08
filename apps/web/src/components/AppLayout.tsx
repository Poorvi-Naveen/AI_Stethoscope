import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  LayoutDashboard,
  Mic,
  Activity,
  Users,
  FileText,
  History,
  Stethoscope,
  LogOut,
  Menu,
  X,
  User,
} from 'lucide-react'
import { logout as clearSessionAction } from '../store/authSlice'
import { logout as apiLogout } from '../api/auth'
import type { RootState } from '../store'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/record', label: 'New recording', icon: Mic },
  { to: '/analytics', label: 'Analytics', icon: Activity },
  { to: '/patients', label: 'Patients', icon: Users },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/history', label: 'History', icon: History },
]

export function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector((state: RootState) => state.auth.user)

  const handleLogout = async () => {
    await apiLogout()
    dispatch(clearSessionAction())
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      {/* Sidebar Navigation */}
      <aside className="border-b border-slate-200 bg-white lg:fixed lg:inset-y-0 lg:w-64 lg:border-b-0 lg:border-r lg:flex lg:flex-col lg:justify-between z-30">
        <div>
          {/* Brand Header */}
          <div className="flex h-16 items-center justify-between px-6 border-b border-slate-100 lg:border-b-0">
            <NavLink to="/dashboard" className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-tr from-brand-700 to-brand-500 text-white shadow-md">
                <Stethoscope className="h-6 w-6" />
              </div>
              <div>
                <span className="text-lg font-bold text-slate-900 tracking-tight">StethAI</span>
                <span className="block text-[10px] font-semibold text-brand-700 tracking-widest uppercase">
                  Clinical AI
                </span>
              </div>
            </NavLink>

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Navigation Items */}
          <nav
            className={`px-3 py-3 space-y-1 ${
              mobileMenuOpen ? 'block' : 'hidden lg:block'
            }`}
          >
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-semibold transition-all duration-150 ${
                      isActive
                        ? 'bg-brand-50 text-brand-800 shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </nav>
        </div>

        {/* User Info & Logout (Desktop Sidebar Footer) */}
        <div className="hidden border-t border-slate-200 p-4 lg:flex lg:items-center lg:justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-800">
              {user?.name ? user.name.split(' ').map((n) => n[0]).join('') : 'PN'}
            </div>
            <div className="truncate text-left">
              <p className="truncate text-xs font-bold text-slate-800">{user?.name || 'Dr. Priya Nair'}</p>
              <p className="truncate text-[11px] text-slate-500 capitalize">{user?.role || 'Doctor'} · Cardiology</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Sign out"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-rose-600 transition"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="min-w-0 flex-1 lg:ml-64">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              AI Decision Support Seam Connected
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full bg-slate-100 py-1 px-3 text-xs font-semibold text-slate-700">
              <User className="h-3.5 w-3.5 text-brand-700" />
              <span>{user?.name || 'Dr. Priya Nair'}</span>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl p-5 sm:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
