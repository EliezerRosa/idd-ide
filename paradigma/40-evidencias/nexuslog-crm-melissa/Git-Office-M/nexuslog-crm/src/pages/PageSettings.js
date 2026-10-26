// src/pages/PageSettings.js
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

export default function PageSettings({ onSaved }) {
  const { profile, user } = useAuth();
  const [form, setForm]   = useState({
    name:    profile?.name    || '',
    role:    profile?.role    || 'Consultor de Vendas',
    region:  profile?.region  || 'Espírito Santo',
    company: profile?.company || 'Nexus Log',
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true); setMsg('');
    const { error } = await supabase
      .from('profiles')
      .update({ ...form, avatar: form.name.slice(0,2).toUpperCase() })
      .eq('id', user.id);
    setSaving(false);
    if (error) setMsg('Erro: ' + error.message);
    else { setMsg('Salvo com sucesso!'); onSaved?.(); }
  };

  const S = {
    header: { display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24 },
    title:  { fontFamily:"'Syne',sans-serif",fontSize:24,fontWeight:800,color:'#111827' },
    sub:    { fontSize:13,color:'#9ca3af',marginTop:4 },
    card:   { background:'#fff',border:'1px solid #e5e7eb',borderRadius:12,padding:24,boxShadow:'0 1px 3px rgba(0,0,0,.05)',marginBottom:16 },
    secTitle:{ fontFamily:"'Syne',sans-serif",fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:1,color:'#9ca3af',marginBottom:16,paddingBottom:10,borderBottom:'1px solid #f3f4f6' },
    grid2:  { display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:14 },
    fgroup: { display:'flex',flexDirection:'column',gap:5 },
    flabel: { fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'.8px',color:'#9ca3af' },
    finput: { padding:'9px 13px',borderRadius:8,border:'1px solid #d1d5db',fontFamily:"'Inter',sans-serif",fontSize:13,color:'#111827',outline:'none',width:'100%' },
    btn:    { padding:'9px 18px',borderRadius:8,border:'none',background:'#C10A25',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:"'Inter',sans-serif",opacity:saving?0.6:1 },
    msgOk:  { background:'#dcfce7',border:'1px solid #bbf7d0',color:'#15803d',borderRadius:8,padding:'10px 14px',fontSize:13,marginTop:12 },
    msgErr: { background:'#fee2e2',border:'1px solid #fecaca',color:'#b91c1c',borderRadius:8,padding:'10px 14px',fontSize:13,marginTop:12 },
    readOnly:{ padding:'9px 13px',borderRadius:8,border:'1px solid #e5e7eb',background:'#f9fafb',fontFamily:"'Inter',sans-serif",fontSize:13,color:'#9ca3af',width:'100%' },
  };

  return (
    <div>
      <div style={S.header}>
        <div>
          <div style={S.title}>Configurações</div>
          <div style={S.sub}>Perfil do usuário e preferências</div>
        </div>
      </div>

      {/* Avatar preview */}
      <div style={S.card}>
        <div style={S.secTitle}>Perfil</div>
        <div style={{display:'flex',alignItems:'center',gap:20,marginBottom:20}}>
          <div style={{width:64,height:64,borderRadius:'50%',background:'rgba(193,10,37,.1)',border:'2px solid rgba(193,10,37,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:800,color:'#C10A25'}}>
            {form.name.slice(0,2).toUpperCase() || '??'}
          </div>
          <div>
            <div style={{fontWeight:700,fontSize:16,color:'#111827'}}>{form.name || 'Seu nome'}</div>
            <div style={{fontSize:13,color:'#9ca3af'}}>{form.role}</div>
            <div style={{fontSize:12,color:'#9ca3af'}}>{user?.email}</div>
          </div>
        </div>

        <div style={S.grid2}>
          <div style={S.fgroup}>
            <label style={S.flabel}>Nome Completo</label>
            <input style={S.finput} value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Seu nome" />
          </div>
          <div style={S.fgroup}>
            <label style={S.flabel}>Cargo</label>
            <input style={S.finput} value={form.role} onChange={e=>set('role',e.target.value)} placeholder="Consultor de Vendas" />
          </div>
          <div style={S.fgroup}>
            <label style={S.flabel}>Empresa</label>
            <input style={S.finput} value={form.company} onChange={e=>set('company',e.target.value)} placeholder="Nexus Log" />
          </div>
          <div style={S.fgroup}>
            <label style={S.flabel}>Região</label>
            <input style={S.finput} value={form.region} onChange={e=>set('region',e.target.value)} placeholder="Espírito Santo" />
          </div>
          <div style={S.fgroup}>
            <label style={S.flabel}>E-mail (não editável)</label>
            <div style={S.readOnly}>{user?.email}</div>
          </div>
        </div>

        <div style={{marginTop:16,display:'flex',justifyContent:'flex-end',alignItems:'center',gap:12}}>
          <button style={S.btn} onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando…' : '✓ Salvar Perfil'}
          </button>
        </div>
        {msg && <div style={msg.startsWith('Erro')?S.msgErr:S.msgOk}>{msg}</div>}
      </div>

      {/* App info */}
      <div style={S.card}>
        <div style={S.secTitle}>Sobre o App</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12,fontSize:13}}>
          {[['Aplicativo','Nexus Log CRM'],['Versão','1.0.0 MVP'],['Banco de Dados','Supabase (PostgreSQL)'],['Hospedagem','Vercel'],['Representada','HELI Forklift'],['Território','Espírito Santo']].map(([k,v])=>(
            <div key={k} style={{background:'#f9fafb',borderRadius:8,padding:'10px 14px'}}>
              <div style={{fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:1,color:'#9ca3af',marginBottom:3}}>{k}</div>
              <div style={{fontWeight:600,color:'#111827'}}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Danger zone */}
      <div style={{...S.card,borderColor:'#fee2e2'}}>
        <div style={{...S.secTitle,color:'#dc2626'}}>Zona de Risco</div>
        <p style={{fontSize:13,color:'#6b7280',marginBottom:16}}>
          Ações irreversíveis. Proceda com cuidado.
        </p>
        <button style={{padding:'9px 16px',borderRadius:8,border:'1px solid #fca5a5',background:'#fff',color:'#dc2626',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:"'Inter',sans-serif"}}>
          Excluir minha conta
        </button>
      </div>
    </div>
  );
}
