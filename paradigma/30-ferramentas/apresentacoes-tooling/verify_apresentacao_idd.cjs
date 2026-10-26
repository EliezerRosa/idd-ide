const path = require('path');
const fs = require('fs');

const playwrightPath = path.resolve(__dirname, '../motion_graphics_renderer/rendering_service/node_modules/playwright');
const { chromium } = require(playwrightPath);

async function verifyPresentation() {
  const htmlPath = path.resolve(__dirname, 'apresentacao_idd_perspectiva_tecnica.html');
  const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');

  console.log('Abrindo navegador Chrome headless...');
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 }
  });

  console.log(`Navegando para: ${fileUrl}`);
  await page.goto(fileUrl, { waitUntil: 'networkidle' });

  // Captura Slide 1
  const outSlide1 = path.resolve(__dirname, 'preview_slide_1_diagnostico.png');
  await page.screenshot({ path: outSlide1 });
  console.log(`Screenshot Slide 1 salvo em: ${outSlide1}`);

  // Avança para Slide 2
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(600);
  const outSlide2 = path.resolve(__dirname, 'preview_slide_2_mcp_vs_idd.png');
  await page.screenshot({ path: outSlide2 });
  console.log(`Screenshot Slide 2 salvo em: ${outSlide2}`);

  // Avança para Slide 3 (Intent IR)
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(600);
  const outSlide3 = path.resolve(__dirname, 'preview_slide_3_intent_ir.png');
  await page.screenshot({ path: outSlide3 });
  console.log(`Screenshot Slide 3 salvo em: ${outSlide3}`);

  await browser.close();
  console.log('✅ Validação concluída com sucesso!');
}

verifyPresentation().catch(err => {
  console.error('❌ Erro na validação:', err);
  process.exit(1);
});
