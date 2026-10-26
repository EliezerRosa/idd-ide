/**
 * synth_audio.mjs — sintetiza os WAVs de narração para o vídeo de eleição-candidatos.
 *
 * Uso:
 *   node synth_audio.mjs              # sintetiza todos os segmentos
 *   node synth_audio.mjs --preview    # gera preview_narration.txt sem TTS
 *
 * Saída:
 *   tools/audio/<segmentId>.wav       (um arquivo por segmento)
 *   tools/manifest.json               (lista de segmentos com duração em segundos)
 *   tools/preview_narration.txt       (texto expandido para revisão humana)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Caminhos ─────────────────────────────────────────────────────────────────
const HTML_FILE   = join(__dirname, '..', 'eleicao-candidatos-apresentacao-interativa.html');
const JARGON_FILE = join(__dirname, 'jargon.json');
const AUDIO_DIR   = join(__dirname, 'audio');
const MANIFEST    = join(__dirname, 'manifest.json');
const PREVIEW_TXT = join(__dirname, 'preview_narration.txt');

const PREVIEW_ONLY = process.argv.includes('--preview') ||
                     process.argv.includes('--preview-only');

const VOICE = 'pt-BR-AntonioNeural';
const RATE  = '-10%';   // um pouco mais lento, melhor para narração

// ── Jargão ────────────────────────────────────────────────────────────────────
const JARGON = JSON.parse(readFileSync(JARGON_FILE, 'utf8'));

// Ordena do mais longo para o mais curto (precedência de substituição)
const JARGON_KEYS = Object.keys(JARGON).sort((a, b) => b.length - a.length);

/**
 * Expande abreviações de jargão técnico.
 * Substitui apenas a primeira ocorrência de cada termo no segmento.
 */
function expandJargon(text) {
  let out = text;
  for (const key of JARGON_KEYS) {
    // Só substitui a primeira ocorrência por segmento
    const idx = out.toLowerCase().indexOf(key.toLowerCase());
    if (idx !== -1) {
      out = out.slice(0, idx) + JARGON[key] + out.slice(idx + key.length);
    }
  }
  return out;
}

// ── Extrai constantes do HTML ─────────────────────────────────────────────────
function extractConstants() {
  const html = readFileSync(HTML_FILE, 'utf8');
  const begin = html.indexOf('/* EXTRACT_CONSTANTS_BEGIN */');
  const end   = html.indexOf('/* EXTRACT_CONSTANTS_END */');
  if (begin === -1 || end === -1) {
    throw new Error('Marcadores EXTRACT_CONSTANTS não encontrados no HTML.');
  }
  const block = html.slice(begin + '/* EXTRACT_CONSTANTS_BEGIN */'.length, end);
  // Executa o bloco JS (apenas declarações de dados) para obter os objetos
  // eslint-disable-next-line no-new-func
  return new Function(block + '\nreturn { INTRO_SCRIPT, GRAPHS, GRAPH_INTENT, FLOWS, NARRATIVE_BY_INDEX };')();
}

const { INTRO_SCRIPT, GRAPHS, GRAPH_INTENT, FLOWS, NARRATIVE_BY_INDEX } = extractConstants();

