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
        position: absolute; width: 1100px; height: 1100px; border-radius: 50%;
        background: radial-gradient(circle, rgba(14, 165, 233, 0.35) 0%, rgba(6, 182, 212, 0.2) 45%, transparent 70%);
        top: 50%; left: 50%; transform: translate(-50%, -50%); filter: blur(85px);
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
      .headline { font-size: 76px; font-weight: 900; line-height: 1.05; letter-spacing: -2px; }
      .headline .gradient {
        background: linear-gradient(135deg, #ffffff 0%, #38bdf8 50%, #06b6d4 100%);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      }
      .subhead { font-size: 34px; font-weight: 600; color: #e2e8f0; margin-top: 18px; letter-spacing: -0.5px; }
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
        <div class="badge">EPISÓDIO 2B • METODOLOGIA IDD</div>
        <div class="channel">RACHA DE PIX • <span>O 2º PASSO SAGRADO COM IA</span></div>
      </div>
      
      <div class="main-title">
        <div class="headline">MER PRELIMINAR COM IA: <span class="gradient">O MODELO DE DADOS</span></div>
        <div class="subhead">Arquitetura Relacional do Rateio, Cardinalidades N:N e <span>Cotas Imutáveis</span></div>
      </div>
      
      <div class="cards">
        <div class="card">
          <div class="card-tag">PASSO 2 • NÚCLEO RELACIONAL</div>
          <div class="card-title">Entidades da Mesa</div>
          <div class="card-desc">Mapeamento puro de Mesas, Participantes e Comandas sem contaminação precoce de SQL.</div>
        </div>
        <div class="card">
          <div class="card-tag">PASSO 2 • RATEIO ATÔMICO</div>
          <div class="card-title">Matriz Associativa N:N</div>
          <div class="card-desc">A entidade ConsumoItem garante a atribuição precisa de 1 ou mais amigos por produto.</div>
        </div>
        <div class="card">
          <div class="card-tag">PASSO 2 • GOVERNANÇA</div>
          <div class="card-title">Cota Imutável & Pix</div>
          <div class="card-desc">Snapshot fechado da conta para garantir rastreabilidade, auditoria e QR Codes invioláveis.</div>
        </div>
      </div>
      
      <div class="footer">
        <div class="presenters">
          <div class="presenter">
            <img class="avatar" src="../../avatares/avatar_usuaria_leiga.png">
            <div class="p-info">
              <div class="p-name">Usuária Leiga</div>
              <div class="p-role">Validação do Negócio</div>
            </div>
          </div>
          <div class="presenter">
            <img class="avatar" src="../../avatares/avatar_eliezer_oficial.png">
            <div class="p-info">
              <div class="p-name">Eliézer Rosa</div>
              <div class="p-role">Orquestrador Metodológico IDD</div>
            </div>
          </div>
          <div class="presenter">
            <img class="avatar" src="../../avatares/avatar_ia_compilador.png">
            <div class="p-info">
              <div class="p-name">IA Compilador</div>
              <div class="p-role">Modelagem de Dados & Governança</div>
            </div>
          </div>
        </div>
        <div class="tech-tags">
          <div class="tech-tag">MER Conceitual</div>
          <div class="tech-tag">Zero Código Prematuro</div>
          <div class="tech-tag">Snapshot Imutável</div>
          <div class="tech-tag">Rastreabilidade Pix</div>
        </div>
      </div>
    </div>
  </body>
  </html>
  `;
  
  await page.setContent(html);
  await page.waitForTimeout(500);
  const outPath = path.join(__dirname, 'capa.png');
  await page.screenshot({ path: outPath });
  console.log('✅ Capa gerada em:', outPath);
  await browser.close();
}

makeCover().catch(console.error);
