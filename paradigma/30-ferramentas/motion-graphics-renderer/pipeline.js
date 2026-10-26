const path = require('path');
const fs = require('fs');
const { renderVideo } = require('./renderFrame.js');
const { consolidateAudioTracks } = require('./audio_service/index.js');
const { encodeVideo } = require('./video_encoding_service/index.js');
const { OutputStorageManager } = require('./storage_service/index.js');

/**
 * Main Pipeline Orchestrator for Motion Graphics Renderer.
 * Ties together Audio Service, Rendering Service (Headless Playwright),
 * Video Encoding Service (FFmpeg), and Output Storage & Management.
 */
class PipelineOrchestrator {
  constructor(options = {}) {
    this.storageManager = new OutputStorageManager(options.outputDir || path.join(process.cwd(), 'outputs'));
  }

  /**
   * Runs the complete end-to-end rendering and encoding pipeline.
   * 
   * @param {Object} pipelineConfig Configuration for the pipeline run
   * @param {string} pipelineConfig.projectName Name of the project (used for output folder and versioning)
   * @param {string} pipelineConfig.htmlPath Path to the HTML animation scene
   * @param {number} [pipelineConfig.durationSec=5] Total duration of the animation in seconds
   * @param {number} [pipelineConfig.fps=30] Frame rate (frames per second)
   * @param {number} [pipelineConfig.width=1920] Video width in pixels
   * @param {number} [pipelineConfig.height=1080] Video height in pixels
   * @param {string} [pipelineConfig.canvasSelector='canvas'] CSS selector for the canvas element
   * @param {Array<Object>} [pipelineConfig.audioSchedule=[]] Schedule of audio segments for audio consolidation
   * @param {string} [pipelineConfig.externalAudioPath=null] Path to a pre-consolidated audio track (alternative to audioSchedule)
   * @param {Object} [pipelineConfig.encodingOptions={}] Additional video encoding options (crf, preset, etc.)
   * @returns {Promise<Object>} Result object with final deliverables paths and metadata
   */
  async run(pipelineConfig) {
    const {
      projectName = 'motion_graphics_project',
      htmlPath,
      durationSec = 5,
      fps = 30,
      width = 1920,
      height = 1080,
      canvasSelector = 'canvas',
      audioSchedule = [],
      externalAudioPath = null,
      encodingOptions = {}
    } = pipelineConfig;

    if (!htmlPath) {
      throw new Error('Pipeline error: htmlPath is required.');
    }

    const absoluteHtmlPath = path.isAbsolute(htmlPath) ? htmlPath : path.resolve(process.cwd(), htmlPath);
    if (!fs.existsSync(absoluteHtmlPath)) {
      throw new Error(`Pipeline error: HTML scene file not found at ${absoluteHtmlPath}`);
    }

    const startTime = Date.now();
    console.log('============================================================');
    console.log(`🚀 STARTING PIPELINE ORCHESTRATION: "${projectName}"`);
    console.log('============================================================');

    // Step 1: Output Storage Versioning setup
    const { versionDir, version } = this.storageManager.createVersionedOutputDirectory(projectName);
    const tempDir = fs.mkdtempSync(path.join(process.cwd(), `temp_pipeline_${projectName}_`));
    const tempVideoPath = path.join(versionDir, 'temp_encoded.mp4');

    let consolidatedAudioPath = externalAudioPath;

    try {
      // Step 2: Audio Consolidation (if audioSchedule is provided and not empty)
      if (audioSchedule && audioSchedule.length > 0 && !consolidatedAudioPath) {
        console.log('\n--- [Pipeline Phase 1/3] Audio Consolidation ---');
        consolidatedAudioPath = path.join(tempDir, 'consolidated_audio.aac');
        await consolidateAudioTracks(audioSchedule, consolidatedAudioPath, durationSec);
        console.log(`[Pipeline] Audio successfully consolidated at: ${consolidatedAudioPath}`);
      } else {
        console.log('\n--- [Pipeline Phase 1/3] Audio Consolidation Skipped (No schedule or external audio provided) ---');
      }

      // Step 3: Rendering Service (Headless Browser Playwright) & Video Encoding Service (FFmpeg)
      console.log('\n--- [Pipeline Phase 2/3] Rendering Frames & Encoding Video ---');
      // We can use renderVideo from renderFrame.js which handles both rendering frames and encoding via ffmpeg
      const renderResult = await renderVideo({
        htmlPath: absoluteHtmlPath,
        outputPath: tempVideoPath,
        audioPath: consolidatedAudioPath,
        width,
        height,
        fps,
        durationSec,
        canvasSelector,
        tempDir: path.join(tempDir, 'frames')
      });

      console.log(`[Pipeline] Video encoded successfully to temp path: ${tempVideoPath}`);

      // Step 4: Output Storage Management (Save deliverables, generate metadata JSON, enforce retention)
      console.log('\n--- [Pipeline Phase 3/3] Output Storage & Metadata Generation ---');
      const renderDurationSec = (Date.now() - startTime) / 1000;

      const storageResult = this.storageManager.saveDeliverable({
        versionDir,
        sourceVideoPath: tempVideoPath,
        sourceAudioPath: consolidatedAudioPath,
        projectDefinition: {
          name: projectName,
          width,
          height,
          frameRate: fps,
          durationSec,
          htmlPath: absoluteHtmlPath
        },
        renderStats: {
          pipelineDurationSec: renderDurationSec.toFixed(2),
          totalFrames: renderResult.totalFrames,
          fpsAchieved: (renderResult.totalFrames / renderDurationSec).toFixed(2)
        }
      });

      // Enforce retention policy (keep last 5 versions)
      this.storageManager.enforceRetentionPolicy(projectName, 5);

      console.log('============================================================');
      console.log(`✅ PIPELINE ORCHESTRATION COMPLETED SUCCESSFULLY (${version})!`);
      console.log(`📁 Deliverables saved in: ${storageResult.versionDir}`);
      console.log(`🎬 Video: ${storageResult.finalVideoPath}`);
      console.log(`📄 Metadata: ${storageResult.metadataPath}`);
      console.log('============================================================');

      return {
        success: true,
        version,
        versionDir: storageResult.versionDir,
        finalVideoPath: storageResult.finalVideoPath,
        finalAudioPath: storageResult.finalAudioPath,
        metadataPath: storageResult.metadataPath,
        metadata: storageResult.metadata
      };

    } catch (error) {
      console.error(`\n❌ [Pipeline Error] Pipeline failed for "${projectName}":`, error);
      throw error;
    } finally {
      // Cleanup temporary pipeline files
      this.storageManager.cleanupTempDirectory(tempDir);
    }
  }
}

// CLI Execution support
if (require.main === module) {
  const args = process.argv.slice(2);
  const getArg = (name, fallback) => {
    const found = args.find((a) => a.startsWith(`--${name}=`));
    return found ? found.split('=')[1] : fallback;
  };

  const html = getArg('html', null);
  const name = getArg('name', 'motion_graphics_render');
  const dur = parseFloat(getArg('duration', '3'));
  const fps = parseInt(getArg('fps', '30'), 10);
  const width = parseInt(getArg('width', '1280'), 10);
  const height = parseInt(getArg('height', '720'), 10);

  if (!html) {
    console.log('Usage via CLI:');
    console.log('  node pipeline.js --html=path/to/scene.html [--name=project_name] [--duration=3] [--fps=30] [--width=1280] [--height=720]');
    process.exit(0);
  }

  const orchestrator = new PipelineOrchestrator();
  orchestrator.run({
    projectName: name,
    htmlPath: html,
    durationSec: dur,
    fps,
    width,
    height
  }).catch((err) => {
    console.error('Pipeline failed:', err);
    process.exit(1);
  });
}

module.exports = {
  PipelineOrchestrator
};
