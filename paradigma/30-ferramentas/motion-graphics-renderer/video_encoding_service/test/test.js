const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { encodeVideo } = require('../index.js');

const TEST_DIR = path.join(__dirname, 'temp_test');
const FRAMES_DIR = path.join(TEST_DIR, 'frames');
const OUTPUT_DIR = path.join(TEST_DIR, 'output');
const AUDIO_PATH = path.join(TEST_DIR, 'test_audio.mp3');

function setupTestEnvironment() {
    if (fs.existsSync(TEST_DIR)) {
        fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(FRAMES_DIR, { recursive: true });
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    console.log('Generating dummy test frames...');
    // Generate 15 frames at 10 fps using ffmpeg testsrc (1.5 seconds)
    const frameCmd = `ffmpeg -y -f lavfi -i testsrc=duration=1.5:size=320x240:rate=10 "${path.join(FRAMES_DIR, 'frame_%05d.png')}"`;
    execSync(frameCmd, { stdio: 'pipe' });

    console.log('Generating dummy audio track...');
    // Generate 1.5 seconds sine wave test audio
    const audioCmd = `ffmpeg -y -f lavfi -i "sine=frequency=440:duration=1.5" -c:a libmp3lame "${AUDIO_PATH}"`;
    execSync(audioCmd, { stdio: 'pipe' });

    console.log('Test environment setup complete.');
}

function cleanupTestEnvironment() {
    console.log('Cleaning up temporary test files...');
    if (fs.existsSync(TEST_DIR)) {
        fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    console.log('Cleanup complete.');
}

async function runTests() {
    console.log('=== Starting Video Encoding Module Tests ===\n');

    try {
        setupTestEnvironment();

        // Test 1: Basic Video Encoding (Default parameters)
        console.log('--- Test 1: Basic video encoding with default parameters ---');
        const outputVideo1 = path.join(OUTPUT_DIR, 'test_output_default.mp4');
        const result1 = await encodeVideo(FRAMES_DIR, AUDIO_PATH, outputVideo1, {
            frameRate: 10,
            resolution: '320x240'
        });

        if (fs.existsSync(outputVideo1) && fs.statSync(outputVideo1).size > 0) {
            console.log(`[PASS] Test 1: Video successfully created at ${result1.outputPath} (Size: ${fs.statSync(outputVideo1).size} bytes)`);
        } else {
            throw new Error('Test 1 failed: Output file missing or empty.');
        }

        // Test 2: Configurable Parameters (Bitrate, Resolution scaling, Custom Preset, CRF)
        console.log('\n--- Test 2: Video encoding with custom parameters ---');
        const outputVideo2 = path.join(OUTPUT_DIR, 'test_output_custom.mp4');
        const result2 = await encodeVideo(FRAMES_DIR, AUDIO_PATH, outputVideo2, {
            frameRate: 10,
            resolution: '640x480',
            videoBitrate: '1M',
            preset: 'fast',
            audioBitrate: '128k',
            overwrite: true
        });

        if (fs.existsSync(outputVideo2) && fs.statSync(outputVideo2).size > 0) {
            console.log(`[PASS] Test 2: Video with custom parameters created at ${result2.outputPath} (Size: ${fs.statSync(outputVideo2).size} bytes)`);
        } else {
            throw new Error('Test 2 failed: Custom output file missing or empty.');
        }

        // Test 3: Validation / Error Handling - Non-existent frames directory
        console.log('\n--- Test 3: Error handling - Missing frames directory ---');
        try {
            await encodeVideo('non_existent_frames_dir_12345', AUDIO_PATH, path.join(OUTPUT_DIR, 'should_fail.mp4'));
            throw new Error('Test 3 failed: Expected error for missing frames directory.');
        } catch (err) {
            if (err.message.includes('Frames directory does not exist')) {
                console.log(`[PASS] Test 3: Correctly caught expected error: ${err.message}`);
            } else {
                throw err;
            }
        }

        // Test 4: Validation / Error Handling - Missing audio file
        console.log('\n--- Test 4: Error handling - Missing audio file ---');
        try {
            await encodeVideo(FRAMES_DIR, 'non_existent_audio.mp3', path.join(OUTPUT_DIR, 'should_fail.mp4'));
            throw new Error('Test 4 failed: Expected error for missing audio file.');
        } catch (err) {
            if (err.message.includes('Audio file does not exist')) {
                console.log(`[PASS] Test 4: Correctly caught expected error: ${err.message}`);
            } else {
                throw err;
            }
        }

        console.log('\n=== All Video Encoding Module Tests PASSED Successfully! ===');
    } catch (error) {
        console.error('\n[FAIL] Test suite encountered an error:', error);
        process.exitCode = 1;
    } finally {
        cleanupTestEnvironment();
    }
}

runTests();
