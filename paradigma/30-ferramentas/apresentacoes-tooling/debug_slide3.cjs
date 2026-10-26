const path = require('path');
const playwrightPath = path.resolve(__dirname, '../motion_graphics_renderer/rendering_service/node_modules/playwright');
const { chromium } = require(playwrightPath);

async function inspectSlide3() {
  const htmlPath = path.resolve(__dirname, 'apresentacao_idd_perspectiva_tecnica.html');
  const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });

  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err));

  await page.goto(fileUrl, { waitUntil: 'networkidle' });

  // Pula direto para o Slide 3
  await page.evaluate(() => goToSlide(3));
  await page.waitForTimeout(500);

  const slide3Info = await page.evaluate(() => {
    const s = document.querySelector('.slide[data-slide="3"]');
    if (!s) return { found: false };
    const rect = s.getBoundingClientRect();
    const style = window.getComputedStyle(s);
    return {
      found: true,
      className: s.className,
      rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
      opacity: style.opacity,
      visibility: style.visibility,
      display: style.display,
      innerHTMLSnippet: s.innerHTML.slice(0, 300)
    };
  });

  console.log('Slide 3 Info:', JSON.stringify(slide3Info, null, 2));

  await page.screenshot({ path: path.resolve(__dirname, 'debug_slide3.png') });
  await browser.close();
}

inspectSlide3().catch(console.error);
