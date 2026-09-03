import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, CircleCheck, CircleX, FileCode2, GitBranch, Network, PanelLeft, Search, ShieldCheck, X } from 'lucide-react';

type Integrity = 'aligned' | 'advisory' | 'critical';

type Method = {
  name: string;
  status: Integrity;
  statement: string;
  outcome: string;
  invariants: string[];
  allowedFields: string[];
  code: string;
};

const methods: Method[] = [
  {
    name: 'registerFailedLoginAttempt',
    status: 'critical',
    statement: 'Registrar uma tentativa de login malsucedida sem alterar a identidade ou os dados de contato da conta.',
    outcome: 'Incrementar a contagem de falhas e registrar o instante da tentativa para que a politica de bloqueio possa decidir o proximo passo.',
    invariants: ['email permanece somente leitura', 'a mutacao fica restrita ao agregado Account', 'nenhuma chamada externa participa da operacao'],
    allowedFields: ['failedLoginCount', 'lastFailedLoginAt'],
    code: "@intent('registerFailedLoginAttempt')\nregisterFailedLoginAttempt(): void {\n  this.failedLoginCount += 1;\n  this.lastFailedLoginAt = new Date();\n  this.email = 'locked@example.com';\n}"
  },
  {
    name: 'unlockAccount',
    status: 'aligned',
    statement: 'Restaurar o acesso de uma conta bloqueada quando uma decisao de governanca autorizar o desbloqueio.',
    outcome: 'Zerar o contador de falhas, limpar os marcos temporais de bloqueio e preservar todos os atributos de identidade.',
    invariants: ['email permanece somente leitura', 'a mutacao fica restrita ao agregado Account', 'a autorizacao precede qualquer escrita de estado'],
    allowedFields: ['failedLoginCount', 'lastFailedLoginAt', 'lockedAt'],
    code: "@intent('unlockAccount')\nunlockAccount(): void {\n  this.failedLoginCount = 0;\n  this.lastFailedLoginAt = undefined;\n  this.lockedAt = undefined;\n}"
  }
];

const statusLabel: Record<Integrity, string> = { aligned: 'Aligned', advisory: 'Advisory', critical: 'Critical drift' };

function IntegrityMark({ status }: { status: Integrity }) {
  const Icon = status === 'aligned' ? CircleCheck : status === 'advisory' ? AlertTriangle : CircleX;
  return <Icon aria-label={statusLabel[status]} className={`integrity ${status}`} size={15} />;
}

