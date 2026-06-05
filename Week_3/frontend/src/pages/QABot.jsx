import { useState, useRef, useEffect } from 'react'
import { Search, BookOpen, AlertTriangle, CheckCircle, ChevronRight, Database,
  FileText, Zap, RotateCcw, Shield, Brain, ExternalLink, FlaskConical } from 'lucide-react'
import { streamQA, api } from '../data/api'

const SAMPLE_QUESTIONS = [
  { category: 'Inverters',    q: 'What is the minimum efficiency rating required for grid-connected inverters?' },
  { category: 'Net Metering', q: 'What are the net metering capacity limits for residential consumers?' },
  { category: 'Tariff',       q: 'What is the ACOST rate for Telangana prosumers in FY 2023-24?' },
  { category: 'Battery',      q: 'What battery chemistry is recommended for residential storage and why?' },
  { category: 'Efficiency',   q: 'What are the BEE star rating ISEER requirements for split air conditioners?' },
  { category: 'Safety',       q: 'What is the anti-islanding disconnection time requirement for inverters?' },
  { category: 'Solar',        q: 'What is the specific yield for solar installations in Hyderabad?' },
  { category: 'EV Charging',  q: 'What wiring specification is required for a 7.2 kW home EV charger?' },
]

const CAT_COLORS = {
  'Inverters':    { bg:'rgba(99,102,241,0.1)',  bd:'rgba(99,102,241,0.25)',  t:'#818cf8' },
  'Net Metering': { bg:'rgba(74,222,128,0.08)', bd:'rgba(74,222,128,0.2)',   t:'#4ade80' },
  'Tariff':       { bg:'rgba(251,191,36,0.08)', bd:'rgba(251,191,36,0.2)',   t:'#fbbf24' },
  'Battery':      { bg:'rgba(96,165,250,0.08)', bd:'rgba(96,165,250,0.2)',   t:'#60a5fa' },
  'Efficiency':   { bg:'rgba(52,211,153,0.08)', bd:'rgba(52,211,153,0.2)',   t:'#34d399' },
  'Safety':       { bg:'rgba(248,113,113,0.08)',bd:'rgba(248,113,113,0.2)',  t:'#f87171' },
  'Solar':        { bg:'rgba(251,191,36,0.08)', bd:'rgba(251,191,36,0.2)',   t:'#fbbf24' },
  'EV Charging':  { bg:'rgba(167,139,250,0.08)',bd:'rgba(167,139,250,0.2)',  t:'#a78bfa' },
}

function Badge({ label, color }) {
  const c = color || CAT_COLORS[label] || { bg:'rgba(255,255,255,0.05)', bd:'rgba(255,255,255,0.1)', t:'#94a3b8' }
  return (
    <span style={{ fontSize:'10px', fontWeight:600, padding:'2px 8px', borderRadius:'20px',
      background:c.bg, border:`1px solid ${c.bd}`, color:c.t, whiteSpace:'nowrap' }}>
      {label}
    </span>
  )
}

function CitationCard({ citation, index }) {
  const [open, setOpen] = useState(false)
  const relevance = citation.distance <= 0.15 ? 'high' : citation.distance <= 0.25 ? 'medium' : 'low'
  const relColor  = relevance === 'high' ? '#4ade80' : relevance === 'medium' ? '#fbbf24' : '#f87171'

  return (
    <div style={{ borderRadius:'8px', overflow:'hidden', border:'1px solid rgba(255,255,255,0.06)',
      background:'rgba(255,255,255,0.02)', marginTop:'4px' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width:'100%', display:'flex', alignItems:'center', gap:'8px', padding:'7px 10px',
          background:'none', border:'none', cursor:'pointer', textAlign:'left' }}>
        <FileText size={11} color="#475569" />
        <span style={{ fontSize:'11px', color:'#64748b' }}>Page {citation.page}</span>
        <span style={{ fontSize:'10px', fontFamily:'monospace', color: relColor }}>
          d={citation.distance}
        </span>
        <Badge label={relevance === 'high' ? 'high relevance' : relevance === 'medium' ? 'medium' : 'low'}
          color={{ bg: `${relColor}15`, bd: `${relColor}30`, t: relColor }} />
        <span style={{ marginLeft:'auto', fontSize:'10px', color:'#334155' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ padding:'0 10px 10px 10px', borderTop:'1px solid rgba(255,255,255,0.05)' }}>
          <p style={{ margin:0, fontSize:'11.5px', color:'#475569', lineHeight:1.6, fontStyle:'italic' }}>
            "{citation.excerpt}"
          </p>
        </div>
      )}
    </div>
  )
}

