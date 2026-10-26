const path = require('path');
const fs = require('fs');
const playwrightPath = path.resolve(__dirname, '../../motion_graphics_renderer/rendering_service/node_modules/playwright');
const { chromium } = require(playwrightPath);

async function main() {
  const assetsDir = path.resolve(__dirname);
  const tempDir = path.join(assetsDir, 'test_record_growth');
  if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
  fs.mkdirSync(tempDir, { recursive: true });

  const browser = await chromium.launch({ 
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: [
      '--enable-webgl',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--allow-file-access-from-files',
      '--disable-dev-shm-usage',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows'
    ]
  });

  const context = await browser.newContext({
    recordVideo: { dir: tempDir, size: { width: 1920, height: 1080 } },
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();
  page.on('console', msg => console.log('   [Browser]:', msg.text()));
  page.on('pageerror', err => console.error('   [Page Error]:', err.message));

  const htmlPath = path.join(assetsDir, 'scene_talkshow_completo.html');
  await page.goto('file:///' + htmlPath.replace(/\\/g, '/'));
  await page.waitForTimeout(2000);

  const timeline = JSON.parse(fs.readFileSync(path.join(assetsDir, 'timeline_completo.json'), 'utf8'));
  await page.evaluate((items) => {
    window.setTimeline(items);
    window.startPresentation();
  }, timeline.items);

  console.log('Monitorando crescimento do arquivo de video por 300 segundos...');
  for (let s = 10; s <= 300; s += 10) {
    await page.waitForTimeout(10000);
    
    // Atualiza o tempo
    await page.evaluate((sec) => {
      if (window.updatePresentationToTime) window.updatePresentationToTime(sec);
    }, s);

    const files = fs.readdirSync(tempDir);
    let size = 0;
    if (files.length > 0) {
      size = (fs.statSync(path.join(tempDir, files[0])).size / (1024 * 1024)).toFixed(2);
    }
    const state = await page.evaluate(() => {
      return {
        clock: document.getElementById('clockDisplay').innerText,
        indicator: document.getElementById('stageIndicator').innerText
      };
    }).catch(e => ({ error: e.message }));

    console.log(`[${s}s] WebM: ${size} MB | Clock: ${state.clock} | Stage: ${state.indicator} | Error: ${state.error || 'none'}`);
  }

  await page.close();
  await context.close();
  await browser.close();
}

main().catch(console.error);
