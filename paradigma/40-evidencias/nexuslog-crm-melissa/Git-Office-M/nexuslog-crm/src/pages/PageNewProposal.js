// src/pages/PageNewProposal.js
import { useState, useCallback, useRef } from 'react';

const HELI_PRODUCTS = [
  { id:'cpd30k2',  linha:'eletrica',  model:'CPD30K2 Li',        cap:'3.000 kg',        tracao:'Elétrica Lítio', tag:'⭐ Mais vendido', specs:{Bateria:'48V Lítio',Garantia:'6 anos / 12.000h',Ciclos:'+5.000',Emissão:'Zero',Controlador:'ZAPI AC'} },
  { id:'cpd25li',  linha:'eletrica',  model:'CPD25 Li',           cap:'2.500 kg',        tracao:'Elétrica Lítio', tag:'',              specs:{Bateria:'48V Lítio',Garantia:'6 anos / 12.000h',Ciclos:'+5.000',Emissão:'Zero',Controlador:'ZAPI AC'} },
  { id:'cpd1538',  linha:'eletrica',  model:'CPD15/38-A7LiH4',    cap:'1.500–3.800 kg',  tracao:'Elétrica Lítio', tag:'Câmara fria',   specs:{Bateria:'48V Lítio',Garantia:'6 anos / 12.000h',Ciclos:'+5.000',Emissão:'Zero',Controlador:'ZAPI AC'} },
  { id:'cpd1520',  linha:'eletrica',  model:'CPD15/20SQ',         cap:'1.500–2.000 kg',  tracao:'Elétrica Lítio', tag:'Corredor estreito',specs:{Bateria:'24V Lítio',Garantia:'6 anos',Ciclos:'+5.000',Emissão:'Zero',Controlador:'CURTIS'} },
  { id:'cpcd25g',  linha:'glp',       model:'CPCD25 GLP',         cap:'2.500 kg',        tracao:'GLP',            tag:'',              specs:{Motor:'Nissan K25',Transmissão:'Powershift',Velocidade:'19 km/h',Freio:'Tambor'} },
  { id:'cpcd35g',  linha:'glp',       model:'CPCD35 GLP',         cap:'3.500 kg',        tracao:'GLP',            tag:'',              specs:{Motor:'Nissan K25',Transmissão:'Powershift',Velocidade:'18 km/h',Freio:'Tambor'} },
  { id:'cpcd2035g',linha:'glp',       model:'CPCD20/35-H GLP',    cap:'2.000–3.500 kg',  tracao:'GLP',            tag:'',              specs:{Motor:'Xinchai 492',Transmissão:'Powershift',Velocidade:'19 km/h',Freio:'Tambor'} },
  { id:'cpcd25d',  linha:'diesel',    model:'CPCD25 Diesel',      cap:'2.500 kg',        tracao:'Diesel',         tag:'',              specs:{Motor:'Xinchai 495',Transmissão:'Powershift',Velocidade:'19 km/h',Freio:'Tambor'} },
  { id:'cpcd35d',  linha:'diesel',    model:'CPCD35 Diesel',      cap:'3.500 kg',        tracao:'Diesel',         tag:'',              specs:{Motor:'Xinchai 495',Transmissão:'Powershift',Velocidade:'18 km/h',Freio:'Tambor'} },
  { id:'cpcd70d',  linha:'diesel',    model:'CPCD70 Diesel',      cap:'7.000 kg',        tracao:'Diesel',         tag:'Grande porte',  specs:{Motor:'Mitsubishi S6S',Transmissão:'Powershift',Velocidade:'22 km/h',Freio:'Óleo'} },
  { id:'cdd15',    linha:'retratil',  model:'CDD15J-ZSM',         cap:'1.500 kg',        tracao:'Elétrica Lítio', tag:'Retrátil',      specs:{Elevação:'11.500 mm',Controlador:'ZAPI',Motor:'AC'} },
  { id:'cbd15',    linha:'paleteira', model:'CBD15J-LI3',         cap:'1.500 kg',        tracao:'Elétrica Lítio', tag:'Paleteira',     specs:{Bateria:'24V/30Ah',Tipo:'Timão',Uso:'Interno'} },
  { id:'cbd20',    linha:'paleteira', model:'CBD20J-LI3',         cap:'2.000 kg',        tracao:'Elétrica Lítio', tag:'Paleteira',     specs:{Bateria:'24V/30Ah',Tipo:'Timão',Uso:'Interno'} },
];

