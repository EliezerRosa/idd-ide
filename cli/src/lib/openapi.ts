// src/lib/openapi.ts — Issue #25: OpenAPI 3.1 generator from .intent.yaml
import * as yaml from 'js-yaml';

export interface OpenApiSpec {
  openapi: string;
  info:    { title: string; version: string; description?: string };
  paths:   Record<string, OpenApiPath>;
  components: { schemas: Record<string, object>; securitySchemes?: object };
  tags?:   Array<{ name: string; description?: string }>;
  security?: object[];
}
export interface OpenApiPath { [method: string]: OpenApiOperation }
export interface OpenApiOperation {
  summary: string; description: string; operationId: string; tags: string[];
  parameters?: object[]; requestBody?: object;
  responses: Record<string, object>; security?: object[];
}
export interface IntentYaml {
  intent: string; module: string; constraints: string[]; acceptance: string[];
  depends_on?: string[]; language?: string; framework?: string; version?: string;
}

const METHOD_HINTS: Array<[RegExp, string]> = [
  [/\b(listar|buscar|obter|consultar|get|list|find|fetch|search|read)\b/i,       'get'],
  [/\b(criar|cadastrar|registrar|adicionar|create|add|register|new|post)\b/i,    'post'],
  [/\b(atualizar|editar|modificar|alterar|update|edit|modify|patch|put)\b/i,     'patch'],
  [/\b(remover|deletar|excluir|apagar|delete|remove|drop|destroy)\b/i,           'delete'],
  [/\b(autenticar|fazer login|login|authenticate|auth)\b/i,                      'post'],
  [/\b(enviar|publicar|submit|send|publish)\b/i,                                 'post'],
  [/\b(exportar|download|export)\b/i,                                            'get'],
  [/\b(importar|upload|import)\b/i,                                              'post'],
];

export function inferHttpMethod(intent: string): string {
  for (const [pat, method] of METHOD_HINTS) { if (pat.test(intent)) return method; }
  return 'post';
}

export function inferStatusCodes(method: string, acceptance: string[]): Record<string, object> {
  const responses: Record<string, object> = {};
  const code = method === 'post' ? '201' : method === 'delete' ? '204' : '200';
  responses[code] = {
    description: method === 'post' ? 'Criado com sucesso' : method === 'delete' ? 'Removido' : 'Sucesso',
    ...(method !== 'delete' ? { content: { 'application/json': { schema: { type: 'object' } } } } : {}),
  };
  const text = acceptance.join(' ').toLowerCase();
  if (text.includes('401') || text.includes('credencia')) responses['401'] = { description: 'Não autenticado' };
  if (text.includes('403') || text.includes('permissão'))  responses['403'] = { description: 'Não autorizado' };
  if (text.includes('404') || text.includes('não encontrado')) responses['404'] = { description: 'Não encontrado' };
  if (text.includes('400') || text.includes('inválido')) responses['400'] = {
    description: 'Requisição inválida',
    content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string' }, details: { type: 'array', items: { type: 'string' } } } } } },
  };
  if (text.includes('429') || text.includes('rate limit'))  responses['429'] = { description: 'Rate limit atingido' };
  if (text.includes('423') || text.includes('bloqueado'))   responses['423'] = { description: 'Recurso bloqueado' };
  responses['500'] = { description: 'Erro interno' };
  return responses;
}

