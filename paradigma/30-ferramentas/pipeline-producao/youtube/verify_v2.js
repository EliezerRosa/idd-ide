const { execSync } = require('child_process');
const fs = require('fs');

const outDir = 'C:/Antigravity - IDD Refrigeração/producao_yt/inspect_sync_v2';
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const points = [
  { s: 1, label: '001s_start' },
  { s: 15, label: '015s_seg1_eliezer' },
  { s: 35, label: '035s_seg2_leigo' },
  { s: 57, label: '057s_slide2_leigo' },
  { s: 113, label: '113s_slide3_ia_msg1' },
  { s: 131, label: '131s_slide3_eliezer_msg2' },
  { s: 143, label: '143s_slide3_ia_msg3' },
  { s: 187, label: '187s_slide4_leigo' },
  { s: 200, label: '200s_slide4_eliezer_closing' },
  { s: 210, label: '210s_end' }
];

const vidPath = 'C:/Antigravity - IDD Refrigeração/producao_yt/IDD_Refrigeracao_Novo_Episodio_1.mp4';
for (const p of points) {
  const file = `${outDir}/${p.label}.jpg`;
  execSync(`ffmpeg -y -ss ${p.s} -i "${vidPath}" -vframes 1 -q:v 2 "${file}"`, { stdio: 'ignore' });
  console.log(`Frame at ${p.s}s -> ${file} (${fs.statSync(file).size} bytes)`);
}