const SEGMENTOS = ['Logística / Armazém','Frigorífico / Câmara Fria','Atacado e Varejo','Agronegócio','Bebidas','Centro de Distribuição','Porto / Área Portuária','Cerâmica / Construção','Indústria'];
const ALTURAS   = ['3.000 mm (Duplex)','4.500 mm (Triplex)','4.800 mm (Triplex)','5.500 mm (Triplex)','6.000 mm (Quadruplex)'];
const LINHAS    = [['eletrica','⚡ Elétrica Lítio'],['glp','🔥 GLP'],['diesel','⛽ Diesel'],['retratil','📦 Retrátil'],['paleteira','🔧 Paleteira']];
const STEPS     = ['Cliente','Equipamento','Orçamento','Revisão'];

const fmtBRL = v => Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:0});

const S = {
  title: { fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:800, color:'#111827' },
  sub:   { fontSize:13, color:'#9ca3af', marginTop:4 },
  header:{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 },
  card:  { background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:24, marginBottom:16, boxShadow:'0 1px 3px rgba(0,0,0,.05)' },
  secTitle:{ fontFamily:"'Syne',sans-serif",fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:1,color:'#9ca3af',marginBottom:14,paddingBottom:10,borderBottom:'1px solid #f3f4f6' },
  grid2: { display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:14 },
  grid3: { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 },
  fgroup:{ display:'flex', flexDirection:'column', gap:5 },
  flabel:{ fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'.8px',color:'#9ca3af' },
  finput:{ padding:'9px 13px',borderRadius:8,border:'1px solid #d1d5db',background:'#fff',fontFamily:"'Inter',sans-serif",fontSize:13,color:'#111827',outline:'none',width:'100%',transition:'border-color .15s,box-shadow .15s' },
  row:   { display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:16 },
  btnPrimary:{ padding:'9px 18px',borderRadius:8,border:'none',background:'#C10A25',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:"'Inter',sans-serif" },
  btnOutline:{ padding:'9px 18px',borderRadius:8,border:'1px solid #d1d5db',background:'transparent',color:'#4b5563',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:"'Inter',sans-serif" },
  btnSm: (active) => ({ padding:'7px 12px',borderRadius:8,border:'1px solid',borderColor:active?'#C10A25':'#d1d5db',background:active?'#C10A25':'transparent',color:active?'#fff':'#4b5563',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:"'Inter',sans-serif",whiteSpace:'nowrap' }),
  productCard: (sel) => ({ background:sel?'#fdecea':'#fff',border:`2px solid ${sel?'#C10A25':'#e5e7eb'}`,borderRadius:10,padding:'14px 16px',cursor:'pointer',transition:'all .15s' }),
  specRow:{ display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid #f3f4f6',fontSize:12 },
  voicePanel:{ background:'linear-gradient(135deg,#111827 0%,#1a2035 100%)',border:'1px solid #374151',borderRadius:12,padding:'20px 22px',marginBottom:20 },
};

// Step indicator
function Steps({ current }) {
  return (
    <div style={{display:'flex',alignItems:'center',marginBottom:28}}>
      {STEPS.map((s, i) => {
        const done = i < current, active = i === current;
        return (
          <div key={s} style={{display:'flex',flexDirection:'column',alignItems:'center',flex:1,position:'relative'}}>
            {i < STEPS.length-1 && (
              <div style={{position:'absolute',top:15,left:'calc(50% + 15px)',width:'calc(100% - 30px)',height:2,background:done?'#16a34a':'#e5e7eb'}} />
            )}
            <div style={{width:30,height:30,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1,
              fontSize:12,fontWeight:700,marginBottom:5,transition:'all .2s',
              background:done?'#16a34a':active?'#C10A25':'#fff',
              border:`2px solid ${done?'#16a34a':active?'#C10A25':'#e5e7eb'}`,
              color:done||active?'#fff':'#9ca3af',
              boxShadow:active?'0 0 0 4px #fdecea':'none'}}>
              {done?'✓':i+1}
            </div>
            <div style={{fontSize:11,color:done?'#16a34a':active?'#C10A25':'#9ca3af',fontWeight:active||done?700:400}}>{s}</div>
          </div>
        );
      })}
    </div>
  );
}

// Voice input hook
function useVoice(onResult) {
  const [vs, setVs] = useState('idle');
  const [transcript, setTranscript] = useState('');
  const recRef = useRef(null);

  const parse = useCallback((text) => {
    const lower = text.toLowerCase();
    const f = {};
    const models = [
      [/cpd\s*30\s*k2/i,'CPD30K2 Li'],[/cpd\s*25\s*li/i,'CPD25 Li'],
      [/cpd\s*15.*38/i,'CPD15/38-A7LiH4'],[/cpcd\s*35.*glp/i,'CPCD35 GLP'],
      [/cpcd\s*25.*glp/i,'CPCD25 GLP'],[/cpcd\s*70/i,'CPCD70 Diesel'],
      [/cpcd\s*35.*diesel/i,'CPCD35 Diesel'],[/cpcd\s*35/i,'CPCD35 GLP'],
      [/cpcd\s*25/i,'CPCD25 GLP'],[/cdd\s*15/i,'CDD15J-ZSM'],[/cbd\s*20/i,'CBD20J-LI3'],
    ];
    for (const [re,v] of models) { if (re.test(text)) { f.model=v; break; } }
    const cap = lower.match(/(\d[\d.,]*)\s*(tonelada|ton\b|t\b|kg)/);
    if (cap) { const n=parseFloat(cap[1].replace(',','.')); f.cap=cap[2][0]==='t'?`${n*1000} kg`:`${cap[1]} kg`; }
    if (/lítio|litio/i.test(lower)) f.tracao='Elétrica Lítio';
    else if (/elétric|eletric/i.test(lower)) f.tracao='Elétrica Lítio';
    else if (/glp|gás/i.test(lower)) f.tracao='GLP';
    else if (/diesel/i.test(lower)) f.tracao='Diesel';
    const cli = text.match(/cliente\s+([A-ZÀ-Ú][^,.]{2,30})/i);
    if (cli) f.client = cli[1].trim();
    const con = text.match(/contato\s+([A-ZÀ-Ú][a-záàâãéêíóôõúç]+(?:\s+[A-ZÀ-Ú][a-záàâãéêíóôõúç]+)*)/i);
    if (con) f.contact = con[1].trim();
    const obsTerms = ['câmara fria','frigorífico','ambiente externo','portuário','cerâmica','agronegócio'];
    const found = obsTerms.filter(t=>lower.includes(t));
    if (found.length) f.obs = found.map(w=>w[0].toUpperCase()+w.slice(1)).join(', ');
    return f;
  }, []);

  const simulate = (text) => {
    setTranscript(text); setVs('processing');
    setTimeout(() => { onResult(parse(text)); setVs('success'); setTranscript(text); }, 700);
  };

  const toggle = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setVs('listening'); setTranscript('…');
      setTimeout(() => {
        const demo = 'cliente Armazéns Capixaba CPD30K2 lítio câmara fria';
        setTranscript(demo); setVs('processing');
        setTimeout(() => { onResult(parse(demo)); setVs('success'); setTranscript(demo); }, 700);
      }, 1800);
      return;
    }
    if (vs==='listening') { recRef.current?.stop(); return; }
    const rec = new SR(); rec.lang='pt-BR'; rec.continuous=false; rec.interimResults=true;
    recRef.current = rec;
    rec.onstart = () => { setVs('listening'); setTranscript('…'); };
    rec.onresult = e => {
      let fin='',int='';
      for (const r of e.results) { if(r.isFinal) fin+=r[0].transcript; else int+=r[0].transcript; }
      setTranscript(fin||int);
      if (fin) { setVs('processing'); setTimeout(()=>{onResult(parse(fin));setVs('success');},500); }
    };
    rec.onerror = () => setVs('error');
    rec.onend = () => { if(vs==='listening') setVs('idle'); };
    rec.start();
  };

  return { vs, transcript, toggle, simulate };
}

