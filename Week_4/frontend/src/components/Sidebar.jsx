import { NavLink } from 'react-router-dom'
import { Zap, BarChart3, Cpu, Receipt, Activity, MessageSquare, BookOpen, Bot } from 'lucide-react'

const links = [
  { to: '/',          icon: Activity,      label: 'Live Dashboard' },
  { to: '/analytics', icon: BarChart3,     label: 'Analytics' },
  { to: '/devices',   icon: Cpu,           label: 'Smart Control' },
  { to: '/billing',   icon: Receipt,       label: 'Billing' },
]

const aiLinks = [
  { to: '/chat',  icon: MessageSquare, label: 'AI Chat',          badge: 'W3' },
  { to: '/qa',    icon: BookOpen,      label: 'Knowledge Base',   badge: 'W3' },
  { to: '/agent', icon: Bot,           label: 'Device Agent',     badge: 'W4' },
]

const badgeColors = {
  W3: { bg:'rgba(74,222,128,0.1)',  border:'rgba(74,222,128,0.2)',  text:'#4ade80' },
  W4: { bg:'rgba(251,191,36,0.12)', border:'rgba(251,191,36,0.25)', text:'#fbbf24' },
}

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
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>v2.0 — AGENTIC</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        <p className="text-xs font-medium uppercase tracking-widest px-3 mb-3" style={{ color: 'var(--text-muted)' }}>Navigation</p>
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                isActive ? 'nav-link-active' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`
            }>
            {({ isActive }) => (
              <>
                <Icon size={16} strokeWidth={isActive ? 2.5 : 2}
                  className={`transition-colors ${isActive ? 'text-volt-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                <span className="font-body">{label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* AI section */}
        <div className="pt-4">
          <p className="text-xs font-medium uppercase tracking-widest px-3 mb-3" style={{ color: 'var(--text-muted)' }}>
            AI Features
          </p>
          {aiLinks.map(({ to, icon: Icon, label, badge }) => {
            const bc = badgeColors[badge]
            return (
              <NavLink key={to} to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                    isActive ? 'nav-link-active' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`
                }>
                {({ isActive }) => (
                  <>
                    <Icon size={16} strokeWidth={isActive ? 2.5 : 2}
                      className={`transition-colors ${isActive ? 'text-volt-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                    <span className="font-body">{label}</span>
                    <span className="ml-auto text-xs px-1.5 py-0.5 rounded font-mono"
                      style={{ background:bc.bg, border:`1px solid ${bc.border}`, color:bc.text, fontSize:'9px' }}>
                      {badge}
                    </span>
                  </>
                )}
              </NavLink>
            )
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-4 py-5 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="rounded-xl p-4" style={{ background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.12)' }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-volt-400 pulse-dot" />
            <span className="text-xs font-medium text-volt-400">Solar Active</span>
          </div>
          <p className="text-xs text-slate-500">Agent ready · 5 tools loaded</p>
        </div>
      </div>

      <style>{`.text-volt-400{color:#4ade80}.bg-volt-400{background-color:#4ade80}`}</style>
    </aside>
  )
}
