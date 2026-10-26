// src/pages/PageDashboard.js
import { Badge, Spinner } from '../components/UI';
import { usePipeline } from '../hooks/useData';

const fmtBRL = v => Number(v).toLocaleString('pt-BR', { style:'currency', currency:'BRL', minimumFractionDigits:0 });
const fmtDate = d => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day:'2-digit', month:'short' });

export default function PageDashboard({ proposals, visits, loading, onNew, onSelect }) {
  const { total, approved, negotiating, byStatus } = usePipeline(proposals);
  const upcoming = visits.filter(v => v.status === 'Agendada');

  if (loading) return <Spinner />;

  const pipeline = [['Aprovada','#16a34a'],['Negociando','#C10A25'],['Aguardando','#2563eb'],['Recusada','#dc2626']];

  return (
    <div>
      <style>{`
        .dash-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
        .dash-title { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800; color: #111827; letter-spacing: -.3px; }
        .dash-sub { font-size: 13px; color: #9ca3af; margin-top: 3px; }
        .dash-btn { padding: 9px 16px; border-radius: 8px; border: none; background: #C10A25; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; white-space: nowrap; }

        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }
        @media (min-width: 640px) {
          .kpi-grid { grid-template-columns: repeat(4, 1fr); }
        }

        .kpi-card {
          background: #fff; border: 1px solid #e5e7eb; border-radius: 12px;
          padding: 16px; position: relative; overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,.05);
        }
        .kpi-accent { position: absolute; top: 0; left: 0; right: 0; height: 3px; border-radius: 12px 12px 0 0; }
        .kpi-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; }
        .kpi-value { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800; color: #111827; margin: 4px 0 2px; letter-spacing: -.5px; }
        .kpi-sub { font-size: 11px; color: #9ca3af; }

        .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,.05); }
        .card-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid #f9fafb; }
        .card-title { font-family: 'Syne', sans-serif; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; }

        .pipeline-wrap { padding: 16px; }
        .pipeline-bar { height: 10px; border-radius: 5px; overflow: hidden; display: flex; background: #f3f4f6; margin: 8px 0; }
        .pipeline-seg { height: 100%; }
        .legend { display: flex; gap: 10px; flex-wrap: wrap; font-size: 11px; color: #9ca3af; }
        .p-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin-right: 3px; }

        .table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        table { width: 100%; border-collapse: collapse; min-width: 400px; }
        th { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .8px; color: #9ca3af; padding: 10px 16px; text-align: left; border-bottom: 1px solid #f9fafb; white-space: nowrap; }
        td { padding: 12px 16px; font-size: 13px; color: #4b5563; border-bottom: 1px solid #f9fafb; }
        tr:last-child td { border-bottom: none; }
        tr.clickable:hover td { background: #f9fafb; cursor: pointer; }
        .td-main { font-weight: 600; color: #111827; }
        .td-model { font-family: 'Syne', sans-serif; font-size: 12px; color: #C10A25; font-weight: 700; }
        .td-value { font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700; color: #111827; }

        .empty-state { text-align: center; padding: 32px 16px; }
        .empty-state p { font-size: 13px; color: #9ca3af; margin-bottom: 12px; }
        .empty-link { color: #C10A25; font-weight: 600; background: none; border: none; cursor: pointer; font-size: 13px; font-family: 'Inter', sans-serif; }
      `}</style>

      <div className="dash-header">
        <div>
          <div className="dash-title">Dashboard</div>
          <div className="dash-sub">Nexus Log · Rep. Oficial HELI · ES</div>
        </div>
        <button className="dash-btn" onClick={onNew}>+ Nova Proposta</button>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        {[
          { label:'Pipeline Total', value: proposals.length === 0 ? 'R$ 0' : fmtBRL(total), sub:`${proposals.length} proposta${proposals.length!==1?'s':''}`, color:'#C10A25' },
          { label:'Aprovadas', value: approved.length, sub: fmtBRL(approved.reduce((s,p)=>s+Number(p.value_total||0),0)), color:'#16a34a' },
          { label:'Negociando', value: negotiating.length, sub: fmtBRL(negotiating.reduce((s,p)=>s+Number(p.value_total||0),0)), color:'#2563eb' },
          { label:'Visitas Agend.', value: upcoming.length, sub:'Próximos 7 dias', color:'#ca8a04' },
        ].map(k => (
          <div key={k.label} className="kpi-card">
            <div className="kpi-accent" style={{ background: k.color }} />
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.value}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Pipeline */}
      <div className="card">
        <div className="card-head">
          <span className="card-title">Funil de Vendas</span>
          <span style={{fontSize:12,color:'#9ca3af'}}>{fmtBRL(total)}</span>
        </div>
        <div className="pipeline-wrap">
          <div className="pipeline-bar">
            {pipeline.map(([s,c]) => (
              <div key={s} className="pipeline-seg" style={{ width:`${total?(byStatus[s]||0)/total*100:0}%`, background:c }} />
            ))}
          </div>
          <div className="legend">
            {pipeline.map(([s,c]) => (
              <span key={s}><span className="p-dot" style={{background:c}}/>{s}: {fmtBRL(byStatus[s]||0)}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Recent proposals */}
      <div className="card">
        <div className="card-head">
          <span className="card-title">Propostas Recentes</span>
        </div>
        {proposals.length === 0 ? (
          <div className="empty-state">
            <p>Nenhuma proposta ainda.</p>
            <button className="empty-link" onClick={onNew}>Criar a primeira →</button>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>Cliente</th><th>Modelo</th><th>Valor</th><th>Status</th>
              </tr></thead>
              <tbody>
                {proposals.slice(0,5).map(p => (
                  <tr key={p.id} className="clickable" onClick={() => onSelect(p)}>
                    <td><span className="td-main">{p.client_name}</span></td>
                    <td><span className="td-model">{p.model}</span></td>
                    <td><span className="td-value">{fmtBRL(p.value_total)}</span></td>
                    <td><Badge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
