// src/lib/templates/index.ts — Built-in intent templates
import * as fs   from 'node:fs';
import * as path from 'node:path';
import { findProjectRoot } from '../store.ts';

export interface IntentTemplate {
  name:        string;
  category:    'crud' | 'auth' | 'api' | 'infra' | 'notify' | 'custom';
  description: string;
  language?:   string;
  framework?:  string;
  tags:        string[];
  body: {
    intent:      string;
    constraints: string[];
    acceptance:  string[];
    depends_on?: string[];
  };
}

const BUILTIN_TEMPLATES: IntentTemplate[] = [
  {
    name: 'crud', category: 'crud',
    description: 'CRUD completo com validação, paginação e soft delete',
    tags: ['crud', 'database', 'rest'],
    body: {
      intent: 'Gerenciar {{entity}} com operações de criar, ler, atualizar e remover',
      constraints: [
        'Identificador único por {{entity}}',
        'Campos obrigatórios validados antes de persistir',
        'Soft delete — nunca remover fisicamente',
        'Paginação com limite máximo de 100 itens',
        'Nunca retornar campos sensíveis (senha, hash)',
      ],
      acceptance: [
        'Criar {{entity}} com dados válidos retorna 201 + objeto criado',
        'Criar com dados inválidos retorna 400 com erros detalhados',
        'Listar retorna array paginado com total',
        'Buscar por ID inexistente retorna 404',
        'Deletar marca como inativo sem remover do banco',
      ],
    },
  },
  {
    name: 'auth-jwt', category: 'auth',
    description: 'Autenticação com e-mail e senha retornando JWT',
    tags: ['auth', 'jwt', 'security'],
    body: {
      intent: 'Autenticar {{entity}} com e-mail e senha, retornando JWT válido por 24h',
      constraints: [
        'Senha deve ter mínimo 8 caracteres',
        'Bloquear conta após 5 tentativas falhas por 15 minutos',
        'Token JWT deve expirar em exatamente 24h',
        'Nunca registrar a senha em logs',
        'Hash de senha com bcrypt (mínimo 12 rounds)',
      ],
      acceptance: [
        'Login com credenciais corretas retorna 200 + token JWT',
        'Login com senha incorreta retorna 401 sem vazar informações',
        'Quinta tentativa falha consecutiva bloqueia a conta',
        'Token decodificado contém userId e campo exp válido',
      ],
    },
  },
  {
    name: 'webhook', category: 'api',
    description: 'Receber webhooks com validação de assinatura HMAC',
    tags: ['webhook', 'events', 'integration'],
    body: {
      intent: 'Receber eventos via webhook de {{provider}}, validar assinatura e processar payload',
      constraints: [
        'Validar assinatura HMAC-SHA256 antes de processar',
        'Retornar 200 imediatamente, processar de forma assíncrona',
        'Idempotência: reprocessar mesmo evento não causa efeito duplo',
        'Registrar todos os eventos para auditoria',
      ],
      acceptance: [
        'Payload com assinatura válida retorna 200',
        'Payload com assinatura inválida retorna 401',
        'Mesmo evento processado duas vezes executa apenas uma vez',
        'Evento desconhecido é registrado e retorna 200',
      ],
    },
  },
  {
    name: 'email', category: 'notify',
    description: 'Envio de e-mail transacional com retry',
    tags: ['email', 'notification', 'async'],
    body: {
      intent: 'Enviar e-mails transacionais com template, retry automático e rastreamento',
      constraints: [
        'Rate limit de 100 e-mails por hora por domínio',
        'Retry com backoff exponencial (3 tentativas)',
        'Nunca enviar para endereços na lista de bloqueio',
        'Registrar status de entrega (enviado, falhou, bounce)',
      ],
      acceptance: [
        'E-mail válido é enfileirado e enviado com sucesso',
        'Falha temporária dispara retry com backoff',
        'E-mail bloqueado retorna erro sem tentar enviar',
        'Rate limit retorna 429 com header Retry-After',
      ],
    },
  },
  {
    name: 'health-check', category: 'infra',
    description: 'Endpoint de health check com status de dependências',
    tags: ['infra', 'monitoring', 'ops'],
    body: {
      intent: 'Expor endpoint de health check com status do serviço e dependências',
      constraints: [
        'Resposta em menos de 500ms',
        'Verificar banco, cache e serviços externos',
        'Retornar 200 apenas quando tudo saudável',
        'Nunca expor IPs, senhas ou tokens na resposta',
      ],
      acceptance: [
        'GET /health retorna 200 com status "ok" quando tudo saudável',
        'Banco indisponível resulta em 503',
        'Resposta contém versão da aplicação e uptime',
        'Timeout de dependência resulta em 503',
      ],
    },
  },
  {
    name: 'pagination', category: 'api',
    description: 'Listagem paginada com cursor para alta performance',
    tags: ['api', 'pagination', 'rest'],
    body: {
      intent: 'Listar recursos com paginação baseada em cursor para alta performance',
      constraints: [
        'Limite máximo de 100 itens por página',
        'Cursor opaco (base64 encoded)',
        'Ordenação consistente e determinística',
        'Cursor expirado retorna 400',
      ],
      acceptance: [
        'Primeira página retorna itens + cursor para próxima',
        'Usando cursor retorna página correta sem duplicações',
        'Limite além do máximo é reduzido para 100',
        'Lista vazia retorna array vazio com hasMore: false',
      ],
    },
  },
  {
    name: 'auth-oauth', category: 'auth',
    description: 'Autenticação OAuth 2.0 com provider externo',
    tags: ['auth', 'oauth', 'social'],
    body: {
      intent: 'Autenticar usuário via OAuth 2.0 com provider externo (Google, GitHub)',
      constraints: [
        'Validar state CSRF antes de processar callback',
        'Nunca armazenar access_token do provider no banco',
        'Criar conta automaticamente se e-mail não existir',
        'Vincular conta existente se e-mail já cadastrado',
      ],
      acceptance: [
        'Redirect para URL de autorização do provider',
        'Callback com código válido cria sessão',
        'Callback com state inválido retorna 400',
        'Usuário novo tem conta criada automaticamente',
      ],
    },
  },
];

