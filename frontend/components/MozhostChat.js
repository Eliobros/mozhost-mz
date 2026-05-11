import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, RotateCcw, Bot, User, Loader2, Headphones, Clock, CheckCircle, AlertCircle } from 'lucide-react';

// Mock socket.io-client for demo — replace with: import { io } from 'socket.io-client';
const io = (url) => {
  const handlers = {};
  return {
    emit: () => {},
    on: (event, cb) => { handlers[event] = cb; },
    disconnect: () => {},
    _trigger: (event, data) => handlers[event]?.(data)
  };
};

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

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const socketRef = useRef(null);
  const waitTimerRef = useRef(null);

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

  // Socket.IO connection when ticket is created
  useEffect(() => {
    if (!ticketId) return;

    const socket = io(API_BASE);
    socketRef.current = socket;

    socket.emit('join_ticket', { ticketId });

    socket.on('agente_entrou', ({ agentName: name }) => {
      setAgentName(name);
      setTicketStatus('active');
      addSystemMessage(`✅ Agente **${name}** entrou na conversa!`);
    });

    socket.on('nova_mensagem', ({ message, agentName: name }) => {
      setMessages(prev => [...prev, {
        role: 'agent',
        content: message,
        agentName: name
      }]);
    });

    socket.on('ticket_encerrado', () => {
      setTicketStatus('closed');
      setAgentName(null);
      addSystemMessage('✅ Conversa encerrada pelo agente. Obrigado pelo contacto!');
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
