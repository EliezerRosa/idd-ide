const path = require('path');
const fs = require('fs');
const { PipelineOrchestrator } = require('../pipeline.js');
const { OutputStorageManager } = require('../storage_service/index.js');

async function runE2ETests() {
  console.log('============================================================');
  console.log('🧪 RUNNING END-TO-END PIPELINE & STORAGE INTEGRATION TESTS');
  console.log('============================================================');

  const testOutputDir = path.join(__dirname, 'test_outputs_e2e');
  if (fs.existsSync(testOutputDir)) {
    fs.rmSync(testOutputDir, { recursive: true, force: true });
  }

  try {
    // 1. Test OutputStorageManager unit features
    console.log('\n--- Test 1: OutputStorageManager Versioning & Retention ---');
    const storageManager = new OutputStorageManager(testOutputDir);
    const v1Info = storageManager.createVersionedOutputDirectory('test_proj');
    console.log(`[PASS] Created version directory: ${v1Info.versionDir}`);
    
    const v2Info = storageManager.createVersionedOutputDirectory('test_proj');
    console.log(`[PASS] Created second version directory: ${v2Info.versionDir}`);

    if (v2Info.versionNumber !== 2) {
      throw new Error(`Expected version number 2, got ${v2Info.versionNumber}`);
    }

    // 2. Test Pipeline Orchestrator with example scene (short duration for speed: 0.5s at 10fps = 5 frames)
    console.log('\n--- Test 2: Pipeline Orchestrator End-to-End Execution ---');
    const exampleHtmlPath = path.resolve(__dirname, '../example_scene.html');
    if (!fs.existsSync(exampleHtmlPath)) {
      throw new Error(`Example scene not found at ${exampleHtmlPath}`);
    }

    const orchestrator = new PipelineOrchestrator({ outputDir: testOutputDir });
    const result = await orchestrator.run({
      projectName: 'test_pipeline_video',
      htmlPath: exampleHtmlPath,
      durationSec: 0.5,
      fps: 10,
      width: 320,
      height: 240
    });

    console.log('[PASS] Pipeline execution finished successfully.');
    console.log(`       Final Video: ${result.finalVideoPath}`);
    console.log(`       Metadata: ${result.metadataPath}`);

    // Verify files exist and are non-empty
    if (!fs.existsSync(result.finalVideoPath) || fs.statSync(result.finalVideoPath).size === 0) {
      throw new Error('Final video file is missing or empty.');
    }
    if (!fs.existsSync(result.metadataPath) || fs.statSync(result.metadataPath).size === 0) {
      throw new Error('Metadata JSON file is missing or empty.');
    }

    const metadataContent = JSON.parse(fs.readFileSync(result.metadataPath, 'utf8'));
    console.log(`[PASS] Metadata verified successfully. Schema version: ${metadataContent.schemaVersion}`);
    console.log(`       Video size: ${metadataContent.deliverables.videoSizeMB} MB`);

    console.log('\n============================================================');
    console.log('🎉 ALL END-TO-END INTEGRATION TESTS PASSED SUCCESSFULLY!');
    console.log('============================================================');

  } catch (error) {
    console.error('\n❌ [Test Failure] End-to-end integration test failed:', error);
    process.exitCode = 1;
  } finally {
    // Cleanup test outputs
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
      console.log(`Cleaned up test output directory: ${testOutputDir}`);
    }
  }
}

runE2ETests();
