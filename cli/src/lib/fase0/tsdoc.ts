// src/lib/fase0/tsdoc.ts — ponte especificação → código: contratos v2 da Fase 0 viram anotações TSDoc
// (@intent, @mutates, @readonly, @invariant) que o @idd/eslint-plugin fiscaliza no editor e no CI.
import * as fs from 'node:fs';
import * as path from 'node:path';
import yaml from 'js-yaml';
import { parseContract, type IntentContract } from '@idd/core';

export interface BlocoTsdoc {
  classe: string;
  metodo: string;
  arquivo: string;
  texto: string;
  /** entidades de outras classes que o contrato altera ou lê, sem campo correspondente conhecido em this */
  pendencias: string[];
}

const semMarcacao = (s: string): string => s.replace(/\[\[([^\]]+)\]\]/g, '$1').replace(/\s+/g, ' ').trim();

/**
 * Separa as entradas do contrato em campos da própria classe ("campo" ou "Classe.campo") e referências a
 * outras entidades ("OutraClasse" ou "OutraClasse.campo"), que não têm tradução direta para this.
 */
function separar(lista: string[], classe: string): { proprios: string[]; outros: string[] } {
  const proprios: string[] = [];
  const outros: string[] = [];
  for (const f of lista) {
    if (!f.includes('.')) (f === classe ? outros : /^[A-Z]/.test(f) ? outros : proprios).push(f);
    else if (f.startsWith(`${classe}.`)) proprios.push(f.slice(classe.length + 1));
    else outros.push(f);
  }
  return { proprios, outros };
}

export function tsdocDoContrato(c: IntentContract, arquivo: string): BlocoTsdoc | undefined {
  if (!c.targetClass || !c.targetMethod) return undefined;
  const { allowedFields, readOnlyFields } = c.behavioralContract.stateMutation;
  const muta = separar(allowedFields, c.targetClass);
  const le = separar(readOnlyFields, c.targetClass);

  const L = ['/**', ` * ${semMarcacao(c.intent)}`, ' *', ` * @intent ${c.targetClass}.${c.targetMethod}`];
  L.push(` * @mutates ${muta.proprios.length ? muta.proprios.join(', ') : 'nenhum'}`);
  if (le.proprios.length) L.push(` * @readonly ${le.proprios.join(', ')}`);
  for (const inv of c.constraints.filter(x => x.type === 'invariant')) {
    L.push(` * @invariant ${inv.id} ${semMarcacao(inv.description)}`);
  }
  // A própria classe em allowed_fields significa criar a instância (construtor ou fábrica), não um campo de this
  if (muta.outros.includes(c.targetClass)) L.push(` * Cria uma instância de ${c.targetClass} (construtor ou fábrica).`);
  const pendencias = muta.outros.filter(x => x !== c.targetClass);
  if (pendencias.length) {
    L.push(` * TODO(IDD): o contrato também altera ${pendencias.join(', ')}. Liste em @mutates os campos de ${c.targetClass}`);
    L.push(` *   que guardam essas entidades (ex.: uma coleção do agregado); sem isso a regra acusará as mutações.`);
  }
  L.push(' */');
  return { classe: c.targetClass, metodo: c.targetMethod, arquivo, texto: L.join('\n'), pendencias };
}

/** Lê fase0/<caso>/contratos/*.intent.yaml e gera um bloco por método circunscrito. */
export function tsdocDoCaso(dirContratos: string): { blocos: BlocoTsdoc[]; invalidos: string[] } {
  const blocos: BlocoTsdoc[] = [];
  const invalidos: string[] = [];
  if (!fs.existsSync(dirContratos)) return { blocos, invalidos };
  for (const nome of fs.readdirSync(dirContratos).filter(f => f.endsWith('.intent.yaml')).sort()) {
    const r = parseContract(yaml.load(fs.readFileSync(path.join(dirContratos, nome), 'utf8')));
    if (!r.ok) { invalidos.push(nome); continue; }
    const b = tsdocDoContrato(r.contract, nome);
    if (b) blocos.push(b);
  }
  return { blocos, invalidos };
}
