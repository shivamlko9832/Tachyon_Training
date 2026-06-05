import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Zap, Trash2, Copy, Check, ChevronRight, Brain } from 'lucide-react'
import { streamChat } from '../data/api'

const SUGGESTIONS = [
  { label: 'Battery storage', text: 'What are the benefits of battery storage for a solar prosumer?' },
  { label: 'Net metering', text: 'How does net metering work and what credits do I earn?' },
  { label: 'ToD tariff', text: 'How can I use Time-of-Day tariffs to reduce my electricity bill?' },
  { label: 'LFP vs NMC', text: 'What is the difference between LFP and NMC battery chemistry?' },
  { label: 'EV charging', text: 'How do I integrate solar with EV charging at home?' },
  { label: 'Panel efficiency', text: 'What solar panel efficiency should I target for my rooftop?' },
]

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '4px',
        opacity: 0.4, color: '#94a3b8', transition: 'opacity 0.2s', display: 'flex', alignItems: 'center' }}
      onMouseEnter={e => e.currentTarget.style.opacity = '1'}
      onMouseLeave={e => e.currentTarget.style.opacity = '0.4'}>
      {copied ? <Check size={12} color="#4ade80" /> : <Copy size={12} />}
    </button>
  )
}

function MemoryBadge({ sessionId }) {
  if (!sessionId) return null
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px',
      background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
      borderRadius: '20px', padding: '2px 8px' }}>
      <Brain size={9} color="#818cf8" />
      <span style={{ fontSize: '9px', color: '#818cf8', fontFamily: 'monospace' }}>
        memory · {sessionId.slice(0, 8)}
      </span>
    </div>
  )
}

function Message({ msg }) {
  const isUser   = msg.role === 'user'
  const isError  = msg.role === 'error'
  const isTyping = msg.streaming && !msg.text

  return (
    <div style={{ display: 'flex', gap: '12px', flexDirection: isUser ? 'row-reverse' : 'row',
      alignItems: 'flex-start', animation: 'messageIn 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}>
      <div style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: isUser ? 'linear-gradient(135deg,#3b82f6,#6366f1)' : isError ? 'rgba(239,68,68,0.15)' : 'rgba(74,222,128,0.1)',
        border: isUser ? 'none' : isError ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(74,222,128,0.25)',
        boxShadow: isUser ? '0 0 12px rgba(99,102,241,0.3)' : isError ? 'none' : '0 0 12px rgba(74,222,128,0.15)' }}>
        {isUser ? <User size={14} color="white" /> : isError ? <span style={{fontSize:'14px'}}>⚠</span> : <Zap size={14} color="#4ade80" strokeWidth={2.5} />}
      </div>
      <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', gap: '4px',
        alignItems: isUser ? 'flex-end' : 'flex-start' }}>
        <div style={{ padding: '12px 16px',
          borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          background: isUser ? 'linear-gradient(135deg,rgba(59,130,246,0.25),rgba(99,102,241,0.25))' : isError ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${isUser ? 'rgba(99,102,241,0.35)' : isError ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)'}`,
          backdropFilter: 'blur(8px)', fontSize: '13.5px', lineHeight: '1.65',
          color: isError ? '#fca5a5' : '#e2e8f0', minWidth: isTyping ? '60px' : 'auto' }}>
          {isTyping
            ? <div style={{ display: 'flex', gap: '4px', alignItems: 'center', padding: '4px 0' }}>
                {[0,1,2].map(i => <div key={i} style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#4ade80', opacity:0.7, animation:`typingBounce 1.2s ease-in-out infinite`, animationDelay:`${i*0.2}s` }} />)}
              </div>
            : <span style={{ whiteSpace: 'pre-wrap' }}>{msg.text}{msg.streaming && <span style={{ opacity: 0.5, animation: 'cursorBlink 1s infinite' }}>▊</span>}</span>
          }
        </div>
        {!isTyping && !isUser && !isError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '4px' }}>
            {msg.tokens && <span style={{ fontSize: '10px', color: '#334155', fontFamily: 'monospace' }}>{msg.tokens} tokens</span>}
            <MemoryBadge sessionId={msg.sessionId} />
            <CopyButton text={msg.text} />
          </div>
        )}
      </div>
    </div>
  )
}