// ── Monta segmentos na ordem exata de reprodução ──────────────────────────────
function buildSegments() {
  const segs = [];

  // 1. Introdução
  segs.push({ id: 'intro', text: INTRO_SCRIPT });

  // 2. Cada aba
  for (const graph of GRAPHS) {
    const gid = graph.id;
    const intent = GRAPH_INTENT?.[gid] || '';
    segs.push({
      id: `tab-${gid}`,
      text: `${graph.title}. ${intent}`,
    });

    const flows = FLOWS?.[gid] || [];
    for (let fi = 0; fi < flows.length; fi++) {
      const flow = flows[fi];
      segs.push({
        id: `flow-${gid}-${fi}`,
        text: `Caminho ${fi + 1}: ${flow.name}. Objetivo: ${flow.objective}`,
      });

      for (const ni of flow.indexes) {
        const narr = NARRATIVE_BY_INDEX?.[gid]?.[ni];
        if (!narr) continue;

        segs.push({
          id: `node-${gid}-${ni}-explanation`,
          text: narr.explanation,
        });
        segs.push({
          id: `node-${gid}-${ni}-aicomment`,
          text: narr.aiComment,
        });
      }
    }
  }

  // 3. Encerramento
  segs.push({
    id: 'outro',
    text: 'Fim da apresentação. Obrigado por acompanhar o RVM Designações.',
  });

  // Aplica expansão de jargão em todos
  return segs.map(s => ({ ...s, textExpanded: expandJargon(s.text) }));
}

const segments = buildSegments();

// ── Preview ───────────────────────────────────────────────────────────────────
const previewLines = segments.flatMap(s => [
  `\n=== ${s.id} ===`,
  `[original]  ${s.text}`,
  ...(s.textExpanded !== s.text ? [`[expandido] ${s.textExpanded}`] : []),
]);
writeFileSync(PREVIEW_TXT, previewLines.join('\n'), 'utf8');
console.log(`Preview salvo em: ${PREVIEW_TXT}`);

if (PREVIEW_ONLY) {
  console.log('Modo --preview: TTS ignorado.');
  process.exit(0);
}

// ── TTS via edge-tts (Python) ─────────────────────────────────────────────────
mkdirSync(AUDIO_DIR, { recursive: true });

/**
 * Sintetiza `text` para `outPath` usando edge-tts (Python package).
 * Usa arquivo JSON temporário para evitar problemas de escaping de shell.
 */
function synthesize(text, outPath) {
  const tmpFile = join(tmpdir(), `rvm-tts-${randomUUID()}.json`);
  try {
    writeFileSync(tmpFile, JSON.stringify({ text, voice: VOICE, rate: RATE, out: outPath }));
    const py = /* python */ `
import json, sys, asyncio
with open(sys.argv[1], encoding='utf-8') as fh:
    data = json.load(fh)
import edge_tts
async def run():
    comm = edge_tts.Communicate(data['text'], data['voice'],
                                 rate=data.get('rate', '+0%'))
    await comm.save(data['out'])
asyncio.run(run())
`.trim();
    const res = spawnSync('python', ['-c', py, tmpFile], {
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
    });
    if (res.status !== 0) {
      console.error(`edge-tts falhou para ${outPath}:\n${res.stderr}`);
    }
  } finally {
    try { unlinkSync(tmpFile); } catch (_) { /* ignore */ }
  }
}

/**
 * Obtém a duração em segundos de um arquivo de áudio via ffprobe.
 */
function getDuration(filePath) {
  const res = spawnSync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    filePath,
  ], { encoding: 'utf8' });
  return parseFloat(res.stdout.trim()) || 0;
}

// ── Sintetiza cada segmento ───────────────────────────────────────────────────
const manifest = [];
const total = segments.length;

for (let i = 0; i < segments.length; i++) {
  const seg = segments[i];
  const outPath = join(AUDIO_DIR, `${seg.id}.wav`);
  console.log(`[${i + 1}/${total}] ${seg.id}`);

  if (!existsSync(outPath)) {
    synthesize(seg.textExpanded, outPath);
  } else {
    console.log('  → já existe, pulando TTS');
  }

  const duration = getDuration(outPath);
  manifest.push({ id: seg.id, file: `audio/${seg.id}.wav`, duration });
}

writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2), 'utf8');
console.log(`\nManifest salvo: ${MANIFEST}`);
console.log(`Total de segmentos: ${manifest.length}`);
const totalDuration = manifest.reduce((s, m) => s + m.duration, 0);
console.log(`Duração total estimada: ${(totalDuration / 60).toFixed(1)} min`);
