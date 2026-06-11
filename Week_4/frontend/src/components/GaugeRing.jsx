import { useEffect, useRef } from 'react'

export default function GaugeRing({ value, max, label, unit, color = '#4ade80', size = 160 }) {
  const circRef = useRef(null)
  const radius = 58
  const circumference = 2 * Math.PI * radius
  const pct = Math.min(Math.max((parseFloat(value) || 0) / max, 0), 1)
  const dashOffset = circumference * (1 - pct * 0.75) // 270° arc
  const startAngle = 135

  useEffect(() => {
    if (circRef.current) {
      circRef.current.style.setProperty('--dash-offset', dashOffset)
      circRef.current.style.strokeDashoffset = circumference * 0.75 // start at 0
      setTimeout(() => {
        if (circRef.current) circRef.current.style.strokeDashoffset = dashOffset
      }, 100)
    }
  }, [value, dashOffset, circumference])

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 140 140">
          {/* Track */}
          <circle
            cx="70" cy="70" r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="10"
            strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
            strokeDashoffset={circumference * 0.125}
            strokeLinecap="round"
            transform={`rotate(${startAngle} 70 70)`}
          />
          {/* Fill */}
          <circle
            ref={circRef}
            cx="70" cy="70" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
            strokeLinecap="round"
            transform={`rotate(${startAngle} 70 70)`}
            style={{
              transition: 'stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)',
              filter: `drop-shadow(0 0 6px ${color}80)`,
            }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display font-bold text-2xl text-white">{value}</span>
          <span className="text-xs font-medium mt-0.5" style={{ color }}>{unit}</span>
        </div>
      </div>
      <p className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
  )
}
