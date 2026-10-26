const { chromium } = require('../../../motion_graphics_renderer/rendering_service/node_modules/playwright');
const path = require('path');
const fs = require('fs');

async function generateCover() {
  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  const executablePath = possiblePaths.find((p) => fs.existsSync(p));

  const browser = await chromium.launch({
    headless: true,
    executablePath
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  const coverHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', system-ui, sans-serif; }
      body {
        width: 1280px; height: 720px;
        background: #0c0a09;
        color: #ffffff;
        position: relative;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 50px 70px;
      }
      .grid-bg {
        position: absolute; inset: 0;
        background-image: linear-gradient(rgba(245, 158, 11, 0.08) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(245, 158, 11, 0.08) 1px, transparent 1px);
        background-size: 40px 40px;
      }
      .glow-1 {
        position: absolute; width: 650px; height: 650px; border-radius: 50%;
        background: radial-gradient(circle, rgba(245, 158, 11, 0.3) 0%, rgba(217, 119, 6, 0.15) 50%, transparent 70%);
        top: -120px; right: -100px; filter: blur(80px);
      }
      .glow-2 {
        position: absolute; width: 500px; height: 500px; border-radius: 50%;
        background: radial-gradient(circle, rgba(16, 185, 129, 0.22) 0%, transparent 70%);
        bottom: -100px; left: -100px; filter: blur(80px);
      }

      .top-row {
        position: relative; z-index: 10;
        display: flex; justify-content: space-between; align-items: center;
      }
      .series-badge {
        background: linear-gradient(135deg, #d97706, #b45309);
        color: #ffffff; font-weight: 900; font-size: 15px;
        letter-spacing: 2px; padding: 7px 18px; border-radius: 999px;
        text-transform: uppercase; box-shadow: 0 0 25px rgba(245, 158, 11, 0.5);
      }
      .idd-seal {
        font-size: 15px; font-weight: 800; color: #fbbf24;
        letter-spacing: 1.5px; text-transform: uppercase;
        display: flex; align-items: center; gap: 8px;
      }
      .idd-seal::before {
        content: ''; width: 10px; height: 10px; border-radius: 50%; background: #fbbf24;
        box-shadow: 0 0 10px #fbbf24;
      }

      .main-content {
        position: relative; z-index: 10;
        max-width: 820px;
      }
      .ep-pill {
        display: inline-block;
        background: rgba(245, 158, 11, 0.15); border: 1.5px solid #f59e0b;
        color: #fbbf24; font-weight: 800; font-size: 14px;
        letter-spacing: 2px; padding: 5px 15px; border-radius: 8px;
        text-transform: uppercase; margin-bottom: 15px;
      }
      .main-title {
        font-size: 54px; font-weight: 950; line-height: 1.05;
        letter-spacing: -1px; text-transform: uppercase;
        background: linear-gradient(135deg, #ffffff 40%, #fbbf24 100%);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        margin-bottom: 12px;
      }
      .main-subtitle {
        font-size: 24px; font-weight: 600; color: #cbd5e1;
        line-height: 1.35;
      }
      .highlight { color: #f59e0b; font-weight: 800; }
      .tag-runtime {
        display: inline-flex; align-items: center; gap: 8px;
        margin-top: 15px; background: rgba(245, 158, 11, 0.15);
        border: 1.5px solid #f59e0b; border-radius: 8px; padding: 6px 14px;
        font-family: monospace; font-size: 14px; font-weight: 700; color: #fde047;
      }

      .footer-row {
        position: relative; z-index: 10;
        display: flex; justify-content: space-between; align-items: flex-end;
      }
      .author-box { display: flex; align-items: center; gap: 15px; }
      .author-avatar {
        width: 60px; height: 60px; border-radius: 50%;
        border: 2.5px solid #f59e0b; overflow: hidden;
        box-shadow: 0 0 15px rgba(245, 158, 11, 0.4);
      }
      .author-avatar img { width: 100%; height: 100%; object-fit: cover; }
      .author-info h3 { font-size: 17px; font-weight: 800; color: #ffffff; }
      .author-info p { font-size: 13px; color: #94a3b8; font-weight: 600; }

      .tech-badges { display: flex; gap: 10px; }
      .tech-tag {
        background: rgba(28, 25, 23, 0.85); border: 1px solid rgba(245, 158, 11, 0.4);
        padding: 6px 14px; border-radius: 8px; font-size: 12px; font-weight: 700;
        color: #e2e8f0; text-transform: uppercase; letter-spacing: 1px;
      }

      .preview-box {
        position: absolute; right: 60px; top: 150px; width: 380px; height: 380px;
        background: rgba(28, 25, 23, 0.95); border: 2px solid #f59e0b;
        border-radius: 20px; box-shadow: 0 20px 50px rgba(0,0,0,0.8);
        z-index: 15; padding: 22px; display: flex; flex-direction: column; justify-content: space-between;
        font-family: 'Consolas', monospace;
      }
      .code-header {
        display: flex; gap: 6px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #44403c;
      }
      .code-dot { width: 10px; height: 10px; border-radius: 50%; }
      .code-line { font-size: 12px; line-height: 1.5; color: #cbd5e1; }
      .kw { color: #f43f5e; font-weight: 700; }
      .fn { color: #38bdf8; }
      .dec { color: #fde047; font-weight: 700; }
      .ty { color: #10b981; }
      .test-badge {
        background: rgba(16, 185, 129, 0.15); border: 1.5px solid #10b981;
        border-radius: 10px; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between;
      }
    </style>
  </head>
  <body>
    <div class="glow-1"></div>
    <div class="glow-2"></div>
    <div class="grid-bg"></div>

    <div class="top-row">
      <div class="series-badge">☕ Trilha Oficial 03 • Cafeteria &amp; Padaria</div>
      <div class="idd-seal">Paradigma IDD • Engenharia Canônica</div>
    </div>

    <div class="main-content">
      <div class="ep-pill">Episódio 4C • Código Vivo &amp; Testes de Estresse</div>
      <div class="main-title">Implementação Completa</div>
      <div class="main-subtitle">
        Funções Puras de Baixa de Insumos, Decorador <span class="highlight">@invariant</span> em Runtime e 200 Testes de Concorrência
      </div>
      <div class="tag-runtime">
        <span>⚡ RUNTIME SENTINEL: 100% PURO &amp; ZERO DESPERDÍCIO</span>
      </div>
    </div>

    <div class="preview-box">
      <div>
        <div class="code-header">
          <div class="code-dot" style="background: #ef4444;"></div>
          <div class="code-dot" style="background: #f59e0b;"></div>
          <div class="code-dot" style="background: #10b981;"></div>
          <span style="font-size: 11px; color: #78716c; margin-left: 8px;">ficha_tecnica.pure.ts</span>
        </div>
        <div class="code-line"><span class="dec">@invariant</span>(hasSufficientStock)</div>
        <div class="code-line"><span class="kw">export function</span> <span class="fn">baixarInsumos</span>(</div>
        <div class="code-line">&nbsp;&nbsp;receita: <span class="ty">FichaTecnica</span>,</div>
        <div class="code-line">&nbsp;&nbsp;lotes: <span class="ty">Array&lt;Lote&gt;</span></div>
        <div class="code-line">): <span class="ty">Result&lt;NovoSaldo&gt;</span> {</div>
        <div class="code-line">&nbsp;&nbsp;<span class="kw">return</span> lotes.deduzirFIFO();</div>
        <div class="code-line">}</div>
      </div>
      <div class="test-badge">
        <span style="font-size: 12px; color: #6ee7b7; font-weight: 800;">TESTES CONCORRENTES</span>
        <span style="font-size: 13px; font-weight: 900; color: #10b981;">200/200 OK (100%)</span>
      </div>
    </div>

    <div class="footer-row">
      <div class="author-box">
        <div class="author-avatar">
          <img src="../../avatares/avatar_eliezer_oficial.png" alt="Eliézer Rosa">
        </div>
        <div class="author-info">
          <h3>Eliézer Rosa</h3>
          <p>Criador do Paradigma IDD</p>
        </div>
      </div>
      <div class="tech-badges">
        <div class="tech-tag">Funções Puras</div>
        <div class="tech-tag">Ficha Técnica</div>
        <div class="tech-tag">@invariant</div>
        <div class="tech-tag">200 Testes</div>
      </div>
    </div>
  </body>
  </html>
  `;

  await page.setContent(coverHtml);
  const outPath = path.resolve(__dirname, 'capa.png');
  await page.screenshot({ path: outPath, type: 'png' });
  await browser.close();
  console.log(`[OK] Capa Ep. 4C Cafeteria gerada em: ${outPath}`);
}

generateCover().catch(console.error);
