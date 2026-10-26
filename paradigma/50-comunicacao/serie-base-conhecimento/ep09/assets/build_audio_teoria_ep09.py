"""Gera os áudios e a timeline do Episódio 09 da Base de Conhecimento:
IDD Base de Conhecimento — Ep. 09: IDD vs MCP & Antigravity (Encanamento vs Engenharia)
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

BASE_DIR = Path(r"C:\Antigravity - IDD Refrigeração\motion_graphics_renderer\idd_teoria_ep09_assets")
AUDIO_DIR = BASE_DIR / "audio"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

VOICE_ELIEZER = "pt-BR-AntonioNeural"
VOICE_LEIGO = "pt-BR-FranciscaNeural"

# Roteiro do Episódio 09
SCRIPT_LINES = [
    {
        "index": 0,
        "speaker": "leigo",
        "actor": "Usuária Leiga",
        "voice": VOICE_LEIGO,
        "slide": 1,
        "text": "Eliézer, se você abrir o Twitter ou o LinkedIn hoje, vai ver todo mundo dizendo que o problema do desenvolvimento com IA foi 100% resolvido! O Claude tem o MCP para plugar qualquer banco de dados, e o Google Antigravity opera o terminal e o navegador de forma totalmente autônoma. Se nós já temos essa montanha de ferramentas mágicas, por que raios você insiste que ainda precisamos do Paradigma IDD?"
    },
    {
        "index": 1,
        "speaker": "eliezer",
        "actor": "Eliézer Rosa",
        "voice": VOICE_ELIEZER,
        "slide": 1,
        "text": "Essa é a maior ilusão da nossa indústria no momento! Comprar o Antigravity e o MCP achando que resolveu a engenharia de software é exatamente como comprar a escavadeira hidráulica mais veloz do mundo e entregar a chave na mão de um operador vendado! O Antigravity é uma escavadeira brilhante, e o MCP é uma tubulação fantástica. Mas quem avisa o operador que ele está prestes a romper o cano de gás de alta pressão da empresa? O MCP transporta a chamada, mas quem cuida do cálculo estrutural e da integridade da fundação é a ontologia do IDD!"
    },
    {
        "index": 2,
        "speaker": "leigo",
        "actor": "Usuária Leiga",
        "voice": VOICE_LEIGO,
        "slide": 2,
        "text": "Muito forte! E veja no Slide dois a pergunta provocativa que não quer calar: quantas vezes uma IA autônoma gerou um código que compilou lindo, passou no linter sem chiar, mas corrompeu silenciosamente o faturamento e o estoque do seu cliente em produção?"
    },
    {
        "index": 3,
        "speaker": "eliezer",
        "actor": "Eliézer Rosa",
        "voice": VOICE_ELIEZER,
        "slide": 2,
        "text": "Inúmeras vezes! O protocolo MCP é estritamente uma camada de transporte JSON-RPC. Se o modelo de IA decidir invocar a ferramenta execute_sql com uma exclusão sem WHERE, o MCP vai executar com perfeição e rapidez! Ele não tem moral, não tem noção de domínio e não sabe dizer não! No Paradigma IDD, a IA não conversa direto com a ferramenta bruta: toda intenção passa primeiro pelo tribunal de invariantes formais e pela guarda constitucional do sistema."
    },
    {
        "index": 4,
        "speaker": "leigo",
        "actor": "Usuária Leiga",
        "voice": VOICE_LEIGO,
        "slide": 3,
        "text": "E no Slide três nós vemos outro pesadelo dos arquitetos: e quando o agente precisa encadear três ferramentas pelo MCP e a terceira falha no meio do caminho? O que acontece com o estado do sistema?"
    },
    {
        "index": 5,
        "speaker": "eliezer",
        "actor": "Eliézer Rosa",
        "voice": VOICE_ELIEZER,
        "slide": 3,
        "text": "Caos total! O MCP não implementa rollback simétrico nem Sagas distribuídas. Ele deixa o banco no que chamamos de estado órfão. É aqui que o IDD brilha: o IDD não compete com o MCP ou o Antigravity, ele os governa! O Antigravity e o MCP são os músculos e as veias de execução; o IDD é o cérebro que garante o protocolo atômico em quatro fases com reversão garantida."
    },
    {
        "index": 6,
        "speaker": "leigo",
        "actor": "Usuária Leiga",
        "voice": VOICE_LEIGO,
        "slide": 4,
        "text": "Sensacional! E no nosso próximo episódio, o dez, nós vamos desmontar outro mito do mercado: o GitHub Copilot Workspace, o Aider e a ilusão do Spec-Driven baseado em texto solto!"
    },
    {
        "index": 7,
        "speaker": "eliezer",
        "actor": "Eliézer Rosa",
        "voice": VOICE_ELIEZER,
        "slide": 4,
        "text": "Não percam! Vamos mostrar por que fazer remendo e rezar não é ciência da computação. Inscreva-se no canal, comente a sua experiência com o MCP e venha liderar o futuro da engenharia de software com o Paradigma IDD!"
    }
]

async def gen_tts_file(text: str, voice: str, out_wav: Path):
    communicate = edge_tts.Communicate(text, voice)
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
        tmp_path = Path(tmp.name)
    try:
        await communicate.save(str(tmp_path))
        cmd = [
            "ffmpeg", "-y", "-i", str(tmp_path),
            "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le",
            str(out_wav)
        ]
        res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        if res.returncode != 0:
            raise RuntimeError(f"FFmpeg falhou ao converter {tmp_path} para {out_wav}")
    finally:
        if tmp_path.exists():
            tmp_path.unlink()

def get_wav_duration_seconds(wav_path: Path) -> float:
    with wave.open(str(wav_path), 'rb') as wf:
        frames = wf.getnframes()
        rate = wf.getframerate()
        return frames / float(rate)

async def build_all():
    print("=" * 70)
    print("🎙️ GERANDO ÁUDIOS E TIMELINE DO EP. 09 (IDD VS MCP & ANTIGRAVITY)")
    print("=" * 70)

    timeline_items = []
    current_time = 0.5

    for item in SCRIPT_LINES:
        idx = item["index"]
        spk = item["speaker"]
        wav_file = AUDIO_DIR / f"seg_{idx:02d}_{spk}.wav"

        print(f"Gerando voz [{spk}]: {item['text'][:65]}...")
        await gen_tts_file(item["text"], item["voice"], wav_file)

        dur = get_wav_duration_seconds(wav_file)
        start_sec = round(current_time, 3)
        end_sec = round(start_sec + dur, 3)

        timeline_items.append({
            "index": idx,
            "id": f"seg_{idx:02d}_{spk}",
            "who": spk,
            "actor": item["actor"],
            "avatar": "eliezer" if spk == "eliezer" else "leigo",
            "slide": item["slide"],
            "text": item["text"],
            "wav": str(wav_file),
            "startSec": start_sec,
            "durSec": round(dur, 3),
            "endSec": end_sec
        })

        current_time = end_sec + 0.65

    total_duration = round(current_time + 1.5, 2)
    print(f"\n[OK] Todas as vozes geradas! Duração total: {total_duration}s (~{total_duration/60:.1f} min)")

    timeline_json = BASE_DIR / "video_ep09_timeline.json"
    with open(timeline_json, "w", encoding="utf-8") as f:
        json.dump({
            "projectName": "IDD_Base_Conhecimento_Ep09",
            "totalDurationSec": total_duration,
            "items": timeline_items
        }, f, indent=2, ensure_ascii=False)
    print(f"[OK] Timeline salva em: {timeline_json}")

    print("\n[Mixagem Master] Criando master_soundtrack_video_ep09.wav...")
    sample_rate = 48000
    total_samples = int(total_duration * sample_rate)
    master_audio = np.zeros((total_samples, 2), dtype=np.int16)

    for item in timeline_items:
        with wave.open(item["wav"], 'rb') as wf:
            n_frames = wf.getnframes()
            data = wf.readframes(n_frames)
            seg_samples = np.frombuffer(data, dtype=np.int16).reshape(-1, 2)

            start_idx = int(item["startSec"] * sample_rate)
            end_idx = start_idx + len(seg_samples)
            if end_idx > total_samples:
                seg_samples = seg_samples[:total_samples - start_idx]
                end_idx = total_samples

            master_audio[start_idx:end_idx] = np.clip(
                master_audio[start_idx:end_idx].astype(np.int32) + seg_samples.astype(np.int32),
                -32768, 32767
            ).astype(np.int16)

    t = np.linspace(0, total_duration, total_samples, False)
    room_tone = (np.sin(2 * np.pi * 55 * t) * 60).astype(np.int16)
    room_tone = np.column_stack([room_tone, room_tone])
    master_audio = np.clip(master_audio.astype(np.int32) + room_tone.astype(np.int32), -32768, 32767).astype(np.int16)

    master_wav = BASE_DIR / "master_soundtrack_video_ep09.wav"
    with wave.open(str(master_wav), 'wb') as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(master_audio.tobytes())

    print(f"[OK] Master Soundtrack criada com sucesso: {master_wav.name} ({master_wav.stat().st_size / 1024 / 1024:.1f} MB)")

if __name__ == "__main__":
    asyncio.run(build_all())