function App() {
  const [selected, setSelected] = useState(methods[0]);
  const [treeOpen, setTreeOpen] = useState(true);
  const hasDrift = selected.status === 'critical';

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><img src="/idd-mark.svg" alt="" /><strong>IDD IDE</strong><span>UI LAB</span></div>
      <div className="command"><Search size={16} /><span>Search intent, aggregate, contract</span><kbd>Ctrl K</kbd></div>
      <div className="governance"><ShieldCheck size={16} /><span>STABILIZATION</span><i></i><span>MODERATOR</span></div>
    </header>
    <aside className="rail"><button aria-label="Intent Navigator" className="rail-button active"><PanelLeft size={20} /></button><button aria-label="Impact graph" className="rail-button"><Network size={20} /></button><button aria-label="Governance" className="rail-button"><ShieldCheck size={20} /></button></aside>
    <aside className="navigator">
      <div className="panel-heading"><div><p>Intent Navigator</p><small>1 critical drift</small></div><button aria-label="Collapse navigator" onClick={() => setTreeOpen(!treeOpen)}>{treeOpen ? <ChevronDown size={17} /> : <ChevronRight size={17} />}</button></div>
      {treeOpen && <nav className="tree" aria-label="Semantic intent tree">
        <div className="tree-row level-0"><ChevronDown size={15} /><IntegrityMark status="aligned" /><span>Identity</span><em>BC</em></div>
        <div className="tree-row level-1"><ChevronDown size={15} /><IntegrityMark status="aligned" /><span>Account</span><em>AR</em></div>
        <div className="tree-row level-2"><ChevronDown size={15} /><IntegrityMark status="advisory" /><span>UserAccount</span><em>Entity</em></div>
        {methods.map(method => <button className={`tree-row level-3 method ${selected.name === method.name ? 'selected' : ''}`} onClick={() => setSelected(method)} key={method.name}><FileCode2 size={14} /><IntegrityMark status={method.status} /><span>{method.name}</span></button>)}
      </nav>}
      <footer className="navigator-footer"><span>Contract index</span><b>2 / 2</b></footer>
    </aside>
    <main className="workspace">
      <section className="breadcrumb"><span>Identity</span><ChevronRight size={14} /><span>Account</span><ChevronRight size={14} /><strong>{selected.name}</strong></section>
      <section className="contract-header">
        <div><p>Active Intent Contract</p><h1>{selected.name}</h1></div>
        <div className={`compliance ${hasDrift ? 'failure' : 'success'}`}><IntegrityMark status={selected.status} /><span>{hasDrift ? 'Non-compliant' : 'Compliant'}</span></div>
      </section>
      <section className="intent-statement" aria-labelledby="intent-statement-title">
        <div className="intent-order"><span>01</span><p>Business intent</p></div>
        <div className="intent-content"><h2 id="intent-statement-title">{selected.statement}</h2><p>{selected.outcome}</p></div>
        <div className="invariants"><p>Non-negotiable invariants</p><ul>{selected.invariants.map(invariant => <li key={invariant}><ShieldCheck size={13} />{invariant}</li>)}</ul></div>
      </section>
      <section className="metrics" aria-label="Contract metrics"><div><small>LCOM cohesion</small><b>1.0</b></div><div><small>CBO coupling</small><b>2</b></div><div className="write-fields"><small>Authorized writes</small><span>{selected.allowedFields.map(field => <code key={field}>{field}</code>)}</span></div></section>
      <section className="editors">
        <article className="editor"><header><span><i className="yaml-dot"></i>identity.intent.yaml</span><small>COMPILED CONTRACT</small></header><pre>{`intent:\n  statement: ${selected.statement}\n  outcome: ${selected.outcome}\nstate_mutation:\n  allowed_fields:\n${selected.allowedFields.map(field => `    - ${field}`).join('\n')}\nread_only_fields:\n  - email`}</pre></article>
        <article className="editor"><header><span><i className="ts-dot"></i>UserAccount.ts</span><small>IMPLEMENTATION</small></header><pre>{selected.code.split('\n').map((line, index) => <div className={hasDrift && line.includes('this.email') ? 'drift-line' : ''} key={line}><span className="line-number">{index + 1}</span>{line}</div>)}</pre>{hasDrift && <div className="diagnostic"><CircleX size={16} /><span><b>INV-UI-04</b> `email` is not authorized by this contract.</span><button aria-label="Dismiss diagnostic"><X size={14} /></button></div>}</article>
      </section>
    </main>
    <aside className="impact-panel"><div className="panel-heading"><div><p>Impact</p><small>Static dependency graph</small></div><GitBranch size={17} /></div><div className="impact-score"><span>DRIFT SCORE</span><b>{hasDrift ? '72%' : '100%'}</b><meter min="0" max="100" value={hasDrift ? 72 : 100}></meter></div><ul><li><CircleX size={14} /><span>auth/login.ts</span><small>direct</small></li><li><AlertTriangle size={14} /><span>account.spec.ts</span><small>test</small></li><li><CircleCheck size={14} /><span>session.policy.ts</span><small>consumer</small></li></ul><div className="policy"><ShieldCheck size={17} /><p>Hard gates remain local and deterministic. Advisory signals never interrupt typing.</p></div></aside>
    <footer className="statusbar"><span><IntegrityMark status={hasDrift ? 'critical' : 'aligned'} /> {hasDrift ? '1 hard gate blocking' : 'All contracts aligned'}</span><span>UTF-8</span><span>TypeScript</span><span>IDD local verifier &lt;100ms</span></footer>
  </div>;
}

export default App;