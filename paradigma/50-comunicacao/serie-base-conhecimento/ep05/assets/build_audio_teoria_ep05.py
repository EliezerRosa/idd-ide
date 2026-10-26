"""Gera os áudios e a timeline do Episódio 05 da Base de Conhecimento:
IDD Base de Conhecimento — Ep. 05: O Compilador de Intenções & Intent IR (A Morte do Prompt)
"""

import asyncio
import json
import subprocess
import sys
import tempfile
import wave
from pathlib import Path
import numpy as np
import edge_tts

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

BASE_DIR = Path(r"C:\Antigravity - IDD Refrigeração\motion_graphics_renderer\idd_teoria_ep05_assets")
AUDIO_DIR = BASE_DIR / "audio"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

VOICE_ELIEZER = "pt-BR-AntonioNeural"
VOICE_LEIGO = "pt-BR-FranciscaNeural"

# Roteiro do Episódio 05
SCRIPT_LINES = [
    {
        "index": 0,
        "speaker": "leigo",
        "actor": "Usuária Leiga",
        "voice": VOICE_LEIGO,
        "slide": 1,
        "text": "Eliézer, no episódio anterior nós vimos que a inteligência artificial precisa de um motor simbólico para não alucinar. Mas no dia a dia, a maioria das pessoas ainda tenta controlar a IA escrevendo prompts gigantescos e torcendo para ela acertar. Por que o Prompt Engineering não é engenharia de software de verdade?"
    },
    {
        "index": 1,
        "speaker": "eliezer",
        "actor": "Eliézer Rosa",
        "voice": VOICE_ELIEZER,
        "slide": 1,
        "text": "Porque o chamado Prompt Engineering é uma ilusão empírica! Ficar trocando palavras em um texto solto para ver se o modelo responde melhor é tentativa e erro, não ciência. Pesquisadores de Stanford, como no projeto DSPy, e os maiores especialistas em compiladores já demonstraram: sistemas confiáveis não dependem de prompts manuais, mas de pipelines declarativos e compiladores formais!"
    },
    {
        "index": 2,
        "speaker": "leigo",
        "actor": "Usuária Leiga",
        "voice": VOICE_LEIGO,
        "slide": 2,
        "text": "E é aí que entra uma das invenções mais fascinantes do seu paradigma: a Intent IR, ou Representação Intermediária de Intenção! Veja no Slide dois a semelhança com os compiladores mais avançados do mundo como o LLVM!"
    },
    {
        "index": 3,
        "speaker": "eliezer",
        "actor": "Eliézer Rosa",
        "voice": VOICE_ELIEZER,
        "slide": 2,
        "text": "Exatamente! No compilador tradicional, o C++ ou Rust são traduzidos para uma representação intermediária antes de gerar binário para Intel ou ARM. No IDD, a intenção da usuária leiga é compilada para uma Intent IR: uma árvore sintática abstrata que descreve o negócio com atores, transições e regras matemáticas, totalmente independente de linguagens de programação!"
    },
    {
        "index": 4,
        "speaker": "leigo",
        "actor": "Usuária Leiga",
        "voice": VOICE_LEIGO,
        "slide": 3,
        "text": "Que visão libertadora! No Slide três nós vemos o pipeline determinístico: a Intent IR passa pelas provas de invariantes e só então o compilador emite o código final em TypeScript, Python, SQL ou qualquer outra linguagem que a empresa desejar!"
    },
    {
        "index": 5,
        "speaker": "eliezer",
        "actor": "Eliézer Rosa",
        "voice": VOICE_ELIEZER,
        "slide": 3,
        "text": "Com certeza! Se a moda de frameworks mudar daqui a três anos, a sua empresa não precisa reescrever o sistema do zero. A Intent IR é o verdadeiro patrimônio tecnológico perpétuo do cliente. O código-fonte gerado é apenas um artefato transitório e descartável de compilação!"
    },
    {
        "index": 6,
        "speaker": "leigo",
        "actor": "Usuária Leiga",
        "voice": VOICE_LEIGO,
        "slide": 4,
        "text": "Isso sepulta a ideia de ficar digitando sintaxe manual! E no próximo episódio, o zero seis, nós vamos mergulhar na matemática das Invariantes Formais e no Raciocínio Automatizado que gigantes como Amazon AWS e Microsoft utilizam em sistemas de missão crítica!"
    },
    {
        "index": 7,
        "speaker": "eliezer",
        "actor": "Eliézer Rosa",
        "voice": VOICE_ELIEZER,
        "slide": 4,
        "text": "Fantástico! O futuro do software pertence a quem domina a intenção formal. Continue acompanhando a nossa série e descubra como construir sistemas matematicamente inquebráveis!"
    }
]

