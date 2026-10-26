const path = require('path');
const fs = require('fs');

const playwrightPath = path.resolve(__dirname, '../motion_graphics_renderer/rendering_service/node_modules/playwright');
const { chromium } = require(playwrightPath);

async function captureAllSlides() {
  const htmlPath = path.resolve(__dirname, 'apresentacao_idd_perspectiva_tecnica.html');
  const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');

  const outDir = path.resolve(__dirname, 'slides_preview');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });

  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(fileUrl, { waitUntil: 'networkidle' });

  for (let i = 1; i <= 10; i++) {
    await page.evaluate((num) => goToSlide(num), i);
    await page.waitForTimeout(600); // aguarda a transição CSS de 0.45s
    const outImg = path.join(outDir, `slide_${String(i).padStart(2, '0')}.png`);
    await page.screenshot({ path: outImg });
    console.log(`[Slide ${i}/10] Gravado em: ${outImg}`);
  }

  await browser.close();
  console.log('🎉 Todos os 10 slides foram capturados com sucesso!');
}

captureAllSlides().catch(console.error);
