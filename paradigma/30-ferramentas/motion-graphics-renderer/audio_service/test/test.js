const { consolidateAudioTracks } = require('../index.js');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = path.join(__dirname, 'output');
const TEST_AUDIO_DIR = path.join(__dirname, 'temp_audio');

// Helper to create dummy audio files for testing
async function createDummyAudio(filename, durationSeconds) {
  const filePath = path.join(TEST_AUDIO_DIR, filename);
  if (!fs.existsSync(TEST_AUDIO_DIR)) {
    fs.mkdirSync(TEST_AUDIO_DIR, { recursive: true });
  }

  return new Promise((resolve, reject) => {
    // Use ffmpeg to create a silent audio file
    const command = `ffmpeg -y -f lavfi -i anullsrc=r=48000:cl=stereo -t ${durationSeconds} -c:a aac \"${filePath}\"`;
    require('child_process').exec(command, (error) => {
      if (error) {
        console.error(`Error creating dummy audio ${filename}:`, error);
        return reject(error);
      }
      console.log(`Created dummy audio: ${filePath} (${durationSeconds}s)`);
      resolve(filePath);
    });
  });
}

async function runTests() {
  console.log('Starting Audio Integration Module Tests...');

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Test Case 1: Simple concatenation of two audio files with a gap
  console.log('\n--- Test Case 1: Simple concatenation with gap ---');
  try {
    const audio1Path = await createDummyAudio('audio1.aac', 2);
    const audio2Path = await createDummyAudio('audio2.aac', 3);

    const schedule1 = [
      { path: audio1Path, start: 0, duration: 2 },
      { path: audio2Path, start: 3, duration: 3 }, // 1 second gap
    ];
    const output1 = path.join(OUTPUT_DIR, 'output1.aac');
    const totalDuration1 = 6; // 2s audio1 + 1s silence + 3s audio2
    await consolidateAudioTracks(schedule1, output1, totalDuration1);
    console.log(`Test 1 PASSED: Consolidated audio to ${output1}`);
  } catch (error) {
    console.error('Test 1 FAILED:', error.message);
  }

  // Test Case 2: No gap, segments back-to-back
  console.log('\n--- Test Case 2: Back-to-back segments ---');
  try {
    const audio3Path = await createDummyAudio('audio3.aac', 1.5);
    const audio4Path = await createDummyAudio('audio4.aac', 2.5);

    const schedule2 = [
      { path: audio3Path, start: 0, duration: 1.5 },
      { path: audio4Path, start: 1.5, duration: 2.5 },
    ];
    const output2 = path.join(OUTPUT_DIR, 'output2.aac');
    const totalDuration2 = 4;
    await consolidateAudioTracks(schedule2, output2, totalDuration2);
    console.log(`Test 2 PASSED: Consolidated audio to ${output2}`);
  } catch (error) {
    console.error('Test 2 FAILED:', error.message);
  }

  // Test Case 3: Single audio segment, shorter than totalDuration (padding at end)
  console.log('\n--- Test Case 3: Single segment, end padding ---');
  try {
    const audio5Path = await createDummyAudio('audio5.aac', 4);

    const schedule3 = [
      { path: audio5Path, start: 1, duration: 4 },
    ];
    const output3 = path.join(OUTPUT_DIR, 'output3.aac');
    const totalDuration3 = 8; // 1s silence + 4s audio5 + 3s silence
    await consolidateAudioTracks(schedule3, output3, totalDuration3);
    console.log(`Test 3 PASSED: Consolidated audio to ${output3}`);
  } catch (error) {
    console.error('Test 3 FAILED:', error.message);
  }

  // Test Case 4: Empty schedule (should throw error)
  console.log('\n--- Test Case 4: Empty schedule ---');
  try {
    const output4 = path.join(OUTPUT_DIR, 'output4.aac');
    await consolidateAudioTracks([], output4, 5);
    console.error('Test 4 FAILED: Expected error for empty schedule.');
  } catch (error) {
    console.log(`Test 4 PASSED: Caught expected error: ${error.message}`);
  }

  // Clean up dummy audio files and output directory
  console.log('\nCleaning up test files...');
  try {
    if (fs.existsSync(TEST_AUDIO_DIR)) {
      fs.rmSync(TEST_AUDIO_DIR, { recursive: true, force: true });
      console.log('Cleaned up temporary audio files.');
    }
    // Keep OUTPUT_DIR for manual inspection if needed, or uncomment to remove:
    // if (fs.existsSync(OUTPUT_DIR)) {
    //   fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
    //   console.log('Cleaned up output directory.');
    // }
  } catch (error) {
    console.error('Error during cleanup:', error.message);
  }

  console.log('Audio Integration Module Tests Finished.');
}

runTests();