export default function AIChat() {
  const [messages,   setMessages]   = useState([{ role: 'assistant', text: "Hello! I'm VoltStream AI. I remember our conversation — ask follow-up questions and I'll keep context. What would you like to explore?", ts: Date.now() }])
  const [input,      setInput]      = useState('')
  const [loading,    setLoading]    = useState(false)
  const [sessionId,  setSessionId]  = useState(null)
  const [useMemory,  setUseMemory]  = useState(true)
  const bottomRef   = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const autoResize = () => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
  }

  async function send(overrideText) {
    const q = (overrideText || input).trim()
    if (!q || loading) return
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setLoading(true)

    const userMsg = { role: 'user', text: q, ts: Date.now() }
    const streamMsg = { role: 'assistant', text: '', streaming: true, ts: Date.now() }
    setMessages(prev => [...prev, userMsg, streamMsg])

    let sid = useMemory ? (sessionId || undefined) : undefined

    await streamChat({
      message: q,
      session_id: sid,
      onToken: (token) => {
        setMessages(prev => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last.streaming) updated[updated.length - 1] = { ...last, text: last.text + token }
          return updated
        })
      },
      onDone: (evt) => {
        if (useMemory && evt.session_id) setSessionId(evt.session_id)
        setMessages(prev => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last.streaming) updated[updated.length - 1] = {
            ...last, streaming: false, sessionId: useMemory ? evt.session_id : null
          }
          return updated
        })
        setLoading(false)
      },
      onError: (err) => {
        setMessages(prev => [
          ...prev.filter(m => !m.streaming),
          { role: 'error', text: `Error: ${err}. Is the server running on port 8080?`, ts: Date.now() }
        ])
        setLoading(false)
      },
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', maxHeight: '88vh' }}>
      <style>{`
        @keyframes typingBounce { 0%,100%{transform:translateY(0);opacity:0.4} 50%{transform:translateY(-5px);opacity:1} }
        @keyframes messageIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes cursorBlink { 0%,100%{opacity:1} 50%{opacity:0} }
        .send-btn:hover{background:rgba(74,222,128,0.2)!important;transform:scale(1.05)}
        .send-btn:active{transform:scale(0.95)}
        .suggestion-chip:hover{border-color:rgba(74,222,128,0.4)!important;background:rgba(74,222,128,0.06)!important;color:#e2e8f0!important;transform:translateY(-1px)}
        textarea:focus{outline:none} textarea::placeholder{color:#334155}
      `}</style>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <div style={{ width:'40px', height:'40px', borderRadius:'12px', background:'rgba(74,222,128,0.1)', border:'1px solid rgba(74,222,128,0.25)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 20px rgba(74,222,128,0.15)' }}>
            <Zap size={18} color="#4ade80" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <h1 style={{ margin:0, fontSize:'18px', fontWeight:700, color:'#f1f5f9', letterSpacing:'-0.3px' }}>VoltStream AI</h1>
              <span style={{ fontSize:'10px', fontFamily:'monospace', padding:'2px 8px', borderRadius:'20px', background:'rgba(74,222,128,0.1)', border:'1px solid rgba(74,222,128,0.2)', color:'#4ade80' }}>LIVE · STREAMING</span>
            </div>
            <p style={{ margin:0, fontSize:'11.5px', color:'#475569' }}>gpt-4o-mini · LangChain · {useMemory ? 'Memory ON' : 'Memory OFF'}</p>
          </div>
        </div>
        <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
          {/* Memory toggle */}
          <button onClick={() => { setUseMemory(m => !m); if (useMemory) setSessionId(null) }}
            style={{ display:'flex', alignItems:'center', gap:'6px', background:'none',
              border:`1px solid ${useMemory ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.07)'}`,
              borderRadius:'8px', padding:'6px 12px', cursor:'pointer',
              color: useMemory ? '#818cf8' : '#475569', fontSize:'12px', transition:'all 0.2s' }}>
            <Brain size={12} /> Memory {useMemory ? 'ON' : 'OFF'}
          </button>
          <button onClick={() => { setMessages(messages.slice(0,1)); setSessionId(null) }}
            style={{ display:'flex', alignItems:'center', gap:'6px', background:'none', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'8px', padding:'6px 12px', cursor:'pointer', color:'#475569', fontSize:'12px', transition:'all 0.2s' }}>
            <Trash2 size={12} /> Clear
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:'16px', paddingRight:'4px', marginBottom:'16px' }}>
        {messages.map((m, i) => <Message key={i} msg={m} />)}
        {messages.length === 1 && (
          <div style={{ paddingTop:'8px' }}>
            <p style={{ fontSize:'11px', color:'#334155', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'10px', fontWeight:600 }}>Suggested topics</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'8px' }}>
              {SUGGESTIONS.map(s => (
                <button key={s.label} className="suggestion-chip" onClick={() => send(s.text)}
                  style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'20px', padding:'6px 14px', cursor:'pointer', color:'#64748b', fontSize:'12.5px', transition:'all 0.2s', display:'flex', alignItems:'center', gap:'5px' }}>
                  <ChevronRight size={11} />{s.label}
                </button>
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ flexShrink:0, background:'rgba(15,23,42,0.8)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:'16px', backdropFilter:'blur(12px)', padding:'12px', transition:'border-color 0.2s' }}
        onFocusCapture={e => e.currentTarget.style.borderColor='rgba(74,222,128,0.25)'}
        onBlurCapture={e => e.currentTarget.style.borderColor='rgba(255,255,255,0.09)'}>
        <textarea ref={textareaRef} value={input}
          onChange={e => { setInput(e.target.value); autoResize() }}
          onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="Ask about solar, storage, tariffs… (Enter to send, Shift+Enter for new line)"
          rows={1}
          style={{ width:'100%', background:'none', border:'none', resize:'none', color:'#e2e8f0', fontSize:'13.5px', lineHeight:'1.6', fontFamily:'DM Sans, sans-serif', padding:'0 0 10px 0', maxHeight:'120px' }} />
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:'11px', color:'#1e293b', fontFamily:'monospace' }}>
            {sessionId && useMemory ? `Session: ${sessionId.slice(0,8)}` : 'No active session'}
          </span>
          <button className="send-btn" onClick={() => send()} disabled={!input.trim() || loading}
            style={{ width:'36px', height:'36px', borderRadius:'10px', border:'none', cursor: input.trim()&&!loading ? 'pointer' : 'not-allowed', display:'flex', alignItems:'center', justifyContent:'center', background: input.trim()&&!loading ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.04)', transition:'all 0.2s', outline: input.trim()&&!loading ? '1px solid rgba(74,222,128,0.3)' : '1px solid rgba(255,255,255,0.06)' }}>
            <Send size={14} color={input.trim()&&!loading ? '#4ade80' : '#1e293b'} />
          </button>
        </div>
      </div>
    </div>
  )
}