export default function PageNewProposal({ onCreate, onCancel }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    client:'', contact:'', phone:'', email:'',
    linha:'eletrica', model:'CPD30K2 Li', cap:'3.000 kg', tracao:'Elétrica Lítio',
    altura:'4.800 mm (Triplex)', segmento:'Logística / Armazém', obs:'',
    value:0, frete:2800, treinamento:3200, manutencao:0, acessorios:0, desconto:0,
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const selProduct = HELI_PRODUCTS.find(p => p.model === form.model) || HELI_PRODUCTS[0];
  const filteredProducts = HELI_PRODUCTS.filter(p => p.linha === form.linha);
  const subtotal = (form.value||0)+(form.frete||0)+(form.treinamento||0)+(form.manutencao||0)+(form.acessorios||0);
  const totalFinal = subtotal - subtotal*((form.desconto||0)/100);

  const onVoiceResult = useCallback((fields) => {
    setForm(f => {
      const updated = { ...f };
      if (fields.client) updated.client = fields.client;
      if (fields.contact) updated.contact = fields.contact;
      if (fields.obs) updated.obs = fields.obs;
      if (fields.model) {
        updated.model = fields.model;
        const p = HELI_PRODUCTS.find(x => x.model === fields.model);
        if (p) { updated.cap = p.cap; updated.tracao = p.tracao; updated.linha = p.linha; }
      }
      if (fields.cap) updated.cap = fields.cap;
      if (fields.tracao) updated.tracao = fields.tracao;
      return updated;
    });
  }, []);

  const { vs, transcript, toggle, simulate } = useVoice(onVoiceResult);

  const handleSave = async () => {
    setSaving(true);
    try { await onCreate({ ...form, value_total_calc: totalFinal }); }
    catch (e) { alert('Erro ao salvar: ' + e.message); }
    setSaving(false);
  };

  const vsStatus = { idle:'Pressione para falar', listening:'Ouvindo… fale agora', processing:'Processando…', success:'✓ Campos preenchidos!', error:'Não reconhecido. Tente novamente.' };
  const vsColor  = { idle:'#6b7280', listening:'#C10A25', processing:'#C10A25', success:'#16a34a', error:'#dc2626' };

  return (
    <div>
      <div style={S.header}>
        <div>
          <div style={S.title}>Nova Proposta</div>
          <div style={S.sub}>Preencha os dados ou use sua voz</div>
        </div>
        <button style={S.btnOutline} onClick={onCancel}>← Voltar</button>
      </div>

      <Steps current={step} />

      {/* ── STEP 0: CLIENT ── */}
      {step === 0 && (
        <>
          {/* Voice panel */}
          <div style={S.voicePanel}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
              <div>
                <div style={{fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700,color:'#f9fafb'}}>🎙 Preencher por voz</div>
                <div style={{fontSize:11,color:'#6b7280',marginTop:3}}>Fale os dados — o app preenche automaticamente</div>
              </div>
              <button onClick={toggle} style={{
                width:50,height:50,borderRadius:'50%',border:'none',cursor:'pointer',
                background:vs==='listening'?'#dc2626':'#C10A25',color:'#fff',fontSize:18,
                display:'flex',alignItems:'center',justifyContent:'center',
                boxShadow:`0 4px 14px rgba(193,10,37,.4)`,
                animation:vs==='listening'?'pulse 1.2s infinite':'none',
              }}>{vs==='listening'?'⏹':vs==='processing'?'⏳':'🎙'}</button>
            </div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:10}}>
              {[
                ['cliente Cerâmica Vitória contato Carlos CPCD25 GLP','Cerâmica Vitória · CPCD25 GLP'],
                ['CPD30K2 lítio câmara fria três toneladas','CPD30K2 lítio · câmara fria'],
                ['cliente Porto de Vitória CPCD70 diesel portuário','Porto Vitória · CPCD70 diesel'],
              ].map(([txt,lbl]) => (
                <span key={lbl} onClick={()=>simulate(txt)} style={{
                  background:'#1e2a3a',border:'1px solid #374151',borderRadius:20,
                  padding:'5px 12px',fontSize:11,color:'#9ca3af',cursor:'pointer',fontStyle:'italic',
                }}>"{lbl}"</span>
              ))}
            </div>
            {transcript && (
              <div style={{background:'#0f172a',border:'1px solid #1e293b',borderRadius:6,padding:'10px 13px',
                fontSize:13,color:vs==='success'?'#e5e7eb':'#6b7280',fontStyle:vs==='success'?'normal':'italic',marginBottom:8}}>
                "{transcript}"
              </div>
            )}
            <div style={{fontSize:12,color:vsColor[vs],fontWeight:vs==='idle'?400:600}}>{vsStatus[vs]}</div>
          </div>

          <div style={S.card}>
            <div style={S.secTitle}>Dados do Cliente</div>
            <div style={S.grid2}>
              {[['client','Empresa *','Nome da empresa'],['contact','Contato *','Nome do responsável'],['phone','Telefone','+55 27 99999-9999'],['email','E-mail','email@empresa.com.br']].map(([k,l,p])=>(
                <div key={k} style={S.fgroup}>
                  <label style={S.flabel}>{l}</label>
                  <input style={S.finput} value={form[k]} onChange={e=>set(k,e.target.value)} placeholder={p}
                    onFocus={e=>{e.target.style.borderColor='#C10A25';e.target.style.boxShadow='0 0 0 3px rgba(193,10,37,.1)'}}
                    onBlur={e=>{e.target.style.borderColor='#d1d5db';e.target.style.boxShadow='none'}} />
                </div>
              ))}
            </div>
          </div>
          <div style={S.row}>
            <div />
            <button style={{...S.btnPrimary,opacity:(!form.client||!form.contact)?0.5:1}} onClick={()=>setStep(1)} disabled={!form.client||!form.contact}>Próximo: Equipamento →</button>
          </div>
        </>
      )}

      {/* ── STEP 1: EQUIPMENT ── */}
      {step === 1 && (
        <>
          <div style={S.card}>
            <div style={S.secTitle}>Linha do Produto</div>
            <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
              {LINHAS.map(([k,l])=>(
                <button key={k} style={S.btnSm(form.linha===k)} onClick={()=>{
                  set('linha',k);
                  const first=HELI_PRODUCTS.find(p=>p.linha===k);
                  if(first){set('model',first.model);set('cap',first.cap);set('tracao',first.tracao);}
                }}>{l}</button>
              ))}
            </div>

            <div style={S.secTitle}>Modelo HELI</div>
            <div style={S.grid3}>
              {filteredProducts.map(p=>(
                <div key={p.id} style={S.productCard(form.model===p.model)}
                  onClick={()=>{set('model',p.model);set('cap',p.cap);set('tracao',p.tracao);}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                    <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:14,color:'#C10A25'}}>{p.model}</div>
                    {p.tag&&<span style={{fontSize:10,background:'#fdecea',color:'#C10A25',padding:'2px 6px',borderRadius:10,fontWeight:600,whiteSpace:'nowrap'}}>{p.tag}</span>}
                  </div>
                  <div style={{fontSize:13,fontWeight:600,color:'#111827',marginBottom:3}}>{p.cap}</div>
                  <div style={{fontSize:11,color:'#9ca3af'}}>{p.tracao}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={S.card}>
            <div style={S.secTitle}>Configuração · {form.model}</div>
            <div style={S.grid2}>
              <div style={S.fgroup}>
                <label style={S.flabel}>Capacidade</label>
                <input style={{...S.finput,background:'#f9fafb',color:'#9ca3af'}} value={form.cap} readOnly />
              </div>
              <div style={S.fgroup}>
                <label style={S.flabel}>Tipo de Tração</label>
                <input style={{...S.finput,background:'#f9fafb',color:'#9ca3af'}} value={form.tracao} readOnly />
              </div>
              <div style={S.fgroup}>
                <label style={S.flabel}>Altura de Elevação</label>
                <select style={S.finput} value={form.altura} onChange={e=>set('altura',e.target.value)}>
                  {ALTURAS.map(a=><option key={a}>{a}</option>)}
                </select>
              </div>
              <div style={S.fgroup}>
                <label style={S.flabel}>Segmento de Aplicação</label>
                <select style={S.finput} value={form.segmento} onChange={e=>set('segmento',e.target.value)}>
                  {SEGMENTOS.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div style={{...S.fgroup,gridColumn:'1/-1'}}>
                <label style={S.flabel}>Observações Técnicas</label>
                <input style={S.finput} value={form.obs} onChange={e=>set('obs',e.target.value)} placeholder="Ex: câmara fria, piso irregular, operação 24h…" />
              </div>
            </div>

            {selProduct && (
              <div style={{marginTop:16,background:'#f9fafb',borderRadius:8,padding:14}}>
                <div style={{fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:1,color:'#9ca3af',marginBottom:8}}>📋 Ficha Técnica</div>
                {Object.entries(selProduct.specs).map(([k,v])=>(
                  <div key={k} style={S.specRow}>
                    <span style={{color:'#9ca3af'}}>{k}</span>
                    <span style={{fontWeight:600,color:v==='Zero'?'#16a34a':'#111827'}}>{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={S.row}>
            <button style={S.btnOutline} onClick={()=>setStep(0)}>← Voltar</button>
            <button style={S.btnPrimary} onClick={()=>setStep(2)}>Próximo: Orçamento →</button>
          </div>
        </>
      )}

      {/* ── STEP 2: BUDGET ── */}
      {step === 2 && (
        <>
          <div style={S.card}>
            <div style={S.secTitle}>Composição do Orçamento</div>
            <div style={S.grid2}>
              {[['value','Valor do Equipamento (R$) *'],['frete','Frete / Entrega (R$)'],['treinamento','Treinamento (R$)'],['manutencao','Contrato Manutenção (R$)'],['acessorios','Acessórios / Implementos (R$)'],['desconto','Desconto (%)']].map(([k,l])=>(
                <div key={k} style={S.fgroup}>
                  <label style={S.flabel}>{l}</label>
                  <input style={S.finput} type="number" min="0" value={form[k]||''} onChange={e=>set(k,Number(e.target.value))}
                    onFocus={e=>{e.target.style.borderColor='#C10A25';e.target.style.boxShadow='0 0 0 3px rgba(193,10,37,.1)'}}
                    onBlur={e=>{e.target.style.borderColor='#d1d5db';e.target.style.boxShadow='none'}} />
                </div>
              ))}
            </div>

            {/* Total preview */}
            <div style={{marginTop:20,background:'#f9fafb',borderRadius:8,padding:16}}>
              {[['Equipamento',form.value||0],['Frete',form.frete||0],['Treinamento',form.treinamento||0],['Manutenção',form.manutencao||0],['Acessórios',form.acessorios||0]].map(([k,v])=>(
                <div key={k} style={S.specRow}><span style={{color:'#9ca3af'}}>{k}</span><span style={{fontWeight:600}}>{fmtBRL(v)}</span></div>
              ))}
              {(form.desconto||0)>0 && (
                <div style={S.specRow}><span style={{color:'#16a34a'}}>Desconto ({form.desconto}%)</span><span style={{fontWeight:600,color:'#16a34a'}}>−{fmtBRL(subtotal*(form.desconto/100))}</span></div>
              )}
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:12,paddingTop:12,borderTop:'2px solid #e5e7eb'}}>
                <span style={{fontWeight:700,fontSize:13}}>Total Final</span>
                <span style={{fontFamily:"'Syne',sans-serif",fontSize:26,fontWeight:800,color:'#C10A25'}}>{fmtBRL(totalFinal)}</span>
              </div>
            </div>
          </div>

          <div style={S.row}>
            <button style={S.btnOutline} onClick={()=>setStep(1)}>← Voltar</button>
            <button style={{...S.btnPrimary,opacity:!form.value?0.5:1}} onClick={()=>setStep(3)} disabled={!form.value}>Revisar Proposta →</button>
          </div>
        </>
      )}

      {/* ── STEP 3: REVIEW ── */}
      {step === 3 && (
        <>
          <div style={S.card}>
            <div style={{background:'#111827',borderRadius:8,padding:'12px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <div>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,color:'#fff',fontSize:14}}>Nexus Log</div>
                <div style={{fontSize:10,color:'rgba(255,255,255,.35)'}}>Representante Oficial HELI · Espírito Santo · nexuslogin.com.br</div>
              </div>
              <div style={{textAlign:'right',fontSize:11,color:'rgba(255,255,255,.3)'}}>{new Date().toLocaleDateString('pt-BR')}</div>
            </div>

            <div style={S.secTitle}>Resumo</div>
            <div style={{...S.grid2,marginBottom:16}}>
              {[['Cliente',form.client],['Contato',form.contact],['Telefone',form.phone||'—'],['E-mail',form.email||'—'],['Modelo HELI',form.model],['Capacidade',form.cap],['Tração',form.tracao],['Altura',form.altura],['Segmento',form.segmento]].map(([k,v])=>(
                <div key={k}>
                  <div style={{fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:1,color:'#9ca3af',marginBottom:3}}>{k}</div>
                  <div style={{fontSize:14,fontWeight:600,color:k==='Modelo HELI'?'#C10A25':'#111827'}}>{v}</div>
                </div>
              ))}
              {form.obs && <div style={{gridColumn:'1/-1'}}>
                <div style={{fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:1,color:'#9ca3af',marginBottom:3}}>Observações</div>
                <div style={{fontSize:13,color:'#111827'}}>{form.obs}</div>
              </div>}
            </div>

            <div style={{borderTop:'2px solid #f3f4f6',paddingTop:16,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:1,color:'#9ca3af'}}>Valor Total</div>
                <div style={{fontFamily:"'Syne',sans-serif",fontSize:32,fontWeight:800,color:'#C10A25',letterSpacing:'-.5px'}}>{fmtBRL(totalFinal)}</div>
              </div>
              <div style={{textAlign:'right',fontSize:12,color:'#9ca3af'}}>
                <div>Validade: 15 dias</div>
                <div>Pagamento: 30/60/90</div>
              </div>
            </div>
          </div>

          <div style={S.row}>
            <button style={S.btnOutline} onClick={()=>setStep(2)}>← Voltar</button>
            <div style={{display:'flex',gap:10}}>
              <button style={S.btnOutline}>⬇ Exportar PDF</button>
              <button style={{...S.btnPrimary,opacity:saving?0.6:1}} onClick={handleSave} disabled={saving}>
                {saving?'Salvando…':'✓ Salvar Proposta'}
              </button>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes pulse {
          0%   { box-shadow: 0 0 0 0 rgba(220,38,38,.5); }
          70%  { box-shadow: 0 0 0 12px rgba(220,38,38,0); }
          100% { box-shadow: 0 0 0 0 rgba(220,38,38,0); }
        }
        @keyframes slideUp { from { opacity:0; transform:translateY(16px); } }
        @keyframes toastIn { from { opacity:0; transform:translateY(8px); } }
      `}</style>
    </div>
  );
}
