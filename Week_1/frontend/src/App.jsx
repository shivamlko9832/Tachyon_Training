import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import LiveDashboard from './pages/LiveDashboard'
import UsageHistory from './pages/UsageHistory'
import SmartControl from './pages/SmartControl'
import Invoices from './pages/Invoices'
import NotFound from './pages/NotFound'

function Layout() {
  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Background orbs */}
      <div className="orb w-96 h-96" style={{ background: '#4ade80', top: '-10%', left: '15%' }} />
      <div className="orb w-80 h-80" style={{ background: '#60a5fa', bottom: '10%', right: '5%' }} />
      <div className="orb w-64 h-64" style={{ background: '#818cf8', top: '40%', left: '35%' }} />

      <Sidebar />

      <main className="flex-1 ml-64 relative z-10">
        <div className="max-w-5xl mx-auto px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<LiveDashboard />} />
          <Route path="/analytics" element={<UsageHistory />} />
          <Route path="/devices" element={<SmartControl />} />
          <Route path="/billing" element={<Invoices />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
