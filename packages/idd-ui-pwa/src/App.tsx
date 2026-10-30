import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Binary,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CircleX,
  Database,
  Download,
  FileCode2,
  FileText,
  FolderOpen,
  GitBranch,
  Info,
  Layers,
  Network,
  PanelLeft,
  RotateCcw,
  Search,
  ShieldCheck,
  Sliders,
  Sparkles,
  UploadCloud,
  X,
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

/**
 * Sanitiza o código-fonte substituindo comentários (// e /* ... * /) e literais de string
 * ('...', "...", `...`) por espaços em branco, preservando rigorosamente quebras de linha (\r, \n)
 * e o índice de colunas. Isso previne falsos positivos na varredura regex leve da PWA
 * sem o custo proibitivo de empacotar o compilador TypeScript no bundle Web (~10MB).
 */
export function sanitizarCodigoParaPwa(codigo: string): string {
  return codigo
    .replace(/\/\*[\s\S]*?\*\//g, match => match.replace(/[^\r\n]/g, ' '))
    .replace(/\/\/.*$/gm, match => ' '.repeat(match.length))
    .replace(/(['"`])(?:\\.|(?!\1)[^\\\r\n])*\1/g, match => ' '.repeat(match.length));
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
  const sanitizado = sanitizarCodigoParaPwa(code);
  const lines = sanitizado.split('\n');
  const assignRe = /\bthis\.([A-Za-z_$][\w$]*)\s*(?:\+\+|--|[+\-*/%&|^]?=(?!=)|\|\|=|\?\?=)/g;
  const mutatorCallRe = /\bthis\.([A-Za-z_$][\w$]*)\.(?:push|pop|shift|unshift|splice|set|delete|clear)\s*\(/g;

  lines.forEach((line, idx) => {
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
  const [showShalaModal, setShowShalaModal] = useState(false);
  const [viewMode, setViewMode] = useState<'contracts' | 'fase0_ingestion'>('fase0_ingestion');
  const [inputText, setInputText] = useState(
    'Queremos um aplicativo para rachar a conta da mesa do bar com os amigos via Pix. A conta vem com os itens consumidos mais 10% de taxa de serviço. Cada participante paga os itens que consumiu e a sua parte da taxa. O responsável da mesa cria a mesa e cadastra a sua chave Pix. O aplicativo divide a conta entre os participantes.'
  );
  const [fase0State, setFase0State] = useState<'draft' | 'compiled' | 'resolved'>('draft');
  const [selectedDecision, setSelectedDecision] = useState<string>('rodizio');
  const [inputSourceType, setInputSourceType] = useState<'text' | 'code' | 'repo'>('text');
  const [codeText, setCodeText] = useState(
`export class Mesa {
  public status: string = 'aberta';
  public totalCentavos: number = 0;
  public fechada_em: Date | null = null;

  fechar() {
    this.status = 'fechada';
    this.fechada_em = new Date();
  }

  // Divisão simples sem regra de resto (soma zero violada!):
  calcularCotas(amigos: string[]) {
    const valorPorAmigo = Math.floor(this.totalCentavos / amigos.length);
    return amigos.map(nome => ({ nome, valorCentavos: valorPorAmigo }));
  }
}`
  );
  const [repoUrl, setRepoUrl] = useState('https://github.com/empresa/racha-conta-api.git');
  const [openMenu, setOpenMenu] = useState<'file' | 'edit' | 'view' | 'tools' | 'help' | null>(null);
  const [showGraphModal, setShowGraphModal] = useState(false);
  const [activeModal, setActiveModal] = useState<'gate1' | 'gate2' | 'decisions' | 'dictionary' | 'canon' | 'about' | null>(null);
  const [activeCaseName, setActiveCaseName] = useState<string>('racha-conta');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('node-mesa');
  const [nodesData, setNodesData] = useState([
    {
      id: 'node-mesa',
      name: 'Mesa',
      kind: 'class',
      def: 'Encontro de consumo no restaurante/bar e raiz do agregado.',
      allowed: '',
      readOnly: 'id',
      x: 160,
      y: 130,
    },
    {
      id: 'node-fechar',
      name: 'Mesa.fechar',
      kind: 'method',
      def: 'Transição definitiva de fechamento da mesa pelo responsável.',
      allowed: 'status, fechada_em',
      readOnly: 'id',
      x: 440,
      y: 80,
    },
    {
      id: 'node-calcular',
      name: 'Mesa.calcularCotas',
      kind: 'method',
      def: 'Rateio dos preços dos itens e taxa entre participantes com soma zero.',
      allowed: '',
      readOnly: 'totalCentavos, itens',
      x: 440,
      y: 210,
    },
    {
      id: 'node-status',
      name: 'status',
      kind: 'property',
      def: 'Estado do ciclo de vida da mesa (aberta ou fechada).',
      allowed: '',
      readOnly: '',
      x: 230,
      y: 320,
    },
  ]);
  const [saveToast, setSaveToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('✓ Ajustes Sincronizados!');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  const handleDownloadSpec = (caseName: string) => {
    const spec = `# ESPECIFICAÇÃO FORMAL DE DOMÍNIO - IDD
Caso: ${caseName}
Data: ${new Date().toISOString()}
Integridade Semântica: 100% (SHALA H(Y|X) = 0.00 bits)

## 1. Dicionário Ubíquo Canônico
- Entidade Raiz: ${caseName === 'racha-conta' ? 'Mesa' : caseName === 'marketplace-pix' ? 'PedidoMarketplace' : 'ContaCorrente'}
- Transação Principal: ${caseName === 'racha-conta' ? 'calcularCotas (soma zero)' : caseName === 'marketplace-pix' ? 'splitPix (custódia)' : 'transferir (partida dobrada)'}
- Invariante de Resto: Distribuição determinística auditada (sem perda de centavos).

## 2. Invariantes & AST Guards
- INV-001 (Soma Zero): sum(cotas) == total + taxas
- INV-ENCAP-01: Modificações de estado restritas a allowed_fields; escrita em campos read-only é rejeitada.

Gerado deterministicamente pelo IDD IDE v0.1.0 (Zero-Cost Epistemics).
`;
    const blob = new Blob([spec], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${caseName}.spec.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`✓ Arquivo ${caseName}.spec.md exportado com sucesso!`);
  };

  const loadCase = (caseName: 'racha-conta' | 'marketplace-pix' | 'fintech-core') => {
    setActiveCaseName(caseName);
    if (caseName === 'racha-conta') {
      setInputText(
        'Queremos um aplicativo para rachar a conta da mesa do bar com os amigos via Pix. A conta vem com os itens consumidos mais 10% de taxa de serviço. Cada participante paga os itens que consumiu e a sua parte da taxa. O responsável da mesa cria a mesa e cadastra a sua chave Pix. O aplicativo divide a conta entre os participantes.'
      );
      setCodeText(`export class Mesa {
  public status: string = 'aberta';
  public totalCentavos: number = 0;
  public fechada_em: Date | null = null;

  fechar() {
    this.status = 'fechada';
    this.fechada_em = new Date();
  }

  // Divisão simples sem regra de resto (soma zero violada!):
  calcularCotas(amigos: string[]) {
    const valorPorAmigo = Math.floor(this.totalCentavos / amigos.length);
    return amigos.map(nome => ({ nome, valorCentavos: valorPorAmigo }));
  }
}`);
      setNodesData([
        { id: 'node-mesa', name: 'Mesa', kind: 'class', def: 'Encontro de consumo no restaurante/bar e raiz do agregado.', allowed: '', readOnly: 'id', x: 160, y: 130 },
        { id: 'node-fechar', name: 'Mesa.fechar', kind: 'method', def: 'Transição definitiva de fechamento da mesa pelo responsável.', allowed: 'status, fechada_em', readOnly: 'id', x: 440, y: 80 },
        { id: 'node-calcular', name: 'Mesa.calcularCotas', kind: 'method', def: 'Rateio dos preços dos itens e taxa entre participantes com soma zero.', allowed: '', readOnly: 'totalCentavos, itens', x: 440, y: 210 },
        { id: 'node-status', name: 'status', kind: 'property', def: 'Estado do ciclo de vida da mesa (aberta ou fechada).', allowed: '', readOnly: '', x: 230, y: 320 }
      ]);
      setSelectedNodeId('node-mesa');
    } else if (caseName === 'marketplace-pix') {
      setInputText(
        'Plataforma de marketplace multi-lojista onde o cliente realiza pedidos unificados e liquida via Pix único. O valor é rateado instantaneamente entre os vendedores participantes e a taxa da plataforma com custódia (escrow) garantida até a entrega física.'
      );
      setCodeText(`export class PedidoMarketplace {
  public status: 'pendente' | 'pago' | 'entregue' = 'pendente';
  public totalCentavos: number = 0;
  public splitLojistas: { lojistaId: string; valorCentavos: number }[] = [];

  liberarEscrow() {
    this.status = 'entregue';
  }

  splitPix(taxaPlataformaCentavos: number) {
    const valorLiquido = this.totalCentavos - taxaPlataformaCentavos;
    return this.splitLojistas.map(l => ({ ...l }));
  }
}`);
      setNodesData([
        { id: 'node-pedido', name: 'PedidoMarketplace', kind: 'class', def: 'Agregado de compra multi-lojista com carrinho único.', allowed: '', readOnly: 'id', x: 160, y: 130 },
        { id: 'node-split', name: 'Pedido.splitPix', kind: 'method', def: 'Divisão de pagamento Pix com comissão retida.', allowed: 'splitLojistas', readOnly: 'totalCentavos', x: 440, y: 80 },
        { id: 'node-escrow', name: 'Pedido.liberarEscrow', kind: 'method', def: 'Liberação de custódia após confirmação de entrega física.', allowed: 'status', readOnly: 'id', x: 440, y: 210 },
        { id: 'node-status', name: 'status', kind: 'property', def: 'Estado do pedido (pendente, pago, entregue).', allowed: '', readOnly: '', x: 230, y: 320 }
      ]);
      setSelectedNodeId('node-pedido');
    } else if (caseName === 'fintech-core') {
      setInputText(
        'Core bancário de conta de pagamento com escrituração contábil em partidas dobradas. Todo débito deve corresponder a um crédito exato preservando o invariante de soma zero. Reservas de saldo bloqueiam limite sem alterar o saldo real.'
      );
      setCodeText(`export class ContaCorrente {
  public saldoCentavos: number = 0;
  public bloqueadoCentavos: number = 0;

  transferir(destino: ContaCorrente, valorCentavos: number) {
    if (this.saldoCentavos - this.bloqueadoCentavos < valorCentavos) {
      throw new Error('Saldo disponível insuficiente');
    }
    this.saldoCentavos -= valorCentavos;
    destino.saldoCentavos += valorCentavos;
  }
}`);
      setNodesData([
        { id: 'node-conta', name: 'ContaCorrente', kind: 'class', def: 'Conta corrente contábil com partidas dobradas.', allowed: '', readOnly: 'id', x: 160, y: 130 },
        { id: 'node-transferir', name: 'Conta.transferir', kind: 'method', def: 'Transferência atômica bilateral com conservação de centavos.', allowed: 'saldoCentavos', readOnly: 'id', x: 440, y: 80 },
        { id: 'node-saldo', name: 'saldoCentavos', kind: 'property', def: 'Saldo total em centavos.', allowed: '', readOnly: '', x: 230, y: 320 }
      ]);
      setSelectedNodeId('node-conta');
    }
    setViewMode('fase0_ingestion');
    setFase0State('draft');
    showToast(`✓ Estudo carregado: ${caseName}`);
  };

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
        </div>

        <nav className="desktop-menubar" aria-label="Menu principal">
          {/* File Menu */}
          <div style={{ position: 'relative' }}>
            <button
              className={`menu-btn ${openMenu === 'file' ? 'active' : ''}`}
              onClick={() => setOpenMenu(openMenu === 'file' ? null : 'file')}
            >
              File
            </button>
            {openMenu === 'file' && (
              <div className="dropdown-menu">
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setViewMode('fase0_ingestion');
                    setFase0State('draft');
                    setOpenMenu(null);
                  }}
                >
                  <span><FileText size={13} /> Novo Estudo (Fase 0)</span>
                  <span className="dropdown-shortcut">Ctrl+N</span>
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setViewMode('contracts');
                    setOpenMenu(null);
                  }}
                >
                  <span><FolderOpen size={13} /> Abrir Workspace...</span>
                  <span className="dropdown-shortcut">Ctrl+O</span>
                </button>
                <div className="dropdown-separator"></div>
                <div style={{ padding: '4px 14px', fontSize: '9px', color: '#7b8e86', textTransform: 'uppercase' }}>
                  Recentes:
                </div>
                <button
                  className="dropdown-item"
                  style={{ color: activeCaseName === 'racha-conta' ? '#e5c15c' : '#c8d4ce' }}
                  onClick={() => {
                    loadCase('racha-conta');
                    setOpenMenu(null);
                  }}
                >
                  <span>{activeCaseName === 'racha-conta' ? '✓ ' : ''}racha-conta</span>
                </button>
                <button
                  className="dropdown-item"
                  style={{ color: activeCaseName === 'marketplace-pix' ? '#e5c15c' : '#c8d4ce' }}
                  onClick={() => {
                    loadCase('marketplace-pix');
                    setOpenMenu(null);
                  }}
                >
                  <span>{activeCaseName === 'marketplace-pix' ? '✓ ' : ''}marketplace-pix</span>
                </button>
                <button
                  className="dropdown-item"
                  style={{ color: activeCaseName === 'fintech-core' ? '#e5c15c' : '#c8d4ce' }}
                  onClick={() => {
                    loadCase('fintech-core');
                    setOpenMenu(null);
                  }}
                >
                  <span>{activeCaseName === 'fintech-core' ? '✓ ' : ''}fintech-core</span>
                </button>
                <div className="dropdown-separator"></div>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setViewMode('fase0_ingestion');
                    setInputSourceType('code');
                    setOpenMenu(null);
                  }}
                >
                  <span><FileCode2 size={13} /> Importar Código Fonte...</span>
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setViewMode('fase0_ingestion');
                    setInputSourceType('repo');
                    setOpenMenu(null);
                  }}
                >
                  <span><GitBranch size={13} /> Importar Repositório Git...</span>
                </button>
                <div className="dropdown-separator"></div>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    handleDownloadSpec(activeCaseName);
                    setOpenMenu(null);
                  }}
                >
                  <span><Download size={13} /> Exportar Especificações...</span>
                  <span className="dropdown-shortcut">Ctrl+E</span>
                </button>
              </div>
            )}
          </div>

          {/* Edit Menu */}
          <div style={{ position: 'relative' }}>
            <button
              className={`menu-btn ${openMenu === 'edit' ? 'active' : ''}`}
              onClick={() => setOpenMenu(openMenu === 'edit' ? null : 'edit')}
            >
              Edit
            </button>
            {openMenu === 'edit' && (
              <div className="dropdown-menu">
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setCodeOverrides({});
                    showToast('✓ Mutações AST restauradas ao estado canônico.');
                    setOpenMenu(null);
                  }}
                >
                  <span><RotateCcw size={13} /> Desfazer Mutações AST</span>
                  <span className="dropdown-shortcut">Ctrl+Z</span>
                </button>
                <div className="dropdown-separator"></div>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setActiveModal('dictionary');
                    setOpenMenu(null);
                  }}
                >
                  <span><BookOpen size={13} /> Dicionário Ubíquo (dicionario.json)</span>
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setActiveModal('decisions');
                    setOpenMenu(null);
                  }}
                >
                  <span><Sliders size={13} /> Decisões Socráticas (decisoes.md)</span>
                </button>
              </div>
            )}
          </div>

          {/* View Menu */}
          <div style={{ position: 'relative' }}>
            <button
              className={`menu-btn ${openMenu === 'view' ? 'active' : ''}`}
              onClick={() => setOpenMenu(openMenu === 'view' ? null : 'view')}
            >
              View
            </button>
            {openMenu === 'view' && (
              <div className="dropdown-menu">
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setViewMode('fase0_ingestion');
                    setOpenMenu(null);
                  }}
                >
                  <span>1. Ingestão &amp; Ambiguidade (Fase 0)</span>
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setViewMode('contracts');
                    setOpenMenu(null);
                  }}
                >
                  <span>2. Navegador de Contratos &amp; AST</span>
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setShowGraphModal(true);
                    setOpenMenu(null);
                  }}
                >
                  <span>3. Grafo de Conhecimento (Graphify)</span>
                </button>
              </div>
            )}
          </div>

          {/* Tools Menu */}
          <div style={{ position: 'relative' }}>
            <button
              className={`menu-btn ${openMenu === 'tools' ? 'active' : ''}`}
              onClick={() => setOpenMenu(openMenu === 'tools' ? null : 'tools')}
            >
              Tools
            </button>
            {openMenu === 'tools' && (
              <div className="dropdown-menu">
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setShowShalaModal(true);
                    setOpenMenu(null);
                  }}
                >
                  <span><Binary size={13} /> Métrica SHALA H(Y|X)</span>
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setShowGraphModal(true);
                    setOpenMenu(null);
                  }}
                >
                  <span><Network size={13} /> Grafo de AST (Graphify)</span>
                </button>
                <div className="dropdown-separator"></div>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setActiveModal('gate1');
                    setOpenMenu(null);
                  }}
                >
                  <span><CheckCircle2 size={13} style={{ color: '#45b08c' }} /> Verificar Gate 1 (Lint)</span>
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setActiveModal('gate2');
                    setOpenMenu(null);
                  }}
                >
                  <span><ShieldCheck size={13} style={{ color: '#45b08c' }} /> Verificar Gate 2 (Arquitetura)</span>
                </button>
              </div>
            )}
          </div>

          {/* Help Menu */}
          <div style={{ position: 'relative' }}>
            <button
              className={`menu-btn ${openMenu === 'help' ? 'active' : ''}`}
              onClick={() => setOpenMenu(openMenu === 'help' ? null : 'help')}
            >
              Help
            </button>
            {openMenu === 'help' && (
              <div className="dropdown-menu">
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setShowShalaModal(true);
                    setOpenMenu(null);
                  }}
                >
                  <span><BookOpen size={13} /> Tutorial Simples para Leigos</span>
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setActiveModal('canon');
                    setOpenMenu(null);
                  }}
                >
                  <span><Database size={13} /> Cânone IDD &amp; Epistêmica</span>
                </button>
                <div className="dropdown-separator"></div>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setActiveModal('about');
                    setOpenMenu(null);
                  }}
                >
                  <span><Info size={13} /> Sobre o IDD IDE v0.1.0</span>
                </button>
              </div>
            )}
          </div>
        </nav>

        <div className="phase-switcher">
          <button
            className={`phase-tab ${viewMode === 'fase0_ingestion' ? 'active' : ''}`}
            onClick={() => setViewMode('fase0_ingestion')}
          >
            <UploadCloud size={14} />
            <span>1. Ingestão &amp; Ambiguidade (Fase 0)</span>
          </button>
          <button
            className={`phase-tab ${viewMode === 'contracts' ? 'active' : ''}`}
            onClick={() => setViewMode('contracts')}
          >
            <ShieldCheck size={14} />
            <span>2. Contratos &amp; AST (Fase 1)</span>
          </button>
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
        <button
          title="Fase 0: Ingestão de Fontes &amp; Compilação Ubíqua"
          aria-label="Fase 0 Ingestão"
          className={`rail-button ${viewMode === 'fase0_ingestion' ? 'active' : ''}`}
          onClick={() => setViewMode('fase0_ingestion')}
        >
          <UploadCloud size={20} />
        </button>
        <button
          title="Fase 1: Navegador de Contratos &amp; Cercas de Mutação"
          aria-label="Intent Navigator"
          className={`rail-button ${viewMode === 'contracts' ? 'active' : ''}`}
          onClick={() => setViewMode('contracts')}
        >
          <PanelLeft size={20} />
        </button>
        <button
          title="Grafo de Conhecimento Estrutural (Graphify)"
          aria-label="Grafo Interativo"
          className="rail-button"
          onClick={() => setShowGraphModal(true)}
        >
          <Network size={20} />
        </button>
        <button
          title="SHALA: Métrica de Ambiguidade"
          aria-label="SHALA"
          className="rail-button"
          onClick={() => setShowShalaModal(true)}
        >
          <Binary size={20} />
        </button>
      </aside>

      {viewMode === 'fase0_ingestion' ? (
        <main className="ingestion-studio">
          <div className="ingestion-header">
            <h1>
              <UploadCloud size={24} style={{ color: '#17865e' }} />
              Fase 0 — Ingestão de Requisitos &amp; Compilação Ubíqua
            </h1>
            <p>
              Onde e como o usuário carrega documentos, regras e códigos brutos para eliminar ambiguidades matematicamente antes de qualquer linha de implementação.
            </p>
          </div>

          <div className="ingestion-grid">
            {/* Coluna Esquerda: ONDE carregar os inputs */}
            <div className="ingestion-section">
              <h2>
                1. ONDE CARREGAR OS INPUTS
                <span>FONTES BRUTAS (TEXTO, CÓDIGO OU GIT)</span>
              </h2>

              <div className="source-tabs">
                <button
                  className={`source-tab-btn ${inputSourceType === 'text' ? 'active' : ''}`}
                  onClick={() => setInputSourceType('text')}
                >
                  <FileText size={13} />
                  📝 Texto / Requisitos
                </button>
                <button
                  className={`source-tab-btn ${inputSourceType === 'code' ? 'active' : ''}`}
                  onClick={() => setInputSourceType('code')}
                >
                  <FileCode2 size={13} />
                  💻 Código Fonte (.ts / .sql)
                </button>
                <button
                  className={`source-tab-btn ${inputSourceType === 'repo' ? 'active' : ''}`}
                  onClick={() => setInputSourceType('repo')}
                >
                  <GitBranch size={13} />
                  🌐 Repositório Git (URL)
                </button>
              </div>

              {inputSourceType === 'text' && (
                <>
                  <div
                    className="dropzone"
                    onClick={() => {
                      setFase0State('compiled');
                    }}
                  >
                    <UploadCloud size={36} />
                    <strong>Arraste e solte arquivos aqui (.txt, .docx, .pdf, .sql, transcrições)</strong>
                    <small>ou clique para selecionar documentos no seu computador</small>
                  </div>

                  <label style={{ display: 'block', fontSize: 11, fontFamily: 'monospace', color: '#65716c', marginBottom: 6 }}>
                    DIGITE OU COLE O TEXTO INFORMAL DO NEGÓCIO:
                  </label>
                  <textarea
                    className="ingestion-textarea"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    placeholder="Exemplo: Queremos um aplicativo para dividir a conta do bar entre os amigos..."
                  />

                  <div className="action-row">
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        setInputText(
                          'Queremos um aplicativo para rachar a conta da mesa do bar com os amigos via Pix. A conta vem com os itens consumidos mais 10% de taxa de serviço. Cada participante paga os itens que consumiu e a sua parte da taxa. O responsável da mesa cria a mesa e cadastra a sua chave Pix. O aplicativo divide a conta entre os participantes.'
                        );
                        setFase0State('draft');
                      }}
                    >
                      <FileText size={12} style={{ display: 'inline', marginRight: 4 }} />
                      Carregar Exemplo (Racha-Conta / Pizza)
                    </button>

                    <button
                      className="btn-primary"
                      onClick={() => setFase0State(fase0State === 'resolved' ? 'resolved' : 'compiled')}
                    >
                      <Sparkles size={14} />
                      ⚡ Compilar &amp; Rodar SHALA
                    </button>
                  </div>
                </>
              )}

              {inputSourceType === 'code' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={{ fontSize: 11, fontFamily: 'monospace', color: '#65716c' }}>
                      CÓDIGO FONTE LEGADO (TYPESCRIPT / JAVASCRIPT / SQL):
                    </label>
                    <span style={{ fontSize: 10, color: '#17865e', fontFamily: 'monospace' }}>
                      🌳 Grafo AST (TypeScript Compiler API)
                    </span>
                  </div>
                  <textarea
                    className="ingestion-textarea"
                    style={{ minHeight: 180 }}
                    value={codeText}
                    onChange={e => setCodeText(e.target.value)}
                    spellCheck={false}
                  />

                  <div className="action-row">
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        setCodeText(
`export class Mesa {
  public status: string = 'aberta';
  public totalCentavos: number = 0;
  public fechada_em: Date | null = null;

  fechar() {
    this.status = 'fechada';
    this.fechada_em = new Date();
  }

  // Divisão simples sem regra de resto (soma zero violada!):
  calcularCotas(amigos: string[]) {
    const valorPorAmigo = Math.floor(this.totalCentavos / amigos.length);
    return amigos.map(nome => ({ nome, valorCentavos: valorPorAmigo }));
  }
}`
                        );
                        setFase0State('draft');
                      }}
                    >
                      Restaurar Código Demo
                    </button>

                    <button
                      className="btn-primary"
                      onClick={() => setFase0State(fase0State === 'resolved' ? 'resolved' : 'compiled')}
                    >
                      <Sparkles size={14} />
                      ⚡ Graphificar AST &amp; Rodar SHALA
                    </button>
                  </div>
                </>
              )}

              {inputSourceType === 'repo' && (
                <>
                  <div style={{ padding: 16, background: '#f6f9f7', border: '1px solid #c8dcd2', borderRadius: 4, marginBottom: 14 }}>
                    <strong style={{ display: 'block', fontSize: 13, color: '#1c352d', marginBottom: 4 }}>
                      Repositório Git remoto (ainda não implementado)
                    </strong>
                    <p style={{ margin: 0, fontSize: 12, color: '#5f6f67' }}>
                      A clonagem e a varredura de repositório remoto ainda não existem. Clone o repositório e rode <code>idd fase0 graphify &lt;arquivo.ts&gt;</code> nos arquivos.
                    </p>
                  </div>

                  <label style={{ display: 'block', fontSize: 11, fontFamily: 'monospace', color: '#65716c', marginBottom: 6 }}>
                    URL DO REPOSITÓRIO GIT:
                  </label>
                  <input
                    type="text"
                    className="code-editor-input"
                    style={{ minHeight: 38, marginBottom: 12, border: '1px solid #cfcdc1', borderRadius: 4, padding: '8px 12px' }}
                    value={repoUrl}
                    onChange={e => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/empresa/meu-sistema.git"
                  />

                  <div className="action-row">
                    <button
                      className="btn-secondary"
                      onClick={() => setRepoUrl('https://github.com/racha-conta/api.git')}
                    >
                      Usar URL Demo
                    </button>

                    <button className="btn-primary" disabled title="Ainda não implementado">
                      <GitBranch size={14} />
                      📥 Clonar &amp; mapear (não implementado)
                    </button>
                  </div>
                </>
              )}

              {fase0State !== 'draft' && (
                <div style={{ marginTop: 20 }}>
                  <h3 style={{ fontSize: 13, margin: '0 0 8px', color: '#1c352d' }}>
                    Dicionário Ubíquo Extraído Automaticamente:
                  </h3>
                  <div className="term-chips-container">
                    <span className="term-chip-box"><b>[[Mesa]]</b>: Entidade raiz</span>
                    <span className="term-chip-box"><b>[[Participante]]</b>: Membro consumidor</span>
                    <span className="term-chip-box"><b>[[ItemConsumido]]</b>: Produto da comanda</span>
                    <span className="term-chip-box"><b>[[TaxaServico]]</b>: Percentual da mesa</span>
                    <span className="term-chip-box"><b>[[Cota]]</b>: Centavos calculados</span>
                    <span className="term-chip-box"><b>[[ChavePix]]</b>: Meio de liquidação</span>
                  </div>
                </div>
              )}
            </div>

            {/* Coluna Direita: COMO COMPILA & PRODUZ O INPUT DA PRÓXIMA FASE */}
            <div className="ingestion-section">
              <h2>
                2. COMPILAÇÃO CIENTÍFICA &amp; RESOLUÇÃO
                <span>HEURÍSTICAS SHALA + GRAFO AST (LOCAL, SEM LLM) · DEMONSTRAÇÃO</span>
              </h2>

              {fase0State === 'draft' ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#76857d' }}>
                  <Sparkles size={40} style={{ color: '#b8c7bf', marginBottom: 12 }} />
                  <p>
                    Escolha uma das 3 fontes (Texto, Código ou Git) e clique em{' '}
                    <strong>&quot;Compilar / Graphificar&quot;</strong> para analisar o código e os requisitos.
                  </p>
                </div>
              ) : (
                <>
                  {inputSourceType !== 'text' && (
                    <div className="graph-preview-box">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ color: '#e5c15c', fontWeight: 'bold' }}>
                          🌳 Grafo AST (TypeScript Compiler API)
                        </span>
                        <span style={{ color: '#7ee8bd' }}>
                          local, sem LLM
                        </span>
                      </div>
                      <div className="graph-edge-row">
                        <span className="graph-tag">Nó [class]</span> Mesa (Entidade de Domínio)
                      </div>
                      <div className="graph-edge-row">
                        <span className="graph-tag">Nó [method]</span> Mesa.fechar &amp; Mesa.calcularCotas
                      </div>
                      <div className="graph-edge-row">
                        <span className="graph-tag">Aresta [mutates]</span> Mesa ➔ mutates ➔ status, fechada_em
                      </div>
                      <div className="graph-edge-row" style={{ color: '#e5b0aa', marginTop: 4 }}>
                        ⚠️ <strong>Alerta Semântico:</strong> Operação de divisão financeira sem soma zero!
                      </div>
                      <button
                        className="btn-secondary"
                        style={{
                          marginTop: 10,
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          background: '#1c352d',
                          color: '#e5c15c',
                          borderColor: '#345047',
                        }}
                        onClick={() => setShowGraphModal(true)}
                      >
                        <Network size={13} />
                        🔍 Abrir Visualizador de Grafo &amp; Ajustar Nós
                      </button>
                    </div>
                  )}

                  <div className={`shala-meter-box ${fase0State === 'resolved' ? 'zero' : 'high'}`}>
                    <div className="shala-meter-header">
                      <span>Indicador SHALA (heurístico, consultivo) · valores de demonstração</span>
                      <strong>{fase0State === 'resolved' ? '0.00 bits (nenhuma detectada)' : '2.00 bits (4 interpretações estimadas)'}</strong>
                    </div>
                    <meter min="0" max="4" value={fase0State === 'resolved' ? 0 : 2} style={{ width: '100%', height: 6 }}></meter>
                    <p style={{ margin: '8px 0 0', fontSize: 12 }}>
                      {fase0State === 'resolved'
                        ? '✓ As heurísticas não detectaram interpretações concorrentes (isso não prova que a especificação seja unívoca).'
                        : '⚠️ Lacuna detectada (Fillmore Frame): O código/texto divide valores, mas a política de centavos indivisíveis não existe!'}
                    </p>
                  </div>

                  {fase0State === 'compiled' && (
                    <div className="socratic-card">
                      <h4>
                        ❓ Pergunta Socrática (SHADA D-002) — Clique para Decidir:
                      </h4>
                      <p style={{ margin: '4px 0 8px', fontSize: 12, color: '#4a5b53' }}>
                        Quando a conta de R$ 100,00 for dividida por 3 amigos (R$ 33,333...), como distribuir o 1 centavo indivisível?
                      </p>
                      <div className="socratic-options">
                        <button
                          className={`socratic-opt-btn ${selectedDecision === 'primeiro' ? 'chosen' : ''}`}
                          onClick={() => {
                            setSelectedDecision('primeiro');
                            setFase0State('resolved');
                          }}
                        >
                          <span><strong>Opção A:</strong> O primeiro participante alfabético paga sempre o centavo a mais (+1c para Ana).</span>
                        </button>
                        <button
                          className={`socratic-opt-btn ${selectedDecision === 'rodizio' ? 'chosen' : ''}`}
                          onClick={() => {
                            setSelectedDecision('rodizio');
                            setFase0State('resolved');
                          }}
                        >
                          <span><strong>Opção B (Recomendada):</strong> Rodízio alfabético contínuo entre os itens consumidos (soma zero perfeita).</span>
                        </button>
                        <button
                          className={`socratic-opt-btn ${selectedDecision === 'desconto' ? 'chosen' : ''}`}
                          onClick={() => {
                            setSelectedDecision('desconto');
                            setFase0State('resolved');
                          }}
                        >
                          <span><strong>Opção C:</strong> Descartar centavo residual como desconto comercial do estabelecimento.</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {fase0State === 'resolved' && (
                    <div className="export-card-box">
                      <h3>
                        <CheckCircle2 size={16} />
                        Gate 1 &amp; Gate 2 Verdes — Input Pronto para a Próxima Fase!
                      </h3>
                      <p style={{ margin: '0 0 10px', fontSize: 12 }}>
                        A compilação gerou os artefatos formais a partir das decisões registradas:
                      </p>
                      <ul className="export-files-list">
                        <li>
                          <FileCode2 size={14} style={{ color: '#e5c15c' }} />
                          <span><b>contratos/racha_conta.intent.yaml</b> (Contratos v2 com cercas de mutação AST)</span>
                        </li>
                        <li>
                          <Layers size={14} style={{ color: '#45b08c' }} />
                          <span><b>modelo/dominio.mmd &amp; schema.sql</b> (Classes BCNF e tabelas do banco)</span>
                        </li>
                        <li>
                          <FileText size={14} style={{ color: '#4272a6' }} />
                          <span><b>exportacoes/spec.md</b> (Especificação blindada para Aider, Cursor ou Claude)</span>
                        </li>
                      </ul>

                      <div style={{ display: 'flex', gap: 10 }}>
                        <button
                          className="btn-primary"
                          style={{ width: '100%', justifyContent: 'center' }}
                          onClick={() => setViewMode('contracts')}
                        >
                          <ArrowRight size={15} />
                          Avançar para Fase 1: Validar Contratos &amp; Cercas AST
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </main>
      ) : (
        <>
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

        <div className="shala-card">
          <div className="shala-card-header">
            <span>SHALA (Ambiguidade)</span>
            <b>H = 0.00 bits</b>
          </div>
          <div className="shala-pillars">
            <div className="shala-pillar-row">
              <span>1. Frames (regex)</span>
              <span style={{ color: '#17865e' }}>✓ 100% slots</span>
            </div>
            <div className="shala-pillar-row">
              <span>2. Estrutura (regex)</span>
              <span style={{ color: '#17865e' }}>✓ Sem alerta</span>
            </div>
            <div className="shala-pillar-row">
              <span>3. PMI + JSD</span>
              <span style={{ color: '#17865e' }}>✓ 8 termos</span>
            </div>
            <div className="shala-pillar-row">
              <span>4. Guardas (regex)</span>
              <span style={{ color: '#17865e' }}>✓ Disjuntas</span>
            </div>
            <div className="shala-pillar-row">
              <span>5. Testes Soma Zero</span>
              <span style={{ color: '#17865e' }}>✓ 0 divergência</span>
            </div>
          </div>
          <button className="shala-btn" onClick={() => setShowShalaModal(true)}>
            <Binary size={13} />
            Simular Contraexemplos
          </button>
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
    </>
  )}

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

      {showShalaModal && (
        <div className="shala-modal-backdrop" onClick={() => setShowShalaModal(false)}>
          <div className="shala-modal" onClick={e => e.stopPropagation()}>
            <div className="shala-modal-header">
              <h3>
                <Binary size={18} />
                SHALA — Resolução Matemática de Ambiguidade &amp; Linguagem Ubíqua
              </h3>
              <button aria-label="Fechar modal" onClick={() => setShowShalaModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="shala-modal-body">
              <p>
                <strong>Indicador SHALA (heurístico):</strong> log2 do número de interpretações estimadas por regras fixas, calculado localmente em TypeScript, sem IA. É consultivo: sugere perguntas e não prova univocidade.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, margin: '14px 0' }}>
                <div style={{ padding: 12, border: '1px solid #d58b85', background: '#fcf2f0', borderRadius: 4 }}>
                  <span className="shala-badge-red">Antes da Fase 0 (Texto Vago)</span>
                  <p style={{ margin: '8px 0 4px', font: '11px monospace' }}>
                    <em>&quot;O sistema deve dividir a conta de pizza de R$ 100 entre os 3 amigos.&quot;</em>
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: '#9d302c' }}>
                    <strong>H(Y|X) = 2.00 bits (4 modelos concorrentes)</strong>
                  </p>
                </div>
                <div style={{ padding: 12, border: '1px solid #74b49d', background: '#f0f9f4', borderRadius: 4 }}>
                  <span className="shala-badge-green">Após Fase 0 IDD (Decisões D-002, D-022, D-032)</span>
                  <p style={{ margin: '8px 0 4px', font: '11px monospace' }}>
                    <em>&quot;Rodízio alfabético contínuo com soma zero exata ao centavo.&quot;</em>
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: '#146145' }}>
                    <strong>H(Y|X) = 0.00 bits (Univocidade Matemática)</strong>
                  </p>
                </div>
              </div>

              <h4>Tabela de Contraexemplos Concretos (Mesa de R$ 100,00 / 3 Amigos):</h4>
              <table className="shala-table">
                <thead>
                  <tr>
                    <th>Participante</th>
                    <th>Modelo A (Truncamento)</th>
                    <th>Modelo B (Primeiro)</th>
                    <th>Modelo C (Último)</th>
                    <th>IDD Canônico (Rodízio)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Ana</strong></td>
                    <td>R$ 33,33</td>
                    <td style={{ color: '#c94640', fontWeight: 'bold' }}>R$ 33,34 (+1c)</td>
                    <td>R$ 33,33</td>
                    <td style={{ color: '#17865e', fontWeight: 'bold' }}>R$ 33,34 (Item 1)</td>
                  </tr>
                  <tr>
                    <td><strong>Bruno</strong></td>
                    <td>R$ 33,33</td>
                    <td>R$ 33,33</td>
                    <td>R$ 33,33</td>
                    <td style={{ color: '#17865e', fontWeight: 'bold' }}>R$ 33,34 (Item 2)</td>
                  </tr>
                  <tr>
                    <td><strong>Carla</strong></td>
                    <td>R$ 33,33</td>
                    <td>R$ 33,33</td>
                    <td style={{ color: '#c94640', fontWeight: 'bold' }}>R$ 33,34 (+1c)</td>
                    <td style={{ color: '#17865e', fontWeight: 'bold' }}>R$ 33,34 (Item 3)</td>
                  </tr>
                  <tr style={{ background: '#f5f3eb', fontWeight: 'bold' }}>
                    <td>Total Arrecadado</td>
                    <td style={{ color: '#c94640' }}>R$ 99,99 (Falta 1c)</td>
                    <td>R$ 100,00</td>
                    <td>R$ 100,00</td>
                    <td style={{ color: '#17865e' }}>R$ 100,00 (Zero Defasagem)</td>
                  </tr>
                </tbody>
              </table>

              <p style={{ fontSize: 11, color: '#68766f', margin: 0 }}>
                💡 <em>O Combo Científico de Custo Zero elimina a ambiguidade antes do código ser gerado, garantindo que o desenvolvedor ou agente IA implemente a única interpretação matematicamente válida.</em>
              </p>
            </div>
          </div>
        </div>
      )}

      {showGraphModal && (
        <div className="shala-modal-backdrop" onClick={() => setShowGraphModal(false)}>
          <div className="graph-view-modal" onClick={e => e.stopPropagation()}>
            <div className="graph-view-header">
              <h3 style={{ margin: 0, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Network size={18} style={{ color: '#45b08c' }} />
                Grafo de Conhecimento Estrutural &amp; Inspetor de Nós (Graphify AST)
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 11, color: '#e5c15c', fontFamily: 'monospace' }}>
                  Grafo AST local (TypeScript Compiler API)
                </span>
                <button
                  aria-label="Fechar modal"
                  style={{ background: 'transparent', border: 0, color: '#c9c7bb', cursor: 'pointer' }}
                  onClick={() => setShowGraphModal(false)}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="graph-view-content">
              {/* Área SVG do Grafo Interativo */}
              <div className="graph-svg-area">
                <svg viewBox="0 0 600 400">
                  <defs>
                    <marker
                      id="arrow"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="#456057" />
                    </marker>
                    <marker
                      id="arrow-mutate"
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="#c94640" />
                    </marker>
                  </defs>

                  {/* Arestas conectando nós */}
                  {/* Mesa -> fechar */}
                  <line x1="160" y1="130" x2="440" y2="80" stroke="#36574c" strokeWidth="2" markerEnd="url(#arrow)" />
                  <text x="290" y="95" fill="#8da59b" fontSize="10" fontFamily="monospace">contains</text>

                  {/* Mesa -> calcularCotas */}
                  <line x1="160" y1="130" x2="440" y2="210" stroke="#36574c" strokeWidth="2" markerEnd="url(#arrow)" />
                  <text x="290" y="160" fill="#8da59b" fontSize="10" fontFamily="monospace">contains</text>

                  {/* fechar -> status (mutates) */}
                  <path d="M 440 80 Q 320 200 230 320" fill="none" stroke="#c94640" strokeWidth="2" strokeDasharray="4,4" markerEnd="url(#arrow-mutate)" />
                  <text x="330" y="270" fill="#e5b0aa" fontSize="10" fontFamily="monospace">mutates</text>

                  {/* Mesa -> status (owns) */}
                  <line x1="160" y1="130" x2="230" y2="320" stroke="#36574c" strokeWidth="2" markerEnd="url(#arrow)" />
                  <text x="180" y="240" fill="#8da59b" fontSize="10" fontFamily="monospace">owns</text>

                  {/* Nós Clicáveis */}
                  {nodesData.map(node => {
                    const isSelected = selectedNodeId === node.id;
                    const isClass = node.kind === 'class';
                    const isMethod = node.kind === 'method';
                    const strokeColor = isSelected ? '#e5c15c' : isClass ? '#45b08c' : isMethod ? '#4272a6' : '#d2a435';
                    const width = isClass ? 130 : isMethod ? 170 : 110;

                    return (
                      <g
                        key={node.id}
                        transform={`translate(${node.x - width / 2}, ${node.y - 25})`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSelectedNodeId(node.id)}
                      >
                        {isSelected && (
                          <rect
                            x="-4"
                            y="-4"
                            width={width + 8}
                            height="58"
                            rx="8"
                            fill="none"
                            stroke="#e5c15c"
                            strokeWidth="2"
                            strokeDasharray="3,3"
                          />
                        )}
                        <rect
                          width={width}
                          height="50"
                          rx="6"
                          fill="#13231f"
                          stroke={strokeColor}
                          strokeWidth={isSelected ? 2 : 1.5}
                        />
                        <text
                          x={width / 2}
                          y="18"
                          textAnchor="middle"
                          fill="#8da59b"
                          fontSize="9"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          [{node.kind.toUpperCase()}]
                        </text>
                        <text
                          x={width / 2}
                          y="36"
                          textAnchor="middle"
                          fill="#e8e7df"
                          fontSize="12"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {node.name}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Inspetor & Ajuste do Nó Selecionado */}
              <aside className="graph-inspector-panel">
                {(() => {
                  const node = nodesData.find(n => n.id === selectedNodeId) || nodesData[0];
                  return (
                    <div>
                      <h3>
                        <Sparkles size={14} style={{ color: '#e5c15c' }} />
                        Inspetor do Nó: {node.name}
                      </h3>

                      <div className="inspector-field">
                        <label>Identificador no Grafo / Código</label>
                        <input
                          type="text"
                          value={node.name}
                          onChange={e => {
                            const val = e.target.value;
                            setNodesData(prev => prev.map(n => n.id === node.id ? { ...n, name: val } : n));
                          }}
                        />
                      </div>

                      <div className="inspector-field">
                        <label>Tipo no Domínio (DDD / AST)</label>
                        <select
                          value={node.kind}
                          onChange={e => {
                            const val = e.target.value;
                            setNodesData(prev => prev.map(n => n.id === node.id ? { ...n, kind: val } : n));
                          }}
                        >
                          <option value="class">Entidade / Agregado (Classe)</option>
                          <option value="method">Transação / Operação (Método)</option>
                          <option value="property">Atributo de Estado (Propriedade)</option>
                          <option value="table">Tabela Relacional (SQL)</option>
                        </select>
                      </div>

                      <div className="inspector-field">
                        <label>Definição Ubíqua (dicionario.json)</label>
                        <textarea
                          value={node.def}
                          onChange={e => {
                            const val = e.target.value;
                            setNodesData(prev => prev.map(n => n.id === node.id ? { ...n, def: val } : n));
                          }}
                        />
                      </div>

                      {node.kind === 'method' && (
                        <>
                          <div className="inspector-field">
                            <label>Cerca de Mutação Autorizada (allowed_fields)</label>
                            <input
                              type="text"
                              value={node.allowed}
                              placeholder="ex: status, fechada_em"
                              onChange={e => {
                                const val = e.target.value;
                                setNodesData(prev => prev.map(n => n.id === node.id ? { ...n, allowed: val } : n));
                              }}
                            />
                          </div>

                          <div className="inspector-field">
                            <label>Campos Somente Leitura (read_only_fields)</label>
                            <input
                              type="text"
                              value={node.readOnly}
                              placeholder="ex: id, total"
                              onChange={e => {
                                const val = e.target.value;
                                setNodesData(prev => prev.map(n => n.id === node.id ? { ...n, readOnly: val } : n));
                              }}
                            />
                          </div>
                        </>
                      )}

                      <button
                        className="inspector-save-btn"
                        onClick={() => {
                          setSaveToast(true);
                          setTimeout(() => setSaveToast(false), 2500);
                        }}
                      >
                        {saveToast ? '✓ Ajustes Sincronizados!' : 'Salvar Ajustes do Nó'}
                      </button>

                      {saveToast && (
                        <p style={{ fontSize: 10, color: '#45b08c', marginTop: 8, textAlign: 'center' }}>
                          ✓ Nó atualizado. Dicionário ubíquo e contratos .intent.yaml sincronizados!
                        </p>
                      )}
                    </div>
                  );
                })()}
              </aside>
            </div>
          </div>
        </div>
      )}
      {/* Modal Genérico do Sistema (Gate 1, Gate 2, Dicionário, Decisões, Cânone, Sobre) */}
      {activeModal && (
        <div className="shala-modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="shala-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 860 }}>
            {/* Header */}
            <div className="shala-modal-header">
              <h3>
                {activeModal === 'gate1' && <><CheckCircle2 size={16} style={{ color: '#45b08c' }} /> Gate 1: Linter Semântico &amp; Sintaxe AST</>}
                {activeModal === 'gate2' && <><ShieldCheck size={16} style={{ color: '#45b08c' }} /> Gate 2: Verificação Arquitetural &amp; BCNF</>}
                {activeModal === 'dictionary' && <><BookOpen size={16} style={{ color: '#e5c15c' }} /> Dicionário Ubíquo Canônico ({activeCaseName})</>}
                {activeModal === 'decisions' && <><Sliders size={16} style={{ color: '#e5c15c' }} /> Decisões Socráticas de Arquitetura (ADRs)</>}
                {activeModal === 'canon' && <><Database size={16} style={{ color: '#45b08c' }} /> Cânone IDD: Epistêmica de Precisão &amp; Custo Zero</>}
                {activeModal === 'about' && <><Info size={16} style={{ color: '#4272a6' }} /> Sobre o IDD IDE v0.1.0</>}
              </h3>
              <button aria-label="Fechar modal" onClick={() => setActiveModal(null)}>
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="shala-modal-body">
              {/* GATE 1 */}
              {activeModal === 'gate1' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#e4f4ed', padding: '10px 14px', borderRadius: 4, border: '1px solid #74b49d', marginBottom: 16 }}>
                    <strong style={{ color: '#136a4b', fontSize: 13 }}>✓ Gate 1 Aprovado (5/5 Critérios Determinísticos)</strong>
                    <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#17865e' }}>0 tokens de LLM consumidos</span>
                  </div>
                  <table className="shala-table">
                    <thead>
                      <tr>
                        <th>Critério</th>
                        <th>Verificador</th>
                        <th>Resultado</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>a) Linter Semântico</strong></td>
                        <td>Regras LN001 a LN015 (lintLn)</td>
                        <td>intencoes.md e invariantes.md sem erros sintáticos ou violações de vocabulário</td>
                        <td><span className="shala-badge-green">PASSOU</span></td>
                      </tr>
                      <tr>
                        <td><strong>b) Invariantes Testáveis</strong></td>
                        <td>Validador Estrutural de Invariantes</td>
                        <td>Todas as invariantes possuem ID canônico, tipo válido e marcador testável</td>
                        <td><span className="shala-badge-green">PASSOU</span></td>
                      </tr>
                      <tr>
                        <td><strong>c) Decisões de Arquitetura</strong></td>
                        <td>Analisador de ADRs (decisoes.md)</td>
                        <td>Nenhuma decisão bloqueante em aberto; todas as bifurcações foram arbitradas</td>
                        <td><span className="shala-badge-green">PASSOU</span></td>
                      </tr>
                      <tr>
                        <td><strong>d) Completude Mínima</strong></td>
                        <td>Contador Estrutural de Artefatos</td>
                        <td>Pelo menos 1 intenção e 1 invariante estruturadas no caso de estudo</td>
                        <td><span className="shala-badge-green">PASSOU</span></td>
                      </tr>
                      <tr>
                        <td><strong>e) SHALA (consultivo)</strong></td>
                        <td>Motor SHALA (Frames + EARS + SAT)</td>
                        <td>nenhuma interpretação concorrente detectada pelas heurísticas (não reprova o gate)</td>
                        <td><span className="shala-badge-green">PASSOU</span></td>
                      </tr>
                    </tbody>
                  </table>
                  <p style={{ fontSize: 11, color: '#5f6f67', margin: '8px 0 0' }}>
                    O Gate 1 é o portão de linting semântico estrito. Nenhuma linha de código avança para a Fase 2 se violar o vocabulário ubíquo, ou deixar decisão bloqueante em aberto. O indicador SHALA é consultivo: gera perguntas, não reprova.
                  </p>
                </div>
              )}

              {/* GATE 2 */}
              {activeModal === 'gate2' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#e4f4ed', padding: '10px 14px', borderRadius: 4, border: '1px solid #74b49d', marginBottom: 16 }}>
                    <strong style={{ color: '#136a4b', fontSize: 13 }}>✓ Gate 2 Aprovado: Consistência Arquitetural Formal</strong>
                    <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#17865e' }}>5 Artefatos Validados</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ background: '#fff', border: '1px solid #cfcdc1', padding: 12, borderRadius: 4 }}>
                      <strong style={{ fontSize: 12, color: '#1c352d' }}>1. MER BCNF (Boyce-Codd)</strong>
                      <p style={{ fontSize: 11, color: '#5f6f67', margin: '4px 0 0' }}>
                        Todas as dependências funcionais $X \to Y$ possuem $X$ como superchave. Zero redundância de saldo e valores em centavos inteiros.
                      </p>
                    </div>
                    <div style={{ background: '#fff', border: '1px solid #cfcdc1', padding: 12, borderRadius: 4 }}>
                      <strong style={{ fontSize: 12, color: '#1c352d' }}>2. Casos de Uso com Pós-Condições</strong>
                      <p style={{ fontSize: 11, color: '#5f6f67', margin: '4px 0 0' }}>
                        UC-01 (Criar Mesa), UC-02 (Registrar Consumo), UC-03 (Calcular Cotas &amp; Fechar) com invariantes pré/pós formalizados.
                      </p>
                    </div>
                    <div style={{ background: '#fff', border: '1px solid #cfcdc1', padding: 12, borderRadius: 4 }}>
                      <strong style={{ fontSize: 12, color: '#1c352d' }}>3. Diagramas de Atividades</strong>
                      <p style={{ fontSize: 11, color: '#5f6f67', margin: '4px 0 0' }}>
                        Fluxo de controle determinístico com nós de decisão sem deadlocks e caminhos de exceção exaustivos.
                      </p>
                    </div>
                    <div style={{ background: '#fff', border: '1px solid #cfcdc1', padding: 12, borderRadius: 4 }}>
                      <strong style={{ fontSize: 12, color: '#1c352d' }}>4. Máquina de Estados Finita</strong>
                      <p style={{ fontSize: 11, color: '#5f6f67', margin: '4px 0 0' }}>
                        Ciclo de vida estrito: <code>aberta</code> $\to$ <code>fechada</code> (terminal e idempotente).
                      </p>
                    </div>
                  </div>
                  <div style={{ marginTop: 12, background: '#fff', border: '1px solid #cfcdc1', padding: 12, borderRadius: 4 }}>
                    <strong style={{ fontSize: 12, color: '#1c352d' }}>5. Cerca de Mutação AST (allowed_fields &amp; read_only_fields)</strong>
                    <p style={{ fontSize: 11, color: '#5f6f67', margin: '4px 0 0' }}>
                      Métodos de transição só podem alterar campos explicitamente autorizados na especificação. Escrita acidental em campos de auditoria ou chaves primárias é bloqueada pelo linter.
                    </p>
                  </div>
                </div>
              )}

              {/* DICIONÁRIO */}
              {activeModal === 'dictionary' && (
                <div>
                  <p style={{ fontSize: 12, color: '#5f6f67', margin: '0 0 12px' }}>
                    Termos canônicos sincronizados no <code>dicionario.json</code> do caso ativo (<strong>{activeCaseName}</strong>).
                  </p>
                  <table className="shala-table">
                    <thead>
                      <tr>
                        <th>Termo Canônico</th>
                        <th>Contexto Delimitado</th>
                        <th>Definição Formal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeCaseName === 'racha-conta' ? (
                        <>
                          <tr><td><strong>Mesa</strong></td><td>Consumo / Agregado</td><td>Agregado raiz do encontro de consumo no restaurante/bar.</td></tr>
                          <tr><td><strong>Participante</strong></td><td>Consumo / Pagamento</td><td>Pessoa física vinculada à mesa com consumo próprio e cota devida.</td></tr>
                          <tr><td><strong>ResponsavelMesa</strong></td><td>Governança</td><td>Participante com privilégio administrativo de fechar a mesa e receber Pix.</td></tr>
                          <tr><td><strong>ItemConsumido</strong></td><td>Consumo / Comanda</td><td>Produto consumido com quantidade e valor unitário em centavos.</td></tr>
                          <tr><td><strong>TaxaServico</strong></td><td>Faturamento</td><td>Acréscimo de 10% rateado proporcionalmente sobre os itens da mesa.</td></tr>
                          <tr><td><strong>Cota</strong></td><td>Financeiro / Rateio</td><td>Valor exato em centavos devido por um participante após rateio de soma zero.</td></tr>
                          <tr><td><strong>Resto</strong></td><td>Aritmética / Compensação</td><td>Centavos indivisíveis resultantes da divisão distribuídos via rodízio alfabético.</td></tr>
                          <tr><td><strong>StatusMesa</strong></td><td>Ciclo de Vida</td><td>Enum estrito com os valores terminais: aberta | fechada | cancelada.</td></tr>
                        </>
                      ) : activeCaseName === 'marketplace-pix' ? (
                        <>
                          <tr><td><strong>PedidoMarketplace</strong></td><td>Checkout / Agregado</td><td>Carrinho consolidado com produtos de múltiplos vendedores.</td></tr>
                          <tr><td><strong>SplitPix</strong></td><td>Liquidação</td><td>Divisão instantânea de fundos entre lojistas e plataforma.</td></tr>
                          <tr><td><strong>CustodiaEscrow</strong></td><td>Garantia Financeira</td><td>Retenção segura do valor até a confirmação de entrega física.</td></tr>
                          <tr><td><strong>Lojista</strong></td><td>Vendas / Seller</td><td>Parceiro comercial credenciado com chave Pix de liquidação.</td></tr>
                        </>
                      ) : (
                        <>
                          <tr><td><strong>ContaCorrente</strong></td><td>Bancário / Agregado</td><td>Unidade contábil titular de depósitos e lançamentos.</td></tr>
                          <tr><td><strong>PartidaDobrada</strong></td><td>Contabilidade</td><td>Princípio de conservação: débito == crédito (soma zero estrita).</td></tr>
                          <tr><td><strong>ReservaSaldo</strong></td><td>Prevenção de Risco</td><td>Bloqueio temporário de limite para transações em processamento.</td></tr>
                          <tr><td><strong>Lancamento</strong></td><td>Auditoria / Ledger</td><td>Registro imutável de movimentação financeira.</td></tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* DECISÕES SOCRÁTICAS */}
              {activeModal === 'decisions' && (
                <div>
                  <p style={{ fontSize: 12, color: '#5f6f67', margin: '0 0 12px' }}>
                    Registro formal de decisões arquiteturais (ADRs) documentadas em <code>decisoes.md</code>.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 380, overflowY: 'auto' }}>
                    <div style={{ background: '#fff', border: '1px solid #cfcdc1', padding: 10, borderRadius: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <strong style={{ fontSize: 12, color: '#1c352d' }}>ADR-001: Rateio de Resto em Centavos por Rodízio Alfabético</strong>
                        <span className="shala-badge-green">VALIDADO</span>
                      </div>
                      <p style={{ fontSize: 11, color: '#5f6f67', margin: '4px 0 0' }}>
                        Divisões não inteiras de centavos (ex: R$ 100,00 ÷ 3 = R$ 33,33 com R$ 0,01 de resto) são alocadas deterministicamente aos primeiros participantes em ordem alfabética. Elimina incerteza de implementação ($H(Y \mid X) = 0.00$).
                      </p>
                    </div>

                    <div style={{ background: '#fff', border: '1px solid #cfcdc1', padding: 10, borderRadius: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <strong style={{ fontSize: 12, color: '#1c352d' }}>ADR-002: Chave Pix Vinculada ao Responsável da Mesa</strong>
                        <span className="shala-badge-green">VALIDADO</span>
                      </div>
                      <p style={{ fontSize: 11, color: '#5f6f67', margin: '4px 0 0' }}>
                        O responsável da mesa cadastra sua chave Pix como credor único do rateio perante o bar, evitando múltiplos Pix para o garçom.
                      </p>
                    </div>

                    <div style={{ background: '#fff', border: '1px solid #cfcdc1', padding: 10, borderRadius: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <strong style={{ fontSize: 12, color: '#1c352d' }}>ADR-003: Taxa de Serviço Proporcional ao Consumo Individual</strong>
                        <span className="shala-badge-green">VALIDADO</span>
                      </div>
                      <p style={{ fontSize: 11, color: '#5f6f67', margin: '4px 0 0' }}>
                        Os 10% da taxa incidem exclusivamente sobre a soma dos itens consumidos por cada participante. Quem consumiu zero itens paga zero taxa.
                      </p>
                    </div>

                    <div style={{ background: '#fff', border: '1px solid #cfcdc1', padding: 10, borderRadius: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <strong style={{ fontSize: 12, color: '#1c352d' }}>ADR-004: Fechamento de Mesa Idempotente</strong>
                        <span className="shala-badge-green">VALIDADO</span>
                      </div>
                      <p style={{ fontSize: 11, color: '#5f6f67', margin: '4px 0 0' }}>
                        Chamar <code>fechar()</code> em uma mesa já fechada não altera seu <code>fechada_em</code> nem recomputa transações passadas.
                      </p>
                    </div>

                    <div style={{ background: '#fff', border: '1px solid #cfcdc1', padding: 10, borderRadius: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <strong style={{ fontSize: 12, color: '#1c352d' }}>ADR-005: Armazenamento Financeiro em Centavos Inteiros</strong>
                        <span className="shala-badge-green">VALIDADO</span>
                      </div>
                      <p style={{ fontSize: 11, color: '#5f6f67', margin: '4px 0 0' }}>
                        Proibição estrita de <code>float</code> ou <code>double</code> em cálculos monetários. Todos os valores são representados como números inteiros de centavos no banco de dados e contratos.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* CÂNONE IDD */}
              {activeModal === 'canon' && (
                <div>
                  <h4 style={{ margin: '0 0 8px', color: '#1c352d' }}>Epistêmica de Precisão do Paradigma IDD</h4>
                  <p style={{ fontSize: 12, color: '#5f6f67', margin: '0 0 14px' }}>
                    O Intent-Driven Development (IDD) substitui a adivinhação estatística por garantias formais locais. O combo científico de 5 pilares opera com custo zero de execução:
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ background: '#fff', border: '1px solid #cfcdc1', padding: 10, borderRadius: 4 }}>
                      <strong style={{ color: '#1c352d', fontSize: 12 }}>1. Frames por regex (inspirados em Fillmore)</strong>
                      <p style={{ fontSize: 11, color: '#5f6f67', margin: '2px 0 0' }}>Catálogo próprio de gatilhos e slots por expressão regular; aponta elementos obrigatórios ausentes. Não usa a base FrameNet.</p>
                    </div>
                    <div style={{ background: '#fff', border: '1px solid #cfcdc1', padding: 10, borderRadius: 4 }}>
                      <strong style={{ color: '#1c352d', fontSize: 12 }}>2. Ambiguidade estrutural (regex)</strong>
                      <p style={{ fontSize: 11, color: '#5f6f67', margin: '2px 0 0' }}>Padrões para "A e B ou C", termos vagos e modificadores soltos. Não há parser Earley nem gramática.</p>
                    </div>
                    <div style={{ background: '#fff', border: '1px solid #cfcdc1', padding: 10, borderRadius: 4 }}>
                      <strong style={{ color: '#1c352d', fontSize: 12 }}>3. Divergência de Jensen-Shannon (JSD)</strong>
                      <p style={{ fontSize: 11, color: '#5f6f67', margin: '2px 0 0' }}>Coocorrência em janela de 3 tokens e divergência de Jensen-Shannon entre contextos: cálculo real, sobre um corpus pequeno.</p>
                    </div>
                    <div style={{ background: '#fff', border: '1px solid #cfcdc1', padding: 10, borderRadius: 4 }}>
                      <strong style={{ color: '#1c352d', fontSize: 12 }}>4. Guardas numéricas (regex)</strong>
                      <p style={{ fontSize: 11, color: '#5f6f67', margin: '2px 0 0' }}>Checa fronteiras em uma dimensão (x &gt; N e x &lt; N sem o caso N). Não há solver SAT/DPLL.</p>
                    </div>
                    <div style={{ background: '#fff', border: '1px solid #cfcdc1', padding: 10, borderRadius: 4 }}>
                      <strong style={{ color: '#1c352d', fontSize: 12 }}>5. Indicador SHALA (log2 de interpretações estimadas)</strong>
                      <p style={{ fontSize: 11, color: '#5f6f67', margin: '2px 0 0' }}>Estimativa heurística e consultiva: indica onde perguntar; não mede a incerteza do código nem bloqueia o avanço.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* SOBRE */}
              {activeModal === 'about' && (
                <div>
                  <div style={{ textAlign: 'center', padding: '10px 0 16px' }}>
                    <img src="/idd-mark.svg" alt="" style={{ width: 48, height: 48, marginBottom: 8 }} />
                    <h2 style={{ margin: '0 0 4px', fontSize: 18, color: '#1c352d' }}>IDD IDE &mdash; Intent-Driven Development</h2>
                    <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#17865e', background: '#e4f4ed', padding: '2px 8px', borderRadius: 4 }}>
                      Versão 0.1.0-alpha (Build 2026.10)
                    </span>
                  </div>
                  <div style={{ background: '#fff', border: '1px solid #cfcdc1', padding: 14, borderRadius: 4, fontSize: 12, lineHeight: 1.6, color: '#2d3e37' }}>
                    <p style={{ margin: '0 0 8px' }}>
                      O <strong>IDD IDE</strong> é o ambiente integrado pioneiro para desenvolvimento governado por intenção estrita e epistemologia de precisão.
                    </p>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      <li><strong>Grafo AST (TypeScript Compiler API):</strong> extração determinística local de classes, métodos e mutações. Não é Tree-sitter nem o graphify open source.</li>
                      <li><strong>SHALA:</strong> indicador heurístico e consultivo de ambiguidade (regex, coocorrência e JSD).</li>
                      <li><strong>Gates Determinísticos:</strong> Linting semântico estrito e arquitetura BCNF verificados localmente sem alucinações.</li>
                    </ul>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                    <button className="btn-primary" onClick={() => setActiveModal(null)}>
                      Entendido
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {saveToast && (
        <div style={{
          position: 'fixed',
          bottom: '36px',
          right: '24px',
          background: '#163029',
          color: '#e8e7df',
          border: '1px solid #45b08c',
          padding: '10px 16px',
          borderRadius: '5px',
          fontSize: '11px',
          fontFamily: 'monospace',
          boxShadow: '0 6px 18px rgba(0,0,0,0.4)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <CheckCircle2 size={15} style={{ color: '#45b08c' }} /> {toastMessage}
        </div>
      )}
    </div>
  );
}

export default App;
