const path = require('path');
const fs = require('fs');
const playwrightPath = path.resolve(__dirname, '../../motion_graphics_renderer/rendering_service/node_modules/playwright');
const { chromium } = require(playwrightPath);

async function preview() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: [
      '--enable-webgl',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--allow-file-access-from-files'
    ]
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  
  const fileUrl = 'file:///' + path.resolve(__dirname, 'scene_talkshow.html').replace(/\\/g, '/');
  console.log('Abrindo:', fileUrl);
  await page.goto(fileUrl);
  await page.waitForTimeout(1500);

  // Remove cortina preta para teste visual
  await page.evaluate(() => {
    const c = document.getElementById('black-curtain');
    if (c) c.remove();
  });
  await page.waitForTimeout(1000);

  const previewPath1 = path.resolve(__dirname, 'preview_talkshow_mer.png');
  await page.screenshot({ path: previewPath1 });
  console.log('Screenshot MER salvo em:', previewPath1);

  // Testa alternar para o UML e simular ação
  await page.evaluate(() => {
    switchView('uml');
    const av = document.getElementById('av-eliezer');
    if (av) av.classList.add('talking');
    moveMouseTo(190, 132);
    triggerClickRipple(190, 132);
    interactWithUmlFrame('click_mecanico');
  });
  await page.waitForTimeout(1200);

  const previewPath2 = path.resolve(__dirname, 'preview_talkshow_uml.png');
  await page.screenshot({ path: previewPath2 });
  console.log('Screenshot UML salvo em:', previewPath2);

  await browser.close();
}

preview().catch(console.error);