async def gen_tts_file(text: str, voice: str, out_wav: Path):
    communicate = edge_tts.Communicate(text, voice)
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
        tmp_path = Path(tmp.name)
    try:
        await communicate.save(str(tmp_path))
        res = subprocess.run([
            "ffmpeg", "-y", "-i", str(tmp_path),
            "-ar", "48000", "-ac", "1", str(out_wav)
        ], capture_output=True)
        if res.returncode != 0:
            raise RuntimeError(res.stderr.decode("utf-8", errors="replace"))
    finally:
        if tmp_path.exists():
            tmp_path.unlink()

def get_wav_duration(p: Path) -> float:
    with wave.open(str(p), "rb") as w:
        frames = w.getnframes()
        rate = w.getframerate()
        return frames / float(rate)

async def build_episode():
    print("=" * 70)
    print("🎙️ GERANDO ÁUDIOS E TIMELINE DO EP. 05 (COMPILADOR DE INTENÇÕES & INTENT IR)")
    print("=" * 70)

    timeline_items = []
    current_time = 0.5
    gap_between_speakers = 0.65

    for item in SCRIPT_LINES:
        idx = item["index"]
        wav_filename = f"seg_{idx:02d}_{item['speaker']}.wav"
        wav_path = AUDIO_DIR / wav_filename
        
        print(f"Gerando voz [{item['speaker']}]: {item['text'][:60]}...")
        await gen_tts_file(item["text"], item["voice"], wav_path)
        
        dur = get_wav_duration(wav_path)
        end_time = current_time + dur

        timeline_items.append({
            "index": idx,
            "id": f"seg_{idx:02d}_{item['speaker']}",
            "who": item["speaker"],
            "actor": item["actor"],
            "avatar": item["speaker"],
            "slide": item["slide"],
            "text": item["text"],
            "wav": str(wav_path),
            "startSec": round(current_time, 3),
            "durSec": round(dur, 3),
            "endSec": round(end_time, 3)
        })

        current_time = end_time + gap_between_speakers

    total_duration = current_time + 1.5
    print(f"\n[OK] Todas as vozes geradas! Duração total: {total_duration:.2f}s (~{(total_duration/60):.1f} min)")

    timeline_data = {
        "projectName": "IDD_Base_Conhecimento_Ep05",
        "totalDurationSec": round(total_duration, 2),
        "items": timeline_items
    }

    timeline_file = BASE_DIR / "video_ep05_timeline.json"
    with open(timeline_file, "w", encoding="utf-8") as f:
        json.dump(timeline_data, f, indent=2, ensure_ascii=False)
    print(f"[OK] Timeline salva em: {timeline_file}")

    # Montar master soundtrack com música sutil de fundo
    print("\n[Mixagem Master] Criando master_soundtrack_video_ep05.wav...")
    SR = 48000
    TOTAL_SAMPLES = int(total_duration * SR)
    master_track = np.zeros((TOTAL_SAMPLES, 2), dtype=np.float32)

    for it in timeline_items:
        w_path = Path(it["wav"])
        with wave.open(str(w_path), "rb") as w:
            n_frames = w.getnframes()
            data = np.frombuffer(w.readframes(n_frames), dtype=np.int16).astype(np.float32) / 32768.0
        
        s = int(it["startSec"] * SR)
        e = min(TOTAL_SAMPLES, s + len(data))
        seg_len = e - s
        master_track[s:e, 0] += data[:seg_len] * 0.95
        master_track[s:e, 1] += data[:seg_len] * 0.95

    # Trilha ambiente suave
    t = np.linspace(0, total_duration, TOTAL_SAMPLES, endpoint=False)
    ambiance = (
        np.sin(2 * np.pi * 110 * t) * 0.012 +
        np.sin(2 * np.pi * 220 * t) * 0.008 +
        np.sin(2 * np.pi * 330 * t) * 0.005
    )
    fade_s = int(2.0 * SR)
    fade_in = np.linspace(0, 1, fade_s)
    fade_out = np.linspace(1, 0, fade_s)
    ambiance[:fade_s] *= fade_in
    ambiance[-fade_s:] *= fade_out

    master_track[:, 0] += ambiance
    master_track[:, 1] += ambiance

    master_int16 = np.clip(master_track * 32767, -32768, 32767).astype(np.int16)
    master_wav_file = BASE_DIR / "master_soundtrack_video_ep05.wav"
    with wave.open(str(master_wav_file), "wb") as out_w:
        out_w.setnchannels(2)
        out_w.setsampwidth(2)
        out_w.setframerate(SR)
        out_w.writeframes(master_int16.tobytes())

    print(f"[OK] Master Soundtrack criada com sucesso: {master_wav_file.name} ({master_wav_file.stat().st_size / (1024*1024):.1f} MB)")

if __name__ == "__main__":
    asyncio.run(build_episode())