function GuardBadge({ status }) {
  const map = {
    pass:           { label:'✓ Guard pass',      bg:'rgba(74,222,128,0.08)',  bd:'rgba(74,222,128,0.2)',  t:'#4ade80' },
    low_confidence: { label:'⚠ Low confidence', bg:'rgba(251,191,36,0.08)', bd:'rgba(251,191,36,0.2)', t:'#fbbf24' },
    no_context:     { label:'✗ No context',      bg:'rgba(248,113,113,0.08)',bd:'rgba(248,113,113,0.2)',t:'#f87171' },
  }
  const c = map[status] || map.pass
  return (
    <span style={{ fontSize:'10px', fontWeight:600, padding:'2px 8px', borderRadius:'20px',
      background:c.bg, border:`1px solid ${c.bd}`, color:c.t }}>
      {c.label}
    </span>
  )
}

function QACard({ entry }) {
  const isFallback = entry.answer === "I don't have that information"
  const isLoading  = entry.answer === null
  const isError    = entry.error

  return (
    <div style={{ borderRadius:'16px', overflow:'hidden', border:'1px solid rgba(255,255,255,0.07)',
      background:'rgba(15,23,42,0.6)', backdropFilter:'blur(12px)',
      animation:'cardIn 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}>

      {/* Question */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:'12px', padding:'14px 18px',
        background:'rgba(255,255,255,0.02)', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ width:'22px', height:'22px', borderRadius:'6px', flexShrink:0,
          background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.25)',
          display:'flex', alignItems:'center', justifyContent:'center', marginTop:'1px' }}>
          <Search size={11} color="#818cf8" />
        </div>
        <p style={{ margin:0, fontSize:'13px', color:'#cbd5e1', fontWeight:500, flex:1, lineHeight:1.5 }}>
          {entry.question}
        </p>
        {entry.guard && <GuardBadge status={entry.guard} />}
      </div>

      {/* Answer */}
      <div style={{ padding:'14px 18px' }}>
        {isLoading ? (
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <div style={{ display:'flex', gap:'4px' }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#4ade80',
                  animation:'typingBounce 1.2s ease-in-out infinite', animationDelay:`${i*0.2}s` }} />
              ))}
            </div>
            <span style={{ fontSize:'12px', color:'#334155' }}>
              {entry.citations?.length > 0 ? `Found ${entry.citations.length} source chunks, generating answer…` : 'Searching knowledge base…'}
            </span>
          </div>
        ) : isError ? (
          <div style={{ display:'flex', gap:'10px', alignItems:'flex-start' }}>
            <AlertTriangle size={14} color="#f87171" style={{ flexShrink:0, marginTop:'1px' }} />
            <p style={{ margin:0, fontSize:'13px', color:'#f87171', lineHeight:1.6 }}>{entry.answer}</p>
          </div>
        ) : isFallback ? (
          <div style={{ display:'flex', gap:'10px', alignItems:'flex-start' }}>
            <div style={{ width:'22px', height:'22px', borderRadius:'6px', flexShrink:0,
              background:'rgba(251,191,36,0.1)', border:'1px solid rgba(251,191,36,0.2)',
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <AlertTriangle size={11} color="#fbbf24" />
            </div>
            <div>
              <p style={{ margin:0, fontSize:'13px', color:'#fbbf24', fontFamily:'monospace', fontWeight:500 }}>
                I don't have that information
              </p>
              <p style={{ margin:'4px 0 0', fontSize:'11.5px', color:'#334155' }}>
                Question is out of scope or similarity threshold not met.
              </p>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display:'flex', gap:'10px', alignItems:'flex-start' }}>
              <div style={{ width:'22px', height:'22px', borderRadius:'6px', flexShrink:0,
                background:'rgba(74,222,128,0.1)', border:'1px solid rgba(74,222,128,0.2)',
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                <CheckCircle size={11} color="#4ade80" />
              </div>
              <p style={{ margin:0, fontSize:'13px', color:'#e2e8f0', lineHeight:1.7, flex:1, whiteSpace:'pre-wrap' }}>
                {entry.answer}{entry.streaming && <span style={{ opacity:0.5, animation:'cursorBlink 1s infinite' }}>▊</span>}
              </p>
            </div>

            {/* Feature 1: Citations */}
            {!entry.streaming && entry.citations?.length > 0 && (
              <div style={{ marginTop:'12px', paddingLeft:'32px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'6px' }}>
                  <Database size={10} color="#4ade80" />
                  <span style={{ fontSize:'10.5px', color:'#4ade80', fontFamily:'monospace' }}>
                    {entry.citations.length} source chunk{entry.citations.length > 1 ? 's' : ''} retrieved
                  </span>
                </div>
                {entry.citations.map((c, i) => <CitationCard key={i} citation={c} index={i} />)}
              </div>
            )}

            {/* Feature 2: Memory indicator */}
            {entry.sessionId && (
              <div style={{ marginTop:'8px', paddingLeft:'32px', display:'flex', alignItems:'center', gap:'5px' }}>
                <Brain size={10} color="#818cf8" />
                <span style={{ fontSize:'10px', color:'#475569', fontFamily:'monospace' }}>
                  session {entry.sessionId.slice(0,8)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── RAGAS Eval Panel ──────────────────────────────────────────────────────────
const DEFAULT_TEST_CASES = [
  { question: 'What is the minimum efficiency rating for grid-connected inverters?', ground_truth: '97% at full load per IS 16221' },
  { question: 'What is the ACOST rate in Telangana?', ground_truth: 'Rs. 3.82 per kWh for FY 2023-24' },
  { question: 'What is the capital of France?', ground_truth: 'Paris' },
]

function EvalPanel({ onClose }) {
  const [running,   setRunning]   = useState(false)
  const [results,   setResults]   = useState(null)

async function runEval() {
    setRunning(true)
    setResults(null)
    try {
      const res = await fetch('http://localhost:8080/api/v1/qa/eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test_cases: DEFAULT_TEST_CASES }),
      })
      if (!res.ok) {
        const err = await res.text()
        setResults({ error: `HTTP ${res.status}: ${err}` })
        return
      }
      const data = await res.json()
      setResults(data)
    } catch (e) {
      setResults({ error: e.message })
    } finally {
      setRunning(false)
    }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex',
      alignItems:'center', justifyContent:'center', zIndex:100, backdropFilter:'blur(4px)' }}>
      <div style={{ background:'#0f172a', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'20px',
        padding:'28px', width:'560px', maxHeight:'80vh', overflowY:'auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <FlaskConical size={18} color="#818cf8" />
            <h2 style={{ margin:0, fontSize:'16px', fontWeight:700, color:'#f1f5f9' }}>RAGAS Evaluation</h2>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#475569', fontSize:'18px' }}>×</button>
        </div>
        <p style={{ fontSize:'12px', color:'#475569', marginBottom:'16px', lineHeight:1.6 }}>
          Runs {DEFAULT_TEST_CASES.length} test cases through the RAG pipeline and scores
          <strong style={{ color:'#94a3b8' }}> faithfulness</strong>,
          <strong style={{ color:'#94a3b8' }}> answer relevancy</strong>, and
          <strong style={{ color:'#94a3b8' }}> context precision</strong> using an LLM judge.
        </p>
        <button onClick={runEval} disabled={running}
          style={{ width:'100%', padding:'10px', borderRadius:'10px', border:'none', cursor: running ? 'not-allowed' : 'pointer',
            background: running ? 'rgba(255,255,255,0.05)' : 'rgba(99,102,241,0.15)',
            color: running ? '#334155' : '#818cf8', fontSize:'13px', fontWeight:600,
            outline:'1px solid rgba(99,102,241,0.25)', marginBottom:'16px' }}>
          {running ? 'Running evaluation…' : 'Run Evaluation'}
        </button>
        {results?.error && (
          <p style={{ fontSize:'12px', color:'#f87171' }}>Error: {results.error}</p>
        )}
        {results?.summary && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'16px' }}>
              {[
                ['Faithfulness',     results.summary.avg_faithfulness],
                ['Answer Relevancy', results.summary.avg_answer_relevancy],
                ['Context Precision',results.summary.avg_context_precision],
                ['Composite Score',  results.summary.avg_composite],
              ].map(([label, val]) => (
                <div key={label} style={{ padding:'12px', borderRadius:'10px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)' }}>
                  <p style={{ margin:0, fontSize:'10px', color:'#475569', textTransform:'uppercase', letterSpacing:'0.5px' }}>{label}</p>
                  <p style={{ margin:'4px 0 0', fontSize:'22px', fontWeight:700,
                    color: val >= 0.8 ? '#4ade80' : val >= 0.5 ? '#fbbf24' : '#f87171', fontFamily:'monospace' }}>
                    {(val * 100).toFixed(0)}%
                  </p>
                </div>
              ))}
            </div>
            {results.results.map((r, i) => (
              <div key={i} style={{ padding:'10px 12px', borderRadius:'8px', marginBottom:'6px',
                background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ margin:0, fontSize:'11.5px', color:'#94a3b8', fontWeight:500 }}>{r.question}</p>
                <p style={{ margin:'4px 0 0', fontSize:'11px', color:'#475569' }}>Answer: {r.answer?.slice(0,80)}…</p>
                <div style={{ display:'flex', gap:'8px', marginTop:'4px' }}>
                  {['faithfulness','answer_relevancy','context_precision'].map(k => (
                    <span key={k} style={{ fontSize:'10px', fontFamily:'monospace',
                      color: r[k] >= 0.8 ? '#4ade80' : r[k] >= 0.5 ? '#fbbf24' : '#f87171' }}>
                      {k.split('_')[0]}={r[k]?.toFixed(2)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function QABot() {
  const [question,     setQuestion]     = useState('')
  const [history,      setHistory]      = useState([])
  const [loading,      setLoading]      = useState(false)
  const [activeFilter, setFilter]       = useState('All')
  const [sessionId,    setSessionId]    = useState(null)
  const [useMemory,    setUseMemory]    = useState(false)
  const [showEval,     setShowEval]     = useState(false)
  const bottomRef = useRef(null)

  const categories = ['All', ...new Set(SAMPLE_QUESTIONS.map(q => q.category))]
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [history])

  async function ask(q, category) {
    const text = (q || question).trim()
    if (!text || loading) return
    setQuestion('')
    setLoading(true)

    const entry = { question: text, answer: null, citations: [], guard: null, error: false,
      category: category || null, sessionId: null, streaming: true }
    setHistory(prev => [...prev, entry])

    const sid = useMemory ? (sessionId || undefined) : undefined

    await streamQA({
      question: text,
      session_id: sid,
      onCitation: (cit) => {
        setHistory(prev => {
          const updated = [...prev]
          const last    = { ...updated[updated.length - 1] }
          last.citations = [...(last.citations || []), cit]
          updated[updated.length - 1] = last
          return updated
        })
      },
      onToken: (token) => {
        setHistory(prev => {
          const updated = [...prev]
          const last    = { ...updated[updated.length - 1] }
          last.answer   = (last.answer || '') + token
          updated[updated.length - 1] = last
          return updated
        })
      },
      onDone: (evt) => {
        if (useMemory && evt.session_id) setSessionId(evt.session_id)
        setHistory(prev => {
          const updated = [...prev]
          const last    = { ...updated[updated.length - 1] }
          last.streaming  = false
          last.sessionId  = useMemory ? evt.session_id : null
          last.guard      = 'pass'
          if (!last.answer || last.answer === "I don't have that information") {
            last.answer = "I don't have that information"
            last.guard  = evt.guard || 'no_context'
          }
          updated[updated.length - 1] = last
          return updated
        })
        setLoading(false)
      },
      onError: (err) => {
        setHistory(prev => prev.map((e, i) =>
          i === prev.length - 1
            ? { ...e, answer: `Error: ${err}`, error: true, streaming: false }
            : e
        ))
        setLoading(false)
      },
    })
  }

  const filteredSamples = activeFilter === 'All' ? SAMPLE_QUESTIONS : SAMPLE_QUESTIONS.filter(q => q.category === activeFilter)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'0' }}>
      <style>{`
        @keyframes typingBounce{0%,100%{transform:translateY(0);opacity:0.4}50%{transform:translateY(-5px);opacity:1}}
        @keyframes cardIn{from{opacity:0;transform:translateY(12px) scale(0.98)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes cursorBlink{0%,100%{opacity:1}50%{opacity:0}}
        .sample-row:hover{background:rgba(255,255,255,0.04)!important;border-color:rgba(74,222,128,0.2)!important}
        .sample-row:hover .sarrow{opacity:1!important;transform:translateX(2px)}
        .qa-input:focus-within{border-color:rgba(74,222,128,0.3)!important}
        textarea:focus{outline:none} textarea::placeholder{color:#1e293b}
        .ask-btn:hover:not(:disabled){background:rgba(74,222,128,0.2)!important;transform:scale(1.05)}
      `}</style>

      {showEval && <EvalPanel onClose={() => setShowEval(false)} />}

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'20px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <div style={{ width:'40px', height:'40px', borderRadius:'12px', background:'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.25)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 20px rgba(99,102,241,0.15)' }}>
            <BookOpen size={18} color="#818cf8" />
          </div>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <h1 style={{ margin:0, fontSize:'18px', fontWeight:700, color:'#f1f5f9', letterSpacing:'-0.3px' }}>Energy Knowledge Base</h1>
              <span style={{ fontSize:'10px', fontFamily:'monospace', padding:'2px 8px', borderRadius:'20px', background:'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.25)', color:'#818cf8' }}>RAG · STREAMING</span>
            </div>
            <p style={{ margin:0, fontSize:'11.5px', color:'#475569' }}>
              Citations · Hallucination Guard · {useMemory ? 'Memory ON' : 'Memory OFF'}
            </p>
          </div>
        </div>
        <div style={{ display:'flex', gap:'8px' }}>
          <button onClick={() => setShowEval(true)}
            style={{ display:'flex', alignItems:'center', gap:'6px', background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:'8px', padding:'6px 12px', cursor:'pointer', color:'#818cf8', fontSize:'12px', transition:'all 0.2s' }}>
            <FlaskConical size={12} /> RAGAS Eval
          </button>
          <button onClick={() => setUseMemory(m => !m)}
            style={{ display:'flex', alignItems:'center', gap:'6px', background:'none', border:`1px solid ${useMemory ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.07)'}`, borderRadius:'8px', padding:'6px 12px', cursor:'pointer', color: useMemory ? '#818cf8' : '#475569', fontSize:'12px', transition:'all 0.2s' }}>
            <Brain size={12} /> Memory {useMemory ? 'ON' : 'OFF'}
          </button>
          {history.length > 0 && (
            <button onClick={() => { setHistory([]); setSessionId(null) }}
              style={{ display:'flex', alignItems:'center', gap:'6px', background:'none', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'8px', padding:'6px 12px', cursor:'pointer', color:'#334155', fontSize:'12px', transition:'all 0.2s' }}>
              <RotateCcw size={11} /> Reset
            </button>
          )}
        </div>
      </div>

      {/* Info strip */}
      <div style={{ display:'flex', alignItems:'center', gap:'16px', padding:'10px 16px', borderRadius:'10px', marginBottom:'20px', background:'rgba(99,102,241,0.05)', border:'1px solid rgba(99,102,241,0.12)', flexWrap:'wrap' }}>
        {[
          { icon: <FileText size={11} color="#818cf8" />, label:'energy.pdf', sub:'16 pages' },
          { icon: <Database size={11} color="#4ade80" />, label:'ChromaDB', sub:'cosine sim' },
          { icon: <Shield size={11} color="#fbbf24" />,   label:'Hallucination Guard', sub:`d ≤ 0.35` },
          { icon: <Zap size={11} color="#60a5fa" />,      label:'Streaming', sub:'SSE tokens' },
        ].map((item, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:'6px' }}>
            {item.icon}
            <span style={{ fontSize:'11.5px', color:'#64748b' }}>
              <span style={{ color:'#94a3b8', fontWeight:500 }}>{item.label}</span> · {item.sub}
            </span>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="qa-input" style={{ background:'rgba(15,23,42,0.7)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:'14px', backdropFilter:'blur(12px)', padding:'12px 14px', marginBottom:'20px', transition:'border-color 0.2s', display:'flex', alignItems:'flex-end', gap:'10px' }}>
        <Search size={15} color="#334155" style={{ flexShrink:0, marginBottom:'10px' }} />
        <textarea value={question} onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); ask() } }}
          placeholder="Ask anything about energy standards, tariffs, inverters, batteries…"
          rows={1}
          style={{ flex:1, background:'none', border:'none', resize:'none', color:'#e2e8f0', fontSize:'13.5px', lineHeight:'1.6', fontFamily:'DM Sans, sans-serif', maxHeight:'80px' }} />
        <button className="ask-btn" onClick={() => ask()} disabled={!question.trim() || loading}
          style={{ flexShrink:0, width:'34px', height:'34px', borderRadius:'9px', border:'none',
            cursor: question.trim()&&!loading ? 'pointer' : 'not-allowed',
            background: question.trim()&&!loading ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
            outline: question.trim()&&!loading ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(255,255,255,0.06)',
            display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s' }}>
          <Search size={14} color={question.trim()&&!loading ? '#818cf8' : '#1e293b'} />
        </button>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginBottom:'24px' }}>
          {history.map((entry, i) => <QACard key={i} entry={entry} />)}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Sample questions */}
      {history.length === 0 && (
        <div>
          <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'14px' }}>
            {categories.map(cat => {
              const isActive = activeFilter === cat
              const c = CAT_COLORS[cat]
              return (
                <button key={cat} onClick={() => setFilter(cat)}
                  style={{ padding:'4px 12px', borderRadius:'20px', cursor:'pointer', fontSize:'11.5px', fontWeight:500, transition:'all 0.2s',
                    background: isActive && c ? c.bg : isActive ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                    border: isActive && c ? `1px solid ${c.bd}` : isActive ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.06)',
                    color: isActive && c ? c.t : isActive ? '#e2e8f0' : '#475569' }}>
                  {cat}
                </button>
              )
            })}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
            {filteredSamples.map(({ category, q }) => (
              <button key={q} className="sample-row" onClick={() => ask(q, category)}
                style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 16px', borderRadius:'12px',
                  cursor:'pointer', textAlign:'left', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', transition:'all 0.2s', width:'100%' }}>
                <Badge label={category} />
                <span style={{ flex:1, fontSize:'13px', color:'#64748b', lineHeight:1.4 }}>{q}</span>
                <ChevronRight size={13} color="#1e293b" className="sarrow" style={{ flexShrink:0, opacity:0, transition:'all 0.2s' }} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
