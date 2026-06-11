import { Link } from 'react-router-dom'
import { Zap, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center fade-up">
      <div className="relative mb-8">
        <div className="font-display font-bold text-[140px] leading-none select-none"
          style={{ color: 'rgba(255,255,255,0.03)', userSelect: 'none' }}>
          404
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}>
            <Zap size={28} className="text-volt-400" strokeWidth={2} />
          </div>
        </div>
      </div>
      <h2 className="font-display font-bold text-2xl text-white mb-3">Circuit Not Found</h2>
      <p className="text-sm mb-8 max-w-xs" style={{ color: 'var(--text-muted)' }}>
        This page doesn't exist in the VoltStream grid. Check the URL or navigate back.
      </p>
      <Link to="/"
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:translate-y-[-1px]"
        style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)' }}>
        <ArrowLeft size={15} strokeWidth={2.5} />
        Back to Dashboard
      </Link>
    </div>
  )
}
