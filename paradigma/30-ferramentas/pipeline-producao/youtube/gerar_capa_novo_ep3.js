const fs = require('fs');
const path = require('path');
const { chromium } = require('../motion_graphics_renderer/rendering_service/node_modules/playwright');

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
      body { width: 1920px; height: 1080px; background: #070a13; color: white; overflow: hidden; position: relative; }
      .bg-glow {
        position: absolute; width: 1050px; height: 1050px; border-radius: 50%;
        background: radial-gradient(circle, rgba(168, 85, 247, 0.28) 0%, rgba(14, 165, 233, 0.24) 45%, transparent 70%);
        top: 50%; left: 50%; transform: translate(-50%, -50%); filter: blur(75px);
      }
      .grid {
        position: absolute; inset: 0;
        background-image: linear-gradient(rgba(56, 189, 248, 0.05) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(56, 189, 248, 0.05) 1px, transparent 1px);
        background-size: 80px 80px;
      }
      .container {
        position: relative; z-index: 10; width: 100%; height: 100%;
        display: flex; flex-direction: column; justify-content: space-between; padding: 75px 95px;
      }
      .header { display: flex; justify-content: space-between; align-items: center; }
      .badge {
        background: rgba(168, 85, 247, 0.2); border: 2px solid #a855f7; color: #c084fc;
        padding: 12px 28px; border-radius: 999px; font-weight: 800; font-size: 24px;
        letter-spacing: 2px; text-transform: uppercase; box-shadow: 0 0 25px rgba(168, 85, 247, 0.4);
      }
      .channel { font-size: 28px; font-weight: 700; color: #94a3b8; letter-spacing: 1px; }
      .channel span { color: #f8fafc; font-weight: 800; }
      
      .main-title { margin-top: 15px; }
      .headline { font-size: 80px; font-weight: 900; line-height: 1.05; letter-spacing: -2px; }
      .headline .gradient {
        background: linear-gradient(135deg, #ffffff 0%, #c084fc 50%, #38bdf8 100%);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      }
      .subhead { font-size: 35px; font-weight: 600; color: #cbd5e1; margin-top: 18px; letter-spacing: -0.5px; }
      .subhead span { color: #38bdf8; font-weight: 700; }
      
      .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; margin-top: 25px; }
      .card {
        background: rgba(15, 23, 42, 0.85); border: 1.5px solid rgba(56, 189, 248, 0.35);
        border-radius: 20px; padding: 26px 30px; backdrop-filter: blur(16px);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
      }
      .card-title { font-size: 23px; font-weight: 800; color: #c084fc; margin-bottom: 8px; }
      .card-desc { font-size: 18px; color: #94a3b8; line-height: 1.4; }
      
      .footer {
        display: flex; justify-content: space-between; align-items: center;
        border-top: 1px solid rgba(148, 163, 184, 0.2); padding-top: 25px;
      }
      .footer-tag { font-size: 22px; font-weight: 700; color: #e2e8f0; }
      .footer-badge {
        background: linear-gradient(135deg, #7c3aed, #0284c7);
        padding: 12px 28px; border-radius: 12px; font-size: 20px; font-weight: 800; color: white;
      }
    </style>
  </head>
  <body>
    <div class="bg-glow"></div>
    <div class="grid"></div>
    <div class="container">
      <div class="header">
        <div class="badge">★ EPISÓDIO 3: IMPLEMENTAÇÃO & BANCO DE DADOS ★</div>
        <div class="channel">CANAL <span>@EliézerJPRosa</span></div>
      </div>
      
      <div class="main-title">
        <div class="headline">
          DO MER AO BANCO DE DADOS REAL<br>
          <span class="gradient">SUPABASE, POSTGRESQL & OFFLINE-FIRST</span>
        </div>
        <div class="subhead">
          Segurança RLS Nativa · Máscaras de Campo · QR Code em menos de 50ms
        </div>
      </div>
      
      <div class="cards">
        <div class="card">
          <div class="card-title">🛡️ MULTITENANT RLS</div>
          <div class="card-desc">Isolamento criptográfico de dados no PostgreSQL impedindo vazamento entre tenants.</div>
        </div>
        <div class="card">
          <div class="card-title">📱 OFFLINE-FIRST REAL</div>
          <div class="card-desc">Operação contínua no celular via IndexedDB para subsolos e câmaras frigoríficas.</div>
        </div>
        <div class="card">
          <div class="card-title">🤖 COMPILADOR DE MIGRAÇÕES</div>
          <div class="card-desc">A IA antecipa tolerâncias de rede e compila endpoints com idempotência total.</div>
        </div>
      </div>
      
      <div class="footer">
        <div class="footer-tag">★ SÉRIE IDD NA PRÁTICA: LEIGOS & ENGENHEIROS ★</div>
        <div class="footer-badge">NOVO EPISÓDIO 3 OFICIAL</div>
      </div>
    </div>
  </body>
  </html>
  `;
  
  await page.setContent(html);
  const outPath = path.resolve('C:/Antigravity - IDD Refrigeração/producao_yt/capas/capa_novo_episodio_3.png');
  await page.screenshot({ path: outPath });
  console.log('Capa salva com sucesso em:', outPath);
  await browser.close();
}

makeCover().catch(err => {
  console.error(err);
  process.exit(1);
});
