const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Encodes a video from sequential image frames and an optional audio track using FFmpeg.
 *
 * @param {string} framesDirPath - Path to the directory containing sequentially numbered image frames.
 * @param {string|null} audioFilePath - Path to the audio file (e.g., MP3/AAC/WAV) or null for video without audio.
 * @param {string} outputVideoPath - Path where the output video file will be saved.
 * @param {object} [options={}] - Configuration options for video encoding.
 * @param {number} [options.frameRate=30] - Frame rate of the output video in FPS.
 * @param {string|{width: number, height: number}} [options.resolution='1920x1080'] - Target resolution ('WxH' or {width, height}).
 * @param {string} [options.videoBitrate] - Target video bitrate (e.g. '5M', '8000k'). If omitted, CRF is used.
 * @param {number} [options.crf=23] - Constant Rate Factor (0-51). Lower values mean higher quality.
 * @param {string} [options.preset='medium'] - H.264 encoding preset (e.g. 'ultrafast', 'fast', 'medium', 'slow').
 * @param {string} [options.videoCodec='libx264'] - Video codec.
 * @param {string} [options.audioCodec='aac'] - Audio codec.
 * @param {string} [options.audioBitrate='192k'] - Audio bitrate (e.g., '192k', '320k').
 * @param {string} [options.pixelFormat='yuv420p'] - Pixel format for compatibility (default: 'yuv420p').
 * @param {string} [options.framePattern='frame_%05d.png'] - File naming pattern for frames.
 * @param {number} [options.startNumber] - Starting frame number (auto-detected if omitted).
 * @param {boolean} [options.shortest=false] - If true, end video when the shortest input (frames or audio) ends.
 * @param {boolean} [options.overwrite=true] - Overwrite output file if it exists.
 * @param {string[]} [options.extraFfmpegArgs=[]] - Additional arguments to pass to FFmpeg.
 * @param {string} [options.ffmpegPath] - Custom path to ffmpeg binary.
 * @returns {Promise<{outputPath: string}>} A promise that resolves with the output path upon completion.
 */
