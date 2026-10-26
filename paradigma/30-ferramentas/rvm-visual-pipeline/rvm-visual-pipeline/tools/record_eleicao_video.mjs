/**
 * record_eleicao_video.mjs — grava o apresentador interativo em modo vídeo.
 *
 * Uso:
 *   node record_eleicao_video.mjs
 *
 * Saída:
 *   tools/out/eleicao-candidatos-apresentacao.webm
 *
 * Pré-requisitos:
 *   npm install playwright
 *   npx playwright install chromium
 *   Servidor HTTP rodando em 5500 (ou este script sobe um automaticamente)
 */

import { chromium } from 'playwright';
import { createServer } from 'net';
import { spawnSync, spawn } from 'child_process';
import { mkdirSync, existsSync, renameSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// visual/ é o pai de tools/
const VISUAL_DIR = join(__dirname, '..');
const OUT_DIR    = join(__dirname, 'out');
const OUT_WEBM   = join(OUT_DIR, 'eleicao-candidatos-apresentacao.webm');

const PORT = 5500;
const URL  = `http://localhost:${PORT}/eleicao-candidatos-apresentacao-interativa.html?video=1&autostart=1`;

mkdirSync(OUT_DIR, { recursive: true });

// ── Detecta se porta 5500 está ocupada ────────────────────────────────────────
function isPortBusy(port) {
  return new Promise((resolve) => {
    const srv = createServer();
    srv.once('error', () => resolve(true));
    srv.once('listening', () => { srv.close(); resolve(false); });
    srv.listen(port, '127.0.0.1');
  });
}

// ── Inicia servidor HTTP simples na pasta visual/ ─────────────────────────────
function startServer() {
  console.log(`Iniciando python -m http.server ${PORT} em ${VISUAL_DIR} ...`);
  const proc = spawn('python', ['-m', 'http.server', String(PORT)], {
    cwd: VISUAL_DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  });
  // Aguarda 1 s para o servidor subir
  return new Promise((resolve) => setTimeout(() => resolve(proc), 1000));
}

// ── Main ───────────────────────────────────────────────────────────────────────
const busy = await isPortBusy(PORT);
let serverProc = null;

if (!busy) {
  serverProc = await startServer();
} else {
  console.log(`Porta ${PORT} já em uso — reutilizando servidor existente.`);
}

console.log(`Iniciando Playwright Chromium, viewport 1920×1080 com gravação de vídeo…`);

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  recordVideo: {
    dir: OUT_DIR,
    size: { width: 1920, height: 1080 },
  },
});

const page = await context.newPage();
page.setDefaultTimeout(0); // sem timeout — a apresentação pode demorar muito

console.log(`Navegando para: ${URL}`);
await page.goto(URL, { waitUntil: 'networkidle' });

console.log('Aguardando window._rvmVideoDone === true …');
await page.waitForFunction('window._rvmVideoDone === true');
console.log('Apresentação concluída. Finalizando gravação…');

// Salva o vídeo antes de fechar
const videoPath = await page.video().path();
await context.close();
await browser.close();

// Renomeia para nome fixo
if (existsSync(OUT_WEBM)) {
  try { unlinkSync(OUT_WEBM); } catch (_) { /* ignore */ }
}
renameSync(videoPath, OUT_WEBM);
console.log(`Vídeo gravado em: ${OUT_WEBM}`);

if (serverProc) {
  console.log('Encerrando servidor HTTP…');
  serverProc.kill();
}
