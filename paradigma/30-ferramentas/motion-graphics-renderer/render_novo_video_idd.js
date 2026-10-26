/**
 * @file render_novo_video_idd.js
 * @description Renderizador Mestre do Novo Vídeo Motion Graphics do Paradigma IDD.
 * Integra:
 * - Cena HTML5 Canvas de Alta Fidelidade (1920x1080 @ 30/60 fps)
 * - Trilha Sonora Mestre Estéreo com Dueto Neural (Antonio + Francisca) em -14 LUFS
 * - Gravação direta via Playwright Chromium Engine em Full HD
 * - Encoding final FFmpeg H.264 broadcast-grade
 * - Armazenamento versionado em outputs/ e producao_yt/
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { PipelineOrchestrator } = require('./pipeline.js');

async function executarRenderNovoVideo() {
  console.log('='.repeat(70));
  console.log('🎬 IDD VIDEO STUDIO: INICIANDO CRIAÇÃO DO NOVO VÍDEO COMPLETO');
  console.log('   "IDD - O Paradigma da Intenção na Prática (Engenharia de Refrigeração)"');
  console.log('='.repeat(70));

  const startTime = Date.now();
  const projectName = 'IDD_Paradigma_Manifesto_Oficial';
  const durationSec = 80;
  const width = 1920;
  const height = 1080;
  const fps = 30;

  const htmlPath = path.resolve(__dirname, 'idd_novo_video_assets/idd_motion_scene.html');
  const audioPath = path.resolve(__dirname, 'idd_novo_video_assets/master_soundtrack_idd_novo.wav');

  if (!fs.existsSync(htmlPath)) throw new Error(`HTML não encontrado: ${htmlPath}`);
  if (!fs.existsSync(audioPath)) throw new Error(`Áudio não encontrado: ${audioPath}`);

  // 1. Configura diretório de saída versionado
  const orchestrator = new PipelineOrchestrator({ outputDir: path.join(__dirname, 'outputs') });
  const { versionDir, version } = orchestrator.storageManager.createVersionedOutputDirectory(projectName);
  const tempRecordDir = path.join(versionDir, 'temp_raw_record');
  fs.mkdirSync(tempRecordDir, { recursive: true });

  console.log(`\n[Fase 1/3] Preparação de Ambiente: Versão ${version}`);
  console.log(`📁 Pasta de Saída: ${versionDir}`);
  console.log(`🎬 Resolução: ${width}x${height} Full HD | Duração: ${durationSec}s`);
  console.log(`🎙️ Áudio Master: ${audioPath}`);

  // 2. Gravação de Vídeo via Playwright Chromium Engine
  console.log('\n[Fase 2/3] Gravando Cena Motion Graphics em Tempo Real...');
  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  const executablePath = possiblePaths.find((p) => fs.existsSync(p));

  const browser = await chromium.launch({
    headless: true,
    executablePath,
    args: [
      '--enable-webgl',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-background-timer-throttling'
    ]
  });

  const context = await browser.newContext({
    recordVideo: { dir: tempRecordDir, size: { width, height } },
    viewport: { width, height },
    deviceScaleFactor: 1
  });

  const page = await context.newPage();
  const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');

  console.log('   Iniciando captura suave dos 80 segundos...');
  await page.goto(fileUrl, { waitUntil: 'networkidle' });

  // Aguarda a reprodução exata dos 80 segundos com exibição de progresso
  const totalMs = durationSec * 1000;
  const intervalMs = 5000;
  for (let elapsed = 0; elapsed < totalMs; elapsed += intervalMs) {
    await page.waitForTimeout(intervalMs);
    const pct = Math.min(100, Math.round(((elapsed + intervalMs) / totalMs) * 100));
    const sec = Math.min(durationSec, Math.round((elapsed + intervalMs) / 1000));
    process.stdout.write(`   Gravando timeline: ${sec}s / ${durationSec}s (${pct}%)...\r`);
  }
  console.log('\n   Gravação da cena gráfica concluída com sucesso!');

  await page.close();
  await context.close();

  const videoObj = await page.video();
  const rawVideoPath = await videoObj.path();
  await browser.close();

  console.log(`   Arquivo temporário gerado: ${rawVideoPath} (${(fs.statSync(rawVideoPath).size / (1024 * 1024)).toFixed(1)} MB)`);

  // 3. Muxing e Encoding Final H.264 com Trilha Sonora Estúdio
  console.log('\n[Fase 3/3] Codificando Vídeo Master H.264 Full HD com Áudio EBU R128 (-14 LUFS)...');
  const finalVideoPath = path.join(versionDir, `${projectName}_${version}.mp4`);
  const producaoPath = path.resolve(__dirname, '../producao_yt/IDD_Novo_Video_Manifesto_Oficial.mp4');

  const ffmpegArgs = [
    '-y',
    '-i', rawVideoPath,
    '-i', audioPath,
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-crf', '18',
    '-preset', 'medium',
    '-r', String(fps),
    '-c:a', 'aac',
    '-b:a', '192k',
    '-ar', '48000',
    '-shortest',
    '-movflags', '+faststart',
    finalVideoPath
  ];

  await new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', ffmpegArgs);
    ff.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg falhou com código ${code}`));
    });
  });

  // Copia para producao_yt
  fs.copyFileSync(finalVideoPath, producaoPath);

  // Limpa gravação bruta temporária
  fs.rmSync(tempRecordDir, { recursive: true, force: true });

  // Metadados do Projeto
  const metadataPath = path.join(versionDir, 'metadata.json');
  const metadata = {
    projectName,
    version,
    createdAt: new Date().toISOString(),
    resolution: `${width}x${height}`,
    fps,
    durationSec,
    audioProfile: 'pt-BR-AntonioNeural (Dev) + pt-BR-FranciscaNeural (IA)',
    loudness: '-14 LUFS (EBU R128)',
    narrativeActs: [
      { act: 1, title: 'O Despertar do Paradigma IDD', time: '0s - 16s' },
      { act: 2, title: 'A Física Térmica e a Lei 13.589 do PMOC', time: '16s - 33s' },
      { act: 3, title: 'Escudo de Invariantes & Governança Persistente', time: '33s - 49s' },
      { act: 4, title: 'Conexão com o Campo: O Mecânico e o Smartphone', time: '49s - 65s' },
      { act: 5, title: 'O Clímax & O Futuro do Software', time: '65s - 80s' }
    ],
    fileSizeMB: (fs.statSync(finalVideoPath).size / (1024 * 1024)).toFixed(1),
    deliverables: {
      versionedPath: finalVideoPath,
      producaoPath
    }
  };
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');

  const totalTimeSec = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n' + '='.repeat(70));
  console.log('🎉 SUCESSO ABSOLUTO! NOVO VÍDEO IDD RENDERIZADO E ENTREGUE:');
  console.log(`🎬 Arquivo na Produção: ${producaoPath}`);
  console.log(`📁 Arquivo Versionado: ${finalVideoPath}`);
  console.log(`📄 Metadados do Vídeo: ${metadataPath}`);
  console.log(`⏱️ Tempo Total de Renderização: ${totalTimeSec} segundos`);
  console.log(`📦 Tamanho Final: ${metadata.fileSizeMB} MB`);
  console.log('='.repeat(70));
}

executarRenderNovoVideo().catch((err) => {
  console.error('\n❌ Falha na criação do novo vídeo:', err);
  process.exit(1);
});