function encodeVideo(framesDirPath, audioFilePath, outputVideoPath, options = {}) {
    return new Promise((resolve, reject) => {
        let resolvedFramesDirPath = framesDirPath;
        let resolvedAudioFilePath = audioFilePath;
        let resolvedOutputVideoPath = outputVideoPath;
        let resolvedOptions = options || {};

        if (typeof framesDirPath === 'object' && framesDirPath !== null) {
            resolvedFramesDirPath = framesDirPath.framesDirPath || framesDirPath.frameSource;
            resolvedAudioFilePath = framesDirPath.audioFilePath || framesDirPath.audioPath || null;
            resolvedOutputVideoPath = framesDirPath.outputVideoPath || framesDirPath.outputPath;
            resolvedOptions = framesDirPath.options || {};
        }

        if (!resolvedFramesDirPath || typeof resolvedFramesDirPath !== 'string') {
            return reject(new Error('framesDirPath must be a valid directory path string.'));
        }
        if (!fs.existsSync(resolvedFramesDirPath)) {
            return reject(new Error(`Frames directory does not exist: ${resolvedFramesDirPath}`));
        }
        if (!resolvedOutputVideoPath || typeof resolvedOutputVideoPath !== 'string') {
            return reject(new Error('outputVideoPath must be a valid file path string.'));
        }

        const resolvedFramesDir = path.resolve(resolvedFramesDirPath);
        const resolvedOutputPath = path.resolve(resolvedOutputVideoPath);

        // Ensure target directory exists
        const outputDir = path.dirname(resolvedOutputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const {
            frameRate = resolvedOptions.fps || 30,
            resolution = '1920x1080',
            videoBitrate = null,
            crf = 23,
            preset = 'medium',
            videoCodec = 'libx264',
            audioCodec = 'aac',
            audioBitrate = '192k',
            pixelFormat = 'yuv420p',
            framePattern = 'frame_%05d.png',
            startNumber = undefined,
            shortest = false,
            overwrite = true,
            extraFfmpegArgs = [],
            ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg'
        } = resolvedOptions;

        // Auto-detect start number if not provided
        let detectedStartNumber = startNumber;
        if (detectedStartNumber === undefined) {
            try {
                const files = fs.readdirSync(resolvedFramesDir);
                const frameMatches = files
                    .map((file) => {
                        const m = file.match(/^frame_(\d+)\.(png|jpg|jpeg)$/i);
                        return m ? parseInt(m[1], 10) : null;
                    })
                    .filter((n) => n !== null)
                    .sort((a, b) => a - b);

                if (frameMatches.length > 0) {
                    detectedStartNumber = frameMatches[0];
                }
            } catch (err) {
                // If reading fails, ignore and proceed
            }
        }

        const inputImagePattern = path.join(resolvedFramesDir, framePattern);
        const ffmpegArgs = [];

        if (overwrite) {
            ffmpegArgs.push('-y');
        }

        if (detectedStartNumber !== undefined) {
            ffmpegArgs.push('-start_number', String(detectedStartNumber));
        }

        ffmpegArgs.push(
            '-framerate', String(frameRate),
            '-i', inputImagePattern
        );

        let hasAudio = false;
        if (audioFilePath) {
            const resolvedAudioPath = path.resolve(audioFilePath);
            if (!fs.existsSync(resolvedAudioPath)) {
                return reject(new Error(`Audio file does not exist: ${resolvedAudioPath}`));
            }
            ffmpegArgs.push('-i', resolvedAudioPath);
            hasAudio = true;
        }

        ffmpegArgs.push(
            '-c:v', videoCodec,
            '-pix_fmt', pixelFormat,
            '-preset', preset
        );

        if (videoBitrate) {
            ffmpegArgs.push('-b:v', videoBitrate);
        } else {
            ffmpegArgs.push('-crf', String(crf));
        }

        // Resolution parsing
        let formattedResolution = null;
        if (typeof resolution === 'string' && resolution.includes('x')) {
            formattedResolution = resolution.replace('x', ':');
        } else if (typeof resolution === 'object' && resolution.width && resolution.height) {
            formattedResolution = `${resolution.width}:${resolution.height}`;
        }

        if (formattedResolution) {
            ffmpegArgs.push('-vf', `scale=${formattedResolution}`);
        }

        if (hasAudio) {
            ffmpegArgs.push(
                '-c:a', audioCodec,
                '-b:a', audioBitrate
            );
        }

        if (shortest && hasAudio) {
            ffmpegArgs.push('-shortest');
        }

        if (Array.isArray(extraFfmpegArgs) && extraFfmpegArgs.length > 0) {
            ffmpegArgs.push(...extraFfmpegArgs);
        }

        ffmpegArgs.push(resolvedOutputPath);

        console.log(`[VideoEncodingService] Running: ${ffmpegPath} ${ffmpegArgs.join(' ')}`);

        const ffmpegProcess = spawn(ffmpegPath, ffmpegArgs);
        let stderrData = '';
        let stdoutData = '';

        ffmpegProcess.stdout.on('data', (data) => {
            stdoutData += data.toString();
        });

        ffmpegProcess.stderr.on('data', (data) => {
            stderrData += data.toString();
        });

        ffmpegProcess.on('close', (code) => {
            if (code === 0) {
                console.log(`[VideoEncodingService] Successfully encoded video: ${resolvedOutputPath}`);
                resolve({ outputPath: resolvedOutputPath });
            } else {
                console.error(`[VideoEncodingService] FFmpeg failed with exit code ${code}`);
                console.error(stderrData);
                reject(new Error(`FFmpeg exited with code ${code}: ${stderrData.slice(-500)}`));
            }
        });

        ffmpegProcess.on('error', (err) => {
            reject(new Error(`Failed to spawn FFmpeg process (${ffmpegPath}): ${err.message}`));
        });
    });
}

module.exports = {
    encodeVideo
};
