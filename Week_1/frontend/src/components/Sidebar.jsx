import { NavLink } from 'react-router-dom'
import { Zap, BarChart3, Cpu, Receipt, Activity } from 'lucide-react'

const links = [
  { to: '/', icon: Activity, label: 'Live Dashboard' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/devices', icon: Cpu, label: 'Smart Control' },
  { to: '/billing', icon: Receipt, label: 'Billing' },
]

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-full w-64 flex flex-col z-20"
      style={{ background: 'rgba(9,14,26,0.95)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>

      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-7 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="relative">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.25)' }}>
            <Zap size={18} className="text-volt-400" strokeWidth={2.5} />
          </div>
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-volt-400 pulse-dot" />
        </div>
        <div>
          <h1 className="font-display font-bold text-lg text-white leading-none tracking-tight">VoltStream</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>v1.0 — LIVE</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-6 space-y-1">
        <p className="text-xs font-medium uppercase tracking-widest px-3 mb-3" style={{ color: 'var(--text-muted)' }}>Navigation</p>
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                isActive ? 'nav-link-active' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={16} strokeWidth={isActive ? 2.5 : 2}
                  className={`transition-colors ${isActive ? 'text-volt-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                <span className="font-body">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-5 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="rounded-xl p-4" style={{ background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.12)' }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-volt-400 pulse-dot" />
            <span className="text-xs font-medium text-volt-400">Solar Active</span>
          </div>
          <p className="text-xs text-slate-500">System operating normally. All panels online.</p>
        </div>
      </div>
    </aside>
  )
}
