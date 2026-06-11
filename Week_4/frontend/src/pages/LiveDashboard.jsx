import { useEffect, useState } from 'react'
import { Zap, Sun, Battery, Activity, Wifi } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { api } from '../data/api'
import GaugeRing from '../components/GaugeRing'
import StatCard from '../components/StatCard'
import LoadingSpinner from '../components/LoadingSpinner'

// Generate a 20-point mock sparkline for live chart
function generateSparkline() { 
  const points = []
  for (let i = 0; i < 20; i++) {
    points.push({
      t: `${i}s`,
      solar: parseFloat((Math.random() * 3 + 2).toFixed(2)),
      grid: parseFloat((Math.random() * 2 + 0.5).toFixed(2)),
    })
  }
  return points
}

export default function LiveDashboard() {
  const [live, setLive] = useState(null)
  const [sparkline, setSparkline] = useState(generateSparkline())
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  const fetchLive = async () => {
    try {
      const data = await api.getLive()
      setLive(data)
      setLastUpdated(new Date())
      setSparkline(prev => {
        const next = [...prev.slice(1), {
          t: `${prev.length}s`,
          solar: data.solar_generation_kw,
          grid: data.grid_draw_kw,
        }]
        return next
      })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLive()
    const id = setInterval(fetchLive, 4000)
    return () => clearInterval(id)
  }, [])

  const statusConfig = {
    exporting: { label: 'Exporting to Grid', color: '#4ade80', bg: 'rgba(74,222,128,0.1)', border: 'rgba(74,222,128,0.25)', dot: '#4ade80' },
    importing: { label: 'Importing from Grid', color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)', dot: '#f87171' },
    balanced:  { label: 'Grid Balanced', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.25)', dot: '#60a5fa' },
  }

  // Derive status client-side so it's always consistent with the live values
  const derivedStatus = !live ? 'balanced'
    : live.net_usage_kw < -0.1 ? 'exporting'
    : live.net_usage_kw >  0.1 ? 'importing'
    : 'balanced'

  if (loading) return <LoadingSpinner message="Connecting to grid..." />

  const sc = statusConfig[derivedStatus]
  const StatusIcon = sc.icon

  return (
    <div className="space-y-6 fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-2xl text-white">Live Dashboard</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Real-time energy flow · Updated {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium select-none"
          style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, cursor: 'default' }}>
          <span className="w-2 h-2 rounded-full pulse-dot flex-shrink-0" style={{ background: sc.dot }} />
          {sc.label}
        </div>
      </div>

      {/* Live indicator bar */}
      <div className="rounded-2xl p-1 flex items-center gap-3"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-2 px-4 py-2">
          <Wifi size={13} className="text-volt-400" />
          <span className="font-mono text-xs text-volt-400">STREAM ACTIVE</span>
        </div>
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
        <span className="font-mono text-xs px-4 py-2" style={{ color: 'var(--text-muted)' }}>
          ↻ Polling every 4s
        </span>
      </div>

      {/* Gauges row */}
      <div className="card-glass rounded-2xl p-6">
        <p className="text-xs font-medium uppercase tracking-widest mb-6" style={{ color: 'var(--text-muted)' }}>
          Power Flow — Real Time
        </p>
        <div className="grid grid-cols-3 gap-6 items-center">
          <div className="flex justify-center">
            <GaugeRing value={live?.solar_generation_kw?.toFixed(1)} max={8} label="Solar Generation" unit="kW" color="#4ade80" />
          </div>
          {/* Flow indicator */}
          <div className="flex flex-col items-center gap-3">
            <div className="text-center">
              <div className="font-display font-bold text-4xl"
                style={{ color: live?.net_usage_kw < 0 ? '#4ade80' : '#f87171' }}>
                {Math.abs(live?.net_usage_kw)?.toFixed(2)}
              </div>
              <div className="text-sm font-medium mt-1" style={{ color: 'var(--text-muted)' }}>kW Net</div>
            </div>
            <div className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full select-none"
              style={{ background: sc.bg, color: sc.color, cursor: 'default' }}>
              <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: sc.dot }} />
              <span>{derivedStatus === 'exporting' ? 'Selling surplus' : derivedStatus === 'importing' ? 'Buying power' : 'Self-sufficient'}</span>
            </div>
          </div>
          <div className="flex justify-center">
            <GaugeRing value={live?.grid_draw_kw?.toFixed(1)} max={8} label="Grid Draw" unit="kW" color="#60a5fa" />
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Solar Generation" value={live?.solar_generation_kw?.toFixed(2)} unit="kW"
          subtitle="Panels operating at peak" icon={Sun} color="green" />
        <StatCard title="Grid Consumption" value={live?.grid_draw_kw?.toFixed(2)} unit="kW"
          subtitle="Current draw from grid" icon={Zap} color="blue" />
        <StatCard title="Battery Reserve" value={live?.battery_percent?.toFixed(0)} unit="%"
          subtitle="Estimated 4h 20m remaining" icon={Battery}
          color={live?.battery_percent > 60 ? 'green' : live?.battery_percent > 30 ? 'amber' : 'red'} />
      </div>

      {/* Live sparkline */}
      <div className="card-glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Live Power Trace — Last 20 readings
          </p>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 inline-block rounded-full bg-volt-400" />
              <span style={{ color: 'var(--text-muted)' }}>Solar</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 inline-block rounded-full bg-blue-400" />
              <span style={{ color: 'var(--text-muted)' }}>Grid</span>
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={sparkline} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="solarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gridGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="t" hide />
            <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
            <Tooltip
              contentStyle={{ background: 'rgba(17,24,39,0.95)', border: '1px solid rgba(74,222,128,0.2)',
                borderRadius: 8, fontSize: 12, fontFamily: 'DM Sans' }}
              labelStyle={{ color: '#64748b' }}
            />
            <Area type="monotone" dataKey="solar" stroke="#4ade80" strokeWidth={2} fill="url(#solarGrad)" dot={false} name="Solar kW" />
            <Area type="monotone" dataKey="grid" stroke="#60a5fa" strokeWidth={2} fill="url(#gridGrad)" dot={false} name="Grid kW" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
