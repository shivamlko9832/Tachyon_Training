import { DollarSign, AlertTriangle, TrendingDown, Sun, Calendar, CreditCard } from 'lucide-react'
import { useFetch } from '../hooks/useFetch'
import { api } from '../data/api'
import LoadingSpinner from '../components/LoadingSpinner'
import StatCard from '../components/StatCard'

export default function Invoices() {
  const { data: billing, loading } = useFetch(api.getBilling)

  if (loading) return <LoadingSpinner message="Fetching billing data..." />

  const spendPct = billing ? Math.min((billing.current_balance / billing.budget_limit) * 100, 100) : 0
  const projPct = billing ? Math.min((billing.projected_bill / billing.budget_limit) * 100, 100) : 0
  const isOverBudget = billing?.alert

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const mockHistory = months.slice(0, new Date().getMonth()).map((m, i) => ({
    month: m,
    amount: parseFloat((55 + Math.sin(i) * 15 + Math.random() * 8).toFixed(2)),
    solar: parseFloat((18 + Math.cos(i) * 8 + Math.random() * 5).toFixed(2)),
  }))

  return (
    <div className="space-y-6 fade-up">
      <div>
        <h2 className="font-display font-bold text-2xl text-white">Billing Overview</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Current cycle · {billing?.days_remaining} days remaining
        </p>
      </div>

      {/* Alert banner */}
      {isOverBudget && (
        <div className="rounded-2xl p-4 flex items-center gap-3"
          style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.25)' }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(251,191,36,0.12)' }}>
            <AlertTriangle size={16} className="text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-amber-400">Budget Alert</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Projected bill ${billing?.projected_bill?.toFixed(2)} exceeds budget of ${billing?.budget_limit?.toFixed(2)}.
              Consider reducing device usage.
            </p>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Current Balance" value={`$${billing?.current_balance?.toFixed(2)}`}
          subtitle={`${billing?.days_remaining} days remaining`} icon={DollarSign} color="blue" />
        <StatCard title="Solar Credits" value={`$${billing?.solar_credits?.toFixed(2)}`}
          subtitle="Earned from grid exports" icon={Sun} color="green" />
        <StatCard title="YoY Savings" value={`$${billing?.savings_this_month?.toFixed(2)}`}
          subtitle="vs last month baseline" icon={TrendingDown} color="green" />
      </div>

      {/* Projected bill card */}
      <div className="card-glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              This Month's Projection
            </p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="font-display font-bold text-4xl text-white">
                ${billing?.projected_bill?.toFixed(2)}
              </span>
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>projected</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Budget</p>
            <p className="font-display font-bold text-2xl" style={{ color: isOverBudget ? '#f87171' : '#4ade80' }}>
              ${billing?.budget_limit?.toFixed(0)}
            </p>
          </div>
        </div>

        {/* Budget progress */}
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span style={{ color: 'var(--text-muted)' }}>Current spend</span>
              <span style={{ color: '#60a5fa' }}>${billing?.current_balance?.toFixed(2)}</span>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${spendPct}%`,
                  background: 'linear-gradient(90deg, #60a5fa, #818cf8)',
                  boxShadow: '0 0 8px rgba(96,165,250,0.4)',
                }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span style={{ color: 'var(--text-muted)' }}>Projected total</span>
              <span style={{ color: isOverBudget ? '#f87171' : '#4ade80' }}>
                ${billing?.projected_bill?.toFixed(2)} / ${billing?.budget_limit?.toFixed(0)}
              </span>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${projPct}%`,
                  background: isOverBudget
                    ? 'linear-gradient(90deg, #f87171, #ef4444)'
                    : 'linear-gradient(90deg, #4ade80, #22c55e)',
                  boxShadow: isOverBudget ? '0 0 8px rgba(248,113,113,0.4)' : '0 0 8px rgba(74,222,128,0.4)',
                }} />
            </div>
          </div>
        </div>
      </div>

      {/* Monthly history table */}
      <div className="card-glass rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <CreditCard size={14} style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm font-medium text-white">Invoice History</p>
        </div>
        <table className="w-full">
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
              {['Month', 'Grid Bill', 'Solar Credit', 'Net Total', 'Status'].map(h => (
                <th key={h} className="text-left px-6 py-3 text-xs font-medium uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mockHistory.map((row, i) => {
              const net = (row.amount - row.solar).toFixed(2)
              return (
                <tr key={i} className="border-t transition-colors hover:bg-white/[0.02]"
                  style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
                      <span className="text-sm font-medium text-white">{row.month} 2026</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm" style={{ color: '#f1f5f9' }}>${row.amount}</td>
                  <td className="px-6 py-4 text-sm text-volt-400">-${row.solar}</td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-sm text-white">${net}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                      style={{ background: 'rgba(74,222,128,0.08)', color: '#4ade80',
                        border: '1px solid rgba(74,222,128,0.2)' }}>
                      Paid
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
