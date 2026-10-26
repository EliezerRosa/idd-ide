"""Gera os áudios e a timeline do Episódio 06 da Base de Conhecimento:
IDD Base de Conhecimento — Ep. 06: A Teoria das Invariantes Formais & Raciocínio Automatizado
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

BASE_DIR = Path(r"C:\Antigravity - IDD Refrigeração\motion_graphics_renderer\idd_teoria_ep06_assets")
AUDIO_DIR = BASE_DIR / "audio"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

VOICE_ELIEZER = "pt-BR-AntonioNeural"
VOICE_LEIGO = "pt-BR-FranciscaNeural"

# Roteiro do Episódio 06
SCRIPT_LINES = [
    {
        "index": 0,
        "speaker": "leigo",
        "actor": "Usuária Leiga",
        "voice": VOICE_LEIGO,
        "slide": 1,
        "text": "Eliézer, no desenvolvimento tradicional todo mundo se apoia em testes unitários para garantir que o código funciona. Mas na era da inteligência artificial, por que gigantes como Amazon AWS e Microsoft afirmam que apenas escrever testes unitários comuns não é mais suficiente?"
    },
    {
        "index": 1,
        "speaker": "eliezer",
        "actor": "Eliézer Rosa",
        "voice": VOICE_ELIEZER,
        "slide": 1,
        "text": "Porque testes unitários convencionais testam apenas os poucos exemplos que o programador lembrou de escrever! Se a IA gerar um código com um caminho não previsto, o teste passa em silêncio e o sistema quebra em produção. Para sistemas de missão crítica, a ciência da computação moderna exige Raciocínio Automatizado e Provas Formais!"
    },
    {
        "index": 2,
        "speaker": "leigo",
        "actor": "Usuária Leiga",
        "voice": VOICE_LEIGO,
        "slide": 2,
        "text": "E isso nos leva diretamente ao coração do IDD: a Teoria das Invariantes Formais! Veja no Slide dois como isso se conecta aos provadores matemáticos mais avançados do mundo, como os SMT Solvers e a linguagem Dafny da Microsoft!"
    },
    {
        "index": 3,
        "speaker": "eliezer",
        "actor": "Eliézer Rosa",
        "voice": VOICE_ELIEZER,
        "slide": 2,
        "text": "Exatamente! Em vez de jogar dados aleatórios para ver se quebra, o compilador IDD formula as regras de negócio como teoremas matemáticos de contorno. Usando solucionadores de teorias como o Z3, o sistema prova que sob qualquer combinação de dados, uma lei inviolável de negócio jamais será violada!"
    },
    {
        "index": 4,
        "speaker": "leigo",
        "actor": "Usuária Leiga",
        "voice": VOICE_LEIGO,
        "slide": 3,
        "text": "E no Slide três nós temos a tríade das invariantes do IDD: Invariantes Estruturais do MER, Invariantes Comportamentais de Máquinas de Estados e as brilhantes Invariantes Temporizadas, que protegem dados históricos de mudanças de regras no futuro!"
    },
    {
        "index": 5,
        "speaker": "eliezer",
        "actor": "Eliézer Rosa",
        "voice": VOICE_ELIEZER,
        "slide": 3,
        "text": "Isso mesmo! O passado da empresa permanece inviolável sob as leis da sua época, e o presente cumpre a norma nova com guardas temporais. Isso não é um teste que roda e dá verde ou vermelho: é uma garantia matemática formal de conservação do patrimônio de dados do cliente."
    },
    {
        "index": 6,
        "speaker": "leigo",
        "actor": "Usuária Leiga",
        "voice": VOICE_LEIGO,
        "slide": 4,
        "text": "Sensacional! E no próximo episódio, o zero sete, nós vamos ver como o IDD aplica a Engenharia Constitucional inspirada na Anthropic e a Máquina de Diff de Intenções para evoluir sistemas vivos com total controle humano!"
    },
    {
        "index": 7,
        "speaker": "eliezer",
        "actor": "Eliézer Rosa",
        "voice": VOICE_ELIEZER,
        "slide": 4,
        "text": "Com certeza! A matemática das invariantes é o escudo supremo do desenvolvimento com inteligência artificial. Acompanhe a nossa Base de Conhecimento e construa software matematicamente inabalável!"
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
    print("🎙️ GERANDO ÁUDIOS E TIMELINE DO EP. 06 (INVARIANTES FORMAIS & SMT)")
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
        "projectName": "IDD_Base_Conhecimento_Ep06",
        "totalDurationSec": round(total_duration, 2),
        "items": timeline_items
    }

    timeline_file = BASE_DIR / "video_ep06_timeline.json"
    with open(timeline_file, "w", encoding="utf-8") as f:
        json.dump(timeline_data, f, indent=2, ensure_ascii=False)
    print(f"[OK] Timeline salva em: {timeline_file}")

    # Montar master soundtrack com música sutil de fundo
    print("\n[Mixagem Master] Criando master_soundtrack_video_ep06.wav...")
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
    master_wav_file = BASE_DIR / "master_soundtrack_video_ep06.wav"
    with wave.open(str(master_wav_file), "wb") as out_w:
        out_w.setnchannels(2)
        out_w.setsampwidth(2)
        out_w.setframerate(SR)
        out_w.writeframes(master_int16.tobytes())

    print(f"[OK] Master Soundtrack criada com sucesso: {master_wav_file.name} ({master_wav_file.stat().st_size / (1024*1024):.1f} MB)")

if __name__ == "__main__":
    asyncio.run(build_episode())
