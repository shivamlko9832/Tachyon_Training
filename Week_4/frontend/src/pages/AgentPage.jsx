import { useState, useRef, useEffect } from 'react'
import { Send, Bot, Cpu, ChevronDown, ChevronRight, Zap, RotateCcw,
  CheckCircle, AlertTriangle, Activity, Clock, Hash, ArrowRight } from 'lucide-react'

const BASE_URL = 'http://localhost:8080'

const QUICK_COMMANDS = [
  { label: 'Turn off Dishwasher',    msg: 'Turn off the Dishwasher' },
  { label: 'Show all devices',       msg: 'Show me all devices and their current status' },
  { label: 'Energy summary',         msg: 'What is my energy usage and cost today?' },
  { label: 'Turn off all ACs',       msg: 'Turn off all air conditioning units' },
  { label: 'EV Charger status',      msg: 'What is the status of the EV Charger?' },
  { label: 'Turn on Washing Machine',msg: 'Turn on the Washing Machine' },
  { label: 'Turn off Smart TV',      msg: 'Turn off the Smart TV' },
  { label: 'Energy saving tips',     msg: 'Which devices should I turn off to save the most energy?' },
]

const TOOL_COLORS = {
  toggle_device:     { bg: 'rgba(74,222,128,0.1)',  border: 'rgba(74,222,128,0.3)',  text: '#4ade80' },
  get_device_status: { bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.3)',  text: '#60a5fa' },
  list_all_devices:  { bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.3)', text: '#a78bfa' },
  get_energy_summary:{ bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.3)',  text: '#fbbf24' },
  bulk_device_action:{ bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.3)', text: '#f87171' },
}

function ToolBadge({ name }) {
  const c = TOOL_COLORS[name] || { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)', text: '#94a3b8' }
  const short = name.replace(/_/g, ' ')
  return (
    <span style={{ fontSize:'10px', fontWeight:600, padding:'2px 8px', borderRadius:'20px',
      background:c.bg, border:`1px solid ${c.border}`, color:c.text, whiteSpace:'nowrap' }}>
      {short}
    </span>
  )
}

