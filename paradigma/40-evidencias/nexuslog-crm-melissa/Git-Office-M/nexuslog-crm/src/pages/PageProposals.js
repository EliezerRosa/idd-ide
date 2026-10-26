// src/pages/PageProposals.js
import { useState } from 'react';
import { Badge, EmptyState } from '../components/UI';

const fmtBRL = v => Number(v).toLocaleString('pt-BR', { style:'currency', currency:'BRL', minimumFractionDigits:0 });
const fmtDate = d => new Date(d).toLocaleDateString('pt-BR', { day:'2-digit', month:'short' });

const S = {
  header: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 },
  title: { fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:800, color:'#111827' },
  sub: { fontSize:13, color:'#9ca3af', marginTop:4 },
  btn: { padding:'9px 16px', borderRadius:8, border:'none', background:'#C10A25', color:'#fff',
    fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:"'Inter',sans-serif" },
  filterRow: { display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center' },
  searchWrap: { display:'flex', alignItems:'center', gap:8, background:'#fff',
    border:'1px solid #d1d5db', borderRadius:8, padding:'8px 14px', flex:1, minWidth:200 },
  searchInput: { border:'none', background:'transparent', fontFamily:"'Inter',sans-serif",
    fontSize:13, color:'#111827', outline:'none', flex:1 },
  filterBtn: (active) => ({ padding:'7px 12px', borderRadius:8, border:'1px solid',
    borderColor: active ? '#C10A25' : '#d1d5db', background: active ? '#C10A25' : 'transparent',
    color: active ? '#fff' : '#4b5563', fontSize:12, fontWeight:600, cursor:'pointer',
    fontFamily:"'Inter',sans-serif", whiteSpace:'nowrap' }),
  card: { background:'#fff', border:'1px solid #e5e7eb', borderRadius:12,
    overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,.05)' },
  table: { width:'100%', borderCollapse:'collapse' },
  th: { fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'.8px',
    color:'#9ca3af', padding:'10px 18px', textAlign:'left', borderBottom:'1px solid #f9fafb',
    whiteSpace:'nowrap' },
  td: { padding:'13px 18px', fontSize:13, color:'#4b5563', borderBottom:'1px solid #f9fafb' },
  footer: { padding:'12px 18px', borderTop:'1px solid #f3f4f6',
    display:'flex', justifyContent:'space-between', alignItems:'center' },
};

export default function PageProposals({ proposals, onNew, onSelect }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Todos');

  const filtered = proposals.filter(p => {
    const q = search.toLowerCase();
    const ok = !q || p.client_name?.toLowerCase().includes(q) || p.model?.toLowerCase().includes(q);
    const fok = filter === 'Todos' || p.status === filter;
    return ok && fok;
  });

  const total = filtered.reduce((s, p) => s + Number(p.value_total || 0), 0);

  return (
    <div>
      <div style={S.header}>
        <div>
          <div style={S.title}>Propostas</div>
          <div style={S.sub}>{proposals.length} proposta{proposals.length !== 1 ? 's' : ''} · {fmtBRL(proposals.reduce((s,p)=>s+Number(p.value_total||0),0))} em pipeline</div>
        </div>
        <button style={S.btn} onClick={onNew}>+ Nova Proposta</button>
      </div>

      <div style={S.filterRow}>
        <div style={S.searchWrap}>
          <span style={{color:'#9ca3af'}}>🔍</span>
          <input style={S.searchInput} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar cliente, modelo…" />
          {search && <button style={{background:'none',border:'none',cursor:'pointer',color:'#9ca3af',fontSize:16}} onClick={()=>setSearch('')}>×</button>}
        </div>
        {['Todos','Aguardando','Negociando','Aprovada','Recusada'].map(s => (
          <button key={s} style={S.filterBtn(filter===s)} onClick={()=>setFilter(s)}>{s}</button>
        ))}
      </div>

      <div style={S.card}>
        {filtered.length === 0 ? (
          <EmptyState icon="📋" title="Nenhuma proposta encontrada" sub="Ajuste os filtros ou crie uma nova proposta"
            action={<button style={S.btn} onClick={onNew}>+ Nova Proposta</button>} />
        ) : (
          <>
            <div style={{overflowX:'auto'}}>
              <table style={S.table}>
                <thead><tr>
                  <th style={S.th}>#</th>
                  <th style={S.th}>Cliente</th>
                  <th style={S.th}>Modelo HELI</th>
                  <th style={S.th}>Tração</th>
                  <th style={S.th}>Valor Total</th>
                  <th style={S.th}>Visitas</th>
                  <th style={S.th}>Data</th>
                  <th style={S.th}>Status</th>
                </tr></thead>
                <tbody>
                  {filtered.map((p, i) => (
                    <tr key={p.id}
                      style={{cursor:'pointer'}}
                      onMouseEnter={e => Array.from(e.currentTarget.cells).forEach(c=>c.style.background='#f9fafb')}
                      onMouseLeave={e => Array.from(e.currentTarget.cells).forEach(c=>c.style.background='')}
                      onClick={() => onSelect(p)}>
                      <td style={{...S.td, color:'#9ca3af', fontSize:12}}>{String(i+1).padStart(2,'0')}</td>
                      <td style={S.td}>
                        <div style={{fontWeight:600,color:'#111827'}}>{p.client_name}</div>
                        <div style={{fontSize:11,color:'#9ca3af'}}>{p.contact}</div>
                      </td>
                      <td style={S.td}><span style={{fontFamily:"'Syne',sans-serif",fontSize:12,color:'#C10A25',fontWeight:700}}>{p.model}</span></td>
                      <td style={{...S.td,fontSize:12}}>{p.tracao}</td>
                      <td style={S.td}><span style={{fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700,color:'#111827'}}>{fmtBRL(p.value_total)}</span></td>
                      <td style={{...S.td,color:'#9ca3af'}}>{p.visits_count || 0}x</td>
                      <td style={{...S.td,fontSize:12,color:'#9ca3af'}}>{fmtDate(p.created_at)}</td>
                      <td style={S.td}><Badge status={p.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={S.footer}>
              <span style={{fontSize:12,color:'#9ca3af'}}>{filtered.length} resultado{filtered.length!==1?'s':''}</span>
              <span style={{fontSize:13,fontWeight:700,color:'#111827'}}>Total: {fmtBRL(total)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
