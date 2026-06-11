import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend
} from 'recharts'
import { TrendingDown, TrendingUp, Leaf, DollarSign } from 'lucide-react'
import { useFetch } from '../hooks/useFetch'
import { api } from '../data/api'
import StatCard from '../components/StatCard'
import LoadingSpinner from '../components/LoadingSpinner'

const PERIODS = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
]

const CustomBar = (props) => {
  const { x, y, width, height, fill } = props
  const r = 4
  return (
    <path
      d={`M${x+r},${y} h${width-2*r} a${r},${r} 0 0 1 ${r},${r} v${height-r} h${-width} v${-(height-r)} a${r},${r} 0 0 1 ${r},${-r}z`}
      fill={fill}
    />
  )
}

export default function UsageHistory() {
  const [period, setPeriod] = useState('daily')
  const { data, loading } = useFetch(() => api.getHistory(period), [period])

  const totalUsage = data?.reduce((s, d) => s + d.usage_kwh, 0) || 0
  const totalSolar = data?.reduce((s, d) => s + d.solar_kwh, 0) || 0
  const totalCost = data?.reduce((s, d) => s + d.cost_usd, 0) || 0
  const totalSavings = data?.reduce((s, d) => s + d.savings_usd, 0) || 0
  const solarCoverage = totalUsage ? Math.round((totalSolar / totalUsage) * 100) : 0

  return (
    <div className="space-y-6 fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-2xl text-white">Energy Analytics</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Usage history and solar performance breakdown
          </p>
        </div>
        {/* Period toggle */}
        <div className="flex p-1 rounded-xl gap-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200"
              style={period === p.key
                ? { background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)' }
                : { color: '#64748b' }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard title="Total Consumption" value={totalUsage.toFixed(0)} unit="kWh"
          subtitle={`Across ${data?.length || 0} ${period} periods`} icon={TrendingUp} color="blue" />
        <StatCard title="Solar Generated" value={totalSolar.toFixed(0)} unit="kWh"
          subtitle={`${solarCoverage}% of total demand covered`} icon={Leaf} color="green" />
        <StatCard title="Energy Cost" value={`$${totalCost.toFixed(2)}`}
          subtitle="Net after solar offsets" icon={DollarSign} color="amber" />
        <StatCard title="Solar Savings" value={`$${totalSavings.toFixed(2)}`}
          subtitle="Earnings from surplus export" icon={TrendingDown} color="green" />
      </div>

      {/* Main bar chart */}
      <div className="card-glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="font-medium text-white">Consumption vs. Solar Generation</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>kWh per {period.slice(0, -2)} period</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            {[
              { color: '#60a5fa', label: 'Grid Usage' },
              { color: '#4ade80', label: 'Solar Output' },
            ].map(l => (
              <span key={l.label} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm inline-block" style={{ background: l.color }} />
                <span style={{ color: 'var(--text-muted)' }}>{l.label}</span>
              </span>
            ))}
          </div>
        </div>
        {loading ? <LoadingSpinner message="Fetching history..." /> : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} width={35} />
              <Tooltip
                contentStyle={{ background: 'rgba(17,24,39,0.95)', border: '1px solid rgba(96,165,250,0.2)',
                  borderRadius: 8, fontSize: 12, fontFamily: 'DM Sans' }}
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              />
              <Bar dataKey="usage_kwh" fill="#60a5fa" name="Grid Usage kWh" shape={<CustomBar />} opacity={0.85} />
              <Bar dataKey="solar_kwh" fill="#4ade80" name="Solar kWh" shape={<CustomBar />} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Cost & Savings line chart */}
      <div className="card-glass rounded-2xl p-6">
        <div className="mb-6">
          <p className="font-medium text-white">Cost vs. Savings Trend</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>USD per period</p>
        </div>
        {loading ? <LoadingSpinner /> : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} width={35} />
              <Tooltip
                contentStyle={{ background: 'rgba(17,24,39,0.95)', border: '1px solid rgba(251,191,36,0.2)',
                  borderRadius: 8, fontSize: 12, fontFamily: 'DM Sans' }}
              />
              <Line type="monotone" dataKey="cost_usd" stroke="#fbbf24" strokeWidth={2} dot={false} name="Cost $" />
              <Line type="monotone" dataKey="savings_usd" stroke="#4ade80" strokeWidth={2} dot={false} name="Savings $" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
