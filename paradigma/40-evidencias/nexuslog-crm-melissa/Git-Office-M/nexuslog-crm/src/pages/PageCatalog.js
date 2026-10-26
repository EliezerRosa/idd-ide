// src/pages/PageCatalog.js
import { useState } from 'react';

const HELI_PRODUCTS = [
  { id:'cpd30k2',  linha:'eletrica',  model:'CPD30K2 Li',       cap:'3.000 kg', tracao:'Elétrica Lítio', tag:'⭐ Mais vendido', specs:{Bateria:'48V Lítio',Garantia:'6 anos / 12.000h',Ciclos:'+5.000',Emissão:'Zero',Controlador:'ZAPI AC'} },
  { id:'cpd25li',  linha:'eletrica',  model:'CPD25 Li',          cap:'2.500 kg', tracao:'Elétrica Lítio', tag:'',              specs:{Bateria:'48V Lítio',Garantia:'6 anos / 12.000h',Ciclos:'+5.000',Emissão:'Zero',Controlador:'ZAPI AC'} },
  { id:'cpd1538',  linha:'eletrica',  model:'CPD15/38-A7LiH4',   cap:'1.500–3.800 kg', tracao:'Elétrica Lítio', tag:'Câmara fria',   specs:{Bateria:'48V Lítio',Garantia:'6 anos / 12.000h',Ciclos:'+5.000',Emissão:'Zero',Controlador:'ZAPI AC'} },
  { id:'cpd1520',  linha:'eletrica',  model:'CPD15/20SQ',        cap:'1.500–2.000 kg', tracao:'Elétrica Lítio', tag:'Corredor estreito', specs:{Bateria:'24V Lítio',Garantia:'6 anos',Ciclos:'+5.000',Emissão:'Zero',Controlador:'CURTIS'} },
  { id:'cpcd25g',  linha:'glp',       model:'CPCD25 GLP',        cap:'2.500 kg', tracao:'GLP',            tag:'',              specs:{Motor:'Nissan K25',Transmissão:'Powershift',Velocidade:'19 km/h',Freio:'Tambor'} },
  { id:'cpcd35g',  linha:'glp',       model:'CPCD35 GLP',        cap:'3.500 kg', tracao:'GLP',            tag:'',              specs:{Motor:'Nissan K25',Transmissão:'Powershift',Velocidade:'18 km/h',Freio:'Tambor'} },
  { id:'cpcd2035g',linha:'glp',       model:'CPCD20/35-H GLP',   cap:'2.000–3.500 kg', tracao:'GLP',     tag:'',              specs:{Motor:'Xinchai 492',Transmissão:'Powershift',Velocidade:'19 km/h',Freio:'Tambor'} },
  { id:'cpcd25d',  linha:'diesel',    model:'CPCD25 Diesel',     cap:'2.500 kg', tracao:'Diesel',         tag:'',              specs:{Motor:'Xinchai 495',Transmissão:'Powershift',Velocidade:'19 km/h',Freio:'Tambor'} },
  { id:'cpcd35d',  linha:'diesel',    model:'CPCD35 Diesel',     cap:'3.500 kg', tracao:'Diesel',         tag:'',              specs:{Motor:'Xinchai 495',Transmissão:'Powershift',Velocidade:'18 km/h',Freio:'Tambor'} },
  { id:'cpcd70d',  linha:'diesel',    model:'CPCD70 Diesel',     cap:'7.000 kg', tracao:'Diesel',         tag:'Grande porte',  specs:{Motor:'Mitsubishi S6S',Transmissão:'Powershift',Velocidade:'22 km/h',Freio:'Óleo'} },
  { id:'cdd15',    linha:'retratil',  model:'CDD15J-ZSM',        cap:'1.500 kg', tracao:'Elétrica Lítio', tag:'Retrátil',      specs:{Elevação:'11.500 mm',Controlador:'ZAPI',Motor:'AC'} },
  { id:'cbd15',    linha:'paleteira', model:'CBD15J-LI3',        cap:'1.500 kg', tracao:'Elétrica Lítio', tag:'Paleteira',     specs:{Bateria:'24V/30Ah',Tipo:'Timão',Uso:'Interno'} },
  { id:'cbd20',    linha:'paleteira', model:'CBD20J-LI3',        cap:'2.000 kg', tracao:'Elétrica Lítio', tag:'Paleteira',     specs:{Bateria:'24V/30Ah',Tipo:'Timão',Uso:'Interno'} },
];

