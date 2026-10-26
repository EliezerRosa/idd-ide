/**
 * build_video.mjs — orquestra todo o pipeline de geração de vídeo.
 *
 * Passos:
 *  1. Síntese de áudio (synth_audio.mjs)
 *  2. Gravação do vídeo (record_eleicao_video.mjs)
 *  3. Monta trilha de áudio completa com pausas (ffmpeg concat)
 *  4. Mux vídeo + áudio → MP4 final
 *  5. Copia para public/videos/ e gera poster.png
 *
 * Uso:
 *   node build_video.mjs
 *   node build_video.mjs --skip-synth    # pula síntese (usa WAVs existentes)
 *   node build_video.mjs --skip-record   # pula gravação (usa WEBM existente)
 *   node build_video.mjs --skip-mux      # somente síntese + gravação
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Caminhos ─────────────────────────────────────────────────────────────────
const MANIFEST_PATH = join(__dirname, 'manifest.json');
const AUDIO_DIR     = join(__dirname, 'audio');
const OUT_DIR       = join(__dirname, 'out');
const SILENCE_WAV   = join(OUT_DIR, '_silence_1s.wav');
const CONCAT_LIST   = join(OUT_DIR, '_concat.txt');
const MERGED_WAV    = join(OUT_DIR, 'merged_audio.wav');
const WEBM_PATH     = join(OUT_DIR, 'eleicao-candidatos-apresentacao.webm');
const MP4_FINAL     = join(OUT_DIR, 'eleicao-candidatos-final.mp4');

// APP_ROOT = rvm-designacoes-unified/ (4 níveis acima de visual/tools/)
const APP_ROOT  = join(__dirname, '..', '..', '..', '..');
const VIDEOS_DIR = join(APP_ROOT, 'public', 'videos');
const MP4_DEST   = join(VIDEOS_DIR, 'eleicao-candidatos-apresentacao.mp4');
const POSTER_DEST = join(VIDEOS_DIR, 'eleicao-candidatos-apresentacao-poster.png');

const SKIP_SYNTH  = process.argv.includes('--skip-synth');
const SKIP_RECORD = process.argv.includes('--skip-record');
const SKIP_MUX    = process.argv.includes('--skip-mux');

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(VIDEOS_DIR, { recursive: true });

// ── Helpers ───────────────────────────────────────────────────────────────────
function run(prog, args, label) {
  console.log(`\n► ${label}`);
  const res = spawnSync(prog, args, { stdio: 'inherit', encoding: 'utf8' });
  if (res.status !== 0) {
    console.error(`ERRO: ${label} falhou (exit ${res.status})`);
    process.exit(res.status ?? 1);
  }
}

function runNode(script, extraArgs = []) {
  const label = `node ${script} ${extraArgs.join(' ')}`.trim();
  run('node', [join(__dirname, script), ...extraArgs], label);
}

// ── Passo 1: Síntese ──────────────────────────────────────────────────────────
if (!SKIP_SYNTH) {
  runNode('synth_audio.mjs');
} else {
  console.log('--skip-synth: síntese ignorada.');
}

// ── Passo 2: Gravação ─────────────────────────────────────────────────────────
if (!SKIP_RECORD) {
  runNode('record_eleicao_video.mjs');
} else {
  console.log('--skip-record: gravação ignorada.');
}

if (SKIP_MUX) {
  console.log('--skip-mux: encerrado após síntese + gravação.');
  process.exit(0);
}

// ── Passo 3: Constrói trilha de áudio com pausas ──────────────────────────────
console.log('\n► Gerando silêncio 1 s de referência…');
run('ffmpeg', [
  '-y', '-f', 'lavfi', '-i', 'anullsrc=r=22050:cl=mono',
  '-t', '1', '-ar', '22050', '-ac', '1', SILENCE_WAV,
], 'ffmpeg gera _silence_1s.wav');

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));

// Pausas em segundos por tipo de segmento
const PAUSE_AFTER_NODE   = 0.35;
const PAUSE_AFTER_FLOW   = 0.60;
const PAUSE_AFTER_TAB    = 1.20;
const PAUSE_AFTER_INTRO  = 0.40;

const concatLines = [];

function addAudio(filePath) {
  concatLines.push(`file '${filePath.replace(/\\/g, '/')}'`);
}

function addSilence(seconds) {
  if (seconds <= 0) return;
  concatLines.push(`file '${SILENCE_WAV.replace(/\\/g, '/')}'`);
  concatLines.push(`duration ${seconds.toFixed(3)}`);
}

for (const entry of manifest) {
  const filePath = join(AUDIO_DIR, entry.id + '.wav');
  if (!existsSync(filePath)) {
    console.warn(`Aviso: arquivo ausente, pulando: ${filePath}`);
    continue;
  }
  addAudio(filePath);

  // Determina pausa baseada no tipo de segmento
  if (entry.id === 'intro') {
    addSilence(PAUSE_AFTER_INTRO);
  } else if (entry.id.startsWith('tab-')) {
    addSilence(PAUSE_AFTER_TAB);
  } else if (entry.id.startsWith('flow-')) {
    addSilence(PAUSE_AFTER_FLOW);
  } else if (entry.id.startsWith('node-')) {
    addSilence(PAUSE_AFTER_NODE);
  }
  // 'outro' sem pausa final
}

writeFileSync(CONCAT_LIST, concatLines.join('\n'), 'utf8');
console.log(`Concat list: ${CONCAT_LIST} (${manifest.length} entradas)`);

run('ffmpeg', [
  '-y', '-f', 'concat', '-safe', '0',
  '-i', CONCAT_LIST,
  '-ar', '44100', '-ac', '2',
  MERGED_WAV,
], 'ffmpeg monta merged_audio.wav');

// ── Passo 4: Mux vídeo + áudio ────────────────────────────────────────────────
if (!existsSync(WEBM_PATH)) {
  console.error(`ERRO: vídeo gravado não encontrado em ${WEBM_PATH}`);
  process.exit(1);
}

run('ffmpeg', [
  '-y',
  '-i', WEBM_PATH,
  '-i', MERGED_WAV,
  '-c:v', 'libx264',
  '-crf', '18',
  '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart',
  '-c:a', 'aac',
  '-b:a', '192k',
  '-shortest',
  MP4_FINAL,
], 'ffmpeg mux → eleicao-candidatos-final.mp4');

// ── Passo 5: Copia para public/videos/ ───────────────────────────────────────
run('cmd', ['/c', 'copy', '/y', MP4_FINAL.replace(/\//g, '\\'), MP4_DEST.replace(/\//g, '\\')],
  'Copiar MP4 para public/videos/');

// Gera poster.png no instante t=2s
run('ffmpeg', [
  '-y',
  '-i', MP4_DEST,
  '-ss', '2',
  '-vframes', '1',
  '-q:v', '2',
  POSTER_DEST,
], 'ffmpeg gera poster.png');

console.log(`\n✔ Pipeline concluído!\n  MP4 : ${MP4_DEST}\n  Poster: ${POSTER_DEST}`);
