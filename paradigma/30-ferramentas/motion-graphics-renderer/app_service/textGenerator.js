const path = require('path');
const fs = require('fs');
const { AntonioVoiceService } = require('./antonioVoiceService.js');
const { AIIntegrationService } = require('./aiIntegrationService.js');
const { ElevenLabsService } = require('../audio_service/elevenLabsService.js');
const { WebResearchService } = require('./webResearchService.js');

/**
 * Text Prompt Generator Service (Up to 30 Minutes Long-Form Video Mode with Web & YouTube Research)
 * Accepts a text prompt and optional source URLs/YouTube channels, queries public material via free AI APIs,
 * and generates structured multi-chapter scripts with synchronized neural voiceover.
 */
class TextPromptGenerator {
  constructor(options = {}) {
    this.outputDir = options.outputDir || path.join(process.cwd(), 'temp_text_generator');
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
    this.antonioService = new AntonioVoiceService({ outputDir: path.join(this.outputDir, 'antonio_audio') });
    this.aiService = new AIIntegrationService();
    this.elevenLabsService = new ElevenLabsService({ outputDir: path.join(this.outputDir, 'elevenlabs_audio') });
    this.researchService = new WebResearchService();
    this.useElevenLabs = process.env.USE_ELEVENLABS === 'true';
  }

  /**
   * Generates long-form script segments and audio schedule from a text prompt and optional source URLs.
   * 
   * @param {string} prompt Text prompt input
   * @param {number} [durationSec=1800] Desired total duration in seconds (defaults to 30 minutes / 1800s)
   * @param {Array<string>} [sourceUrls=[]] Optional public websites or YouTube channel URLs to research
   * @returns {Promise<Object>} Object containing durationSec, script, and audioSchedule
   */
  async generateFromPrompt(prompt, durationSec = 1800, sourceUrls = []) {
    const targetDuration = Math.min(1800, Math.max(10, durationSec));
    console.log(`[TextPromptGenerator] Processing prompt with web/YouTube research for ${targetDuration}s: "${prompt}"`);

    // 1. Conduct Web & YouTube Research using free AI APIs
    const researchData = await this.researchService.researchTopic(prompt, sourceUrls);
    console.log(`[TextPromptGenerator] Research synthesized. Sources analyzed: ${researchData.sourcesAnalyzed}`);

    // 2. Generate multi-chapter script incorporating research synthesis
    const enrichedPrompt = `${prompt}\nContext from research: ${researchData.synthesis}`;
    const longScript = await this.aiService.generateLongFormScript(enrichedPrompt, targetDuration);
    const scriptSegments = longScript.segments || [];

    console.log(`[TextPromptGenerator] Generated ${scriptSegments.length} script segments. Synthesizing audio...`);

    // 3. Generate neural audio for each script segment
    const audioSchedule = [];
    let currentTime = 0;
    for (const seg of scriptSegments) {
      const segDuration = Math.max(1.5, seg.duration || 3.0);
      let audioResult;

      if (this.useElevenLabs) {
        try {
          audioResult = await this.elevenLabsService.generateSegmentAudio(seg.text, segDuration, `prompt_seg_${seg.id}`);
        } catch (e) {
          audioResult = await this.antonioService.generateSegmentAudio(seg.text, segDuration, `p_seg_${seg.id}`);
        }
      } else {
        audioResult = await this.antonioService.generateSegmentAudio(seg.text, segDuration, `p_seg_${seg.id}`);
      }

      audioSchedule.push({
        path: audioResult.path,
        start: parseFloat(currentTime.toFixed(2)),
        duration: segDuration,
        text: seg.text,
        chapter: seg.chapter || 'Masterclass IDD',
        voice: this.useElevenLabs ? 'ElevenLabs-Neural' : 'pt-BR-AntonioNeural'
      });

      currentTime += segDuration;
    }

    return {
      durationSec: Math.max(targetDuration, currentTime),
      script: scriptSegments,
      research: researchData,
      audioSchedule
    };
  }
}

module.exports = {
  TextPromptGenerator
};
