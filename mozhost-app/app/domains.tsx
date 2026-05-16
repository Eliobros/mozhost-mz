import { useState, useEffect, useCallback } from "react";

// ─── ICONS (inline SVG para não depender de libs) ───────────────────────────
const Icon = ({ d, size = 16, stroke = "currentColor", fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const Icons = {
  globe:    "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z",
  refresh:  "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
  lock:     "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4",
  unlock:   "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 9.9-1",
  dns:      "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
  ns:       "M5 12h14M12 5l7 7-7 7",
  transfer: "M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3",
  plus:     "M12 5v14M5 12h14",
  trash:    "M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2",
  check:    "M20 6L9 17l-5-5",
  x:        "M18 6L6 18M6 6l12 12",
  clock:    "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2",
  eye:      "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  search:   "M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z",
  copy:     "M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2M8 4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2M8 4h8",
  warn:     "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
};

// ─── API HELPER ─────────────────────────────────────────────────────────────
const API_BASE = typeof window !== 'undefined'
  ? (window.__API_BASE__ || 'https://api.mozhost.shop/api/registrar')
  : 'https://api.mozhost.shop/api/registrar';

async function api(path, opts = {}) {
  const token = localStorage.getItem('token') || '';
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

// ─── HELPERS ────────────────────────────────────────────────────────────────
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / 86400000);
}
function fmtDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}
function statusColor(status) {
  const map = { completed: '#22c55e', failed: '#ef4444', processing: '#f59e0b', pending: '#6b7280', executing: '#3b82f6' };
  return map[status] || '#6b7280';
}
function expiryColor(days) {
  if (days === null) return '#6b7280';
  if (days <= 14) return '#ef4444';
  if (days <= 30) return '#f59e0b';
  return '#22c55e';
}

// ─── TOAST ──────────────────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div style={{ position:'fixed', bottom:24, right:24, zIndex:9999, display:'flex', flexDirection:'column', gap:8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.type === 'error' ? '#1a0a0a' : t.type === 'success' ? '#0a1a0a' : '#0a0a1a',
          border: `1px solid ${t.type === 'error' ? '#7f1d1d' : t.type === 'success' ? '#14532d' : '#1e3a5f'}`,
          color: t.type === 'error' ? '#fca5a5' : t.type === 'success' ? '#86efac' : '#93c5fd',
          padding: '10px 16px', borderRadius: 8, fontSize: 13, maxWidth: 320,
          animation: 'slideIn 0.2s ease',
        }}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ─── BADGE ──────────────────────────────────────────────────────────────────
function Badge({ label, color = '#6b7280' }) {
  return (
    <span style={{
      background: color + '22', color, border: `1px solid ${color}44`,
      borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600,
      letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap',
    }}>{label}</span>
  );
}

// ─── MODAL ──────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, width = 520 }) {
  return (
    <div style={{
      position:'fixed', inset:0, zIndex:1000,
      background:'rgba(0,0,0,0.7)', backdropFilter:'blur(4px)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:16
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background:'#0f1117', border:'1px solid #1e2130', borderRadius:12,
        width:'100%', maxWidth:width, maxHeight:'90vh', overflow:'auto',
        padding:24, position:'relative'
      }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <span style={{ fontFamily:'monospace', fontWeight:700, fontSize:15, color:'#e2e8f0' }}>{title}</span>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#6b7280', cursor:'pointer', padding:4 }}>
            <Icon d={Icons.x} size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── INPUT ──────────────────────────────────────────────────────────────────
function Input({ label, ...props }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ display:'block', fontSize:12, color:'#94a3b8', marginBottom:5, fontWeight:500 }}>{label}</label>}
      <input style={{
        width:'100%', background:'#1a1d2e', border:'1px solid #2a2f45', borderRadius:7,
        padding:'9px 12px', color:'#e2e8f0', fontSize:13, outline:'none', boxSizing:'border-box',
      }} {...props} />
    </div>
  );
}

function Select({ label, children, ...props }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ display:'block', fontSize:12, color:'#94a3b8', marginBottom:5, fontWeight:500 }}>{label}</label>}
      <select style={{
        width:'100%', background:'#1a1d2e', border:'1px solid #2a2f45', borderRadius:7,
        padding:'9px 12px', color:'#e2e8f0', fontSize:13, outline:'none', boxSizing:'border-box',
      }} {...props}>{children}</select>
    </div>
  );
}

