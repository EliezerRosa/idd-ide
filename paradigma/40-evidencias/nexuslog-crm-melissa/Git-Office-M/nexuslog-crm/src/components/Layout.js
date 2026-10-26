// src/components/Layout.js
import { useState } from 'react';
import { useAuth } from '../lib/AuthContext';

export default function Layout({ page, setPage, children, counts = {} }) {
  const { profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const nav = [
    { key: 'dashboard',    icon: '⊞', label: 'Dashboard' },
    { key: 'proposals',    icon: '◧', label: 'Propostas',     badge: counts.negotiating || null },
    { key: 'new-proposal', icon: '＋', label: 'Nova Proposta' },
    { key: 'visits',       icon: '📅', label: 'Visitas',       badge: counts.upcomingVisits || null },
    { key: 'catalog',      icon: '📦', label: 'Catálogo HELI' },
    { key: 'settings',     icon: '⚙',  label: 'Configurações' },
  ];

  const labels = {
    dashboard: 'Dashboard', proposals: 'Propostas', 'new-proposal': 'Nova Proposta',
    visits: 'Visitas', catalog: 'Catálogo HELI', detail: 'Detalhe', settings: 'Configurações',
  };

  const go = (key) => { setPage(key); setOpen(false); };

  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Inter',sans-serif;background:#f9fafb}

        .app{display:flex;min-height:100vh}

        /* ---------- SIDEBAR ---------- */
        .sidebar{
          width:240px;background:#111827;
          display:flex;flex-direction:column;
          position:fixed;top:0;left:0;bottom:0;z-index:200;
          transition:transform .25s ease;
        }

        /* Mobile: hidden by default */
        @media(max-width:767px){
          .sidebar{transform:translateX(-100%)}
          .sidebar.open{transform:translateX(0)}
        }

        /* Desktop: always visible */
        @media(min-width:768px){
          .sidebar{transform:translateX(0)!important}
          .main{margin-left:240px}
          .menu-btn{display:none!important}
          .sidebar-close{display:none!important}
          .overlay{display:none!important}
        }

        .overlay{
          display:none;position:fixed;inset:0;
          background:rgba(0,0,0,.55);z-index:199;
        }
        .overlay.open{display:block}

        .sb-header{
          padding:20px 18px 16px;
          border-bottom:1px solid rgba(255,255,255,.07);
          display:flex;align-items:center;justify-content:space-between;
        }
        .logo-row{display:flex;align-items:center;gap:10px}
        .logo-badge{
          width:36px;height:36px;border-radius:8px;background:#C10A25;
          display:flex;align-items:center;justify-content:center;
          font-size:13px;font-weight:800;color:#fff;flex-shrink:0;
          font-family:'Syne',sans-serif;
        }
        .logo-name{font-family:'Syne',sans-serif;font-size:15px;font-weight:700;color:#fff;line-height:1.1}
        .logo-sub{font-size:10px;color:#C10A25;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;margin-top:1px}
        .sidebar-close{background:none;border:none;color:rgba(255,255,255,.4);font-size:24px;cursor:pointer;line-height:1}

        .sb-nav{flex:1;padding:10px;overflow-y:auto}
        .sb-section{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,.2);padding:12px 10px 5px}
        .sb-item{
          display:flex;align-items:center;gap:10px;
          padding:10px 10px;border-radius:8px;cursor:pointer;
          font-size:14px;font-weight:500;color:rgba(255,255,255,.5);
          background:transparent;border:none;width:100%;text-align:left;
          font-family:'Inter',sans-serif;margin-bottom:2px;transition:all .15s;
        }
        .sb-item:hover{color:rgba(255,255,255,.85);background:rgba(255,255,255,.06)}
        .sb-item.active{color:#fff;background:rgba(193,10,37,.2)}
        .sb-item.active .sb-icon{color:#C10A25}
        .sb-icon{font-size:16px;width:20px;text-align:center;flex-shrink:0}
        .sb-badge{margin-left:auto;background:#C10A25;color:#fff;font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px}

        .sb-footer{padding:14px 18px;border-top:1px solid rgba(255,255,255,.07)}
        .user-row{display:flex;align-items:center;gap:10px}
        .user-av{
          width:32px;height:32px;border-radius:50%;
          background:rgba(193,10,37,.25);border:1px solid rgba(193,10,37,.4);
          display:flex;align-items:center;justify-content:center;
          font-size:11px;font-weight:700;color:#C10A25;flex-shrink:0;
        }
        .user-name{font-size:12px;font-weight:600;color:rgba(255,255,255,.75)}
        .user-role{font-size:10px;color:rgba(255,255,255,.3);margin-top:1px}
        .sign-out{margin-top:8px;width:100%;background:transparent;border:none;color:rgba(255,255,255,.25);font-size:12px;cursor:pointer;text-align:left;font-family:'Inter',sans-serif;padding:3px 0}

        /* ---------- MAIN ---------- */
        .main{flex:1;display:flex;flex-direction:column;min-height:100vh;width:100%}

        .topbar{
          height:52px;background:#fff;border-bottom:1px solid #e5e7eb;
          display:flex;align-items:center;justify-content:space-between;
          padding:0 14px;position:sticky;top:0;z-index:100;
        }
        .tl{display:flex;align-items:center;gap:10px}
        .menu-btn{background:none;border:none;cursor:pointer;font-size:22px;color:#374151;padding:4px;display:flex;align-items:center}
        .tb-title{font-family:'Syne',sans-serif;font-size:16px;font-weight:700;color:#111827}
        .tr{display:flex;gap:8px}
        .tb-btn{padding:6px 12px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;white-space:nowrap}
        .tb-out{border:1px solid #d1d5db;background:transparent;color:#4b5563}
        .tb-red{border:none;background:#C10A25;color:#fff}

        .content{flex:1;padding:18px 14px 40px;overflow-x:hidden}
        @media(min-width:768px){.content{padding:24px 28px 40px}}

        @keyframes toastIn{from{opacity:0;transform:translateY(8px)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(16px)}}
      `}</style>

      <div className="app">
        {/* Overlay */}
        <div className={`overlay${open?' open':''}`} onClick={()=>setOpen(false)} />

        {/* Sidebar */}
        <aside className={`sidebar${open?' open':''}`}>
          <div className="sb-header">
            <div className="logo-row">
              <div className="logo-badge">NX</div>
              <div>
                <div className="logo-name">Nexus Log</div>
                <div className="logo-sub">HELI · ES</div>
              </div>
            </div>
            <button className="sidebar-close" onClick={()=>setOpen(false)}>×</button>
          </div>

          <nav className="sb-nav">
            <div className="sb-section">Menu</div>
            {nav.map(n => {
              const active = page===n.key||(page==='detail'&&n.key==='proposals');
              return (
                <button key={n.key} className={`sb-item${active?' active':''}`} onClick={()=>go(n.key)}>
                  <span className={`sb-icon${active?' active':''}`}>{n.icon}</span>
                  {n.label}
                  {n.badge?<span className="sb-badge">{n.badge}</span>:null}
                </button>
              );
            })}
          </nav>

          <div className="sb-footer">
            <div className="user-row">
              <div className="user-av">{profile?.avatar||'??'}</div>
              <div>
                <div className="user-name">{profile?.name||'Usuário'}</div>
                <div className="user-role">{profile?.role||'Consultor'}</div>
              </div>
            </div>
            <button className="sign-out" onClick={signOut}>↩ Sair</button>
            <button className="sign-out" style={{marginTop:4}} onClick={()=>go('privacidade')}>🔒 Política de Privacidade</button>
          </div>
        </aside>

        {/* Main */}
        <div className="main">
          <div className="topbar">
            <div className="tl">
              <button className="menu-btn" onClick={()=>setOpen(true)}>☰</button>
              <span className="tb-title">{labels[page]||page}</span>
            </div>
            <div className="tr">
              <button className="tb-btn tb-out" onClick={()=>go('visits')}>+ Visita</button>
              <button className="tb-btn tb-red" onClick={()=>go('new-proposal')}>+ Proposta</button>
            </div>
          </div>
          <div className="content">{children}</div>
        </div>
      </div>
    </>
  );
}