export default function PageCatalog() {
  const [linha, setLinha]     = useState('todos');
  const [expanded, setExpanded] = useState(null);

  const filtered = linha === 'todos' ? HELI_PRODUCTS : HELI_PRODUCTS.filter(p => p.linha === linha);

  const S = {
    header: { display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24 },
    title:  { fontFamily:"'Syne',sans-serif",fontSize:24,fontWeight:800,color:'#111827' },
    sub:    { fontSize:13,color:'#9ca3af',marginTop:4 },
    filters:{ display:'flex',gap:8,marginBottom:20,flexWrap:'wrap' },
    filterBtn: (a) => ({ padding:'7px 12px',borderRadius:8,border:'1px solid',borderColor:a?'#C10A25':'#d1d5db',background:a?'#C10A25':'transparent',color:a?'#fff':'#4b5563',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:"'Inter',sans-serif" }),
    grid:   { display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14 },
    card:   (sel) => ({ background:'#fff',border:`2px solid ${sel?'#C10A25':'#e5e7eb'}`,borderRadius:12,padding:'16px 18px',cursor:'pointer',transition:'all .15s',boxShadow:sel?'0 4px 16px rgba(193,10,37,.1)':'0 1px 3px rgba(0,0,0,.05)' }),
    model:  { fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:15,color:'#C10A25' },
    cap:    { fontSize:13,fontWeight:600,color:'#111827',marginTop:4,marginBottom:3 },
    trac:   { fontSize:11,color:'#9ca3af' },
    tag:    { fontSize:10,background:'#fdecea',color:'#C10A25',padding:'2px 6px',borderRadius:10,fontWeight:600,whiteSpace:'nowrap' },
    specRow:{ display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid #f9fafb',fontSize:12 },
  };

  return (
    <div>
      <div style={S.header}>
        <div>
          <div style={S.title}>Catálogo HELI</div>
          <div style={S.sub}>Portfólio completo · Nexus Log ES · {HELI_PRODUCTS.length} modelos</div>
        </div>
        <a href="https://nexuslogin.com.br" target="_blank" rel="noreferrer"
          style={{padding:'7px 14px',borderRadius:8,border:'1px solid #d1d5db',background:'transparent',color:'#4b5563',fontSize:12,fontWeight:600,textDecoration:'none',display:'flex',alignItems:'center',gap:5}}>
          🌐 Site Nexus Log
        </a>
      </div>

      <div style={S.filters}>
        {[['todos','Todos'],['eletrica','⚡ Elétrica Lítio'],['glp','🔥 GLP'],['diesel','⛽ Diesel'],['retratil','📦 Retrátil'],['paleteira','🔧 Paleteira']].map(([k,l])=>(
          <button key={k} style={S.filterBtn(linha===k)} onClick={()=>setLinha(k)}>{l}</button>
        ))}
      </div>

      <div style={S.grid}>
        {filtered.map(p => {
          const open = expanded === p.id;
          return (
            <div key={p.id} style={S.card(open)} onClick={()=>setExpanded(open?null:p.id)}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                <div style={S.model}>{p.model}</div>
                {p.tag && <span style={S.tag}>{p.tag}</span>}
              </div>
              <div style={S.cap}>{p.cap}</div>
              <div style={S.trac}>{p.tracao}</div>
              {open && (
                <div style={{marginTop:12,paddingTop:12,borderTop:'1px solid #f3f4f6'}}>
                  {Object.entries(p.specs).map(([k,v])=>(
                    <div key={k} style={S.specRow}>
                      <span style={{color:'#9ca3af'}}>{k}</span>
                      <span style={{fontWeight:600,color:v==='Zero'?'#16a34a':'#111827'}}>{v}</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{marginTop:10,fontSize:11,color:'#9ca3af',textAlign:'right'}}>
                {open?'▲ fechar':'▼ ficha técnica'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
