const path = require('path');
const fs = require('fs');
const playwrightPath = path.resolve(__dirname, '../motion_graphics_renderer/rendering_service/node_modules/playwright');
const { chromium } = require(playwrightPath);

async function generateThumbnails() {
  console.log('🎨 GERANDO CAPAS PERSONALIZADAS 16:9 PARA EPISÓDIOS 3C E 3D...');

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1
  });

  // Capa Ep 3C: Bounded Contexts & Modularidade
  const html3c = `
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
                    radial-gradient(circle at 90% 80%, rgba(16, 185, 129, 0.25) 0%, transparent 50%);
      }
      .top-row { display: flex; justify-content: space-between; align-items: center; z-index: 10; }
      .badge-ep {
        background: linear-gradient(135deg, #059669, #0284c7);
        padding: 10px 24px; border-radius: 999px; font-size: 18px; font-weight: 800;
        letter-spacing: 1.5px; text-transform: uppercase; box-shadow: 0 0 25px rgba(16, 185, 129, 0.5);
      }
      .tag-series {
        font-family: 'JetBrains Mono', monospace; font-size: 17px; color: #38bdf8; font-weight: 700;
        letter-spacing: 1px; text-transform: uppercase;
      }
      .center-content { z-index: 10; display: flex; flex-direction: column; gap: 15px; margin-top: 10px; }
      h1 {
        font-family: 'Outfit', sans-serif; font-size: 58px; font-weight: 900; line-height: 1.1;
        letter-spacing: -1.5px; color: #fff;
      }
      h1 span {
        background: linear-gradient(135deg, #38bdf8, #34d399);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      }
      p { font-size: 24px; color: #94a3b8; font-weight: 600; line-height: 1.35; max-width: 950px; }
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
      <div class="badge-ep">METODOLOGIA IDD · EP. 3C</div>
      <div class="tag-series">ARQUITETURA DE SOFTWARE COM IA</div>
    </div>
    <div class="center-content">
      <h1>BOUNDED CONTEXTS<br><span>&amp; MODULARIDADE ESTITA</span></h1>
      <p>Como decompor Casos de Uso de 1º e 2º Nível sem cair na armadilha do código espaguete gerado por IA.</p>
    </div>
    <div class="bottom-row">
      <div class="pills-group">
        <div class="pill">📐 Casos de Uso Preliminares</div>
        <div class="pill">🛡️ 4 Sub-Módulos HVAC-R</div>
        <div class="pill">⚡ Sem Código Espaguete</div>
      </div>
      <div class="author">👤 Eliézer Rosa</div>
    </div>
  </body>
  </html>
  `;

  await page.setContent(html3c);
  await page.waitForTimeout(500);
  const capa3cPath = path.resolve(__dirname, 'capas/capa_novo_episodio_3c.png');
  await page.screenshot({ path: capa3cPath, type: 'png' });
  console.log(`[OK] Capa Ep. 3C salva em: ${capa3cPath}`);

  // Capa Ep 3D: Transações Atômicas & Métodos UML
  const html3d = `
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
        background: radial-gradient(circle at 10% 20%, rgba(168, 85, 247, 0.35) 0%, transparent 50%),
                    radial-gradient(circle at 90% 80%, rgba(2, 132, 199, 0.3) 0%, transparent 50%);
      }
      .top-row { display: flex; justify-content: space-between; align-items: center; z-index: 10; }
      .badge-ep {
        background: linear-gradient(135deg, #7c3aed, #0284c7);
        padding: 10px 24px; border-radius: 999px; font-size: 18px; font-weight: 800;
        letter-spacing: 1.5px; text-transform: uppercase; box-shadow: 0 0 25px rgba(168, 85, 247, 0.5);
      }
      .tag-series {
        font-family: 'JetBrains Mono', monospace; font-size: 17px; color: #c084fc; font-weight: 700;
        letter-spacing: 1px; text-transform: uppercase;
      }
      .center-content { z-index: 10; display: flex; flex-direction: column; gap: 15px; margin-top: 10px; }
      h1 {
        font-family: 'Outfit', sans-serif; font-size: 58px; font-weight: 900; line-height: 1.1;
        letter-spacing: -1.5px; color: #fff;
      }
      h1 span {
        background: linear-gradient(135deg, #c084fc, #38bdf8);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      }
      p { font-size: 24px; color: #94a3b8; font-weight: 600; line-height: 1.35; max-width: 950px; }
      .bottom-row { display: flex; justify-content: space-between; align-items: flex-end; z-index: 10; }
      .pills-group { display: flex; gap: 12px; }
      .pill {
        background: rgba(15, 23, 42, 0.85); border: 1.5px solid rgba(168, 85, 247, 0.4);
        padding: 10px 20px; border-radius: 12px; font-size: 16px; font-weight: 800; color: #c084fc;
      }
      .author { font-size: 20px; font-weight: 800; color: #f1f5f9; display: flex; align-items: center; gap: 10px; }
    </style>
  </head>
  <body>
    <div class="bg-glow"></div>
    <div class="top-row">
      <div class="badge-ep">METODOLOGIA IDD · EP. 3D</div>
      <div class="tag-series">ARQUITETURA TRANSACIONAL &amp; UML</div>
    </div>
    <div class="center-content">
      <h1>TRANSAÇÕES ATÔMICAS<br><span>&amp; MÉTODOS DE CLASSES UML</span></h1>
      <p>Unit of Work, Sagas e Métodos Comportamentais de 4 Fases para Garantir Atomicidade de Negócio.</p>
    </div>
    <div class="bottom-row">
      <div class="pills-group">
        <div class="pill">⚡ Two-Phase Transactions</div>
        <div class="pill">🛡️ Preservação do MER</div>
        <div class="pill">🔄 Rollback e Compensação</div>
      </div>
      <div class="author">👤 Eliézer Rosa</div>
    </div>
  </body>
  </html>
  `;

  await page.setContent(html3d);
  await page.waitForTimeout(500);
  const capa3dPath = path.resolve(__dirname, 'capas/capa_novo_episodio_3d.png');
  await page.screenshot({ path: capa3dPath, type: 'png' });
  console.log(`[OK] Capa Ep. 3D salva em: ${capa3dPath}`);

  await browser.close();
  console.log('🎉 Ambas as capas personalizadas geradas com sucesso!');
}

generateThumbnails().catch(console.error);
