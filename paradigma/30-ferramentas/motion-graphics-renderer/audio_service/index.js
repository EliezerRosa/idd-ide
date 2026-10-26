const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH || 'ffmpeg');
ffmpeg.setFfprobePath(process.env.FFPROBE_PATH || 'ffprobe');

/**
 * Combines multiple audio segments into a single audio file, padding with silence as needed.
 * Uses native FFmpeg audio filter graph (anullsrc + concat) for robust, gap-perfect audio assembly.
 *
 * @param {Array<Object>} audioSchedule - An array of audio segment objects:
 *   - `path`: The absolute path to the audio file.
 *   - `start`: The scheduled start time of the segment in seconds (relative to the final track).
 *   - `duration`: The duration of the segment in seconds.
 * @param {string} outputPath - The absolute path for the consolidated output audio file.
 * @param {number} totalDuration - The total duration of the final audio track in seconds.
 * @returns {Promise<string>} Resolves with outputPath on success.
 */
async function consolidateAudioTracks(audioSchedule, outputPath, totalDuration) {
  if (!audioSchedule || audioSchedule.length === 0) {
    throw new Error('Audio schedule cannot be empty.');
  }
  if (!outputPath) {
    throw new Error('Output path is required.');
  }
  if (typeof totalDuration !== 'number' || totalDuration <= 0) {
    throw new Error('Total duration must be a positive number.');
  }

  // Filter existing files and sort chronologically
  const validSchedule = audioSchedule
    .filter((seg) => {
      const fullPath = path.resolve(seg.path);
      const exists = fs.existsSync(fullPath);
      if (!exists) {
        console.warn(`Warning: Audio file not found: ${fullPath}. Skipping segment.`);
      }
      return exists;
    })
    .sort((a, b) => a.start - b.start);

  if (validSchedule.length === 0) {
    throw new Error('No valid audio inputs found after processing schedule.');
  }

  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log(`Consolidating audio tracks to: ${outputPath} with total duration: ${totalDuration.toFixed(2)}s`);

  return new Promise((resolve, reject) => {
    const command = ffmpeg();
    const complexFilter = [];
    const concatStreams = [];
    let lastEndTime = 0;
    let silenceCount = 0;

    // Add valid audio inputs to ffmpeg
    validSchedule.forEach((seg, inputIdx) => {
      command.input(path.resolve(seg.path));

      // If gap before this segment, create silence filter
      if (seg.start > lastEndTime) {
        const gap = seg.start - lastEndTime;
        if (gap > 0.001) {
          const sLabel = `s${silenceCount++}`;
          complexFilter.push({
            filter: 'anullsrc',
            options: { r: 48000, cl: 'stereo', d: gap },
            outputs: sLabel,
          });
          concatStreams.push(sLabel);
          console.log(`Added ${gap.toFixed(2)}s silence from ${lastEndTime.toFixed(2)}s`);
        }
      }

      // Add audio input stream
      concatStreams.push(`${inputIdx}:a`);
      console.log(`Added audio segment: ${seg.path} at ${seg.start.toFixed(2)}s for ${seg.duration.toFixed(2)}s`);
      lastEndTime = seg.start + seg.duration;
    });

    // Check if trailing silence is needed
    if (lastEndTime < totalDuration) {
      const trailingGap = totalDuration - lastEndTime;
      if (trailingGap > 0.001) {
        const sLabel = `s${silenceCount++}`;
        complexFilter.push({
          filter: 'anullsrc',
          options: { r: 48000, cl: 'stereo', d: trailingGap },
          outputs: sLabel,
        });
        concatStreams.push(sLabel);
        console.log(`Added ${trailingGap.toFixed(2)}s silence to reach total duration ${totalDuration.toFixed(2)}s`);
      }
    }

    // Add concat filter
    complexFilter.push({
      filter: 'concat',
      options: { n: concatStreams.length, v: 0, a: 1 },
      inputs: concatStreams,
      outputs: 'out_audio',
    });

    command.complexFilter(complexFilter, 'out_audio');

    // Codec by extension
    const ext = path.extname(outputPath).toLowerCase();
    if (ext === '.mp3') {
      command.audioCodec('libmp3lame').audioBitrate(192);
    } else if (ext === '.aac' || ext === '.m4a') {
      command.audioCodec('aac').audioBitrate(192);
    } else if (ext === '.wav') {
      command.audioCodec('pcm_s16le');
    }

    command
      .output(outputPath)
      .on('end', () => {
        console.log('Audio consolidation finished.');
        resolve(outputPath);
      })
      .on('error', (err, stdout, stderr) => {
        console.error('Error during audio consolidation:', err.message);
        if (stdout) console.error('FFmpeg stdout:', stdout);
        if (stderr) console.error('FFmpeg stderr:', stderr);
        reject(new Error(`Audio consolidation failed: ${err.message}`));
      })
      .run();
  });
}

module.exports = {
  consolidateAudioTracks,
};
