import { createRoot } from 'react-dom/client';
import type { ReactElement } from 'react';

type ContractDetail = {
  name: string;
  status: 'Conforme' | 'Nao Conforme';
  lcom: number | string;
  cbo: number | string;
  allowedFields: readonly string[];
};

declare global {
  interface Window { __IDD_CONTRACT__?: ContractDetail; }
}

const fallbackDetail: ContractDetail = {
  name: 'registerFailedLoginAttempt',
  status: 'Conforme',
  lcom: 1,
  cbo: 2,
  allowedFields: ['failedLoginCount', 'lastFailedLoginAt']
};

function Metric({ label, value }: { label: string; value: string | number }): ReactElement {
  return <div className="border-l border-slate-700 px-4 first:border-l-0"><dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt><dd className="mt-1 text-lg font-semibold text-slate-100">{value}</dd></div>;
}

function ContractDetailPanel(): ReactElement {
  const detail = window.__IDD_CONTRACT__ ?? fallbackDetail;
  const statusColor = detail.status === 'Conforme' ? 'text-emerald-400' : 'text-red-400';
  return <main className="min-h-screen bg-slate-950 p-5 font-mono text-slate-200"><header className="border border-slate-700 bg-slate-900 px-5 py-4"><p className="text-xs uppercase tracking-wide text-slate-400">Active intent contract</p><h1 className="mt-1 text-xl font-semibold text-white">{detail.name}</h1><dl className="mt-5 flex flex-wrap gap-y-4"><Metric label="Status" value={detail.status} /><Metric label="LCOM" value={detail.lcom} /><Metric label="CBO" value={detail.cbo} /><div className="border-l border-slate-700 px-4"><dt className="text-xs uppercase tracking-wide text-slate-400">Write permissions</dt><dd className="mt-2 flex flex-wrap gap-2">{detail.allowedFields.map(field => <span className="border border-emerald-700 bg-emerald-950 px-2 py-1 text-xs text-emerald-300" key={field}>{field}</span>)}</dd></div></dl></header><section className="mt-5 grid gap-5 lg:grid-cols-2"><article className="border border-slate-700 bg-slate-900 p-4"><h2 className="text-sm font-semibold text-white">Intent YAML</h2><pre className="mt-3 overflow-auto text-sm text-slate-300">{`state_mutation:\n  allowed_fields:\n${detail.allowedFields.map(field => `    - ${field}`).join('\n')}`}</pre></article><article className="border border-slate-700 bg-slate-900 p-4"><h2 className="text-sm font-semibold text-white">Method source</h2><pre className="mt-3 overflow-auto text-sm text-slate-300">{`@intent('${detail.name}')\nregisterFailedLoginAttempt() {\n  this.failedLoginCount += 1;\n}`}</pre><p className={`mt-4 text-sm ${statusColor}`}>Static contract verification: {detail.status}</p></article></section></main>;
}

const root = document.getElementById('root');
if (root) createRoot(root).render(<ContractDetailPanel />);