export default function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center h-48 gap-4">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-2 border-transparent"
          style={{ borderTopColor: '#4ade80', animation: 'spin 0.8s linear infinite' }} />
        <div className="absolute inset-2 rounded-full border-2 border-transparent"
          style={{ borderTopColor: 'rgba(74,222,128,0.3)', animation: 'spin 1.2s linear infinite reverse' }} />
      </div>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{message}</p>
    </div>
  )
}
