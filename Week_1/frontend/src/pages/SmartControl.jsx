import { useState } from 'react'
import { Zap, Car, Wind, Tv, WashingMachine, Droplets, Thermometer, Waves } from 'lucide-react'
import { useFetch } from '../hooks/useFetch'
import { api } from '../data/api'
import LoadingSpinner from '../components/LoadingSpinner'

const categoryIcons = {
  transport: Car,
  climate: Thermometer,
  appliance: Zap,
  entertainment: Tv,
  outdoor: Waves,
}

const categoryColors = {
  transport: { text: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.2)' },
  climate: { text: '#c084fc', bg: 'rgba(192,132,252,0.08)', border: 'rgba(192,132,252,0.2)' },
  appliance: { text: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.2)' },
  entertainment: { text: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)' },
  outdoor: { text: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)' },
}

function DeviceCard({ device, onToggle }) {
  const [loading, setLoading] = useState(false)
  const Icon = categoryIcons[device.category] || Zap
  const col = categoryColors[device.category] || categoryColors.appliance

  const handleToggle = async () => {
    setLoading(true)
    try { await onToggle(device.id, !device.is_on) }
    finally { setLoading(false) }
  }

  return (
    <div className={`card-glass rounded-2xl p-5 transition-all duration-300 hover:translate-y-[-2px] ${device.is_on ? 'glow-green' : ''}`}
      style={{ borderColor: device.is_on ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.06)' }}>
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: col.bg, border: `1px solid ${col.border}` }}>
          <Icon size={18} style={{ color: col.text }} strokeWidth={2} />
        </div>
        {/* Toggle switch */}
        <label className="toggle-switch">
          <input type="checkbox" checked={device.is_on} onChange={handleToggle} disabled={loading} />
          <span className="toggle-track" />
        </label>
      </div>

      <div className="mb-3">
        <h3 className="font-medium text-white text-sm leading-tight">{device.name}</h3>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{device.room}</p>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="font-display font-bold text-lg text-white">{device.consumption_today_kwh}</span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>kWh today</span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{device.power_w}W rated</p>
        </div>
        <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${device.is_on ? 'text-volt-400' : 'text-slate-500'}`}
          style={{ background: device.is_on ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${device.is_on ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.08)'}` }}>
          {loading ? '...' : device.is_on ? 'ON' : 'OFF'}
        </div>
      </div>
    </div>
  )
}

export default function SmartControl() {
  const { data: devices, loading, refetch } = useFetch(api.getDevices)
  const [filter, setFilter] = useState('all')

  const handleToggle = async (id, is_on) => {
    await api.toggleDevice(id, is_on)
    refetch()
  }

  const categories = ['all', 'transport', 'climate', 'appliance', 'entertainment', 'outdoor']
  const filtered = filter === 'all' ? devices : devices?.filter(d => d.category === filter)
  const activeCount = devices?.filter(d => d.is_on).length || 0
  const totalDraw = devices?.filter(d => d.is_on).reduce((s, d) => s + d.power_w, 0) || 0

  return (
    <div className="space-y-6 fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-2xl text-white">Smart Control</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {activeCount} devices active · {(totalDraw / 1000).toFixed(1)} kW total draw
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
          style={{ background: 'rgba(74,222,128,0.08)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-volt-400 pulse-dot" />
          {activeCount}/{devices?.length || 0} Active
        </div>
      </div>

      {/* Live consumption bar */}
      <div className="card-glass rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Current Active Draw
          </p>
          <span className="font-mono text-sm" style={{ color: '#4ade80' }}>{(totalDraw / 1000).toFixed(2)} kW</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="h-full rounded-full progress-fill transition-all duration-700"
            style={{
              '--progress-width': `${Math.min((totalDraw / 12000) * 100, 100)}%`,
              width: `${Math.min((totalDraw / 12000) * 100, 100)}%`,
              background: 'linear-gradient(90deg, #4ade80, #22c55e)',
              boxShadow: '0 0 12px rgba(74,222,128,0.4)',
            }} />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>0 kW</span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>12 kW max</span>
        </div>
      </div>

      {/* Category filters */}
      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <button key={cat} onClick={() => setFilter(cat)}
            className="px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 capitalize"
            style={filter === cat
              ? { background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' }
              : { background: 'rgba(255,255,255,0.04)', color: '#64748b', border: '1px solid rgba(255,255,255,0.07)' }}>
            {cat}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner message="Loading devices..." /> : (
        <div className="grid grid-cols-3 gap-4">
          {filtered?.map(d => (
            <DeviceCard key={d.id} device={d} onToggle={handleToggle} />
          ))}
        </div>
      )}
    </div>
  )
}
