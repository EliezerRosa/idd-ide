// src/components/UI.js
import { useEffect } from 'react';

export const STATUS_CFG = {
  Aprovada:   { bg: '#dcfce7', color: '#15803d', dot: '#16a34a' },
  Negociando: { bg: '#fef3c7', color: '#b45309', dot: '#d97706' },
  Aguardando: { bg: '#dbeafe', color: '#1d4ed8', dot: '#2563eb' },
  Recusada:   { bg: '#fee2e2', color: '#b91c1c', dot: '#dc2626' },
  Agendada:   { bg: '#dbeafe', color: '#1d4ed8', dot: '#2563eb' },
  Pendente:   { bg: '#fef9c3', color: '#854d0e', dot: '#ca8a04' },
  Realizada:  { bg: '#dcfce7', color: '#15803d', dot: '#16a34a' },
};

export function Badge({ status }) {
  const c = STATUS_CFG[status] || { bg: '#f3f4f6', color: '#6b7280', dot: '#9ca3af' };
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 8px',
      borderRadius:20, fontSize:11, fontWeight:600, background:c.bg, color:c.color }}>
      <span style={{ color:c.dot, fontSize:7 }}>●</span>{status}
    </span>
  );
}

export function Toast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{ position:'fixed', bottom:24, right:24, background:'#111827', color:'#fff',
      padding:'12px 18px', borderRadius:8, fontSize:13, fontWeight:500,
      display:'flex', alignItems:'center', gap:8,
      boxShadow:'0 12px 40px rgba(0,0,0,.2)', zIndex:300,
      animation:'toastIn .2s ease' }}>
      ✓ {msg}
    </div>
  );
}

export function Modal({ title, children, onClose, footer, width = 520 }) {
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }}
      onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:12, width, maxWidth:'95vw',
        maxHeight:'90vh', overflowY:'auto', padding:28,
        boxShadow:'0 12px 40px rgba(0,0,0,.15)', animation:'slideUp .2s ease' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontFamily:"'Syne', sans-serif", fontSize:18, fontWeight:800,
          color:'#111827', marginBottom:20 }}>{title}</div>
        {children}
        {footer && (
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end',
            marginTop:20, paddingTop:16, borderTop:'1px solid #f3f4f6' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function Spinner() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
      height:200, color:'#9ca3af', fontSize:13 }}>
      Carregando…
    </div>
  );
}

export function EmptyState({ icon, title, sub, action }) {
  return (
    <div style={{ textAlign:'center', padding:'48px 24px' }}>
      <div style={{ fontSize:40, marginBottom:12 }}>{icon}</div>
      <div style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:700,
        color:'#111827', marginBottom:6 }}>{title}</div>
      <div style={{ fontSize:13, color:'#9ca3af', marginBottom:action?20:0 }}>{sub}</div>
      {action}
    </div>
  );
}
