// src/pages/PageDetail.js
import { Badge } from '../components/UI';

const fmtBRL  = v => Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:0});
const fmtDate = d => new Date(d).toLocaleDateString('pt-BR');
const STATUS  = ['Aguardando','Negociando','Aprovada','Recusada'];
const STATUS_DOT = { Aprovada:'#16a34a', Negociando:'#d97706', Aguardando:'#2563eb', Recusada:'#dc2626' };

const S = {
  header: { display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24 },
  title:  { fontFamily:"'Syne',sans-serif",fontSize:24,fontWeight:800,color:'#111827' },
  sub:    { fontSize:13,color:'#9ca3af',marginTop:4 },
  card:   { background:'#fff',border:'1px solid #e5e7eb',borderRadius:12,padding:22,boxShadow:'0 1px 3px rgba(0,0,0,.05)',marginBottom:16 },
  secTitle:{ fontFamily:"'Syne',sans-serif",fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:1,color:'#9ca3af',marginBottom:14 },
  detailGrid:{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginTop:14 },
  diLabel:{ fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'.8px',color:'#9ca3af',marginBottom:3 },
  diVal:  { fontSize:14,fontWeight:600,color:'#111827' },
  grid2:  { display:'grid',gridTemplateColumns:'1fr 1fr',gap:14 },
  btnRow: { display:'flex',gap:8,alignItems:'center' },
  btn:    (v) => ({ padding:'7px 14px',borderRadius:8,border:'1px solid',borderColor:v?'#C10A25':'#d1d5db',background:v?'#C10A25':'transparent',color:v?'#fff':'#4b5563',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:"'Inter',sans-serif" }),
  btnAction:{ padding:'9px 14px',borderRadius:8,border:'1px solid #d1d5db',background:'transparent',color:'#4b5563',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:"'Inter',sans-serif",display:'flex',alignItems:'center',gap:6,width:'100%',textAlign:'left',marginBottom:8 },
};

export default function PageDetail({ proposal: p, onBack, onUpdateStatus, onAddVisit, onExportPdf }) {
  if (!p) return null;
  return (
    <div>
      <div style={S.header}>
        <div>
          <div style={S.title}>{p.client_name}</div>
          <div style={S.sub}>Proposta #{String(p.id).slice(-8).toUpperCase()} · {p.model}</div>
        </div>
        <div style={S.btnRow}>
          <button style={S.btn(false)} onClick={onExportPdf}>⬇ PDF</button>
          <button style={S.btn(false)}>📲 WhatsApp</button>
          <Badge status={p.status} />
          <button style={{...S.btn(false),color:'#9ca3af'}} onClick={onBack}>← Voltar</button>
        </div>
      </div>

      <div style={S.card}>
        <div style={S.secTitle}>Informações da Proposta</div>
        <div style={S.detailGrid}>
          {[['Cliente',p.client_name],['Contato',p.contact],['Telefone',p.phone||'—'],['Modelo HELI',p.model,'#C10A25'],['Capacidade',p.cap],['Tração',p.tracao],['Segmento',p.segmento||'—'],['Altura',p.altura||'—'],['Data',fmtDate(p.created_at)]].map(([k,v,c])=>(
            <div key={k}>
              <div style={S.diLabel}>{k}</div>
              <div style={{...S.diVal,color:c||'#111827'}}>{v}</div>
            </div>
          ))}
          {p.obs && <div style={{gridColumn:'1/-1'}}>
            <div style={S.diLabel}>Observações</div>
            <div style={S.diVal}>{p.obs}</div>
          </div>}
        </div>

        <div style={{marginTop:20,borderTop:'2px solid #f3f4f6',paddingTop:16,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:1,color:'#9ca3af'}}>Valor Total</div>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:30,fontWeight:800,color:'#C10A25',letterSpacing:'-.5px'}}>{fmtBRL(p.value_total)}</div>
          </div>
          <div style={{textAlign:'right',fontSize:12,color:'#9ca3af'}}>
            <div>Visitas realizadas: {p.visits_count||0}</div>
            {p.desconto>0 && <div style={{color:'#16a34a',fontWeight:600}}>Desconto aplicado: {p.desconto}%</div>}
          </div>
        </div>
      </div>

      <div style={S.grid2}>
        {/* Status update */}
        <div style={S.card}>
          <div style={S.secTitle}>Atualizar Status</div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {STATUS.map(s=>(
              <button key={s} style={{...S.btnAction,borderColor:p.status===s?'#C10A25':'#e5e7eb',background:p.status===s?'#fdecea':'transparent',color:p.status===s?'#C10A25':'#4b5563'}} onClick={()=>onUpdateStatus(p.id,s)}>
                <span style={{color:STATUS_DOT[s],fontSize:8}}>●</span> {s}
                {p.status===s && <span style={{marginLeft:'auto',fontSize:11}}>✓ atual</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div style={S.card}>
          <div style={S.secTitle}>Ações Rápidas</div>
          <div>
            {[['📅 Agendar Nova Visita', onAddVisit], ['⬇ Exportar Proposta PDF', onExportPdf], ['📲 Enviar por WhatsApp', null], ['✉ Enviar por E-mail', null]].map(([l, fn]) => (
              <button key={l} style={S.btnAction} onClick={fn||undefined}>{l}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
