const { chromium } = require('c:/Antigravity - IDD Refrigeração/motion_graphics_renderer/rendering_service/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const HTML_FILE = 'file:///' + path.resolve(__dirname, '../IDD Paradigma/IDD Prática Melissa/Git-Office-M/nexuslog-crm/apresentacao.html').replace(/\\/g, '/');
const OUT_DIR = path.resolve(__dirname, 'test_slides');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

(async () => {
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(HTML_FILE, { waitUntil: 'networkidle' });

  // 1. Remove overlay
  await page.evaluate(() => {
    const overlay = document.getElementById('startOverlay');
    if (overlay) overlay.style.display = 'none';
    const footer = document.querySelector('footer');
    if (footer) footer.style.display = 'none';
  });

  const testSlides = [0, 1, 3, 5, 7, 10, 11, 12];
  for (const s of testSlides) {
    await page.evaluate((idx) => {
      showSlide(idx);
    }, s);
    await page.waitForTimeout(400);
    const screenshotPath = path.join(OUT_DIR, `slide_${s}.png`);
    await page.screenshot({ path: screenshotPath });
    console.log(`Slide ${s} capturado: ${screenshotPath}`);
  }

  await browser.close();
  console.log('Todos os slides testados com sucesso!');
})();
