import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CircleX,
  FileCode2,
  GitBranch,
  Network,
  PanelLeft,
  RotateCcw,
  Search,
  ShieldCheck,
} from 'lucide-react';

type Integrity = 'aligned' | 'advisory' | 'critical';

const contracts: UiContract[] =
  typeof __IDD_WORKSPACE_CONTRACTS__ !== 'undefined' && Array.isArray(__IDD_WORKSPACE_CONTRACTS__)
    ? __IDD_WORKSPACE_CONTRACTS__
    : [];

const statusLabel: Record<Integrity, string> = {
  aligned: 'Aligned',
  advisory: 'Advisory',
  critical: 'Critical drift',
};

function shortFieldName(f: string): string {
  return f.includes('.') ? f.split('.').pop()! : f;
}

interface MutationViolation {
  line: number;
  field: string;
  rule: 'INV-ENCAP-01' | 'INV-UI-04';
  message: string;
}

function detectMutations(code: string, allowedFields: string[], readOnlyFields: string[]): MutationViolation[] {
  const allowedShort = new Set(allowedFields.map(shortFieldName));
  const readOnlyShort = new Set(readOnlyFields.map(shortFieldName));
  // Só ativa a cerca de mutação quando o contrato declara state_mutation (allowed_fields ou read_only_fields) ou é v2
  const enforceMutationFence = allowedFields.length > 0 || readOnlyFields.length > 0;
  if (!enforceMutationFence) return [];

  const violations: MutationViolation[] = [];
  const lines = code.split('\n');
  const assignRe = /\bthis\.([A-Za-z_$][\w$]*)\s*(?:\+\+|--|[+\-*/]?=(?!=))/g;
  const mutatorCallRe = /\bthis\.([A-Za-z_$][\w$]*)\.(?:push|pop|shift|unshift|splice|set|delete|clear)\s*\(/g;

  lines.forEach((rawLine, idx) => {
    const line = rawLine.replace(/\/\/.*$/, '');
    for (const re of [assignRe, mutatorCallRe]) {
      re.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = re.exec(line)) !== null) {
        const field = match[1];
        if (readOnlyShort.has(field)) {
          violations.push({
            line: idx + 1,
            field,
            rule: 'INV-ENCAP-01',
            message: `Campo '${field}' é read-only neste contrato (${readOnlyFields.join(', ')}).`,
          });
        } else if (!allowedShort.has(field)) {
          violations.push({
            line: idx + 1,
            field,
            rule: 'INV-UI-04',
            message: allowedFields.length
              ? `Campo '${field}' não está autorizado em allowed_fields (${allowedFields.join(', ')}).`
              : `Contrato somente-leitura (allowed_fields vazio): escrita em 'this.${field}' recusada.`,
          });
        }
      }
    }
  });
  return violations;
}

function IntegrityMark({ status }: { status: Integrity }) {
  const Icon = status === 'aligned' ? CircleCheck : status === 'advisory' ? AlertTriangle : CircleX;
  return <Icon aria-label={statusLabel[status]} className={`integrity ${status}`} size={15} />;
}

