"""Gera os áudios e a timeline do Episódio 4E:
Metodologia IDD na Prática - Ep. 4E: Ergonomia Industrial & Multimodalidade em Campo
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

BASE_DIR = Path(r"C:\Antigravity - IDD Refrigeração\motion_graphics_renderer\idd_video_4e_assets")
AUDIO_DIR = BASE_DIR / "audio"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

VOICE_ELIEZER = "pt-BR-AntonioNeural"
VOICE_LEIGO = "pt-BR-FranciscaNeural"

# Roteiro do Episódio 4E
SCRIPT_LINES = [
    {
        "index": 0,
        "speaker": "leigo",
        "actor": "Usuária Leiga",
        "voice": VOICE_LEIGO,
        "slide": 1,
        "text": "Eliézer, nós desenhamos uma arquitetura impecável com regras matemáticas e evolução contínua. Mas me diga uma coisa: e quando esse software chega lá na ponta, na mão do mecânico em cima de um telhado quente, de luva e cheio de graxa?"
    },
    {
        "index": 1,
        "speaker": "eliezer",
        "actor": "Eliézer Rosa",
        "voice": VOICE_ELIEZER,
        "slide": 1,
        "text": "Você tocou no ponto mais crítico de toda a engenharia de software! Um sistema desenvolvido no ar-condicionado de um escritório falha miseravelmente no campo se não respeitar a realidade física do operador. No IDD, a ergonomia não é estética decorativa: ela é tratada como Intenção Operacional Humana e Invariantes de Atrito."
    },
    {
        "index": 2,
        "speaker": "leigo",
        "actor": "Usuária Leiga",
        "voice": VOICE_LEIGO,
        "slide": 2,
        "text": "Veja no Slide dois o que muda na prática! Em vez daqueles botões minúsculos e formulários de trinta campos, o IDD impõe alvos de toque industriais de até oitenta pixels e paleta de alto contraste para sol direto!"
    },
    {
        "index": 3,
        "speaker": "eliezer",
        "actor": "Eliézer Rosa",
        "voice": VOICE_ELIEZER,
        "slide": 2,
        "text": "Com certeza! O técnico de campo nunca deve ser transformado em um digitador de dados. O ativo é identificado em um segundo pelo QR Code, e as escolhas são feitas com cartões de toque único, sem menus suspensos infinitos."
    },
    {
        "index": 4,
        "speaker": "leigo",
        "actor": "Usuária Leiga",
        "voice": VOICE_LEIGO,
        "slide": 3,
        "text": "E no Slide três entra a inteligência artificial multimodal! O mecânico simplesmente aperta o botão de voz e fala o que fez. A IA transcreve, extrai as peças e as quantidades de gás e preenche o modelo do banco automaticamente!"
    },
    {
        "index": 5,
        "speaker": "eliezer",
        "actor": "Eliézer Rosa",
        "voice": VOICE_ELIEZER,
        "slide": 3,
        "text": "Exatamente! Ele dita o laudo em dez segundos, a IA mapeia para os métodos atômicos do MER e o mecânico apenas clica em confirmar. E com a visão computacional, uma foto do manifold ou da plaqueta já extrai as pressões e superaquecimento sem digitar um único número."
    },
    {
        "index": 6,
        "speaker": "leigo",
        "actor": "Usuária Leiga",
        "voice": VOICE_LEIGO,
        "slide": 4,
        "text": "Isso reduz o tempo de fechamento da ordem de serviço de quinze minutos para menos de um minuto! Mas Eliézer, e quando o mecânico entra numa câmara frigorífica ou subsolo sem sinal nenhum de internet?"
    },
    {
        "index": 7,
        "speaker": "eliezer",
        "actor": "Eliézer Rosa",
        "voice": VOICE_ELIEZER,
        "slide": 4,
        "text": "Esse é o tema do nosso episódio quatro F: a arquitetura Offline-First, gaiolas de Faraday e a sincronização resiliente sem perda de dados. Nos vemos lá!"
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

async def build_episode_4e():
    print("=" * 70)
    print("🎙️ GERANDO ÁUDIOS E TIMELINE DO EPISÓDIO 4E (ERGONOMIA INDUSTRIAL)")
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
        "projectName": "IDD_Refrigeracao_Novo_Episodio_4E",
        "totalDurationSec": round(total_duration, 2),
        "items": timeline_items
    }

    timeline_file = BASE_DIR / "video_4e_timeline.json"
    with open(timeline_file, "w", encoding="utf-8") as f:
        json.dump(timeline_data, f, indent=2, ensure_ascii=False)
    print(f"[OK] Timeline salva em: {timeline_file}")

    # Montar master soundtrack com música sutil de fundo
    print("\n[Mixagem Master] Criando master_soundtrack_video_4e.wav...")
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
    master_wav_file = BASE_DIR / "master_soundtrack_video_4e.wav"
    with wave.open(str(master_wav_file), "wb") as out_w:
        out_w.setnchannels(2)
        out_w.setsampwidth(2)
        out_w.setframerate(SR)
        out_w.writeframes(master_int16.tobytes())

    print(f"[OK] Master Soundtrack criada com sucesso: {master_wav_file.name} ({master_wav_file.stat().st_size / (1024*1024):.1f} MB)")

if __name__ == "__main__":
    asyncio.run(build_episode_4e())
