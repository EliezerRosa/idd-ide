// src/App.js
import { useState } from 'react';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { useProposals, useVisits } from './hooks/useData';
import Layout from './components/Layout';
import { Toast } from './components/UI';
import PageAuth        from './pages/PageAuth';
import PageDashboard   from './pages/PageDashboard';
import PageProposals   from './pages/PageProposals';
import PageNewProposal from './pages/PageNewProposal';
import PageVisits      from './pages/PageVisits';
import PageDetail      from './pages/PageDetail';
import PageCatalog     from './pages/PageCatalog';
import PageSettings    from './pages/PageSettings';
import PagePrivacidade from './pages/PagePrivacidade';
import { exportProposalPdf } from './lib/exportPdf';

const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Inter:wght@300;400;500;600&display=swap');
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button { opacity: 1; }
  select { appearance: auto; }
`;

function AppInner() {
  const { user, loading: authLoading } = useAuth();
  const [page, setPage]         = useState('dashboard');
  const [selected, setSelected] = useState(null);
  const [toast, setToast]       = useState(null);

  const { proposals, loading: propLoading, create: createProposal, updateStatus: updateProposalStatus } = useProposals();
  const { visits,   loading: visitLoading, create: createVisit,   updateStatus: updateVisitStatus    } = useVisits();

  const showToast  = (msg) => setToast(msg);
  const navigateTo = (p)   => { setPage(p); if (p !== 'detail') setSelected(null); };

  const counts = {
    negotiating:    proposals.filter(p => p.status === 'Negociando').length,
    upcomingVisits: visits.filter(v => v.status === 'Agendada').length,
  };

  if (authLoading) {
    return (
      <div style={{ minHeight:'100vh', background:'#111827', display:'flex',
        alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,.4)', fontSize:14 }}>
        Carregando…
      </div>
    );
  }

  if (!user) return <PageAuth />;

  const handleNewProposal = async (form) => {
    await createProposal(form);
    showToast('Proposta salva com sucesso!');
    navigateTo('proposals');
  };

  const handleUpdateProposalStatus = async (id, status) => {
    await updateProposalStatus(id, status);
    setSelected(s => s?.id === id ? { ...s, status } : s);
    showToast(`Status atualizado: ${status}`);
  };

  const handleNewVisit = async (form) => {
    await createVisit(form);
    showToast('Visita agendada!');
  };

  const handleExportPdf = (proposal) => {
    exportProposalPdf(proposal);
    showToast('PDF gerado — verifique a janela de impressão.');
  };

  return (
    <Layout page={page} setPage={navigateTo} counts={counts}>
      {page === 'dashboard' && (
        <PageDashboard
          proposals={proposals} visits={visits}
          loading={propLoading || visitLoading}
          onNew={() => navigateTo('new-proposal')}
          onSelect={p => { setSelected(p); navigateTo('detail'); }}
        />
      )}
      {page === 'proposals' && (
        <PageProposals
          proposals={proposals}
          onNew={() => navigateTo('new-proposal')}
          onSelect={p => { setSelected(p); navigateTo('detail'); }}
        />
      )}
      {page === 'new-proposal' && (
        <PageNewProposal
          onCreate={handleNewProposal}
          onCancel={() => navigateTo('proposals')}
        />
      )}
      {page === 'visits' && (
        <PageVisits
          visits={visits}
          loading={visitLoading}
          onAdd={handleNewVisit}
          onUpdateStatus={async (id, status) => {
            await updateVisitStatus(id, status);
            showToast(`Visita marcada como: ${status}`);
          }}
        />
      )}
      {page === 'catalog'      && <PageCatalog />}
      {page === 'settings'     && <PageSettings onSaved={() => showToast('Perfil atualizado!')} />}
      {page === 'privacidade'  && <PagePrivacidade />}
      {page === 'detail' && selected && (
        <PageDetail
          proposal={selected}
          onBack={() => navigateTo('proposals')}
          onUpdateStatus={handleUpdateProposalStatus}
          onAddVisit={() => navigateTo('visits')}
          onExportPdf={() => handleExportPdf(selected)}
        />
      )}
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </Layout>
  );
}

export default function App() {
  return (
    <>
      <style>{GLOBAL_STYLES}</style>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </>
  );
}