export function inferRequestSchema(intent: string, constraints: string[]): object | null {
  if (['get','delete'].includes(inferHttpMethod(intent))) return null;
  const properties: Record<string, object> = {};
  const required: string[] = [];
  const FIELD_PATS: Array<[RegExp, string, object]> = [
    [/email/i,             'email',    { type:'string', format:'email' }],
    [/senha|password/i,    'password', { type:'string', minLength:8, writeOnly:true }],
    [/nome|name/i,         'name',     { type:'string', minLength:1 }],
    [/cpf/i,               'cpf',      { type:'string', pattern:'^\\d{11}$' }],
    [/url/i,               'url',      { type:'string', format:'uri' }],
    [/valor|preco|price/i, 'amount',   { type:'number', minimum:0 }],
    [/quantidade|qty/i,    'quantity', { type:'integer', minimum:1 }],
  ];
  for (const c of constraints) {
    for (const [pat, field, schema] of FIELD_PATS) {
      if (pat.test(c) && !properties[field]) {
        properties[field] = schema;
        if (/obrigatório|required/i.test(c)) required.push(field);
      }
    }
  }
  if (Object.keys(properties).length === 0) return null;
  return { type:'object', ...(required.length ? {required} : {}), properties };
}

export function generateEndpoint(intent: IntentYaml, jsonbSchemas?: Record<string, object>): {
  path: string; method: string; operation: OpenApiOperation;
} {
  const [mod, sub] = intent.module.split('/');
  const method     = inferHttpMethod(intent.intent);
  const isSingle   = /\b(buscar|obter|get|find|remover|deletar|delete|atualizar|update|patch)\b/i.test(intent.intent);
  const basePath   = `/${mod}/${sub}`.replace(/_/g, '-');
  const path2      = isSingle && method !== 'post' ? `${basePath}/{id}` : basePath;
  const responses  = inferStatusCodes(method, intent.acceptance);
  const reqSchema  = inferRequestSchema(intent.intent, intent.constraints);
  const tags       = [mod.charAt(0).toUpperCase() + mod.slice(1)];

  const operation: OpenApiOperation = {
    summary: intent.intent.slice(0, 80),
    description: [intent.intent,'','**Constraints:**',...intent.constraints.map(c=>`- ${c}`),'','**Aceite:**',...intent.acceptance.map(a=>`- ${a}`)].join('\n'),
    operationId: `${method}_${mod}_${sub}`.replace(/-/g,'_'),
    tags, responses,
  };
  if (path2.includes('{id}')) {
    operation.parameters = [{ name:'id', in:'path', required:true, description:`ID do ${sub}`, schema:{ type:'string', format:'uuid' } }];
  }
  if (reqSchema && method !== 'get' && method !== 'delete') {
    operation.requestBody = { required:true, content:{ 'application/json':{ schema:reqSchema } } };
  }
  const entityName = sub.charAt(0).toUpperCase()+sub.slice(1);
  if (jsonbSchemas?.[entityName] && responses['200']) {
    (responses['200'] as any).content = { 'application/json':{ schema:{ $ref:`#/components/schemas/${entityName}` } } };
  }
  return { path: path2, method, operation };
}

export function buildOpenApiSpec(projectName: string, version: string,
  endpoints: Array<{ path: string; method: string; operation: OpenApiOperation }>,
  jsonbSchemas?: Record<string, object>
): OpenApiSpec {
  const paths: Record<string, OpenApiPath> = {};
  const tags = new Set<string>();
  for (const ep of endpoints) {
    if (!paths[ep.path]) paths[ep.path] = {};
    paths[ep.path][ep.method] = ep.operation;
    ep.operation.tags.forEach(t => tags.add(t));
  }
  return {
    openapi: '3.1.0',
    info: { title:`${projectName} API`, version, description:`API gerada pelo IDD IDE a partir de .intent.yaml` },
    tags: [...tags].map(name => ({ name })),
    security: [{ bearerAuth:[] }],
    paths,
    components: {
      schemas: jsonbSchemas ?? {},
      securitySchemes: { bearerAuth:{ type:'http', scheme:'bearer', bearerFormat:'JWT' } },
    },
  };
}
export const specToYaml = (spec: OpenApiSpec): string => yaml.dump(spec, { lineWidth:-1, noRefs:true, sortKeys:false });
export const specToJson = (spec: OpenApiSpec): string => JSON.stringify(spec, null, 2);
