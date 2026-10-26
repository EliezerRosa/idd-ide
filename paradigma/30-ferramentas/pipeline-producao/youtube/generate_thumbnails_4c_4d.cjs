const path = require('path');
const fs = require('fs');
const playwrightPath = path.resolve(__dirname, '../motion_graphics_renderer/rendering_service/node_modules/playwright');
const { chromium } = require(playwrightPath);

async function generateThumbnails() {
  console.log('🎨 GERANDO CAPAS PERSONALIZADAS 16:9 PARA EPISÓDIOS 4C E 4D...');

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1
  });

  // Capa Ep 4C: Máquina de Diff de Intenções
  const html4c = `
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
        background: radial-gradient(circle at 10% 20%, rgba(2, 132, 199, 0.35) 0%, transparent 50%),
                    radial-gradient(circle at 90% 80%, rgba(168, 85, 247, 0.3) 0%, transparent 50%);
      }
      .top-row { display: flex; justify-content: space-between; align-items: center; z-index: 10; }
      .badge-ep {
        background: linear-gradient(135deg, #0284c7, #8b5cf6);
        padding: 10px 24px; border-radius: 999px; font-size: 18px; font-weight: 800;
        letter-spacing: 1.5px; text-transform: uppercase; box-shadow: 0 0 25px rgba(139, 92, 246, 0.5);
      }
      .tag-series {
        font-family: 'JetBrains Mono', monospace; font-size: 17px; color: #38bdf8; font-weight: 700;
        letter-spacing: 1px; text-transform: uppercase;
      }
      .center-content { z-index: 10; display: flex; flex-direction: column; gap: 15px; margin-top: 10px; }
      h1 {
        font-family: 'Outfit', sans-serif; font-size: 56px; font-weight: 900; line-height: 1.1;
        letter-spacing: -1.5px; color: #fff;
      }
      h1 span {
        background: linear-gradient(135deg, #38bdf8, #c084fc);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      }
      p { font-size: 23px; color: #94a3b8; font-weight: 600; line-height: 1.35; max-width: 950px; }
      .bottom-row { display: flex; justify-content: space-between; align-items: flex-end; z-index: 10; }
      .pills-group { display: flex; gap: 12px; }
      .pill {
        background: rgba(15, 23, 42, 0.85); border: 1.5px solid rgba(56, 189, 248, 0.4);
        padding: 10px 20px; border-radius: 12px; font-size: 16px; font-weight: 800; color: #38bdf8;
      }
      .author { font-size: 20px; font-weight: 800; color: #f1f5f9; display: flex; align-items: center; gap: 10px; }
    </style>
  </head>
  <body>
    <div class="bg-glow"></div>
    <div class="top-row">
      <div class="badge-ep">METODOLOGIA IDD · EP. 4C</div>
      <div class="tag-series">EVOLUÇÃO CONTÍNUA DE ESQUEMA COM IA</div>
    </div>
    <div class="center-content">
      <h1>DIFF DE INTENÇÕES<br><span>&amp; MUTAÇÃO DE ESQUEMA</span></h1>
      <p>Por que o Git não basta: como o IDD analisa grafos semânticos de domínio e classifica mutações em Classes A, B e C com plano formal de migração.</p>
    </div>
    <div class="bottom-row">
      <div class="pills-group">
        <div class="pill">🔄 AST Semântica vs Git</div>
        <div class="pill">📊 Mutações Classes A/B/C</div>
        <div class="pill">🛡️ Human-in-the-Loop</div>
      </div>
      <div class="author">👤 Eliézer Rosa</div>
    </div>
  </body>
  </html>
  `;

  await page.setContent(html4c);
  await page.waitForTimeout(600);
  const capa4cPath = path.resolve(__dirname, 'capas/capa_novo_episodio_4c.png');
  await page.screenshot({ path: capa4cPath, type: 'png' });
  console.log(`[OK] Capa Ep. 4C salva em: ${capa4cPath}`);

  // Capa Ep 4D: Invariantes Temporizadas & Expand-Contract
  const html4d = `
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
        background: radial-gradient(circle at 10% 20%, rgba(16, 185, 129, 0.35) 0%, transparent 50%),
                    radial-gradient(circle at 90% 80%, rgba(2, 132, 199, 0.3) 0%, transparent 50%);
      }
      .top-row { display: flex; justify-content: space-between; align-items: center; z-index: 10; }
      .badge-ep {
        background: linear-gradient(135deg, #059669, #0284c7);
        padding: 10px 24px; border-radius: 999px; font-size: 18px; font-weight: 800;
        letter-spacing: 1.5px; text-transform: uppercase; box-shadow: 0 0 25px rgba(16, 185, 129, 0.5);
      }
      .tag-series {
        font-family: 'JetBrains Mono', monospace; font-size: 17px; color: #34d399; font-weight: 700;
        letter-spacing: 1px; text-transform: uppercase;
      }
      .center-content { z-index: 10; display: flex; flex-direction: column; gap: 15px; margin-top: 10px; }
      h1 {
        font-family: 'Outfit', sans-serif; font-size: 54px; font-weight: 900; line-height: 1.1;
        letter-spacing: -1.5px; color: #fff;
      }
      h1 span {
        background: linear-gradient(135deg, #34d399, #38bdf8);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      }
      p { font-size: 23px; color: #94a3b8; font-weight: 600; line-height: 1.35; max-width: 950px; }
      .bottom-row { display: flex; justify-content: space-between; align-items: flex-end; z-index: 10; }
      .pills-group { display: flex; gap: 12px; }
      .pill {
        background: rgba(15, 23, 42, 0.85); border: 1.5px solid rgba(16, 185, 129, 0.4);
        padding: 10px 20px; border-radius: 12px; font-size: 16px; font-weight: 800; color: #34d399;
      }
      .author { font-size: 20px; font-weight: 800; color: #f1f5f9; display: flex; align-items: center; gap: 10px; }
    </style>
  </head>
  <body>
    <div class="bg-glow"></div>
    <div class="top-row">
      <div class="badge-ep">METODOLOGIA IDD · EP. 4D</div>
      <div class="tag-series">BLINDAGEM HISTÓRICA DE PRODUÇÃO</div>
    </div>
    <div class="center-content">
      <h1>INVARIANTES TEMPORIZADAS<br><span>&amp; PADRÃO EXPAND-CONTRACT</span></h1>
      <p>Como aplicar novas exigências legais sem invalidar milhares de ordens históricas: guardas temporais e testes matemáticos de não-regressão.</p>
    </div>
    <div class="bottom-row">
      <div class="pills-group">
        <div class="pill">⏳ Guardas Temporais</div>
        <div class="pill">🧱 Padrão Expand-Contract</div>
        <div class="pill">🧪 Não-Regressão Total</div>
      </div>
      <div class="author">👤 Eliézer Rosa</div>
    </div>
  </body>
  </html>
  `;

  await page.setContent(html4d);
  await page.waitForTimeout(600);
  const capa4dPath = path.resolve(__dirname, 'capas/capa_novo_episodio_4d.png');
  await page.screenshot({ path: capa4dPath, type: 'png' });
  console.log(`[OK] Capa Ep. 4D salva em: ${capa4dPath}`);

  await browser.close();
  console.log('🎉 TODAS AS CAPAS 4C E 4D GERADAS COM SUCESSO!');
}

generateThumbnails().catch(err => {
  console.error('Erro gerando thumbnails:', err);
  process.exit(1);
});
