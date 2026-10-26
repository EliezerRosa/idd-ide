const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { chromium } = require('c:/Antigravity - IDD Refrigeração/motion_graphics_renderer/rendering_service/node_modules/playwright');

const BASE_DIR = path.resolve('C:/Antigravity - IDD Refrigeração');
const ASSETS_DIR = path.join(BASE_DIR, 'producao_yt/melissa_assets');
const TIMELINE_PATH = path.join(ASSETS_DIR, 'melissa_timeline.json');
const MASTER_AUDIO = path.join(ASSETS_DIR, 'melissa_audio_master_lufs.wav');
const HTML_FILE = 'file:///' + path.join(BASE_DIR, 'IDD Paradigma/IDD Prática Melissa/Git-Office-M/nexuslog-crm/apresentacao.html').replace(/\\/g, '/');
const TEMP_VIDEO_DIR = path.join(ASSETS_DIR, 'temp_video_rec');
const FINAL_MP4 = path.join(BASE_DIR, 'producao_yt/Melissa_IDD_Como_uma_leiga_criou_um_CRM.mp4');

if (fs.existsSync(TEMP_VIDEO_DIR)) {
  const oldFiles = fs.readdirSync(TEMP_VIDEO_DIR);
  for (const f of oldFiles) {
    try { fs.unlinkSync(path.join(TEMP_VIDEO_DIR, f)); } catch (_) {}
  }
} else {
  fs.mkdirSync(TEMP_VIDEO_DIR, { recursive: true });
}

async function main() {
  console.log('1. Carregando timeline sincronizada...');
  const timelineData = JSON.parse(fs.readFileSync(TIMELINE_PATH, 'utf8'));
  const totalDuration = timelineData.totalDurationSec;
  console.log(`Duração planejada: ${totalDuration.toFixed(1)}s (~${(totalDuration / 60).toFixed(1)} min)`);

  console.log('2. Iniciando gravação em alta definição (1920x1080) com Playwright (Edge)...');
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: TEMP_VIDEO_DIR,
      size: { width: 1920, height: 1080 }
    }
  });

  const page = await context.newPage();
  console.log(`Navegando para: ${HTML_FILE}`);
  await page.goto(HTML_FILE, { waitUntil: 'networkidle' });

  // Remove overlay de boas-vindas e rodapé de navegação para gravação cinematográfica limpa
  await page.evaluate(() => {
    const overlay = document.getElementById('startOverlay');
    if (overlay) overlay.style.display = 'none';
    const footer = document.querySelector('footer');
    if (footer) footer.style.display = 'none';
    window.speechSynthesis.speak = () => {};
    window.speechSynthesis.cancel = () => {};
  });

  console.log('3. Executando animação dos slides conforme timeline...');
  const items = timelineData.items;

  let currentSlide = -1;
  const startTime = Date.now();

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    
    // Troca de slide quando necessário
    if (it.slide !== currentSlide) {
      currentSlide = it.slide;
      await page.evaluate((sIdx) => {
        current = sIdx;
        showSlide(sIdx);
      }, currentSlide);
      // Pequena pausa para a transição suave de slide
      await page.waitForTimeout(350);
    }

    // Ativa elementos visuais da fala
    await page.evaluate((item) => {
      const s = slides[item.slide];
      const slideEl = document.getElementById(s.final ? 'slide-final' : 'slide-' + item.slide);

      if (item.type === 'narration') {
        const orb = document.getElementById('aiOrb');
        if (orb) orb.classList.add('talking');
        typewriterStart(item.text);
      } else if (item.type === 'uiIntro') {
        const orb = document.getElementById('aiOrbTour');
        if (orb) {
          orb.classList.add('talking');
          scrollToCenter(orb);
        }
      } else if (item.type === 'uiItem') {
        slideEl.querySelectorAll('.ui-card').forEach(c => c.classList.remove('active'));
        const card = slideEl.querySelector(`.ui-card[data-ui="${item.uiIdx}"]`);
        if (card) {
          card.classList.add('active');
          scrollToCenter(card);
        }
      } else {
        clearHighlights(slideEl);
        const speaker = slideEl.querySelector(`.speaker[data-speaker="${item.who}"]`);
        if (speaker) speaker.classList.add('talking');
        const bubble = slideEl.querySelector(`.bubble[data-idx="${item.dialogIdx}"]`);
        if (bubble) {
          bubble.classList.add('active');
          scrollToCenter(bubble);
        }
      }
    }, it);

    // Aguarda a duração exata da fala deste segmento + pausa
    const waitMs = Math.floor((it.durSec + 0.55) * 1000);
    console.log(`  [Slide ${it.slide + 1}] (${it.who}) ${it.text.slice(0, 40)}... (${it.durSec}s)`);
    await page.waitForTimeout(waitMs);

    // Desativa fala
    await page.evaluate((item) => {
      const s = slides[item.slide];
      const slideEl = document.getElementById(s.final ? 'slide-final' : 'slide-' + item.slide);
      if (slideEl) clearHighlights(slideEl);
      document.getElementById('aiOrb')?.classList.remove('talking');
      document.getElementById('aiOrbTour')?.classList.remove('talking');
    }, it);
  }

  // Espera final
  await page.waitForTimeout(2000);

  console.log('4. Fechando navegador e finalizando gravação de vídeo...');
  await page.close();
  await context.close();
  await browser.close();

  // Localiza o arquivo webm gravado pelo Playwright
  const files = fs.readdirSync(TEMP_VIDEO_DIR).filter(f => f.endsWith('.webm'));
  if (files.length === 0) {
    throw new Error('Nenhum vídeo gravado foi encontrado no diretório temporário.');
  }
  const rawVideoPath = path.join(TEMP_VIDEO_DIR, files[0]);
  console.log(`Vídeo gravado pelo Playwright: ${rawVideoPath}`);

  console.log('5. Fazendo mux com áudio mestre -14 LUFS e codificando em MP4 H.264...');
  const cmd = [
    'ffmpeg', '-y',
    '-i', `"${rawVideoPath}"`,
    '-i', `"${MASTER_AUDIO}"`,
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '20',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-ar', '48000',
    '-shortest',
    '-movflags', '+faststart',
    `"${FINAL_MP4}"`
  ].join(' ');

  console.log(`Executando: ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });

  // Limpa gravação bruta
  try {
    fs.unlinkSync(rawVideoPath);
  } catch (e) {}

  console.log('\n============================================================');
  console.log('🎉 VÍDEO DA APRESENTAÇÃO DA MELISSA RENDERIZADO COM SUCESSO!');
  console.log(`Arquivo Final: ${FINAL_MP4}`);
  const stats = fs.statSync(FINAL_MP4);
  console.log(`Tamanho: ${(stats.size / (1024 * 1024)).toFixed(1)} MB`);
  console.log('============================================================');
}

main().catch(err => {
  console.error('❌ Falha na renderização do vídeo:', err);
  process.exit(1);
});
