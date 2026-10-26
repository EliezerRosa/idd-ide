const path = require('path');
const fs = require('fs');
const playwrightPath = path.resolve(__dirname, '../motion_graphics_renderer/rendering_service/node_modules/playwright');
const { chromium } = require(playwrightPath);

async function generateThumbnails() {
  console.log('🎨 GERANDO CAPAS PERSONALIZADAS 16:9 PARA EPISÓDIOS 4E E 4F...');

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1
  });

  // Capa Ep 4E: Ergonomia Industrial & Multimodalidade em Campo
  const html4e = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@800;900&family=Plus+Jakarta+Sans:wght@700;800&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        width: 1280px; height: 720px; overflow: hidden;
        background: #050811; color: #fff; font-family: 'Plus Jakarta Sans', sans-serif;
        position: relative; display: flex; flex-direction: column; justify-content: space-between;
        padding: 50px 65px;
      }
      .bg-glow {
        position: absolute; inset: 0; pointer-events: none;
        background: radial-gradient(circle at 10% 20%, rgba(249, 115, 22, 0.35) 0%, transparent 50%),
                    radial-gradient(circle at 90% 80%, rgba(2, 132, 199, 0.3) 0%, transparent 50%);
      }
      .top-row { display: flex; justify-content: space-between; align-items: center; z-index: 10; }
      .badge-ep {
        background: linear-gradient(135deg, #f97316, #0284c7);
        padding: 10px 24px; border-radius: 999px; font-size: 18px; font-weight: 800;
        letter-spacing: 1.5px; text-transform: uppercase; box-shadow: 0 0 25px rgba(249, 115, 22, 0.5);
      }
      .tag-series {
        font-family: 'JetBrains Mono', monospace; font-size: 17px; color: #fb923c; font-weight: 700;
        letter-spacing: 1px; text-transform: uppercase;
      }
      .center-content { z-index: 10; display: flex; flex-direction: column; gap: 15px; margin-top: 10px; }
      h1 {
        font-family: 'Outfit', sans-serif; font-size: 56px; font-weight: 900; line-height: 1.1;
        letter-spacing: -1.5px; color: #fff;
      }
      h1 span {
        background: linear-gradient(135deg, #fb923c, #38bdf8);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      }
      p { font-size: 23px; color: #94a3b8; font-weight: 600; line-height: 1.35; max-width: 950px; }
      .bottom-row { display: flex; justify-content: space-between; align-items: flex-end; z-index: 10; }
      .pills-group { display: flex; gap: 12px; }
      .pill {
        background: rgba(15, 23, 42, 0.85); border: 1.5px solid rgba(249, 115, 22, 0.4);
        padding: 10px 20px; border-radius: 12px; font-size: 16px; font-weight: 800; color: #fb923c;
      }
      .author { font-size: 20px; font-weight: 800; color: #f1f5f9; display: flex; align-items: center; gap: 10px; }
    </style>
  </head>
  <body>
    <div class="bg-glow"></div>
    <div class="top-row">
      <div class="badge-ep">METODOLOGIA IDD · EP. 4E</div>
      <div class="tag-series">ERGONOMIA INDUSTRIAL &amp; IA MULTIMODAL</div>
    </div>
    <div class="center-content">
      <h1>ERGONOMIA INDUSTRIAL<br><span>&amp; MULTIMODALIDADE EM CAMPO</span></h1>
      <p>Como o IDD elimina a digitação manual e desenha para mecânicos reais: touch targets para luvas, alto contraste ao sol e laudo por voz estruturado no MER.</p>
    </div>
    <div class="bottom-row">
      <div class="pills-group">
        <div class="pill">🧤 O Teste da Luva</div>
        <div class="pill">🎙️ Laudo por Voz</div>
        <div class="pill">📷 OCR de Manifold</div>
      </div>
      <div class="author">👤 Eliézer Rosa</div>
    </div>
  </body>
  </html>
  `;

  await page.setContent(html4e);
  await page.waitForTimeout(600);
  const capa4ePath = path.resolve(__dirname, 'capas/capa_novo_episodio_4e.png');
  await page.screenshot({ path: capa4ePath, type: 'png' });
  console.log(`[OK] Capa Ep. 4E salva em: ${capa4ePath}`);

  // Capa Ep 4F: Offline-First & Validação com Operadores Reais
  const html4f = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@800;900&family=Plus+Jakarta+Sans:wght@700;800&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        width: 1280px; height: 720px; overflow: hidden;
        background: #050811; color: #fff; font-family: 'Plus Jakarta Sans', sans-serif;
        position: relative; display: flex; flex-direction: column; justify-content: space-between;
        padding: 50px 65px;
      }
      .bg-glow {
        position: absolute; inset: 0; pointer-events: none;
        background: radial-gradient(circle at 10% 20%, rgba(20, 184, 166, 0.35) 0%, transparent 50%),
                    radial-gradient(circle at 90% 80%, rgba(2, 132, 199, 0.3) 0%, transparent 50%);
      }
      .top-row { display: flex; justify-content: space-between; align-items: center; z-index: 10; }
      .badge-ep {
        background: linear-gradient(135deg, #14b8a6, #0284c7);
        padding: 10px 24px; border-radius: 999px; font-size: 18px; font-weight: 800;
        letter-spacing: 1.5px; text-transform: uppercase; box-shadow: 0 0 25px rgba(20, 184, 166, 0.5);
      }
      .tag-series {
        font-family: 'JetBrains Mono', monospace; font-size: 17px; color: #2dd4bf; font-weight: 700;
        letter-spacing: 1px; text-transform: uppercase;
      }
      .center-content { z-index: 10; display: flex; flex-direction: column; gap: 15px; margin-top: 10px; }
      h1 {
        font-family: 'Outfit', sans-serif; font-size: 56px; font-weight: 900; line-height: 1.1;
        letter-spacing: -1.5px; color: #fff;
      }
      h1 span {
        background: linear-gradient(135deg, #2dd4bf, #38bdf8);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      }
      p { font-size: 23px; color: #94a3b8; font-weight: 600; line-height: 1.35; max-width: 950px; }
      .bottom-row { display: flex; justify-content: space-between; align-items: flex-end; z-index: 10; }
      .pills-group { display: flex; gap: 12px; }
      .pill {
        background: rgba(15, 23, 42, 0.85); border: 1.5px solid rgba(20, 184, 166, 0.4);
        padding: 10px 20px; border-radius: 12px; font-size: 16px; font-weight: 800; color: #2dd4bf;
      }
      .author { font-size: 20px; font-weight: 800; color: #f1f5f9; display: flex; align-items: center; gap: 10px; }
    </style>
  </head>
  <body>
    <div class="bg-glow"></div>
    <div class="top-row">
      <div class="badge-ep">METODOLOGIA IDD · EP. 4F</div>
      <div class="tag-series">OFFLINE-FIRST &amp; RESILIÊNCIA EM CAMPO</div>
    </div>
    <div class="center-content">
      <h1>ARQUITETURA OFFLINE-FIRST<br><span>&amp; VALIDAÇÃO EM CAMPO REAL</span></h1>
      <p>Gaiolas de Faraday em câmaras frias e subsolos: banco relacional SQLite local, CRDTs sem conflito e validação assistida com operadores reais.</p>
    </div>
    <div class="bottom-row">
      <div class="pills-group">
        <div class="pill">📶 Gaiola de Faraday</div>
        <div class="pill">💾 SQLite &amp; CRDTs</div>
        <div class="pill">👷 Validação Assistida</div>
      </div>
      <div class="author">👤 Eliézer Rosa</div>
    </div>
  </body>
  </html>
  `;

  await page.setContent(html4f);
  await page.waitForTimeout(600);
  const capa4fPath = path.resolve(__dirname, 'capas/capa_novo_episodio_4f.png');
  await page.screenshot({ path: capa4fPath, type: 'png' });
  console.log(`[OK] Capa Ep. 4F salva em: ${capa4fPath}`);

  await browser.close();
  console.log('🎉 TODAS AS CAPAS 4E E 4F GERADAS COM SUCESSO!');
}

generateThumbnails().catch(err => {
  console.error('Erro gerando thumbnails:', err);
  process.exit(1);
});