function Btn({ children, onClick, variant='primary', disabled, loading, size='md', icon, style:sx={} }) {
  const variants = {
    primary: { background:'#3b5bdb', color:'#fff', border:'none' },
    danger:  { background:'#7f1d1d', color:'#fca5a5', border:'1px solid #991b1b' },
    ghost:   { background:'transparent', color:'#94a3b8', border:'1px solid #2a2f45' },
    success: { background:'#14532d', color:'#86efac', border:'1px solid #166534' },
  };
  return (
    <button onClick={onClick} disabled={disabled || loading} style={{
      ...variants[variant],
      borderRadius: 7, cursor: disabled || loading ? 'not-allowed' : 'pointer',
      padding: size === 'sm' ? '6px 12px' : '9px 16px',
      fontSize: size === 'sm' ? 12 : 13, fontWeight: 600,
      opacity: disabled || loading ? 0.6 : 1,
      display:'inline-flex', alignItems:'center', gap:6, whiteSpace:'nowrap',
      ...sx
    }}>
      {loading ? '...' : icon}{children}
    </button>
  );
}

// ─── DNS MODAL ───────────────────────────────────────────────────────────────
function DnsModal({ domain, onClose, toast }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', type: 'A', content: '', ttl: '1800' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api(`/dns/${domain}`).then(d => { setRecords(d.records || []); setLoading(false); }).catch(() => setLoading(false));
  }, [domain]);

  async function addRecord() {
    if (!form.content) return;
    setSaving(true);
    try {
      await api(`/dns/${domain}`, { method:'POST', body: JSON.stringify(form) });
      toast('Registo DNS adicionado', 'success');
      const d = await api(`/dns/${domain}`);
      setRecords(d.records || []);
      setForm({ name:'', type:'A', content:'', ttl:'1800' });
    } catch(e) { toast(e.message, 'error'); }
    setSaving(false);
  }

  return (
    <Modal title={`DNS — ${domain}`} onClose={onClose} width={600}>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:12, color:'#64748b', marginBottom:10, fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase' }}>Registos actuais</div>
        {loading ? <div style={{ color:'#6b7280', fontSize:13 }}>A carregar...</div>
          : records.length === 0
          ? <div style={{ color:'#6b7280', fontSize:13 }}>Sem registos DNS personalizados.</div>
          : records.map((r, i) => (
            <div key={i} style={{
              display:'grid', gridTemplateColumns:'1fr 60px 1fr 60px',
              gap:8, padding:'8px 12px', background:'#1a1d2e', borderRadius:6, marginBottom:4,
              fontSize:12, color:'#cbd5e1', alignItems:'center'
            }}>
              <span style={{ fontFamily:'monospace' }}>{r.Subdomain || r.subdomain || '@'}</span>
              <Badge label={r.RecordType || r.type || '?'} color="#3b5bdb" />
              <span style={{ fontFamily:'monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.Value || r.content || '—'}</span>
              <span style={{ color:'#6b7280' }}>{r.Ttl || r.ttl}s</span>
            </div>
          ))
        }
      </div>
      <div style={{ borderTop:'1px solid #1e2130', paddingTop:18 }}>
        <div style={{ fontSize:12, color:'#64748b', marginBottom:12, fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase' }}>Adicionar registo</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 90px', gap:10 }}>
          <Input label="Nome / Subdomínio" placeholder="@ ou www" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} />
          <Select label="Tipo" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
            {['A','AAAA','CNAME','MX','TXT','NS','SRV'].map(t=><option key={t}>{t}</option>)}
          </Select>
        </div>
        <Input label="Valor / Destino" placeholder="IP, hostname ou valor" value={form.content} onChange={e=>setForm(f=>({...f,content:e.target.value}))} />
        <Input label="TTL (segundos)" type="number" value={form.ttl} onChange={e=>setForm(f=>({...f,ttl:e.target.value}))} />
        <Btn onClick={addRecord} loading={saving} icon={<Icon d={Icons.plus} size={14} />}>Adicionar</Btn>
      </div>
    </Modal>
  );
}

