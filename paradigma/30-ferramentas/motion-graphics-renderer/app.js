const path = require('path');
const { CliParser } = require('./app_service/cliParser.js');
const { VideoProcessor } = require('./app_service/videoProcessor.js');
const { TextPromptGenerator } = require('./app_service/textGenerator.js');
const { PipelineOrchestrator } = require('./pipeline.js');

async function main() {
  const cliParser = new CliParser();
  const options = cliParser.parse();

  if (options.help || (!options.videoPath && !options.prompt)) {
    cliParser.printUsage();
    process.exit(0);
  }

  console.log('============================================================');
  console.log('🎬 MOTION GRAPHICS RENDERER - APPLICATION ENTRY POINT');
  console.log('============================================================');

  let pipelineConfig = {
    projectName: options.name,
    htmlPath: options.html,
    durationSec: options.duration,
    fps: options.fps,
    width: options.width,
    height: options.height,
    audioSchedule: []
  };

  try {
    if (options.videoPath) {
      console.log(`\n--- Mode: Video Path Processing (${options.videoPath}) with Prompt & Web/YouTube Research ---`);
      const videoProcessor = new VideoProcessor();
      const videoResult = await videoProcessor.processVideo(options.videoPath, options.prompt, options.sources);

      pipelineConfig.durationSec = Math.max(options.duration, videoResult.durationSec);
      pipelineConfig.audioSchedule = videoResult.audioSchedule;
      
      console.log(`[App] Video processed successfully. Total duration: ${pipelineConfig.durationSec.toFixed(2)}s, Audio segments: ${pipelineConfig.audioSchedule.length}`);

    } else if (options.prompt) {
      console.log(`\n--- Mode: Text Prompt Generation & Research ("${options.prompt}") for up to ${options.duration}s ---`);
      const textGenerator = new TextPromptGenerator();
      const promptResult = await textGenerator.generateFromPrompt(options.prompt, options.duration, options.sources);

      pipelineConfig.durationSec = Math.max(options.duration, promptResult.durationSec);
      pipelineConfig.audioSchedule = promptResult.audioSchedule;

      console.log(`[App] Text prompt generated successfully. Total duration: ${pipelineConfig.durationSec.toFixed(2)}s, Audio segments: ${pipelineConfig.audioSchedule.length}`);
    }

    // Invoke existing pipeline orchestrator without modifying core pipeline files
    console.log('\n--- Invoking Pipeline Orchestrator ---');
    const orchestrator = new PipelineOrchestrator();
    const result = await orchestrator.run(pipelineConfig);

    console.log('============================================================');
    console.log('🎉 APPLICATION EXECUTION COMPLETED SUCCESSFULLY!');
    console.log(`🎬 Final Video Deliverable: ${result.finalVideoPath}`);
    console.log(`📄 Metadata Report: ${result.metadataPath}`);
    console.log('============================================================');

  } catch (error) {
    console.error('\n❌ [Application Error] Execution failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  main
};
