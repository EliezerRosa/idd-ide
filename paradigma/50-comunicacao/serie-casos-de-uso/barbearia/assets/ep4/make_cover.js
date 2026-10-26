const fs = require('fs');
const path = require('path');
const { chromium } = require('../../../motion_graphics_renderer/rendering_service/node_modules/playwright');

async function makeCover() {
  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  const executablePath = possiblePaths.find((p) => fs.existsSync(p));
  const browser = await chromium.launch({ headless: true, executablePath });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', system-ui, sans-serif; }
      body { width: 1920px; height: 1080px; background: #0c0f18; color: white; overflow: hidden; position: relative; }
      .bg-glow {
        position: absolute; width: 1100px; height: 1100px; border-radius: 50%;
        background: radial-gradient(circle, rgba(234, 88, 12, 0.28) 0%, rgba(194, 65, 12, 0.2) 45%, transparent 70%);
        top: 50%; left: 50%; transform: translate(-50%, -50%); filter: blur(80px);
      }
      .grid {
        position: absolute; inset: 0;
        background-image: linear-gradient(rgba(234, 88, 12, 0.05) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(234, 88, 12, 0.05) 1px, transparent 1px);
        background-size: 80px 80px;
      }
      .container {
        position: relative; z-index: 10; width: 100%; height: 100%;
        display: flex; flex-direction: column; justify-content: space-between; padding: 75px 95px;
      }
      .header { display: flex; justify-content: space-between; align-items: center; }
      .badge {
        background: rgba(234, 88, 12, 0.2); border: 2px solid #ea580c; color: #fb923c;
        padding: 12px 28px; border-radius: 999px; font-weight: 800; font-size: 24px;
        letter-spacing: 2px; text-transform: uppercase; box-shadow: 0 0 25px rgba(234, 88, 12, 0.4);
      }
      .channel { font-size: 28px; font-weight: 700; color: #94a3b8; letter-spacing: 1px; }
      .channel span { color: #f8fafc; font-weight: 800; }
      
      .main-title { margin-top: 15px; }
      .headline { font-size: 80px; font-weight: 900; line-height: 1.05; letter-spacing: -2px; }
      .headline .gradient {
        background: linear-gradient(135deg, #ffffff 0%, #fb923c 50%, #ea580c 100%);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      }
      .subhead { font-size: 35px; font-weight: 600; color: #cbd5e1; margin-top: 18px; letter-spacing: -0.5px; }
      .subhead span { color: #fb923c; font-weight: 700; }
      
      .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; margin-top: 25px; }
      .card {
        background: rgba(15, 23, 42, 0.85); border: 1.5px solid rgba(234, 88, 12, 0.35);
        border-radius: 20px; padding: 26px 30px; backdrop-filter: blur(16px);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
      }
      .card-title { font-size: 23px; font-weight: 800; color: #fb923c; margin-bottom: 8px; }
      .card-desc { font-size: 18px; color: #94a3b8; line-height: 1.4; }
      
      .footer {
        display: flex; justify-content: space-between; align-items: center;
        border-top: 1px solid rgba(148, 163, 184, 0.2); padding-top: 25px;
      }
      .footer-tag { font-size: 22px; font-weight: 700; color: #e2e8f0; }
      .footer-badge {
        background: linear-gradient(135deg, #c2410c, #9a3412);
        padding: 12px 28px; border-radius: 12px; font-size: 20px; font-weight: 800; color: white;
      }
    </style>
  </head>
  <body>
    <div class="bg-glow"></div>
    <div class="grid"></div>
    <div class="container">
      <div class="header">
        <div class="badge">★ IDD NA PRÁTICA · EPISÓDIO 4 ★</div>
        <div class="channel">CANAL <span>@EliézerJPRosa</span></div>
      </div>
      
      <div class="main-title">
        <div class="headline">
          VALIDAÇÃO TOTAL DO APP<br>
          <span class="gradient">240 TESTES &amp; DEPLOY EM 4 SEGUNDOS</span>
        </div>
        <div class="subhead">
          Como Garantir Zero Erros no Sábado de Pico e Subir para a Nuvem com 1 Clique
        </div>
      </div>
      
      <div class="cards">
        <div class="card">
          <div class="card-title">🧪 240 TESTES EM 820ms</div>
          <div class="card-desc">Suíte completa atacando concorrência, cadeira única, comissões e no-show.</div>
        </div>
        <div class="card">
          <div class="card-title">🛡️ CONFIRM-ONCE</div>
          <div class="card-desc">Governança humana ágil: autorização única com suíte 100% verde para publicação.</div>
        </div>
        <div class="card">
          <div class="card-title">⚡ DEPLOY EM 4.2s</div>
          <div class="card-desc">Sincronização atômica de containers e banco na nuvem sem lentidão de equipes manuais.</div>
        </div>
      </div>
      
      <div class="footer">
        <div class="footer-tag">SÉRIE PRÁTICA: O GUIA DEFINITIVO PARA LEIGOS E EMPREENDEDORES</div>
        <div class="footer-badge">BARBEARIA &amp; SALÃO</div>
      </div>
    </div>
  </body>
  </html>
  `;
  
  await page.setContent(html);
  const outPath = path.join(__dirname, 'capa.png');
  await page.screenshot({ path: outPath, type: 'png' });
  console.log(`Capa do Ep 4 da Barbearia gerada em: ${outPath}`);
  await browser.close();
}

makeCover().catch(err => {
  console.error("Erro ao gerar capa Barbearia Ep 4:", err);
  process.exit(1);
});
