const path = require('path');
const { PipelineOrchestrator } = require('./pipeline.js');

/**
 * Script de Disparo Amigável do Pipeline de Vídeo.
 * Altere as opções abaixo conforme o seu projeto e execute com:
 * node run_render.js
 */
async function dispararRender() {
  console.log('='.repeat(60));
  console.log('🎬 INICIANDO DISPARO DO PIPELINE DE VÍDEO');
  console.log('='.repeat(60));

  const orchestrator = new PipelineOrchestrator({
    // Diretório base onde as pastas versionadas de vídeo serão salvas
    outputDir: path.join(__dirname, 'outputs')
  });

  const config = {
    // 1. Nome do projeto (cria a pasta em outputs/<projectName>/v1, v2...)
    projectName: 'idd_video_demonstracao',

    // 2. Cena gráfica animada (HTML / Canvas / GSAP)
    htmlPath: path.join(__dirname, 'example_scene.html'),

    // 3. Parâmetros visuais
    durationSec: 5,       // Duração do vídeo em segundos
    fps: 30,              // 30 ou 60 quadros por segundo
    width: 1920,          // 1920x1080 (Full HD)
    height: 1080,
    canvasSelector: 'canvas',

    // 4. Áudio (opcional): se você tiver uma trilha pronta ou schedule
    // externalAudioPath: path.resolve(__dirname, '../producao_yt/v1_verbatim/audio_segs/b001.wav'),
    // audioSchedule: require('../producao_yt/v1_verbatim/schedule.json'),

    // 5. Opções de compressão e qualidade
    encodingOptions: {
      crf: 18,            // 18 = qualidade visual sem perdas
      preset: 'medium'    // fast, medium, slow
    }
  };

  const resultado = await orchestrator.run(config);

  console.log('\n' + '='.repeat(60));
  console.log('🎉 SUCESSO TOTAL! VÍDEO DISPONÍVEL EM:');
  console.log(`📁 Pasta da Versão: ${resultado.versionDir}`);
  console.log(`🎬 Vídeo MP4:       ${resultado.finalVideoPath}`);
  console.log(`📄 Metadados JSON:  ${resultado.metadataPath}`);
  console.log('='.repeat(60));
}

dispararRender().catch((erro) => {
  console.error('\n❌ Falha na execução do pipeline:', erro);
  process.exit(1);
});