// ─── NS MODAL ────────────────────────────────────────────────────────────────
function NsModal({ domain, onClose, toast }) {
  const [ns, setNs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api(`/ns/${domain}`).then(d => { setNs(d.nameservers || []); setLoading(false); }).catch(() => setLoading(false));
  }, [domain]);

  async function save() {
    const list = ns.filter(Boolean);
    if (list.length < 2) { toast('Mínimo 2 nameservers', 'error'); return; }
    setSaving(true);
    try {
      await api(`/ns/${domain}`, { method:'PUT', body: JSON.stringify({ nameservers: list }) });
      toast('Nameservers actualizados', 'success');
    } catch(e) { toast(e.message, 'error'); }
    setSaving(false);
  }

  return (
    <Modal title={`Nameservers — ${domain}`} onClose={onClose}>
      {loading ? <div style={{ color:'#6b7280', fontSize:13 }}>A carregar...</div> : (
        <>
          <div style={{ marginBottom:14 }}>
            {ns.map((n, i) => (
              <div key={i} style={{ display:'flex', gap:8, marginBottom:6, alignItems:'center' }}>
                <input value={n} onChange={e => setNs(prev => { const c=[...prev]; c[i]=e.target.value; return c; })}
                  style={{ flex:1, background:'#1a1d2e', border:'1px solid #2a2f45', borderRadius:7,
                    padding:'8px 12px', color:'#e2e8f0', fontSize:13, outline:'none', fontFamily:'monospace' }} />
                <button onClick={() => setNs(prev => prev.filter((_,j)=>j!==i))}
                  style={{ background:'none', border:'none', color:'#ef4444', cursor:'pointer' }}>
                  <Icon d={Icons.trash} size={15} />
                </button>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:8, marginBottom:18 }}>
            <input value={input} onChange={e=>setInput(e.target.value)} placeholder="ns1.exemplo.com"
              style={{ flex:1, background:'#1a1d2e', border:'1px solid #2a2f45', borderRadius:7,
                padding:'8px 12px', color:'#e2e8f0', fontSize:13, outline:'none', fontFamily:'monospace' }}
              onKeyDown={e => { if(e.key==='Enter' && input.trim()) { setNs(p=>[...p,input.trim()]); setInput(''); }}} />
            <Btn size="sm" onClick={() => { if(input.trim()) { setNs(p=>[...p,input.trim()]); setInput(''); }}} icon={<Icon d={Icons.plus} size={13}/>}>Add</Btn>
          </div>
          <Btn onClick={save} loading={saving} icon={<Icon d={Icons.check} size={14}/>}>Guardar Nameservers</Btn>
        </>
      )}
    </Modal>
  );
}