function ToolCallCard({ event, index }) {
  const [open, setOpen] = useState(index === 0)
  const c = TOOL_COLORS[event.tool] || { bg:'rgba(255,255,255,0.04)', border:'rgba(255,255,255,0.08)', text:'#94a3b8' }
  const isError = event.output?.error

  return (
    <div style={{ borderRadius:'10px', overflow:'hidden', border:`1px solid ${c.border}`,
      background:c.bg, marginBottom:'6px' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width:'100%', display:'flex', alignItems:'center', gap:'8px',
          padding:'8px 12px', background:'none', border:'none', cursor:'pointer', textAlign:'left' }}>
        <Cpu size={12} color={c.text} style={{ flexShrink:0 }} />
        <span style={{ fontSize:'12px', fontWeight:600, color:c.text }}>{event.tool}</span>
        <ArrowRight size={10} color={c.text} style={{ flexShrink:0 }} />
        <span style={{ fontSize:'11px', color:'#64748b', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {JSON.stringify(event.input || {})}
        </span>
        {event.duration_ms && (
          <span style={{ fontSize:'10px', color:'#334155', fontFamily:'monospace', flexShrink:0 }}>
            {event.duration_ms}ms
          </span>
        )}
        {isError
          ? <AlertTriangle size={12} color="#f87171" style={{ flexShrink:0 }} />
          : <CheckCircle size={12} color="#4ade80" style={{ flexShrink:0 }} />
        }
        {open ? <ChevronDown size={12} color="#334155" /> : <ChevronRight size={12} color="#334155" />}
      </button>
      {open && (
        <div style={{ padding:'0 12px 10px', borderTop:`1px solid rgba(255,255,255,0.06)` }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginTop:'8px' }}>
            <div>
              <p style={{ fontSize:'10px', color:'#334155', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'4px' }}>Input</p>
              <pre style={{ margin:0, fontSize:'11px', color:'#94a3b8', fontFamily:'Courier New',
                background:'rgba(0,0,0,0.2)', padding:'8px', borderRadius:'6px',
                overflowX:'auto', whiteSpace:'pre-wrap', wordBreak:'break-all' }}>
                {JSON.stringify(event.input, null, 2)}
              </pre>
            </div>
            <div>
              <p style={{ fontSize:'10px', color:'#334155', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'4px' }}>Output</p>
              <pre style={{ margin:0, fontSize:'11px', color: isError ? '#f87171' : '#82e0aa', fontFamily:'Courier New',
                background:'rgba(0,0,0,0.2)', padding:'8px', borderRadius:'6px',
                overflowX:'auto', whiteSpace:'pre-wrap', wordBreak:'break-all' }}>
                {JSON.stringify(event.output, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ConversationEntry({ entry }) {
  const [showTrace, setShowTrace] = useState(false)
  const isLoading = entry.status === 'loading'
  const isError   = entry.status === 'error'

  return (
    <div style={{ marginBottom:'20px', animation:'msgIn 0.3s ease' }}>
      {/* User message */}
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'10px' }}>
        <div style={{ maxWidth:'70%', padding:'10px 14px', borderRadius:'16px 16px 4px 16px',
          background:'linear-gradient(135deg,rgba(59,130,246,0.2),rgba(99,102,241,0.2))',
          border:'1px solid rgba(99,102,241,0.3)', fontSize:'13.5px', color:'#e2e8f0' }}>
          {entry.message}
        </div>
      </div>

      {/* Agent response card */}
      <div style={{ borderRadius:'16px', overflow:'hidden', border:'1px solid rgba(255,255,255,0.08)',
        background:'rgba(15,23,42,0.7)', backdropFilter:'blur(12px)' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'12px 16px',
          borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(255,255,255,0.02)' }}>
          <div style={{ width:'28px', height:'28px', borderRadius:'8px', flexShrink:0,
            background:'rgba(74,222,128,0.1)', border:'1px solid rgba(74,222,128,0.25)',
            display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Bot size={14} color="#4ade80" />
          </div>
          <span style={{ fontSize:'12px', fontWeight:600, color:'#94a3b8' }}>VoltStream Agent</span>

          {/* Tool badges */}
          {entry.toolEvents?.length > 0 && (
            <div style={{ display:'flex', gap:'4px', flexWrap:'wrap', flex:1 }}>
              {[...new Set(entry.toolEvents.map(e => e.tool))].map(t => (
                <ToolBadge key={t} name={t} />
              ))}
            </div>
          )}

          {/* Stats */}
          {entry.status === 'done' && (
            <div style={{ display:'flex', gap:'12px', marginLeft:'auto', flexShrink:0 }}>
              {entry.iterations && (
                <span style={{ fontSize:'10px', color:'#334155', fontFamily:'monospace' }}>
                  {entry.iterations} step{entry.iterations > 1 ? 's' : ''}
                </span>
              )}
              {entry.duration_ms && (
                <span style={{ fontSize:'10px', color:'#334155', fontFamily:'monospace' }}>
                  {entry.duration_ms}ms
                </span>
              )}
              {entry.tokens_used && (
                <span style={{ fontSize:'10px', color:'#334155', fontFamily:'monospace' }}>
                  {entry.tokens_used} tokens
                </span>
              )}
            </div>
          )}
        </div>

        {/* Tool execution trace (live during streaming) */}
        {entry.toolEvents?.length > 0 && (
          <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
            <button onClick={() => setShowTrace(t => !t)}
              style={{ display:'flex', alignItems:'center', gap:'6px', background:'none', border:'none',
                cursor:'pointer', marginBottom: showTrace ? '10px' : 0 }}>
              <Activity size={11} color="#475569" />
              <span style={{ fontSize:'11px', color:'#475569' }}>
                Execution trace — {entry.toolEvents.length} tool call{entry.toolEvents.length > 1 ? 's' : ''}
              </span>
              {showTrace ? <ChevronDown size={11} color="#475569" /> : <ChevronRight size={11} color="#475569" />}
            </button>
            {showTrace && entry.toolEvents.map((evt, i) => (
              <ToolCallCard key={i} event={evt} index={i} />
            ))}
          </div>
        )}

        {/* Response text */}
        <div style={{ padding:'14px 16px' }}>
          {isLoading && !entry.responseText ? (
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <div style={{ display:'flex', gap:'4px' }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#4ade80',
                    opacity:0.7, animation:`typingBounce 1.2s ease-in-out infinite`, animationDelay:`${i*0.2}s` }} />
                ))}
              </div>
              <span style={{ fontSize:'12px', color:'#334155' }}>
                {entry.thinkingMsg || 'Agent is thinking…'}
              </span>
            </div>
          ) : isError ? (
            <div style={{ display:'flex', gap:'8px', alignItems:'flex-start' }}>
              <AlertTriangle size={14} color="#f87171" style={{ flexShrink:0, marginTop:'1px' }} />
              <p style={{ margin:0, fontSize:'13px', color:'#f87171', lineHeight:1.6 }}>
                {entry.responseText || entry.error}
              </p>
            </div>
          ) : (
            <p style={{ margin:0, fontSize:'13px', color:'#e2e8f0', lineHeight:1.7, whiteSpace:'pre-wrap' }}>
              {entry.responseText}
              {isLoading && <span style={{ opacity:0.5, animation:'cursorBlink 1s infinite' }}>▊</span>}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AgentPage() {
  const [conversations, setConversations] = useState([])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [conversations])

  const autoResize = () => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
  }

  async function sendMessage(overrideText) {
    const msg = (overrideText || input).trim()
    if (!msg || loading) return
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setLoading(true)

    const entryId = Date.now()
    const newEntry = {
      id: entryId, message: msg, responseText: '',
      toolEvents: [], status: 'loading', thinkingMsg: 'Agent is thinking…',
    }
    setConversations(prev => [...prev, newEntry])

    const update = (patch) => setConversations(prev =>
      prev.map(e => e.id === entryId ? { ...e, ...patch } : e)
    )
    const appendTool = (toolEvt) => setConversations(prev =>
      prev.map(e => e.id === entryId ? { ...e, toolEvents: [...e.toolEvents, toolEvt] } : e)
    )
    const updateLastTool = (patch) => setConversations(prev =>
      prev.map(e => {
        if (e.id !== entryId) return e
        const tools = [...e.toolEvents]
        if (tools.length > 0) tools[tools.length - 1] = { ...tools[tools.length - 1], ...patch }
        return { ...e, toolEvents: tools }
      })
    )

    try {
      const res = await fetch(`${BASE_URL}/api/v1/agent/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      })

      if (!res.ok) {
        update({ status:'error', responseText:`HTTP ${res.status} error` })
        setLoading(false)
        return
      }

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer    = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream:true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const evt = JSON.parse(line.slice(6))
            if (evt.type === 'thinking') {
              update({ thinkingMsg: `Step ${evt.iteration}: thinking…` })
            } else if (evt.type === 'tool_call') {
              appendTool({ tool: evt.tool, input: evt.input, output: null, duration_ms: null })
            } else if (evt.type === 'tool_result') {
              updateLastTool({ output: evt.output, duration_ms: evt.duration_ms })
            } else if (evt.type === 'token') {
              setConversations(prev => prev.map(e =>
                e.id === entryId ? { ...e, responseText: (e.responseText || '') + evt.content } : e
              ))
            } else if (evt.type === 'done') {
              update({
                status: 'done', iterations: evt.iterations,
                duration_ms: evt.duration_ms, tokens_used: evt.tokens_used,
              })
              setLoading(false)
            } else if (evt.type === 'error') {
              update({ status:'error', responseText: evt.content })
              setLoading(false)
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch (err) {
      update({ status:'error', responseText: `Network error: ${err.message}. Is the backend running on port 8080?` })
      setLoading(false)
    }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'80vh' }}>
      <style>{`
        @keyframes typingBounce{0%,100%{transform:translateY(0);opacity:0.4}50%{transform:translateY(-5px);opacity:1}}
        @keyframes msgIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes cursorBlink{0%,100%{opacity:1}50%{opacity:0}}
        .send-btn:hover:not(:disabled){background:rgba(74,222,128,0.2)!important;transform:scale(1.05)}
        .send-btn:active:not(:disabled){transform:scale(0.95)}
        .cmd-chip:hover{border-color:rgba(74,222,128,0.4)!important;background:rgba(74,222,128,0.06)!important;color:#e2e8f0!important}
        textarea:focus{outline:none} textarea::placeholder{color:#334155}
      `}</style>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <div style={{ width:'40px', height:'40px', borderRadius:'12px',
            background:'rgba(74,222,128,0.1)', border:'1px solid rgba(74,222,128,0.25)',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 0 20px rgba(74,222,128,0.15)' }}>
            <Cpu size={18} color="#4ade80" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <h1 style={{ margin:0, fontSize:'18px', fontWeight:700, color:'#f1f5f9', letterSpacing:'-0.3px' }}>
                Device Control Agent
              </h1>
              <span style={{ fontSize:'10px', fontFamily:'monospace', padding:'2px 8px',
                borderRadius:'20px', background:'rgba(74,222,128,0.1)',
                border:'1px solid rgba(74,222,128,0.2)', color:'#4ade80' }}>
                WEEK 4 · AGENTIC AI
              </span>
            </div>
            <p style={{ margin:0, fontSize:'11.5px', color:'#475569' }}>
              ReAct loop · 5 tools · gpt-4o-mini · LangSmith traced
            </p>
          </div>
        </div>
        {conversations.length > 0 && (
          <button onClick={() => setConversations([])}
            style={{ display:'flex', alignItems:'center', gap:'6px', background:'none',
              border:'1px solid rgba(255,255,255,0.07)', borderRadius:'8px', padding:'6px 12px',
              cursor:'pointer', color:'#475569', fontSize:'12px', transition:'all 0.2s' }}>
            <RotateCcw size={11} /> Clear
          </button>
        )}
      </div>

      {/* Info strip */}
      <div style={{ display:'flex', alignItems:'center', gap:'16px', padding:'10px 16px',
        borderRadius:'10px', marginBottom:'20px', background:'rgba(74,222,128,0.04)',
        border:'1px solid rgba(74,222,128,0.1)', flexWrap:'wrap' }}>
        {[
          { icon:<Cpu size={11} color="#4ade80"/>,     label:'5 tools', sub:'toggle · status · list · energy · bulk' },
          { icon:<Activity size={11} color="#60a5fa"/>, label:'ReAct loop', sub:'plan → execute → observe → respond' },
          { icon:<Hash size={11} color="#fbbf24"/>,     label:'Max 5 iterations', sub:'per request' },
          { icon:<Clock size={11} color="#a78bfa"/>,    label:'Streaming SSE', sub:'live tool traces' },
        ].map((item, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:'6px' }}>
            {item.icon}
            <span style={{ fontSize:'11.5px', color:'#64748b' }}>
              <span style={{ color:'#94a3b8', fontWeight:500 }}>{item.label}</span> · {item.sub}
            </span>
          </div>
        ))}
      </div>

      {/* Quick commands */}
      {conversations.length === 0 && (
        <div style={{ marginBottom:'20px' }}>
          <p style={{ fontSize:'11px', color:'#334155', textTransform:'uppercase',
            letterSpacing:'1px', fontWeight:600, marginBottom:'10px' }}>Quick commands</p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'8px' }}>
            {QUICK_COMMANDS.map(cmd => (
              <button key={cmd.label} className="cmd-chip" onClick={() => sendMessage(cmd.msg)}
                style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)',
                  borderRadius:'20px', padding:'6px 14px', cursor:'pointer', color:'#64748b',
                  fontSize:'12.5px', transition:'all 0.2s' }}>
                {cmd.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Conversations */}
      <div style={{ flex:1, marginBottom:'16px' }}>
        {conversations.map(entry => (
          <ConversationEntry key={entry.id} entry={entry} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ background:'rgba(15,23,42,0.8)', border:'1px solid rgba(255,255,255,0.09)',
        borderRadius:'16px', backdropFilter:'blur(12px)', padding:'12px', transition:'border-color 0.2s',
        position:'sticky', bottom:0 }}
        onFocusCapture={e => e.currentTarget.style.borderColor='rgba(74,222,128,0.25)'}
        onBlurCapture={e => e.currentTarget.style.borderColor='rgba(255,255,255,0.09)'}>
        <textarea ref={textareaRef} value={input}
          onChange={e => { setInput(e.target.value); autoResize() }}
          onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
          placeholder="Tell the agent what to do… e.g. 'Turn off the Dishwasher' or 'Show all devices'"
          rows={1}
          style={{ width:'100%', background:'none', border:'none', resize:'none', color:'#e2e8f0',
            fontSize:'13.5px', lineHeight:'1.6', fontFamily:'DM Sans, sans-serif',
            padding:'0 0 10px 0', maxHeight:'120px' }} />
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:'11px', color:'#1e293b', fontFamily:'monospace' }}>
            {loading ? 'Agent running…' : 'Enter to send · Shift+Enter for new line'}
          </span>
          <button className="send-btn" onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            style={{ width:'36px', height:'36px', borderRadius:'10px', border:'none',
              cursor:input.trim()&&!loading?'pointer':'not-allowed',
              display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s',
              background:input.trim()&&!loading?'rgba(74,222,128,0.12)':'rgba(255,255,255,0.04)',
              outline:input.trim()&&!loading?'1px solid rgba(74,222,128,0.3)':'1px solid rgba(255,255,255,0.06)' }}>
            <Send size={14} color={input.trim()&&!loading?'#4ade80':'#1e293b'} />
          </button>
        </div>
      </div>
    </div>
  )
}
