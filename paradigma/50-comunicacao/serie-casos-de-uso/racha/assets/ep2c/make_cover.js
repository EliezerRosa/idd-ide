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
      body { width: 1920px; height: 1080px; background: #030712; color: white; overflow: hidden; position: relative; }
      .bg-glow {
        position: absolute; width: 1150px; height: 1150px; border-radius: 50%;
        background: radial-gradient(circle, rgba(14, 165, 233, 0.38) 0%, rgba(99, 102, 241, 0.22) 45%, transparent 70%);
        top: 50%; left: 50%; transform: translate(-50%, -50%); filter: blur(90px);
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
        background: rgba(14, 165, 233, 0.25); border: 2px solid #38bdf8; color: #38bdf8;
        padding: 12px 28px; border-radius: 999px; font-weight: 800; font-size: 24px;
        letter-spacing: 2px; text-transform: uppercase; box-shadow: 0 0 25px rgba(56, 189, 248, 0.4);
      }
      .channel { font-size: 28px; font-weight: 700; color: #cbd5e1; letter-spacing: 1px; }
      .channel span { color: #38bdf8; font-weight: 800; }
      
      .main-title { margin-top: 15px; }
      .headline { font-size: 70px; font-weight: 900; line-height: 1.05; letter-spacing: -2px; }
      .headline .gradient {
        background: linear-gradient(135deg, #ffffff 0%, #38bdf8 50%, #818cf8 100%);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      }
      .subhead { font-size: 33px; font-weight: 600; color: #e2e8f0; margin-top: 18px; letter-spacing: -0.5px; }
      .subhead span { color: #38bdf8; font-weight: 700; }
      
      .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; margin-top: 25px; }
      .card {
        background: rgba(15, 23, 42, 0.88); border: 1.5px solid rgba(56, 189, 248, 0.35);
        border-radius: 20px; padding: 26px 30px; backdrop-filter: blur(16px);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
      }
      .card-tag { font-size: 14px; font-weight: 800; color: #38bdf8; text-transform: uppercase; letter-spacing: 1.5px; }
      .card-title { font-size: 26px; font-weight: 800; color: #f8fafc; margin-top: 8px; }
      .card-desc { font-size: 16px; color: #94a3b8; margin-top: 8px; line-height: 1.45; }
      
      .footer {
        display: flex; justify-content: space-between; align-items: flex-end;
        border-top: 1px solid rgba(56, 189, 248, 0.25); padding-top: 25px;
      }
      .presenters { display: flex; gap: 40px; }
      .presenter { display: flex; align-items: center; gap: 15px; }
      .avatar {
        width: 70px; height: 70px; border-radius: 50%; border: 2.5px solid #38bdf8;
        object-fit: cover; box-shadow: 0 0 20px rgba(56, 189, 248, 0.4);
      }
      .p-info .p-name { font-size: 20px; font-weight: 800; color: #f8fafc; }
      .p-info .p-role { font-size: 14px; font-weight: 600; color: #38bdf8; }
      .tech-tags { display: flex; gap: 12px; }
      .tech-tag {
        background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(56, 189, 248, 0.3);
        padding: 8px 16px; border-radius: 8px; font-size: 14px; font-weight: 700; color: #e2e8f0;
      }
    </style>
  </head>
  <body>
    <div class="bg-glow"></div>
    <div class="grid"></div>
    <div class="container">
      <div class="header">
        <div class="badge">EPISÓDIO 2C • MODELAGEM CANÔNICA</div>
        <div class="channel">RACHA DE PIX • <span>MER COMPLETO & NORMALIZAÇÃO</span></div>
      </div>
      
      <div class="main-title">
        <div class="headline">MER COMPLETO: <span class="gradient">ENTIDADES & RELAÇÕES</span></div>
        <div class="subhead">Notação Crow's Foot Oficial & <span>Invariantes de Normalização 1FN, 2FN, 3FN</span></div>
      </div>
      
      <div class="cards">
        <div class="card">
          <div class="card-tag">Notação Canônica</div>
          <div class="card-title">Diagrama Crow's Foot</div>
          <div class="card-desc">6 entidades relacionais com chaves primárias (PK), chaves estrangeiras (FK) e matriz N:N fracionária.</div>
        </div>
        <div class="card">
          <div class="card-tag">Rigor Metodológico</div>
          <div class="card-title">Normalização IDD</div>
          <div class="card-desc">Atributos 100% atômicos em 1FN, dependência funcional total em 2FN e eliminação de transitividade em 3FN.</div>
        </div>
        <div class="card">
          <div class="card-tag">Governança no Terminal</div>
          <div class="card-title">Invariantes de Dados</div>
          <div class="card-desc">A IA submete a matriz de integridade referencial e o orquestrador homologa o modelo antes de qualquer SQL.</div>
        </div>
      </div>
      
      <div class="footer">
        <div class="presenters">
          <div class="presenter">
            <img class="avatar" src="file:///C:/Antigravity%20-%20IDD%20Refrigera%C3%A7%C3%A3o/producao_yt/avatares/avatar_eliezer_oficial.png">
            <div class="p-info">
              <div class="p-name">Eliézer Rosa</div>
              <div class="p-role">Criador do Paradigma IDD</div>
            </div>
          </div>
          <div class="presenter">
            <img class="avatar" src="file:///C:/Antigravity%20-%20IDD%20Refrigera%C3%A7%C3%A3o/producao_yt/avatares/avatar_usuaria_leiga.png">
            <div class="p-info">
              <div class="p-name">Usuária Leiga</div>
              <div class="p-role">Validadora de Domínio</div>
            </div>
          </div>
          <div class="presenter">
            <img class="avatar" src="file:///C:/Antigravity%20-%20IDD%20Refrigera%C3%A7%C3%A3o/producao_yt/avatares/avatar_ia_compilador.png">
            <div class="p-info">
              <div class="p-name">IA Compilador</div>
              <div class="p-role">Normalização & Contratos</div>
            </div>
          </div>
        </div>
        <div class="tech-tags">
          <div class="tech-tag">Crow's Foot</div>
          <div class="tech-tag">3FN IDD</div>
          <div class="tech-tag">Integridade Referencial</div>
          <div class="tech-tag">Data Invariants</div>
        </div>
      </div>
    </div>
  </body>
  </html>
  `;
  
  await page.setContent(html);
  const outPath = path.resolve(__dirname, 'capa.png');
  await page.screenshot({ path: outPath, type: 'png' });
  await browser.close();
  console.log(`[OK] Capa Ep. 2C gerada com sucesso em: ${outPath}`);
}

makeCover().catch(console.error);
