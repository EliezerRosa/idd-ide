"""Gera os áudios e a timeline do Episódio 10 da Base de Conhecimento:
IDD Base de Conhecimento — Ep. 10: IDD vs Copilot Workspace & Aider (Fim do Patch-and-Pray)
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

BASE_DIR = Path(r"C:\Antigravity - IDD Refrigeração\motion_graphics_renderer\idd_teoria_ep10_assets")
AUDIO_DIR = BASE_DIR / "audio"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

VOICE_ELIEZER = "pt-BR-AntonioNeural"
VOICE_LEIGO = "pt-BR-FranciscaNeural"

# Roteiro do Episódio 10
SCRIPT_LINES = [
    {
        "index": 0,
        "speaker": "leigo",
        "actor": "Usuária Leiga",
        "voice": VOICE_LEIGO,
        "slide": 1,
        "text": "Eliézer, no episódio anterior nós vimos os limites do MCP e do Antigravity. Mas e quanto ao GitHub Copilot Workspace, que já prega o desenvolvimento orientado a especificação? E o Aider, que bate recordes no benchmark SWE-bench resolvendo bugs de repositórios reais? Eles não chegaram exatamente onde o IDD quer chegar?"
    },
    {
        "index": 1,
        "speaker": "eliezer",
        "actor": "Eliézer Rosa",
        "voice": VOICE_ELIEZER,
        "slide": 1,
        "text": "Aí está a armadilha mais sutil da nossa área! O Copilot Workspace pega um prompt em texto livre e transforma em outro texto livre com bullet points em Markdown! É um gerador de texto orientando outro gerador de texto. Não existe uma Intent IR estruturada, não existe tipagem estrita de domínio. E ferramentas de terminal como o Aider operam na metodologia que eu chamo de Patch-and-Pray: o modelo gera um remendo no arquivo, roda a suíte de testes unitários, e se o pytest der verde, ele comita no Git e reza!"
    },
    {
        "index": 2,
        "speaker": "leigo",
        "actor": "Usuária Leiga",
        "voice": VOICE_LEIGO,
        "slide": 2,
        "text": "E veja no Slide dois por que o Patch-and-Pray é perigoso! Testes unitários com assert_equal testam apenas pontos finitos e conhecidos. Se o seu teste não previa uma condição de corrida ou concorrência assíncrona, adivinha quem vai descobrir o bug às três da manhã em produção? O seu cliente!"
    },
    {
        "index": 3,
        "speaker": "eliezer",
        "actor": "Eliézer Rosa",
        "voice": VOICE_ELIEZER,
        "slide": 2,
        "text": "Exatamente! Uma coisa é passar em três testes unitários; outra coisa completamente diferente é usar provadores formais como o Z3 para provar matematicamente que em nenhum estado do universo uma transação financeira vai gerar saldo negativo! O IDD substitui a amostragem finita pela verificação matemática de invariantes universais."
    },
    {
        "index": 4,
        "speaker": "leigo",
        "actor": "Usuária Leiga",
        "voice": VOICE_LEIGO,
        "slide": 3,
        "text": "E no Slide três nós temos a comparação definitiva: por que o Git é cego para a IA! O Aider depende 100% dos commits do Git. Mas o Git só entende caracteres ASCII e hashes SHA-1. Ele não tem a menor ideia de que uma linha alterada em um arquivo de migração quebrou uma cardinalidade no banco ou travou tabelas em produção!"
    },
    {
        "index": 5,
        "speaker": "eliezer",
        "actor": "Eliézer Rosa",
        "voice": VOICE_ELIEZER,
        "slide": 3,
        "text": "Perfeito! A Máquina de Diff de Intenções do IDD compara grafos ontológicos, prevê o raio de destruição e classifica a mutação em Classes A, B e C, aplicando o padrão Expand and Contract para zero downtime. O Git vê letras; o IDD vê arquitetura e integridade de dados."
    },
    {
        "index": 6,
        "speaker": "leigo",
        "actor": "Usuária Leiga",
        "voice": VOICE_LEIGO,
        "slide": 4,
        "text": "Que confronto esclarecedor! Fechamos essa comparação provando que o IDD não é apenas uma forma de pedir código para a IA, mas uma disciplina científica madura para a nova era do software!"
    },
    {
        "index": 7,
        "speaker": "eliezer",
        "actor": "Eliézer Rosa",
        "voice": VOICE_ELIEZER,
        "slide": 4,
        "text": "Com certeza! Pare de programar por sensações e venha para a engenharia determinística. Inscreva-se no canal, compartilhe essa Masterclass com seu time de desenvolvimento e lidere a revolução do Paradigma IDD!"
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
    print("🎙️ GERANDO ÁUDIOS E TIMELINE DO EP. 10 (IDD VS COPILOT WORKSPACE & AIDER)")
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

    timeline_json = BASE_DIR / "video_ep10_timeline.json"
    with open(timeline_json, "w", encoding="utf-8") as f:
        json.dump({
            "projectName": "IDD_Base_Conhecimento_Ep10",
            "totalDurationSec": total_duration,
            "items": timeline_items
        }, f, indent=2, ensure_ascii=False)
    print(f"[OK] Timeline salva em: {timeline_json}")

    print("\n[Mixagem Master] Criando master_soundtrack_video_ep10.wav...")
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

    master_wav = BASE_DIR / "master_soundtrack_video_ep10.wav"
    with wave.open(str(master_wav), 'wb') as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(master_audio.tobytes())

    print(f"[OK] Master Soundtrack criada com sucesso: {master_wav.name} ({master_wav.stat().st_size / 1024 / 1024:.1f} MB)")

if __name__ == "__main__":
    asyncio.run(build_all())
