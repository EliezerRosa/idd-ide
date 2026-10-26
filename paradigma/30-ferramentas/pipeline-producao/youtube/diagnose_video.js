const { execSync } = require('child_process');
const fs = require('fs');

console.log('--- DIAGNÓSTICO DO VÍDEO 1 ---');
// 1. Extrair frames dos primeiros 15s (0s, 1s, 2s, 3s, 5s, 10s, 14s, 15s, 35s, 57s, 113s, 131s, 143s, 158s, 169s, 187s, 198s, 211s)
const timestamps = [1, 3, 5, 10, 14, 15, 35, 57, 112, 113, 130, 142, 157, 168, 187, 198, 211];
const outDir = 'C:/Antigravity - IDD Refrigeração/producao_yt/diag_frames';
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

for (const t of timestamps) {
  const outPath = `${outDir}/frame_${String(t).padStart(3, '0')}s.jpg`;
  try {
    execSync(`ffmpeg -y -ss ${t} -i "C:/Antigravity - IDD Refrigeração/producao_yt/IDD_Refrigeracao_Novo_Episodio_1.mp4" -vframes 1 -q:v 2 "${outPath}"`, { stdio: 'ignore' });
    const size = fs.statSync(outPath).size;
    console.log(`Frame at ${t}s -> ${outPath} (${size} bytes)`);
  } catch (e) {
    console.error(`Error at ${t}s:`, e.message);
  }
}