// ─── TRANSFER MODAL ───────────────────────────────────────────────────────────
function TransferModal({ onClose, toast, onSuccess }) {
  const [step, setStep] = useState(1); // 1=form, 2=payment
  const [form, setForm] = useState({
    domain:'', auth_code:'', years:'1', method:'mpesa', phone:'',
    first_name:'', last_name:'', email_contact:'', address:'', city:'',
    state:'Maputo', zip:'0000', country:'MZ', phone_contact:''
  });
  const [checking, setChecking] = useState(false);
  const [info, setInfo] = useState(null);
  const [paying, setPaying] = useState(false);

  const f = (k) => e => setForm(p=>({...p,[k]:e.target.value}));

  async function check() {
    if (!form.domain) return;
    setChecking(true);
    try {
      const d = await api('/transfer/check', { method:'POST', body: JSON.stringify({ domain: form.domain }) });
      setInfo(d);
      setStep(2);
    } catch(e) { toast(e.message, 'error'); }
    setChecking(false);
  }

  async function pay() {
    setPaying(true);
    try {
      const cost = info?.transfer_price || 10;
      await api('/pay', { method:'POST', body: JSON.stringify({ ...form, action:'transfer', cost }) });
      toast('Pedido de transferência iniciado! Confirme no email WHOIS.', 'success');
      onSuccess?.();
      onClose();
    } catch(e) { toast(e.message, 'error'); }
    setPaying(false);
  }

  return (
    <Modal title="Transferir Domínio" onClose={onClose} width={560}>
      {step === 1 && (
        <>
          <div style={{ background:'#1a1d2e', borderRadius:8, padding:14, marginBottom:18, fontSize:12, color:'#94a3b8' }}>
            <div style={{ display:'flex', gap:8, alignItems:'flex-start', marginBottom:8 }}>
              <Icon d={Icons.warn} size={15} stroke="#f59e0b" />
              <strong style={{ color:'#fbbf24' }}>Pré-requisitos</strong>
            </div>
            <ul style={{ margin:0, padding:'0 0 0 20px', lineHeight:1.8 }}>
              <li>Domínio não registado/transferido nos últimos 60 dias</li>
              <li>Domínio desbloqueado no registador actual</li>
              <li>EPP/Auth Code válido</li>
              <li>Email WHOIS acessível para confirmar</li>
            </ul>
          </div>
          <Input label="Domínio a transferir" placeholder="exemplo.com" value={form.domain} onChange={f('domain')} />
          <Input label="Auth Code / EPP" placeholder="Código fornecido pelo registador actual" value={form.auth_code} onChange={f('auth_code')} />
          <Btn onClick={check} loading={checking} disabled={!form.domain || !form.auth_code}>Verificar & Continuar →</Btn>
        </>
      )}
      {step === 2 && (
        <>
          <div style={{ background:'#14532d22', border:'1px solid #166534', borderRadius:8, padding:12, marginBottom:18, fontSize:13 }}>
            <strong style={{ color:'#86efac' }}>{form.domain}</strong>
            <span style={{ color:'#94a3b8', marginLeft:10 }}>
              Transferência — {info?.transfer_price ? `$${info.transfer_price}` : 'Preço a confirmar'}
            </span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <Input label="Nome" value={form.first_name} onChange={f('first_name')} />
            <Input label="Apelido" value={form.last_name} onChange={f('last_name')} />
          </div>
          <Input label="Email de contacto" type="email" value={form.email_contact} onChange={f('email_contact')} />
          <Input label="Telefone de contacto" value={form.phone_contact} onChange={f('phone_contact')} />
          <Input label="Morada" value={form.address} onChange={f('address')} />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <Input label="Cidade" value={form.city} onChange={f('city')} />
            <Input label="País" value={form.country} onChange={f('country')} />
          </div>
          <Select label="Método de pagamento" value={form.method} onChange={f('method')}>
            <option value="mpesa">M-Pesa</option>
            <option value="emola">E-Mola</option>
            <option value="mercadopago">Mercado Pago</option>
          </Select>
          {(form.method === 'mpesa' || form.method === 'emola') &&
            <Input label="Número de telefone" placeholder="84XXXXXXX" value={form.phone} onChange={f('phone')} />
          }
          <div style={{ display:'flex', gap:10 }}>
            <Btn variant="ghost" onClick={() => setStep(1)}>← Voltar</Btn>
            <Btn onClick={pay} loading={paying}
              disabled={!form.first_name || !form.email_contact || !form.address || !form.city}>
              Pagar & Transferir
            </Btn>
          </div>
        </>
      )}
    </Modal>
  );
}

