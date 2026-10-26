const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Módulo de Decomposição e Processamento Acústico
 * Decompõe vídeos em seus elementos fundamentais (vídeo, áudio, metadados)
 * e aplica filtragem espectral calibrada para remoção de ruído de ventoinha/cooler.
 */
class VideoDecomposer {
  constructor(workDir = path.join(process.cwd(), 'studio_temp')) {
    this.workDir = path.resolve(workDir);
    if (!fs.existsSync(this.workDir)) {
      fs.mkdirSync(this.workDir, { recursive: true });
    }
  }

  /**
   * Extrai metadados completos de qualquer vídeo usando ffprobe.
   */
  async probeVideo(videoPath) {
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Vídeo não encontrado: ${videoPath}`);
    }

    return new Promise((resolve, reject) => {
      const args = [
        '-v', 'error',
        '-show_entries', 'format=duration,size,bit_rate:stream=index,codec_name,codec_type,width,height,r_frame_rate,duration,sample_rate,channels',
        '-of', 'json',
        videoPath
      ];

      const proc = spawn('ffprobe', args);
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (d) => stdout += d.toString());
      proc.stderr.on('data', (d) => stderr += d.toString());

      proc.on('close', (code) => {
        if (code === 0) {
          try {
            const data = JSON.parse(stdout);
            const videoStream = data.streams.find((s) => s.codec_type === 'video') || {};
            const audioStream = data.streams.find((s) => s.codec_type === 'audio') || {};

            let fps = 30;
            if (videoStream.r_frame_rate) {
              const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
              if (den > 0) fps = Math.round(num / den);
            }

            resolve({
              durationSec: parseFloat(data.format.duration || videoStream.duration || 0),
              sizeBytes: parseInt(data.format.size || 0, 10),
              width: videoStream.width || 1920,
              height: videoStream.height || 1080,
              fps,
              videoCodec: videoStream.codec_name || 'h264',
              audioCodec: audioStream.codec_name || 'aac',
              sampleRate: parseInt(audioStream.sample_rate || 48000, 10),
              channels: audioStream.channels || 2
            });
          } catch (e) {
            reject(new Error(`Falha ao interpretar metadados do ffprobe: ${e.message}`));
          }
        } else {
          reject(new Error(`ffprobe falhou (code ${code}): ${stderr}`));
        }
      });

      proc.on('error', (err) => reject(new Error(`ffprobe não executável: ${err.message}`)));
    });
  }

  /**
   * Extrai a faixa de áudio de um vídeo para um arquivo WAV ou AAC independente.
   */
  async extractAudio(videoPath, outputAudioPath, onProgress) {
    if (onProgress) onProgress('Extraindo faixa de áudio original do vídeo...');

    return new Promise((resolve, reject) => {
      const args = [
        '-y',
        '-i', videoPath,
        '-vn',
        '-c:a', 'pcm_s16le',
        '-ar', '48000',
        '-ac', '2',
        outputAudioPath
      ];

      const proc = spawn('ffmpeg', args);
      proc.on('close', (code) => {
        if (code === 0) {
          if (onProgress) onProgress('Áudio extraído com sucesso.');
          resolve(outputAudioPath);
        } else {
          reject(new Error(`Falha ao extrair áudio (code ${code})`));
        }
      });
      proc.on('error', reject);
    });
  }

  /**
   * Elimina ruído de ventoinha/cooler de notebook usando filtros espectrais avançados:
   * 1. highpass=f=85 (corta vibração mecânica subsônica de baixa frequência do cooler)
   * 2. afftdn (Adaptive FFT Noise Reduction: remove o chiado de ar contínuo e zumbido)
   * 3. loudnorm (Normalização profissional para -14 LUFS)
   */
  async denoiseCoolerFan(inputAudioPath, outputAudioPath, options = {}, onProgress) {
    const {
      noiseReductionDb = 20,   // Força de redução de ruído (10 a 30 dB)
      noiseFloorDb = -38,       // Piso de ruído (-45 a -30 dB)
      highpassFreq = 85,        // Corte de frequência grave da ventoinha em Hz
      normalize = true
    } = options;

    if (onProgress) onProgress(`Aplicando filtro acústico de ventoinha/cooler (HighPass: ${highpassFreq}Hz, AFFTDN: ${noiseReductionDb}dB)...`);

    let audioFilter = `highpass=f=${highpassFreq},afftdn=nr=${noiseReductionDb}:nf=${noiseFloorDb}:tn=1`;
    if (normalize) {
      audioFilter += ',loudnorm=I=-14:TP=-1.5:LRA=11';
    }

    return new Promise((resolve, reject) => {
      const args = [
        '-y',
        '-i', inputAudioPath,
        '-af', audioFilter,
        '-c:a', 'aac',
        '-b:a', '192k',
        outputAudioPath
      ];

      const proc = spawn('ffmpeg', args);
      let stderr = '';

      proc.stderr.on('data', (d) => {
        stderr += d.toString();
        // Pode emitir percentuais se desejado
      });

      proc.on('close', (code) => {
        if (code === 0) {
          if (onProgress) onProgress('Áudio limpo: ruído de cooler eliminado e volume normalizado.');
          resolve(outputAudioPath);
        } else {
          reject(new Error(`Falha no filtro de ruído (code ${code}): ${stderr.slice(-300)}`));
        }
      });
      proc.on('error', reject);
    });
  }

  /**
   * Remuxa o vídeo com a nova faixa de áudio limpa de forma ultrarrápida (Stream copy de vídeo).
   */
  async remuxVideoWithCleanAudio(originalVideoPath, cleanAudioPath, outputVideoPath, onProgress) {
    if (onProgress) onProgress('Remuxando vídeo com a nova trilha de áudio tratada (sem perda de imagem)...');

    return new Promise((resolve, reject) => {
      const args = [
        '-y',
        '-i', originalVideoPath,
        '-i', cleanAudioPath,
        '-map', '0:v:0',
        '-map', '1:a:0',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-movflags', '+faststart',
        '-shortest',
        outputVideoPath
      ];

      const proc = spawn('ffmpeg', args);
      proc.on('close', (code) => {
        if (code === 0) {
          if (onProgress) onProgress('Remux concluído com sucesso!');
          resolve(outputVideoPath);
        } else {
          reject(new Error(`Falha ao remuxar vídeo (code ${code})`));
        }
      });
      proc.on('error', reject);
    });
  }

  /**
   * Executa a decomposição completa e preparação para o pipeline de motion graphics.
   */
  async decomposeAndClean(videoPath, options = {}, onProgress) {
    const meta = await this.probeVideo(videoPath);
    if (onProgress) onProgress(`Vídeo detectado: ${meta.width}x${meta.height} @ ${meta.fps}fps, Duração: ${meta.durationSec.toFixed(1)}s`);

    const sessionId = Date.now();
    const rawAudio = path.join(this.workDir, `raw_audio_${sessionId}.wav`);
    const cleanAudio = path.join(this.workDir, `clean_audio_${sessionId}.aac`);

    // 1. Extração
    await this.extractAudio(videoPath, rawAudio, onProgress);

    // 2. Limpeza de ruído
    await this.denoiseCoolerFan(rawAudio, cleanAudio, options, onProgress);

    // Remove WAV bruto para economizar espaço
    if (fs.existsSync(rawAudio)) {
      try { fs.unlinkSync(rawAudio); } catch (e) {}
    }

    return {
      metadata: meta,
      cleanAudioPath: cleanAudio,
      sessionId
    };
  }
}

module.exports = {
  VideoDecomposer
};
