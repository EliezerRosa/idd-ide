// src/pages/PageVisits.js
import { useState } from 'react';
import { Badge, Modal, EmptyState } from '../components/UI';

const fmtDateFull = d => new Date(d).toLocaleDateString('pt-BR');

export default function PageVisits({ visits, loading, onAdd, onUpdateStatus }) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ client:'', contact:'', date:'', time:'09:00', notes:'' });
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const upcoming = visits.filter(v => v.status !== 'Realizada').sort((a,b)=>a.visit_date>b.visit_date?1:-1);
  const done     = visits.filter(v => v.status === 'Realizada');

  const handleSave = async () => {
    if (!form.client || !form.date) return;
    setSaving(true);
    try { await onAdd(form); setShowModal(false); setForm({client:'',contact:'',date:'',time:'09:00',notes:''}); }
    catch (e) { alert('Erro: ' + e.message); }
    setSaving(false);
  };

  const S = {
    header: { display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24 },
    title:  { fontFamily:"'Syne',sans-serif",fontSize:24,fontWeight:800,color:'#111827' },
    sub:    { fontSize:13,color:'#9ca3af',marginTop:4 },
    btn:    { padding:'9px 16px',borderRadius:8,border:'none',background:'#C10A25',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:"'Inter',sans-serif" },
    card:   { background:'#fff',border:'1px solid #e5e7eb',borderRadius:12,overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,.05)',marginBottom:20 },
    cardHead:{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 20px',borderBottom:'1px solid #f9fafb' },
    cardTitle:{ fontFamily:"'Syne',sans-serif",fontSize:12,fontWeight:700,textTransform:'uppercase',letterSpacing:1,color:'#9ca3af' },
    grid:   { display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,padding:20 },
    vcard:  { background:'#f9fafb',border:'1px solid #e5e7eb',borderRadius:10,padding:'16px 18px',cursor:'default',position:'relative',transition:'box-shadow .15s' },
    day:    { fontFamily:"'Syne',sans-serif",fontSize:32,fontWeight:800,color:'#C10A25',lineHeight:1 },
    month:  { fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:2,color:'#9ca3af',marginBottom:10 },
    time:   { position:'absolute',top:14,right:14,fontSize:13,fontWeight:600,color:'#9ca3af' },
    client: { fontSize:14,fontWeight:600,color:'#111827' },
    contact:{ fontSize:12,color:'#9ca3af',marginTop:2 },
    table:  { width:'100%',borderCollapse:'collapse' },
    th:     { fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'.8px',color:'#9ca3af',padding:'10px 18px',textAlign:'left',borderBottom:'1px solid #f9fafb' },
    td:     { padding:'12px 18px',fontSize:13,color:'#4b5563',borderBottom:'1px solid #f9fafb' },
    fgroup: { marginBottom:16 },
    flabel: { display:'block',fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'.8px',color:'#9ca3af',marginBottom:5 },
    finput: { width:'100%',padding:'9px 13px',borderRadius:8,border:'1px solid #d1d5db',fontFamily:"'Inter',sans-serif",fontSize:13,color:'#111827',outline:'none' },
    grid2:  { display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 },
  };

  return (
    <div>
      <div style={S.header}>
        <div>
          <div style={S.title}>Visitas</div>
          <div style={S.sub}>Agenda de visitas comerciais</div>
        </div>
        <button style={S.btn} onClick={()=>setShowModal(true)}>+ Agendar Visita</button>
      </div>

      {/* Upcoming */}
      <div style={S.card}>
        <div style={S.cardHead}>
          <span style={S.cardTitle}>Próximas Visitas ({upcoming.length})</span>
        </div>
        {upcoming.length === 0 ? (
          <EmptyState icon="📅" title="Nenhuma visita agendada" sub="Agende uma visita para aparecer aqui"
            action={<button style={S.btn} onClick={()=>setShowModal(true)}>+ Agendar</button>} />
        ) : (
          <div style={S.grid}>
            {upcoming.map(v => {
              const d = new Date(v.visit_date + 'T12:00:00');
              return (
                <div key={v.id} style={S.vcard}>
                  <div style={S.time}>{v.visit_time?.slice(0,5)}</div>
                  <div style={S.day}>{d.getDate()}</div>
                  <div style={S.month}>{d.toLocaleString('pt-BR',{month:'short'}).toUpperCase()}</div>
                  <div style={S.client}>{v.client_name}</div>
                  <div style={S.contact}>{v.contact}</div>
                  {v.notes && <div style={{fontSize:11,color:'#9ca3af',marginTop:6,fontStyle:'italic'}}>"{v.notes}"</div>}
                  <div style={{marginTop:10,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <Badge status={v.status} />
                    {v.status === 'Agendada' && (
                      <button onClick={()=>onUpdateStatus(v.id,'Realizada')}
                        style={{padding:'4px 10px',borderRadius:20,border:'none',background:'#dcfce7',color:'#15803d',fontSize:11,fontWeight:600,cursor:'pointer'}}>
                        ✓ Realizada
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Done */}
      {done.length > 0 && (
        <div style={S.card}>
          <div style={S.cardHead}><span style={S.cardTitle}>Realizadas ({done.length})</span></div>
          <table style={S.table}>
            <thead><tr>
              <th style={S.th}>Cliente</th><th style={S.th}>Contato</th>
              <th style={S.th}>Data</th><th style={S.th}>Hora</th><th style={S.th}>Status</th>
            </tr></thead>
            <tbody>
              {done.map(v=>(
                <tr key={v.id}>
                  <td style={S.td}><span style={{fontWeight:600,color:'#111827'}}>{v.client_name}</span></td>
                  <td style={S.td}>{v.contact}</td>
                  <td style={S.td}>{fmtDateFull(v.visit_date)}</td>
                  <td style={S.td}>{v.visit_time?.slice(0,5)}</td>
                  <td style={S.td}><Badge status={v.status}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <Modal title="📅 Agendar Visita" onClose={()=>setShowModal(false)}
          footer={<>
            <button onClick={()=>setShowModal(false)} style={{padding:'9px 16px',borderRadius:8,border:'1px solid #d1d5db',background:'transparent',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:"'Inter',sans-serif",color:'#4b5563'}}>Cancelar</button>
            <button onClick={handleSave} disabled={saving||!form.client||!form.date}
              style={{padding:'9px 16px',borderRadius:8,border:'none',background:'#C10A25',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:"'Inter',sans-serif",opacity:saving||!form.client||!form.date?0.5:1}}>
              {saving?'Salvando…':'Confirmar Visita'}
            </button>
          </>}>
          <div style={S.grid2}>
            <div style={{...S.fgroup,gridColumn:'1/-1'}}>
              <label style={S.flabel}>Cliente *</label>
              <input style={S.finput} value={form.client} onChange={e=>set('client',e.target.value)} placeholder="Nome da empresa" />
            </div>
            <div style={S.fgroup}>
              <label style={S.flabel}>Contato</label>
              <input style={S.finput} value={form.contact} onChange={e=>set('contact',e.target.value)} placeholder="Responsável" />
            </div>
            <div style={S.fgroup}>
              <label style={S.flabel}>Horário</label>
              <input style={S.finput} type="time" value={form.time} onChange={e=>set('time',e.target.value)} />
            </div>
            <div style={{...S.fgroup,gridColumn:'1/-1'}}>
              <label style={S.flabel}>Data *</label>
              <input style={S.finput} type="date" value={form.date} onChange={e=>set('date',e.target.value)} />
            </div>
            <div style={{...S.fgroup,gridColumn:'1/-1'}}>
              <label style={S.flabel}>Objetivo / Notas</label>
              <input style={S.finput} value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="Ex: demonstração in loco, apresentar linha elétrica…" />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