function App() {
  const [selectedId, setSelectedId] = useState<string>(contracts[0]?.id ?? '');
  const [treeOpen, setTreeOpen] = useState(true);
  const [query, setQuery] = useState('');
  const [codeOverrides, setCodeOverrides] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contracts;
    return contracts.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        c.boundedContext.toLowerCase().includes(q) ||
        c.statement.toLowerCase().includes(q) ||
        c.tags.some(t => t.toLowerCase().includes(q)),
    );
  }, [query]);

  const selected = useMemo(
    () => filtered.find(c => c.id === selectedId) ?? filtered[0] ?? contracts[0],
    [filtered, selectedId],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, UiContract[]>();
    for (const c of filtered) {
      if (!map.has(c.boundedContext)) map.set(c.boundedContext, []);
      map.get(c.boundedContext)!.push(c);
    }
    return [...map.entries()];
  }, [filtered]);

  if (!selected) {
    return <div className="app-shell">Nenhum contrato encontrado no workspace.</div>;
  }

  const activeCode = codeOverrides[selected.id] ?? selected.code;
  const violations = detectMutations(activeCode, selected.allowedFields, selected.readOnlyFields);
  const violationLines = new Set(violations.map(v => v.line));
  const effectiveStatus: Integrity =
    violations.length > 0 ? 'critical' : selected.status === 'critical' && codeOverrides[selected.id] ? 'aligned' : selected.status;
  const hasDrift = effectiveStatus === 'critical';

  const criticalCount = contracts.filter(c => {
    const code = codeOverrides[c.id] ?? c.code;
    return detectMutations(code, c.allowedFields, c.readOnlyFields).length > 0 || c.status === 'critical';
  }).length;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <img src="/idd-mark.svg" alt="" />
          <strong>IDD IDE</strong>
          <span>WORKSPACE ({contracts.length} CONTRATOS REAIS)</span>
        </div>
        <div className="command">
          <Search size={16} />
          <input
            aria-label="Filtrar contratos, classes, invariantes ou transações"
            placeholder="Filtrar por classe, método, TN-04, INV-001..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <kbd>Ctrl K</kbd>
        </div>
        <div className="governance">
          <ShieldCheck size={16} />
          <span>EXPLORATORY / FASE 0</span>
          <i></i>
          <span>COMANDO EPISTÊMICO</span>
        </div>
      </header>

      <aside className="rail">
        <button aria-label="Intent Navigator" className="rail-button active">
          <PanelLeft size={20} />
        </button>
        <button aria-label="Impact graph" className="rail-button">
          <Network size={20} />
        </button>
        <button aria-label="Governance" className="rail-button">
          <ShieldCheck size={20} />
        </button>
      </aside>

      <aside className="navigator">
        <div className="panel-heading">
          <div>
            <p>Intent Navigator</p>
            <small>
              {filtered.length} contratos · {criticalCount} drift crítico
            </small>
          </div>
          <button aria-label="Collapse navigator" onClick={() => setTreeOpen(!treeOpen)}>
            {treeOpen ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
          </button>
        </div>
        {treeOpen && (
          <nav className="tree" aria-label="Semantic intent tree">
            {grouped.map(([bc, items]) => (
              <div key={bc}>
                <div className="tree-row level-0">
                  <ChevronDown size={15} />
                  <IntegrityMark
                    status={
                      items.some(i => i.status === 'critical')
                        ? 'critical'
                        : items.some(i => i.status === 'advisory')
                          ? 'advisory'
                          : 'aligned'
                    }
                  />
                  <span>{bc}</span>
                  <em>{items.length}</em>
                </div>
                {items.map(item => {
                  const itemCode = codeOverrides[item.id] ?? item.code;
                  const itemViol = detectMutations(itemCode, item.allowedFields, item.readOnlyFields);
                  const st: Integrity =
                    itemViol.length > 0 ? 'critical' : item.status === 'critical' && codeOverrides[item.id] ? 'aligned' : item.status;
                  return (
                    <button
                      className={`tree-row level-2 method ${selected.id === item.id ? 'selected' : ''}`}
                      onClick={() => setSelectedId(item.id)}
                      key={item.id}
                    >
                      <FileCode2 size={14} />
                      <IntegrityMark status={st} />
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        )}
        <footer className="navigator-footer">
          <span>Contract index</span>
          <b>
            {filtered.length} / {contracts.length}
          </b>
        </footer>
      </aside>

      <main className="workspace">
        <section className="breadcrumb">
          <span>{selected.boundedContext}</span>
          <ChevronRight size={14} />
          <span>{selected.entity}</span>
          <ChevronRight size={14} />
          <strong>{selected.name}</strong>
          {selected.tags.length > 0 && (
            <span className="tag-list">
              {selected.tags.map(t => (
                <code key={t} className="tag-badge">
                  {t}
                </code>
              ))}
            </span>
          )}
        </section>

        <section className="contract-header">
          <div>
            <p>Active Intent Contract · {selected.yamlPath}</p>
            <h1>{selected.name}</h1>
          </div>
          <div className={`compliance ${hasDrift ? 'failure' : 'success'}`}>
            <IntegrityMark status={effectiveStatus} />
            <span>{hasDrift ? 'Non-compliant (Drift)' : 'Compliant'}</span>
          </div>
        </section>

        <section className="intent-statement" aria-labelledby="intent-statement-title">
          <div className="intent-order">
            <span>01</span>
            <p>Business intent</p>
          </div>
          <div className="intent-content">
            <h2 id="intent-statement-title">{selected.statement}</h2>
            <p>{selected.outcome}</p>
          </div>
          <div className="invariants">
            <p>Invariantes &amp; Restrições ({selected.invariants.length})</p>
            <ul>
              {selected.invariants.map(invariant => (
                <li key={invariant}>
                  <ShieldCheck size={13} />
                  {invariant}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="metrics" aria-label="Contract metrics">
          <div>
            <small>Critérios Aceite</small>
            <b>{selected.acceptance.length}</b>
          </div>
          <div className="write-fields">
            <small>Escrita autorizada (allowed_fields)</small>
            <span>
              {selected.allowedFields.length ? (
                selected.allowedFields.map(field => <code key={field}>{field}</code>)
              ) : (
                <code>(somente leitura)</code>
              )}
            </span>
          </div>
          <div className="write-fields">
            <small>Somente leitura (read_only_fields)</small>
            <span>
              {selected.readOnlyFields.length ? (
                selected.readOnlyFields.map(field => (
                  <code key={field} className="readonly-chip">
                    {field}
                  </code>
                ))
              ) : (
                <code>—</code>
              )}
            </span>
          </div>
        </section>

        <section className="editors">
          <article className="editor">
            <header>
              <span>
                <i className="yaml-dot"></i>
                {selected.yamlPath}
              </span>
              <small>COMPILED CONTRACT (.intent.yaml)</small>
            </header>
            <pre>
              {selected.yamlRaw.split('\n').map((line, index) => (
                <div key={`${index}-${line}`}>
                  <span className="line-number">{index + 1}</span>
                  {line}
                </div>
              ))}
            </pre>
          </article>

          <article className="editor">
            <header>
              <span>
                <i className="ts-dot"></i>
                {selected.codePath}
              </span>
              <small style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                SIMULADOR INTERATIVO DE MUTAÇÃO AST
                {codeOverrides[selected.id] !== undefined && (
                  <button
                    className="reset-btn"
                    title="Restaurar código original"
                    onClick={() =>
                      setCodeOverrides(prev => {
                        const next = { ...prev };
                        delete next[selected.id];
                        return next;
                      })
                    }
                  >
                    <RotateCcw size={12} /> Restaurar
                  </button>
                )}
              </small>
            </header>
            <textarea
              aria-label="Editor interativo de código TypeScript para teste de cercas de mutação"
              className="code-editor-input"
              value={activeCode}
              onChange={e => setCodeOverrides(prev => ({ ...prev, [selected.id]: e.target.value }))}
              spellCheck={false}
            />
            <pre className="code-preview">
              {activeCode.split('\n').map((line, index) => (
                <div className={violationLines.has(index + 1) ? 'drift-line' : ''} key={`${index}-${line}`}>
                  <span className="line-number">{index + 1}</span>
                  {line}
                </div>
              ))}
            </pre>
            {violations.map((v, i) => (
              <div className="diagnostic" key={`${v.line}-${v.field}-${i}`}>
                <CircleX size={16} />
                <span>
                  <b>
                    {v.rule} (linha {v.line})
                  </b>{' '}
                  {v.message}
                </span>
              </div>
            ))}
          </article>
        </section>
      </main>

      <aside className="impact-panel">
        <div className="panel-heading">
          <div>
            <p>Impact &amp; Acceptance</p>
            <small>Rastreabilidade determinística</small>
          </div>
          <GitBranch size={17} />
        </div>
        <div className="impact-score">
          <span>ALIGNMENT SCORE</span>
          <b style={{ color: hasDrift ? '#be453d' : '#17865e' }}>{hasDrift ? '30%' : '100%'}</b>
          <meter min="0" max="100" value={hasDrift ? 30 : 100}></meter>
        </div>
        <ul>
          {selected.acceptance.map(acc => (
            <li key={acc}>
              <CircleCheck size={14} />
              <span>{acc}</span>
            </li>
          ))}
        </ul>
        <div className="policy">
          <ShieldCheck size={17} />
          <p>Hard gates permanecem locais e determinísticos (sem LLM). Edite o código ao lado para testar a recusa em tempo real.</p>
        </div>
      </aside>

      <footer className="statusbar">
        <span>
          <IntegrityMark status={effectiveStatus} />{' '}
          {hasDrift
            ? `${violations.length} violação(ões) de state_mutation detectada(s)`
            : 'Contrato alinhado (0 violações de mutação)'}
        </span>
        <span>UTF-8</span>
        <span>TypeScript</span>
        <span>IDD local verifier &lt;5ms</span>
      </footer>
    </div>
  );
}

export default App;