// ─── DOMAIN CARD ─────────────────────────────────────────────────────────────
function DomainCard({ domain, onDns, onNs, onRenew }) {
  const days = daysUntil(domain.expires);
  const expColor = expiryColor(days);

  return (
    <div style={{
      background:'#0f1117', border:'1px solid #1e2130', borderRadius:10,
      padding:'16px 18px', transition:'border-color 0.2s',
    }}
    onMouseEnter={e=>e.currentTarget.style.borderColor='#3b5bdb44'}
    onMouseLeave={e=>e.currentTarget.style.borderColor='#1e2130'}
    >
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Icon d={Icons.globe} size={16} stroke="#3b5bdb" />
          <span style={{ fontFamily:'monospace', fontWeight:700, fontSize:14, color:'#e2e8f0' }}>{domain.name || domain.domain}</span>
        </div>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          {domain.locked && <Badge label="Bloqueado" color="#f59e0b" />}
          {domain.auto_renew && <Badge label="Auto-renew" color="#22c55e" />}
        </div>
      </div>

      <div style={{ fontSize:12, color:'#64748b', marginBottom:14, display:'flex', gap:16, flexWrap:'wrap' }}>
        {domain.expires && (
          <span>
            Expira <strong style={{ color: expColor }}>
              {fmtDate(domain.expires)}
              {days !== null && ` (${days > 0 ? `${days}d` : 'Expirado'})`}
            </strong>
          </span>
        )}
        {domain.action && <span>Acção: <strong style={{ color:'#94a3b8' }}>{domain.action}</strong></span>}
        {domain.method && <span>Via: <strong style={{ color:'#94a3b8' }}>{domain.method}</strong></span>}
      </div>

      {/* Alerta de expiração próxima */}
      {days !== null && days <= 30 && (
        <div style={{
          background: days <= 14 ? '#7f1d1d22' : '#78350f22',
          border: `1px solid ${days <= 14 ? '#991b1b' : '#92400e'}`,
          borderRadius:6, padding:'6px 10px', fontSize:11, color: days <= 14 ? '#fca5a5' : '#fcd34d',
          marginBottom:10, display:'flex', gap:6, alignItems:'center'
        }}>
          <Icon d={Icons.warn} size={13} stroke={days <= 14 ? '#fca5a5' : '#fcd34d'} />
          {days <= 0 ? 'Domínio expirado!' : `Expira em ${days} dias. Renove agora!`}
        </div>
      )}

      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        <Btn size="sm" variant="ghost" onClick={() => onDns(domain)} icon={<Icon d={Icons.dns} size={13}/>}>DNS</Btn>
        <Btn size="sm" variant="ghost" onClick={() => onNs(domain)} icon={<Icon d={Icons.ns} size={13}/>}>Nameservers</Btn>
        <Btn size="sm" variant="ghost" onClick={() => onRenew(domain)} icon={<Icon d={Icons.refresh} size={13}/>}>Renovar</Btn>
      </div>
    </div>
  );
}