export { BUILTIN_TEMPLATES };

export function applyVariables(template: IntentTemplate, variables: Record<string, string>): IntentTemplate {
  const r = (s: string) => s.replace(/\{\{(\w+)\}\}/g, (_, k) => variables[k] ?? `{{${k}}}`);
  const ra = (a: string[]) => a.map(r);
  return {
    ...template,
    body: {
      intent:      r(template.body.intent),
      constraints: ra(template.body.constraints),
      acceptance:  ra(template.body.acceptance),
      depends_on:  template.body.depends_on?.map(r),
    },
  };
}

export function listTemplates(projectRoot?: string): IntentTemplate[] {
  const root  = projectRoot ?? findProjectRoot() ?? process.cwd();
  const local = loadLocalTemplates(root);
  const map   = new Map<string, IntentTemplate>();
  for (const t of BUILTIN_TEMPLATES) map.set(t.name, t);
  for (const t of local)             map.set(t.name, t);
  return [...map.values()];
}

export function getTemplate(name: string, projectRoot?: string): IntentTemplate | null {
  return listTemplates(projectRoot).find(t => t.name === name) ?? null;
}

function loadLocalTemplates(root: string): IntentTemplate[] {
  const dir = path.join(root, '.idd', 'templates');
  if (!fs.existsSync(dir)) return [];
  const results: IntentTemplate[] = [];
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.template.json')) continue;
    try {
      const t = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')) as IntentTemplate;
      if (t.name && t.body) results.push({ ...t, category: t.category ?? 'custom' });
    } catch { /* skip */ }
  }
  return results;
}

function escapeYamlString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function templateToYaml(template: IntentTemplate, module: string, language?: string): string {
  const lines = [
    `intent: "${escapeYamlString(template.body.intent)}"`,
    `module: ${module}`,
    '',
    'constraints:',
    ...template.body.constraints.map(c => `  - "${escapeYamlString(c)}"`),
    '',
    'acceptance:',
    ...template.body.acceptance.map(a => `  - "${escapeYamlString(a)}"`),
  ];
  if (template.body.depends_on?.length) {
    lines.push('', 'depends_on:');
    template.body.depends_on.forEach(d => lines.push(`  - ${d}`));
  }
  if (language ?? template.language) lines.push('', `language: ${language ?? template.language}`);
  if (template.framework) lines.push(`framework: ${template.framework}`);
  lines.push(`version: "0.0.0"`);
  return lines.join('\n') + '\n';
}

export function saveTemplate(template: IntentTemplate, projectRoot?: string): string {
  const root = projectRoot ?? findProjectRoot() ?? process.cwd();
  const dir  = path.join(root, '.idd', 'templates');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${template.name}.template.json`);
  fs.writeFileSync(file, JSON.stringify(template, null, 2), 'utf8');
  return file;
}
