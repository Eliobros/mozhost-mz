import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, RotateCcw, Bot, User, Loader2, Headphones, Clock, CheckCircle, AlertCircle, Star } from 'lucide-react';
import { io } from 'socket.io-client';

const API_BASE = 'https://api.mozhost.shop';

const MozhostChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Olá! 👋 Sou a IA da MozHost. Posso ajudar com seus containers, arquivos, comandos e muito mais. Como posso ajudar?'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Support ticket states
  const [ticketStatus, setTicketStatus] = useState(null); // null | 'waiting' | 'active' | 'closed'
  const [ticketId, setTicketId] = useState(null);
  const [agentName, setAgentName] = useState(null);
  const [waitTime, setWaitTime] = useState(0);

  // Rating states (após ticket encerrado)
  const [rating, setRating] = useState(0);               // 0-5
  const [hoverRating, setHoverRating] = useState(0);     // hover pré-clique
  const [feedbackText, setFeedbackText] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false); // true ⇒ não mostra mais card
  const [ratingError, setRatingError] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const socketRef = useRef(null);
  const waitTimerRef = useRef(null);
  // Guarda para não disparar 2× a mensagem "Agente entrou" (socket + polling).
  const agentArrivedFiredRef = useRef(false);
  // Cursor do último id de mensagem já conhecida (socket + polling compartilham).
  const lastSeenMessageIdRef = useRef(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  // Wait timer
  useEffect(() => {
    if (ticketStatus === 'waiting') {
      waitTimerRef.current = setInterval(() => {
        setWaitTime(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(waitTimerRef.current);
      setWaitTime(0);
    }
    return () => clearInterval(waitTimerRef.current);
  }, [ticketStatus]);

  // Resetar a guarda de "agente entrou" e o cursor de mensagens sempre
  // que muda o ticket (novo ticket ⇒ histórico novo).
  useEffect(() => {
    agentArrivedFiredRef.current = false;
    lastSeenMessageIdRef.current = 0;
  }, [ticketId]);

  // Hidratar ticketId do localStorage para sobreviver a F5 / reload da aba.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const v = localStorage.getItem('mozhost_chat_ticket_id');
      if (v) {
        const id = parseInt(v, 10);
        if (Number.isInteger(id) && id > 0) setTicketId(id);
      }
    } catch {}
  }, []);

  // Persistir ticketId sempre que mudar (cancelar/reset remove).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (ticketId) localStorage.setItem('mozhost_chat_ticket_id', String(ticketId));
      else localStorage.removeItem('mozhost_chat_ticket_id');
    } catch {}
  }, [ticketId]);

  // Sincronizar estado do ticket com o backend. É o fallback quando o
  // socket.io falha em entregar 'agente_entrou' (ex: o socket caiu durante
  // uma queda de internet). Implementado com setTimeout recursivo para que
  // cada ciclo receba jitter fresco (±15%) e faça backoff exponencial em
  // erros consecutivos (cap a 30s). Limpa o localStorage se o ticket for
  // 404/403 (stale ticket de sessão anterior).
  useEffect(() => {
    if (!ticketId) return undefined;
    // Pára o loop depois do ticket estar encerrado/cancelado — já não há
    // estado novo a detetar via polling neste effect.
    if (ticketStatus === 'closed' || ticketStatus === 'cancelled') return undefined;

    let cancelled = false;
    let timeoutId = null;
    let consecutiveFailures = 0;

    const clearStaleTicket = () => {
      try { localStorage.removeItem('mozhost_chat_ticket_id'); } catch {}
      setTicketId(null);
      setTicketStatus(null);
      setAgentName(null);
      addSystemMessage('ℹ️ Esta sessão de suporte já não está disponível.');
    };

    const BASE = 8000;
    const MAX_DELAY = 30000;
    const jitter = (base) => Math.max(2000, Math.round(base * (0.85 + Math.random() * 0.30)));
    const nextDelay = () => jitter(Math.min(MAX_DELAY, BASE * Math.pow(2, consecutiveFailures))); // 8s → 16s → 30s cap

    const tick = async () => {
      if (cancelled) return;
      try {
        const token = localStorage.getItem('mozhost_token');
        if (!token) {
          timeoutId = setTimeout(tick, nextDelay());
          return;
        }
        const res = await fetch(`${API_BASE}/api/support/ticket/${ticketId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (cancelled) return;

        // Stale cleanup: o ticket já não existe ou não é nosso.
        if (res.status === 404 || res.status === 403) {
          if (!cancelled) clearStaleTicket();
          return; // Não voltar a agendar — estado limpo.
        }

        const data = await res.json();
        if (cancelled) return;

        consecutiveFailures = 0;

        if (data.success && data.ticket) {
          const t = data.ticket;
          if (t.status === 'active') {
            if (!agentArrivedFiredRef.current) {
              agentArrivedFiredRef.current = true;
              const finalName = t.agent_name || 'Agente';
              setAgentName(finalName);
              setTicketStatus('active');
              addSystemMessage(`✅ Agente **${finalName}** entrou na conversa!`);
            }
          } else if (t.status === 'closed' || t.status === 'cancelled') {
            setTicketStatus((cur) => (cur === 'closed' ? cur : 'closed'));
            setAgentName(null);
          }
        }
      } catch {
        consecutiveFailures++;
      }
      if (!cancelled) timeoutId = setTimeout(tick, nextDelay());
    };

    // Sync imediato cobre F5 / reload / ticket restaurado do localStorage.
    tick();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [ticketId, ticketStatus]);

  // Polling de mensagens do agente enquanto o ticket está `active` —
  // garante que toda mensagem chega mesmo se o socket.io falhar em
  // entregar `nova_mensagem`. setTimeout recursivo com jitter ±15% e
  // backoff exponencial (cap 30s) em erros consecutivos. O cursor
  // `lastSeenMessageIdRef` é compartilhado com o socket handler para
  // dedup. Se o polling apanhar 404/403 → limpa o estado também.
  useEffect(() => {
    if (!ticketId || ticketStatus !== 'active') return undefined;

    let cancelled = false;
    let timeoutId = null;
    let consecutiveFailures = 0;

    const clearStaleTicket = () => {
      try { localStorage.removeItem('mozhost_chat_ticket_id'); } catch {}
      setTicketId(null);
      setTicketStatus(null);
      setAgentName(null);
    };

    const BASE = 5000;
    const MAX_DELAY = 30000;
    const jitter = (base) => Math.max(2000, Math.round(base * (0.85 + Math.random() * 0.30)));
    const nextDelay = () => jitter(Math.min(MAX_DELAY, BASE * Math.pow(2, consecutiveFailures))); // 5s → 10s → 20s → 30s cap

    const tick = async () => {
      if (cancelled) return;
      try {
        const token = localStorage.getItem('mozhost_token');
        if (!token) {
          timeoutId = setTimeout(tick, nextDelay());
          return;
        }
        const res = await fetch(
          `${API_BASE}/api/support/ticket/${ticketId}/messages?after=${lastSeenMessageIdRef.current}&sender=agent`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        if (cancelled) return;

        if (res.status === 404 || res.status === 403) {
          if (!cancelled) clearStaleTicket();
          return;
        }

        const data = await res.json();
        if (cancelled) return;

        consecutiveFailures = 0;

        if (data.success) {
          const incoming = data.messages || [];
          if (incoming.length > 0) {
            const newMsgs = [];
            let maxId = lastSeenMessageIdRef.current;
            for (const m of incoming) {
              if (m.id > maxId) maxId = m.id;
              newMsgs.push({
                id: m.id,
                role: 'agent',
                content: m.message,
                agentName: m.agent_name || undefined,
              });
            }
            lastSeenMessageIdRef.current = maxId;

            setMessages((prev) => {
              // Dedup contra o que o socket.io já entregou (mesmo id).
              const existing = new Set(prev.filter((p) => p.id != null).map((p) => p.id));
              const unique = newMsgs.filter((m) => !existing.has(m.id));
              if (unique.length === 0) return prev;
              return [...prev, ...unique];
            });
          }
        }
      } catch {
        consecutiveFailures++;
      }
      if (!cancelled) timeoutId = setTimeout(tick, nextDelay());
    };

    // Fetch imediato cobre mensagens que o socket possa ter falhado em
    // entregar logo após o agente entrar.
    tick();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [ticketId, ticketStatus]);

  // Socket.IO connection when ticket is created
  useEffect(() => {
    if (!ticketId) return;

    // 🔧 FIX: o mock antigo apenas guardava handlers mas nunca ligava ao
    // backend (emit fazia no-op). Agora ligamos ao socket.io real e
    // passamos o JWT em `auth` — o backend aceita `socket.handshake.auth.token`
    // ou `socket.handshake.query.token` (ver server.js).
    const token = (typeof window !== 'undefined' && localStorage.getItem('mozhost_token')) || null;
    const socket = io(API_BASE, {
      auth: { token },
      query: token ? { token } : undefined,
      transports: ['websocket', 'polling'],
      reconnection: true,
    });
    socketRef.current = socket;

    socket.on('connect_error', (err) => {
      // Token expirado/inválido ou CORS/proxy mal configurado
      console.error('[Socket] erro de ligação:', err.message);
    });

    socket.emit('join_ticket', { ticketId });

    socket.on('agente_entrou', ({ agentName: name }) => {
      // Garante idempotência com o polling de fallback: só a primeira
      // fonte a detectar a chegada do agente dispara a mensagem de sistema.
      if (agentArrivedFiredRef.current) return;
      agentArrivedFiredRef.current = true;
      const finalName = name || 'Agente';
      setAgentName(finalName);
      setTicketStatus('active');
      addSystemMessage(`✅ Agente **${finalName}** entrou na conversa!`);
    });

    socket.on('nova_mensagem', ({ id, message, agentName: name }) => {
      // Mantém o cursor sincronizado para o polling não buscar de novo a mesma msg.
      if (typeof id === 'number' && id > lastSeenMessageIdRef.current) {
        lastSeenMessageIdRef.current = id;
      }
      setMessages(prev => {
        // Dedup: quando o socket E o polling entregam a mesma mensagem,
        // fica uma só entrada (chave = id).
        if (id != null && prev.some(p => p.id === id)) return prev;
        return [...prev, {
          id,
          role: 'agent',
          content: message,
          agentName: name,
        }];
      });
    });

    socket.on('ticket_encerrado', () => {
      setTicketStatus('closed');
      setAgentName(null);
      addSystemMessage('✅ Conversa encerrada pelo agente.');
      // Mostrar avaliação (caso ainda não tenha sido submetida)
      if (!ratingSubmitted) {
        addSystemMessage('⭐ Que tal avaliar este atendimento? Diga-nos o que achou!');
      }
    });

    return () => socket.disconnect();
  }, [ticketId]);

  const addSystemMessage = (content) => {
    setMessages(prev => [...prev, { role: 'system', content }]);
  };

  const formatWaitTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const sendMessage = async () => {
    const msg = input.trim();
    if (!msg || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);

    // If ticket is active, send to agent via support API
    if (ticketStatus === 'active' && ticketId) {
      try {
        const token = localStorage.getItem('mozhost_token');
        await fetch(`${API_BASE}/api/support/message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ ticketId, message: msg })
        });
      } catch {
        addSystemMessage('❌ Erro ao enviar mensagem. Tente novamente.');
      }
      return;
    }

    // Otherwise send to AI
    setLoading(true);
    try {
      const token = localStorage.getItem('mozhost_token');
      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: msg })
      });

      const data = await res.json();

      if (data.success) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);

        // Check if AI is escalating to human support
        if (data.escalate) {
          await createSupportTicket(msg, data.summary);
        }
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `❌ Erro: ${data.error || 'Falha ao processar mensagem'}`
        }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Erro de conexão. Tente novamente.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const createSupportTicket = async (lastMessage, summary) => {
    try {
      const token = localStorage.getItem('mozhost_token');
      const res = await fetch(`${API_BASE}/api/support/ticket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          lastMessage,
          summary,
          conversationHistory: messages
        })
      });

      const data = await res.json();
      if (data.success) {
        setTicketId(data.ticketId);
        setTicketStatus('waiting');
        addSystemMessage('⏳ A aguardar um agente disponível...');
      }
    } catch {
      addSystemMessage('❌ Erro ao criar ticket de suporte.');
    }
  };

  const requestHumanSupport = async () => {
    if (ticketStatus) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('mozhost_token');
      const res = await fetch(`${API_BASE}/api/support/ticket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          lastMessage: 'Solicitação manual de suporte humano',
          summary: 'Utilizador solicitou suporte humano manualmente',
          conversationHistory: messages
        })
      });

      const data = await res.json();
      if (data.success) {
        setTicketId(data.ticketId);
        setTicketStatus('waiting');
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '🎫 Ticket criado! Estou a passar a sua conversa para um agente humano. Por favor aguarde...'
        }]);
      }
    } catch {
      addSystemMessage('❌ Erro ao solicitar suporte humano.');
    } finally {
      setLoading(false);
    }
  };

  const cancelTicket = async () => {
    if (!ticketId) return;
    try {
      const token = localStorage.getItem('mozhost_token');
      await fetch(`${API_BASE}/api/support/ticket/${ticketId}/cancel`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch {}
    setTicketId(null);
    setTicketStatus(null);
    setAgentName(null);
    addSystemMessage('❌ Pedido de suporte cancelado.');
  };

  const resetChat = async () => {
    if (ticketStatus === 'active') return;
    try {
      const token = localStorage.getItem('mozhost_token');
      await fetch(`${API_BASE}/api/ai/reset`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch {}
    setMessages([{ role: 'assistant', content: 'Conversa reiniciada! 🔄 Como posso ajudar?' }]);
    setTicketId(null);
    setTicketStatus(null);
    setAgentName(null);
    // Reset rating state
    setRating(0);
    setHoverRating(0);
    setFeedbackText('');
    setSubmittingRating(false);
    setRatingSubmitted(false);
    setRatingError(null);
  };

  // Buscar ticket rating ao montar (caso o utilizador já tenha avaliado)
  useEffect(() => {
    const checkExistingRating = async () => {
      if (!ticketId) return;
      try {
        const token = localStorage.getItem('mozhost_token');
        const res = await fetch(`${API_BASE}/api/support/ticket/${ticketId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.ticket?.rating) {
          setRating(data.ticket.rating);
          setRatingSubmitted(true);
        }
      } catch {}
    };
    checkExistingRating();
  }, [ticketId]);

  const submitRating = async () => {
    if (!ticketId || rating < 1 || submittingRating) return;
    setSubmittingRating(true);
    setRatingError(null);
    try {
      const token = localStorage.getItem('mozhost_token');
      const res = await fetch(`${API_BASE}/api/support/ticket/${ticketId}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rating, message: feedbackText.trim() || null })
      });
      const data = await res.json();
      if (data.success) {
        setRatingSubmitted(true);
        addSystemMessage('✅ Obrigado pelo seu feedback! A sua avaliação ajuda-nos a melhorar.');
      } else {
        setRatingError(data.error || 'Erro ao enviar avaliação');
      }
    } catch (e) {
      setRatingError('Erro de conexão. Tente novamente.');
    } finally {
      setSubmittingRating(false);
    }
  };

  const renderRatingCard = () => {
    if (ticketStatus !== 'closed') return null;
    if (ratingSubmitted) {
      // Mostra confirmação bonita com a nota
      return (
        <div style={{
          margin: '8px 12px',
          padding: '12px 14px',
          background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
          border: '1px solid #86efac',
          borderRadius: '14px',
          animation: 'fadeInUp 0.3s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <CheckCircle size={14} style={{ color: '#16a34a' }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#15803d' }}>
              Avaliação enviada — obrigado!
            </span>
          </div>
          <div style={{ display: 'flex', gap: '2px' }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                size={14}
                fill={n <= rating ? '#facc15' : 'transparent'}
                color={n <= rating ? '#facc15' : '#cbd5e1'}
              />
            ))}
          </div>
        </div>
      );
    }
    return (
      <div style={{
        margin: '8px 12px',
        padding: '14px',
        background: 'linear-gradient(135deg, #fefce8, #fef3c7)',
        border: '1px solid #fde68a',
        borderRadius: '14px',
        animation: 'fadeInUp 0.3s ease-out',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px'
        }}>
          <Star size={14} fill="#f59e0b" color="#f59e0b" />
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#92400e' }}>
            Como avalia este atendimento?
          </span>
        </div>

        {/* Estrelas */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '12px'
        }}>
          {[1, 2, 3, 4, 5].map((n) => {
            const isActive = n <= (hoverRating || rating);
            return (
              <button
                key={n}
                type="button"
                aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
                onClick={() => setRating(n)}
                onMouseEnter={() => setHoverRating(n)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'transform 0.15s ease, background 0.15s ease'
                }}
                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseLeave={(e) => {
  setHoverRating(0);
  e.currentTarget.style.transform = 'scale(1)';
}}
              >
                <Star
                  size={28}
                  fill={isActive ? '#facc15' : 'transparent'}
                  color={isActive ? '#facc15' : '#cbd5e1'}
                  strokeWidth={isActive ? 1.5 : 2}
                />
              </button>
            );
          })}
        </div>

        {/* Textarea opcional */}
        <textarea
          value={feedbackText}
          onChange={(e) => setFeedbackText(e.target.value.slice(0, 4000))}
          placeholder="(Opcional) Conte-nos o que achou do atendimento…"
          rows={2}
          style={{
            width: '100%',
            resize: 'none',
            border: '1.5px solid #fde68a',
            borderRadius: '10px',
            padding: '8px 12px',
            fontSize: '12px',
            outline: 'none',
            fontFamily: 'inherit',
            background: 'white',
            color: '#1e293b',
            marginBottom: '10px'
          }}
          onFocus={(e) => e.target.style.borderColor = '#f59e0b'}
          onBlur={(e) => e.target.style.borderColor = '#fde68a'}
        />

        {ratingError && (
          <div style={{
            fontSize: '11px',
            color: '#dc2626',
            marginBottom: '8px',
            padding: '6px 10px',
            background: '#fef2f2',
            borderRadius: '8px',
            border: '1px solid #fecaca'
          }}>
            ❌ {ratingError}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={submitRating}
            disabled={rating < 1 || submittingRating}
            style={{
              flex: 1,
              padding: '10px',
              background: (rating < 1 || submittingRating)
                ? '#e5e7eb'
                : 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: (rating < 1 || submittingRating) ? '#9ca3af' : 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: (rating < 1 || submittingRating) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            {submittingRating ? (
              <>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                A enviar…
              </>
            ) : (
              <>⭐ Enviar avaliação</>
            )}
          </button>
          <button
            type="button"
            onClick={async () => {
              // Submete "saltar" → ainda deixa o agente saber que não avaliou, mas com rating=0
              setRatingSubmitted(true);
              addSystemMessage('👍 Tudo bem, pode iniciar uma nova conversa quando quiser.');
            }}
            disabled={submittingRating}
            style={{
              padding: '10px 14px',
              background: 'transparent',
              color: '#92400e',
              border: '1px solid #fde68a',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: submittingRating ? 'not-allowed' : 'pointer'
            }}
          >
            Saltar
          </button>
        </div>
      </div>
    );
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatMessage = (text) => {
    const formatted = text
      .replace(/```([\s\S]*?)```/g, '<pre style="background:#1e1e2e;color:#a6e3a1;padding:12px;border-radius:8px;margin:8px 0;font-size:11px;overflow-x:auto;white-space:pre-wrap;font-family:monospace">$1</pre>')
      .replace(/`([^`]+)`/g, '<code style="background:#e8e8f0;color:#d63031;padding:2px 6px;border-radius:4px;font-size:11px;font-family:monospace">$1</code>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>');
    return <div dangerouslySetInnerHTML={{ __html: formatted }} />;
  };

  const getStatusBar = () => {
    if (ticketStatus === 'waiting') {
      return (
        <div style={{
          margin: '0 12px 8px',
          padding: '10px 14px',
          background: 'linear-gradient(135deg, #fff8e1, #fff3cd)',
          border: '1px solid #ffc107',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Loader2 size={14} style={{ color: '#f59e0b', animation: 'spin 1s linear infinite', flexShrink: 0 }} />
            <div>
              <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#92400e' }}>
                A aguardar agente...
              </p>
              <p style={{ margin: 0, fontSize: '10px', color: '#b45309' }}>
                Tempo de espera: {formatWaitTime(waitTime)}
              </p>
            </div>
          </div>
          <button
            onClick={cancelTicket}
            style={{
              background: 'none',
              border: '1px solid #f59e0b',
              borderRadius: '6px',
              padding: '3px 8px',
              fontSize: '10px',
              color: '#92400e',
              cursor: 'pointer',
              fontWeight: 600,
              whiteSpace: 'nowrap'
            }}
          >
            Cancelar
          </button>
        </div>
      );
    }

    if (ticketStatus === 'active') {
      return (
        <div style={{
          margin: '0 12px 8px',
          padding: '10px 14px',
          background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
          border: '1px solid #22c55e',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{
            width: '8px', height: '8px',
            borderRadius: '50%',
            background: '#22c55e',
            flexShrink: 0,
            boxShadow: '0 0 0 3px rgba(34,197,94,0.2)'
          }} />
          <div>
            <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: '#15803d' }}>
              Agente conectado
            </p>
            {agentName && (
              <p style={{ margin: 0, fontSize: '10px', color: '#16a34a' }}>
                A falar com {agentName}
              </p>
            )}
          </div>
        </div>
      );
    }

    if (ticketStatus === 'closed') {
      return (
        <div style={{
          margin: '0 12px 8px',
          padding: '10px 14px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle size={14} style={{ color: '#64748b', flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
            Conversa de suporte encerrada
          </p>
        </div>
      );
    }

    return null;
  };

  const getBubbleStyle = (role) => {
    const base = {
      padding: '10px 14px',
      borderRadius: '18px',
      fontSize: '13px',
      lineHeight: '1.5',
      maxWidth: '100%',
      wordBreak: 'break-word'
    };

    switch (role) {
      case 'user':
        return {
          ...base,
          background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          color: 'white',
          borderTopRightRadius: '4px'
        };
      case 'assistant':
        return {
          ...base,
          background: 'white',
          color: '#1e293b',
          border: '1px solid #e2e8f0',
          borderTopLeftRadius: '4px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
        };
      case 'agent':
        return {
          ...base,
          background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
          color: 'white',
          borderTopLeftRadius: '4px'
        };
      case 'system':
        return {
          padding: '6px 12px',
          borderRadius: '20px',
          fontSize: '11px',
          background: '#f1f5f9',
          color: '#64748b',
          textAlign: 'center',
          margin: '0 auto',
          maxWidth: '80%'
        };
      default:
        return base;
    }
  };

  const getAvatarStyle = (role) => {
    const base = {
      width: '28px', height: '28px',
      borderRadius: '50%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, marginTop: '2px'
    };
    if (role === 'user') return { ...base, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' };
    if (role === 'agent') return { ...base, background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)' };
    return { ...base, background: 'linear-gradient(135deg, #6366f1, #3b82f6)' };
  };

  const getHeaderSubtitle = () => {
    if (ticketStatus === 'waiting') return '⏳ A aguardar agente...';
    if (ticketStatus === 'active') return agentName ? `💬 ${agentName} está consigo` : '💬 Agente conectado';
    if (ticketStatus === 'closed') return '✅ Conversa encerrada';
    return 'Assistente inteligente';
  };

  return (
    <>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        .chat-panel { animation: fadeInUp 0.2s ease-out; }
        .msg-item { animation: fadeInUp 0.15s ease-out; }
        .send-btn:not(:disabled):hover { transform: scale(1.05); }
        .send-btn { transition: transform 0.15s ease; }
        .action-btn:hover { background: rgba(255,255,255,0.25) !important; }
      `}</style>

      {/* Chat Panel */}
      {isOpen && (
        <div className="chat-panel" style={{
          position: 'fixed',
          bottom: '80px',
          right: '16px',
          width: 'min(calc(100vw - 32px), 384px)',
          height: '520px',
          background: 'white',
          borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 4px 20px rgba(0,0,0,0.08)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 9999,
          overflow: 'hidden'
        }}>

          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px', height: '36px',
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {ticketStatus === 'active'
                  ? <Headphones size={18} color="white" />
                  : <Bot size={18} color="white" />
                }
              </div>
              <div>
                <h3 style={{ margin: 0, color: 'white', fontWeight: 700, fontSize: '14px' }}>
                  MozHost IA
                </h3>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)', fontSize: '11px' }}>
                  {getHeaderSubtitle()}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {!ticketStatus && (
                <button
                  className="action-btn"
                  onClick={requestHumanSupport}
                  title="Falar com suporte humano"
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  <Headphones size={15} color="white" />
                </button>
              )}
              {!ticketStatus && (
                <button
                  className="action-btn"
                  onClick={resetChat}
                  title="Reiniciar conversa"
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  <RotateCcw size={15} color="white" />
                </button>
              )}
              <button
                className="action-btn"
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                <X size={15} color="white" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            background: '#f8fafc'
          }}>
            {messages.map((msg, i) => (
              <div key={i} className="msg-item" style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : msg.role === 'system' ? 'center' : 'flex-start'
              }}>
                {msg.role === 'system' ? (
                  <div style={getBubbleStyle('system')}>{msg.content}</div>
                ) : (
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    maxWidth: '85%',
                    flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                    alignItems: 'flex-end'
                  }}>
                    <div style={getAvatarStyle(msg.role)}>
                      {msg.role === 'user'
                        ? <User size={14} color="white" />
                        : msg.role === 'agent'
                          ? <Headphones size={14} color="white" />
                          : <Bot size={14} color="white" />
                      }
                    </div>
                    <div>
                      {msg.role === 'agent' && msg.agentName && (
                        <p style={{ margin: '0 0 3px 4px', fontSize: '10px', color: '#0ea5e9', fontWeight: 600 }}>
                          {msg.agentName}
                        </p>
                      )}
                      <div style={getBubbleStyle(msg.role)}>
                        {msg.role === 'user' ? msg.content : formatMessage(msg.content)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="msg-item" style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                  <div style={getAvatarStyle('assistant')}>
                    <Bot size={14} color="white" />
                  </div>
                  <div style={{
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '18px',
                    borderBottomLeftRadius: '4px',
                    padding: '12px 16px',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
                  }}>
                    <Loader2 size={14} style={{ color: '#6366f1', animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>A processar...</span>
                  </div>
                </div>
              </div>
            )}
            {renderRatingCard()}
            <div ref={messagesEndRef} />
          </div>

          {/* Status Bar */}
          {getStatusBar()}

          {/* Input */}
          <div style={{
            padding: '10px 12px',
            borderTop: '1px solid #e2e8f0',
            background: 'white',
            flexShrink: 0
          }}>
            {ticketStatus === 'closed' ? (
              <button
                onClick={resetChat}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Iniciar nova conversa
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    ticketStatus === 'waiting'
                      ? 'A aguardar agente...'
                      : ticketStatus === 'active'
                        ? 'Escreva para o agente...'
                        : 'Digite sua mensagem...'
                  }
                  disabled={loading || ticketStatus === 'waiting'}
                  rows={1}
                  style={{
                    flex: 1,
                    resize: 'none',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    fontSize: '13px',
                    outline: 'none',
                    maxHeight: '80px',
                    minHeight: '40px',
                    fontFamily: 'inherit',
                    lineHeight: '1.4',
                    background: ticketStatus === 'waiting' ? '#f8fafc' : 'white',
                    color: '#1e293b',
                    transition: 'border-color 0.15s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                />
                <button
                  className="send-btn"
                  onClick={sendMessage}
                  disabled={!input.trim() || loading || ticketStatus === 'waiting'}
                  style={{
                    padding: '10px',
                    background: (!input.trim() || loading || ticketStatus === 'waiting')
                      ? '#e2e8f0'
                      : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                    color: (!input.trim() || loading || ticketStatus === 'waiting') ? '#94a3b8' : 'white',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: (!input.trim() || loading || ticketStatus === 'waiting') ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Send size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '16px',
          right: '16px',
          width: '56px', height: '56px',
          borderRadius: '50%',
          border: 'none',
          background: isOpen
            ? '#475569'
            : ticketStatus === 'active'
              ? 'linear-gradient(135deg, #0ea5e9, #06b6d4)'
              : ticketStatus === 'waiting'
                ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999,
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          transition: 'all 0.3s ease',
          transform: isOpen ? 'rotate(0deg)' : 'rotate(0deg)'
        }}
      >
        {isOpen
          ? <X size={22} color="white" />
          : ticketStatus === 'active'
            ? <Headphones size={22} color="white" />
            : ticketStatus === 'waiting'
              ? <Clock size={22} color="white" />
              : <MessageCircle size={22} color="white" />
        }

        {/* Notification dot for waiting */}
        {ticketStatus === 'waiting' && !isOpen && (
          <div style={{
            position: 'absolute',
            top: '2px', right: '2px',
            width: '12px', height: '12px',
            background: '#ef4444',
            borderRadius: '50%',
            border: '2px solid white',
            animation: 'pulse 1.5s infinite'
          }} />
        )}
      </button>
    </>
  );
};

export default MozhostChat;