// ─── PAYMENTS TABLE ───────────────────────────────────────────────────────────
function PaymentsTable({ payments }) {
  if (!payments.length) return (
    <div style={{ color:'#6b7280', fontSize:13, textAlign:'center', padding:40 }}>Sem histórico de pagamentos.</div>
  );
  return (
    <div style={{ overflowX:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
        <thead>
          <tr style={{ borderBottom:'1px solid #1e2130' }}>
            {['Domínio','Acção','Valor USD','Montante','Método','Estado','Data'].map(h=>(
              <th key={h} style={{ padding:'8px 12px', textAlign:'left', color:'#64748b', fontWeight:600, letterSpacing:'0.05em', textTransform:'uppercase', fontSize:10 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {payments.map(p => (
            <tr key={p.id} style={{ borderBottom:'1px solid #0f1117' }}
              onMouseEnter={e=>e.currentTarget.style.background='#1a1d2e'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <td style={{ padding:'10px 12px', fontFamily:'monospace', color:'#e2e8f0' }}>{p.domain}</td>
              <td style={{ padding:'10px 12px' }}><Badge label={p.action} color="#3b5bdb"/></td>
              <td style={{ padding:'10px 12px', color:'#94a3b8' }}>${p.price_usd}</td>
              <td style={{ padding:'10px 12px', color:'#94a3b8' }}>{p.amount} {p.currency}</td>
              <td style={{ padding:'10px 12px', color:'#94a3b8', textTransform:'capitalize' }}>{p.method}</td>
              <td style={{ padding:'10px 12px' }}><Badge label={p.status} color={statusColor(p.status)}/></td>
              <td style={{ padding:'10px 12px', color:'#64748b' }}>{fmtDate(p.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── RENEW MODAL ──────────────────────────────────────────────────────────────
function RenewModal({ domain, onClose, toast, onSuccess }) {
  const [years, setYears] = useState('1');
  const [method, setMethod] = useState('mpesa');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  // Preço estimado (podes ajustar conforme TLD)
  const estimatedUSD = 12 * parseInt(years);

  async function pay() {
    if ((method === 'mpesa' || method === 'emola') && !phone) { toast('Número obrigatório', 'error'); return; }
    setLoading(true);
    try {
      await api('/pay', { method:'POST', body: JSON.stringify({
        domain: domain.name || domain.domain,
        action: 'renew', cost: estimatedUSD, method, phone, years
      })});
      toast('Renovação iniciada!', 'success');
      onSuccess?.();
      onClose();
    } catch(e) { toast(e.message, 'error'); }
    setLoading(false);
  }

  return (
    <Modal title={`Renovar — ${domain.name || domain.domain}`} onClose={onClose}>
      <Select label="Anos" value={years} onChange={e=>setYears(e.target.value)}>
        {['1','2','3','5'].map(y=><option key={y} value={y}>{y} {y==='1'?'ano':'anos'}</option>)}
      </Select>
      <div style={{ background:'#1a1d2e', borderRadius:7, padding:'10px 14px', marginBottom:14, fontSize:13, color:'#94a3b8' }}>
        Estimativa: <strong style={{ color:'#e2e8f0' }}>${estimatedUSD}</strong>
        <span style={{ fontSize:11, color:'#64748b', marginLeft:8 }}>(preço real calculado no pagamento)</span>
      </div>
      <Select label="Método de pagamento" value={method} onChange={e=>setMethod(e.target.value)}>
        <option value="mpesa">M-Pesa</option>
        <option value="emola">E-Mola</option>
        <option value="mercadopago">Mercado Pago</option>
      </Select>
      {(method === 'mpesa' || method === 'emola') &&
        <Input label="Número de telefone" placeholder="84XXXXXXX" value={phone} onChange={e=>setPhone(e.target.value)} />
      }
      <Btn onClick={pay} loading={loading} icon={<Icon d={Icons.refresh} size={14}/>}>Renovar Domínio</Btn>
    </Modal>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function DomainManager() {
  const [tab, setTab] = useState('domains');
  const [domains, setDomains] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [search, setSearch] = useState('');

  // Modais
  const [dnsModal, setDnsModal] = useState(null);
  const [nsModal, setNsModal] = useState(null);
  const [renewModal, setRenewModal] = useState(null);
  const [transferModal, setTransferModal] = useState(false);

  const toast = useCallback((msg, type='info') => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t=>t.id!==id)), 4000);
  }, []);

  const loadDomains = useCallback(async () => {
    setLoading(true);
    try {
      const [d, p] = await Promise.all([
        api('/my-domains').catch(() => ({ domains: [] })),
        api('/my-payments').catch(() => ({ payments: [] })),
      ]);
      setDomains(d.domains || []);
      setPayments(p.payments || []);
    } catch(e) { toast(e.message, 'error'); }
    setLoading(false);
  }, [toast]);

  useEffect(() => { loadDomains(); }, [loadDomains]);

  const filteredDomains = domains.filter(d =>
    (d.name || d.domain || '').toLowerCase().includes(search.toLowerCase())
  );

  const expiringSoon = domains.filter(d => { const days = daysUntil(d.expires); return days !== null && days <= 30; });

  return (
    <div style={{
      minHeight:'100vh', background:'#080b10', fontFamily:'"DM Mono", "Fira Code", monospace',
      color:'#e2e8f0', padding:'24px 16px'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;600;700&display=swap');
        * { box-sizing: border-box; }
        input, select, button { font-family: inherit; }
        @keyframes slideIn { from { transform:translateX(20px); opacity:0; } to { transform:translateX(0); opacity:1; } }
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-track { background:#0f1117; }
        ::-webkit-scrollbar-thumb { background:#2a2f45; border-radius:10px; }
      `}</style>

      <div style={{ maxWidth:960, margin:'0 auto' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28, flexWrap:'wrap', gap:12 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:2 }}>
              <Icon d={Icons.globe} size={20} stroke="#3b5bdb" />
              <h1 style={{ margin:0, fontSize:18, fontWeight:700, fontFamily:'"DM Sans", sans-serif', color:'#e2e8f0' }}>
                Domínios
              </h1>
            </div>
            <p style={{ margin:0, fontSize:12, color:'#64748b' }}>Gestão de domínios via Dynadot</p>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <Btn variant="ghost" size="sm" onClick={loadDomains} icon={<Icon d={Icons.refresh} size={13}/>}>Actualizar</Btn>
            <Btn size="sm" onClick={() => setTransferModal(true)} icon={<Icon d={Icons.transfer} size={13}/>}>Transferir</Btn>
          </div>
        </div>

        {/* Alertas de expiração */}
        {expiringSoon.length > 0 && (
          <div style={{
            background:'#78350f22', border:'1px solid #92400e', borderRadius:8,
            padding:'10px 14px', marginBottom:18, fontSize:12, color:'#fcd34d',
            display:'flex', gap:8, alignItems:'center'
          }}>
            <Icon d={Icons.warn} size={15} stroke="#fcd34d" />
            <span><strong>{expiringSoon.length}</strong> domínio(s) a expirar nos próximos 30 dias.</span>
          </div>
        )}

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:10, marginBottom:22 }}>
          {[
            { label:'Total domínios', value: domains.length, color:'#3b5bdb' },
            { label:'A expirar (30d)', value: expiringSoon.length, color: expiringSoon.length > 0 ? '#f59e0b' : '#22c55e' },
            { label:'Pagamentos', value: payments.length, color:'#64748b' },
            { label:'Completados', value: payments.filter(p=>p.status==='completed').length, color:'#22c55e' },
          ].map(s => (
            <div key={s.label} style={{ background:'#0f1117', border:'1px solid #1e2130', borderRadius:8, padding:'12px 14px' }}>
              <div style={{ fontSize:22, fontWeight:700, color:s.color }}>{s.value}</div>
              <div style={{ fontSize:11, color:'#64748b', marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:4, marginBottom:18, borderBottom:'1px solid #1e2130', paddingBottom:0 }}>
          {[
            { key:'domains', label:'Meus Domínios', icon:Icons.globe },
            { key:'payments', label:'Histórico', icon:Icons.clock },
          ].map(t => (
            <button key={t.key} onClick={()=>setTab(t.key)} style={{
              background:'none', border:'none', cursor:'pointer', padding:'8px 14px',
              fontSize:13, fontWeight:600, color: tab===t.key ? '#3b5bdb' : '#64748b',
              borderBottom: tab===t.key ? '2px solid #3b5bdb' : '2px solid transparent',
              marginBottom:-1, display:'flex', alignItems:'center', gap:6,
              transition:'color 0.2s',
            }}>
              <Icon d={t.icon} size={14} stroke="currentColor" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Search */}
        {tab === 'domains' && (
          <div style={{ position:'relative', marginBottom:16 }}>
            <Icon d={Icons.search} size={14} stroke="#64748b" />
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Pesquisar domínios..."
              style={{
                width:'100%', background:'#0f1117', border:'1px solid #1e2130', borderRadius:7,
                padding:'9px 12px 9px 32px', color:'#e2e8f0', fontSize:13, outline:'none'
              }}
            />
            <div style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}>
              <Icon d={Icons.search} size={14} stroke="#64748b" />
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div style={{ textAlign:'center', padding:60, color:'#64748b', fontSize:13 }}>A carregar...</div>
        ) : tab === 'domains' ? (
          filteredDomains.length === 0 ? (
            <div style={{
              textAlign:'center', padding:60, color:'#64748b', fontSize:13,
              background:'#0f1117', border:'1px solid #1e2130', borderRadius:10
            }}>
              {search ? 'Nenhum domínio encontrado.' : 'Ainda não tens domínios registados.'}
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:12 }}>
              {filteredDomains.map((d, i) => (
                <DomainCard key={i} domain={d}
                  onDns={() => setDnsModal(d)}
                  onNs={() => setNsModal(d)}
                  onRenew={() => setRenewModal(d)}
                />
              ))}
            </div>
          )
        ) : (
          <div style={{ background:'#0f1117', border:'1px solid #1e2130', borderRadius:10, overflow:'hidden' }}>
            <PaymentsTable payments={payments} />
          </div>
        )}
      </div>

      {/* Modais */}
      {dnsModal && <DnsModal domain={dnsModal.name||dnsModal.domain} onClose={()=>setDnsModal(null)} toast={toast} />}
      {nsModal && <NsModal domain={nsModal.name||nsModal.domain} onClose={()=>setNsModal(null)} toast={toast} />}
      {renewModal && <RenewModal domain={renewModal} onClose={()=>setRenewModal(null)} toast={toast} onSuccess={loadDomains} />}
      {transferModal && <TransferModal onClose={()=>setTransferModal(false)} toast={toast} onSuccess={loadDomains} />}
      <Toast toasts={toasts} />
    </div>
  );
}