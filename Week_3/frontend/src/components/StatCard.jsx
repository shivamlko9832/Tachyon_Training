export default function StatCard({ title, value, unit, subtitle, icon: Icon, color = 'green', trend }) {
  const colors = {
    green: { text: '#4ade80', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.2)' },
    amber: { text: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.2)' },
    blue: { text: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.2)' },
    red: { text: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)' },
  }
  const c = colors[color] || colors.green

  return (
    <div className="card-glass rounded-2xl p-5 flex flex-col gap-4 transition-all duration-300 hover:translate-y-[-2px]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{title}</p>
          {trend && (
            <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: trend > 0 ? 'rgba(248,113,113,0.1)' : 'rgba(74,222,128,0.1)',
                color: trend > 0 ? '#f87171' : '#4ade80' }}>
              {trend > 0 ? '+' : ''}{trend}%
            </span>
          )}
        </div>
        {Icon && (
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: c.bg, border: `1px solid ${c.border}` }}>
            <Icon size={16} style={{ color: c.text }} strokeWidth={2} />
          </div>
        )}
      </div>
      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="font-display font-bold text-3xl text-white fade-up">{value}</span>
          {unit && <span className="text-sm font-medium" style={{ color: c.text }}>{unit}</span>}
        </div>
        {subtitle && <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
      </div>
    </div>
  )
}
