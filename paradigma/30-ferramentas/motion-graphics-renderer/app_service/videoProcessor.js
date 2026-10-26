const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const { AntonioVoiceService } = require('./antonioVoiceService.js');
const { AIIntegrationService } = require('./aiIntegrationService.js');
const { ElevenLabsService } = require('../audio_service/elevenLabsService.js');
const { WebResearchService } = require('./webResearchService.js');

ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH || 'ffmpeg');
ffmpeg.setFfprobePath(process.env.FFPROBE_PATH || 'ffprobe');

/**
 * Video Processor Service (Video Path Mode with Prompt & Web/YouTube Research)
 * Accepts a video file path, optional prompt, and optional source URLs/YouTube channels,
 * queries public sources via free AI APIs to gather context, and generates high-quality neural voiceover.
 */
class VideoProcessor {
  constructor(options = {}) {
    this.outputDir = options.outputDir || path.join(process.cwd(), 'temp_video_processor');
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
    this.antonioService = new AntonioVoiceService({ outputDir: path.join(this.outputDir, 'antonio_audio') });
    this.aiService = new AIIntegrationService();
    this.elevenLabsService = new ElevenLabsService({ outputDir: path.join(this.outputDir, 'elevenlabs_audio') });
    this.researchService = new WebResearchService();
    this.useElevenLabs = options.useElevenLabs || process.env.USE_ELEVENLABS === 'true';
    this.useGroqAI = options.useGroqAI !== false;
  }

  /**
   * Processes input video file along with optional prompt and source URLs: extracts duration, researches web/YouTube context, generates neural voiceover schedule.
   * 
   * @param {string} videoPath Path to input video
   * @param {string} [prompt=''] Optional prompt for context and refinement
   * @param {Array<string>} [sourceUrls=[]] Optional public websites or YouTube channels to research
   * @returns {Promise<Object>} Object containing durationSec and audioSchedule
   */
  async processVideo(videoPath, prompt = '', sourceUrls = []) {
    const absoluteVideoPath = path.resolve(videoPath);
    if (!fs.existsSync(absoluteVideoPath)) {
      throw new Error(`Video file not found at: ${absoluteVideoPath}`);
    }

    console.log(`[VideoProcessor] Analyzing input video: ${absoluteVideoPath} with prompt: "${prompt}"`);

    // 1. Probe video duration and streams using ffprobe
    const videoMetadata = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(absoluteVideoPath, (err, metadata) => {
        if (err) {
          reject(new Error(`Failed to probe video: ${err.message}`));
        } else {
          resolve(metadata);
        }
      });
    });

    const durationSec = videoMetadata.format && videoMetadata.format.duration ? parseFloat(videoMetadata.format.duration) : 5.0;
    console.log(`[VideoProcessor] Video duration detected: ${durationSec.toFixed(2)}s`);

    // 2. Conduct Web & YouTube Research if prompt or URLs provided
    let researchData = null;
    if (prompt || (sourceUrls && sourceUrls.length > 0)) {
      try {
        researchData = await this.researchService.researchTopic(prompt || 'Refrigeração IDD Otimização', sourceUrls);
        console.log(`[VideoProcessor] Research data gathered successfully. Sources analyzed: ${researchData.sourcesAnalyzed}`);
      } catch (err) {
        console.warn('[VideoProcessor] Web research warning:', err.message);
      }
    }

    // 3. Extract or load transcription/script segments using AI Integration Service
    let transcriptSegments = [];
    if (this.useGroqAI) {
      try {
        const enrichedPrompt = `${prompt || 'Análise de vídeo de refrigeração'} ${researchData ? 'Contexto: ' + researchData.synthesis : ''}`;
        const aiScript = await this.aiService.generateLongFormScript(enrichedPrompt, durationSec);
        if (aiScript && Array.isArray(aiScript.segments)) {
          transcriptSegments = aiScript.segments;
        }
      } catch (err) {
        console.warn('[VideoProcessor] AI script generation fallback:', err.message);
      }
    }

    if (transcriptSegments.length === 0) {
      const defaultTranscriptPath = path.resolve(process.cwd(), 'producao_yt/transcricao_small.json');
      if (fs.existsSync(defaultTranscriptPath)) {
        try {
          const raw = fs.readFileSync(defaultTranscriptPath, 'utf8');
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            transcriptSegments = parsed.slice(0, 3).map((item, idx) => ({
              id: idx + 1,
              start: item.start || (idx * 2),
              duration: item.duration || 2.5,
              text: item.text || `Segmento ${idx + 1} de refrigeração e climatização IDD.`
            }));
          }
        } catch (e) {
          console.warn('[VideoProcessor] Could not parse default transcription, using generated script segments.');
        }
      }
    }

    if (transcriptSegments.length === 0) {
      // Fallback script segments
      transcriptSegments = [
        { id: 1, start: 0.0, duration: Math.min(3.0, durationSec * 0.3), text: 'Bem-vindo ao sistema de refrigeração IDD com Inteligência Artificial.' },
        { id: 2, start: Math.min(3.0, durationSec * 0.3), duration: Math.min(3.0, durationSec * 0.4), text: 'Governando intenções e gerando código de alta qualidade.' },
        { id: 3, start: Math.min(6.0, durationSec * 0.7), duration: Math.max(1.0, durationSec - Math.min(6.0, durationSec * 0.7)), text: 'Execução e codificação automatizada em tempo real.' }
      ];
    }

    console.log(`[VideoProcessor] Generating neural voiceover for ${transcriptSegments.length} segments...`);

    // 4. Generate neural voice for each segment (ElevenLabs or Antonio)
    const audioSchedule = [];
    let currentTime = 0;
    for (const seg of transcriptSegments) {
      const segDuration = Math.max(1.5, seg.duration || 2.5);
      let audioResult;
      
      if (this.useElevenLabs) {
        try {
          audioResult = await this.elevenLabsService.generateSegmentAudio(seg.text, segDuration, `seg_${seg.id}`);
        } catch (e) {
          audioResult = await this.antonioService.generateSegmentAudio(seg.text, segDuration, `v_seg_${seg.id}`);
        }
      } else {
        audioResult = await this.antonioService.generateSegmentAudio(seg.text, segDuration, `v_seg_${seg.id}`);
      }
      
      audioSchedule.push({
        path: audioResult.path,
        start: currentTime,
        duration: segDuration,
        text: seg.text,
        voice: this.useElevenLabs ? 'ElevenLabs-Neural' : 'pt-BR-AntonioNeural'
      });

      currentTime += segDuration;
    }

    // Ensure total duration matches or covers video duration
    const finalDuration = Math.max(durationSec, currentTime);

    return {
      durationSec: finalDuration,
      research: researchData,
      audioSchedule
    };
  }
}

module.exports = {
  VideoProcessor
};
