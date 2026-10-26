"""Gera os áudios e a timeline do Episódio 08 da Base de Conhecimento:
IDD Base de Conhecimento — Ep. 08: A Teoria da Ação Atômica (Sagas & O Protocolo em 4 Fases)
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

BASE_DIR = Path(r"C:\Antigravity - IDD Refrigeração\motion_graphics_renderer\idd_teoria_ep08_assets")
AUDIO_DIR = BASE_DIR / "audio"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

VOICE_ELIEZER = "pt-BR-AntonioNeural"
VOICE_LEIGO = "pt-BR-FranciscaNeural"

# Roteiro do Episódio 08
SCRIPT_LINES = [
    {
        "index": 0,
        "speaker": "leigo",
        "actor": "Usuária Leiga",
        "voice": VOICE_LEIGO,
        "slide": 1,
        "text": "Eliézer, chegamos ao episódio oito da nossa Base de Conhecimento! Até aqui nós vimos como o IDD define a ontologia do domínio, compila intenções com DSPy, valida invariantes com Z3 e governa a evolução com diff semântico. Mas no mundo real, um sistema não é feito apenas de tabelas paradas, ele é feito de ações e comportamento! Qual é o grande perigo quando agentes de inteligência artificial executam operações complexas?"
    },
    {
        "index": 1,
        "speaker": "eliezer",
        "actor": "Eliézer Rosa",
        "voice": VOICE_ELIEZER,
        "slide": 1,
        "text": "Esse é o calcanhar de Aquiles do desenvolvimento com IA! Se você deixar um agente gerar código imperativo livre, ele faz meia-operação: debita um saldo e cai antes de registrar o pedido, deixando o banco em estado inconsistente e corrompido! No Paradigma IDD, nós não permitimos código comportamental ad-hoc. Toda mutação de estado obedece rigorosamente à Teoria da Ação Atômica!"
    },
    {
        "index": 2,
        "speaker": "leigo",
        "actor": "Usuária Leiga",
        "voice": VOICE_LEIGO,
        "slide": 2,
        "text": "E é fascinante ver no Slide dois como o IDD resolve isso através do Protocolo Canônico em Quatro Fases! Explique para quem está nos assistindo como funciona essa esteira de execução blindada!"
    },
    {
        "index": 3,
        "speaker": "eliezer",
        "actor": "Eliézer Rosa",
        "voice": VOICE_ELIEZER,
        "slide": 2,
        "text": "É uma garantia matemática! Primeira fase: Guarda. Validamos precondições e invariantes de domínio com falha rápida antes de tocar qualquer dado. Segunda fase: Mutação. O estado é modificado em escopo estritamente isolado e idempotente. Terceira fase: Selagem. As pós-condições são verificadas e o evento de domínio é emitido como log imutável. E quarta fase: Compensação. Se qualquer elo da cadeia falhar, o protocolo dispara a reversão simétrica garantindo consistência total!"
    },
    {
        "index": 4,
        "speaker": "leigo",
        "actor": "Usuária Leiga",
        "voice": VOICE_LEIGO,
        "slide": 3,
        "text": "E no Slide três nós conectamos isso diretamente com a literatura clássica de sistemas distribuídos: as Sagas de Hector Garcia-Molina e a teoria de Pat Helland de dados através do tempo! Como o IDD aplica Sagas sem o pesadelo de bloqueios distribuídos?"
    },
    {
        "index": 5,
        "speaker": "eliezer",
        "actor": "Eliézer Rosa",
        "voice": VOICE_ELIEZER,
        "slide": 3,
        "text": "Exatamente! Transações distribuídas de duas fases tradicionais causam deadlocks e não escalam. O IDD adota Sagas declarativas: cada intenção já declara formalmente a sua ação compensatória correspondente. Se um serviço externo falha, o compilador já sabe exatamente como desfazer os passos anteriores sem travar o banco. É a engenharia de software no seu mais alto nível de maturidade!"
    },
    {
        "index": 6,
        "speaker": "leigo",
        "actor": "Usuária Leiga",
        "voice": VOICE_LEIGO,
        "slide": 4,
        "text": "Que jornada espetacular! Fechamos a série conceitual fundamental provando que a engenharia de software pós-sintaxe não é tentativa e erro, é ciência rigorosa, ontologia clara e matemática aplicada!"
    },
    {
        "index": 7,
        "speaker": "eliezer",
        "actor": "Eliézer Rosa",
        "voice": VOICE_ELIEZER,
        "slide": 4,
        "text": "Com certeza! O Paradigma IDD substitui a fragilidade do Vibe Coding por uma fortaleza de confiabilidade. Inscreva-se no canal, estude essa Base de Conhecimento, confira as nossas playlists de aplicação prática de campo e lidere o futuro da criação de software com inteligência artificial!"
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
    print("🎙️ GERANDO ÁUDIOS E TIMELINE DO EP. 08 (AÇÃO ATÔMICA & SAGAS EM 4 FASES)")
    print("=" * 70)

    timeline_items = []
    current_time = 0.5  # Pausa inicial de 500ms

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

        current_time = end_sec + 0.65  # Pausa natural entre interlocutores

    total_duration = round(current_time + 1.5, 2)
    print(f"\n[OK] Todas as vozes geradas! Duração total: {total_duration}s (~{total_duration/60:.1f} min)")

    timeline_json = BASE_DIR / "video_ep08_timeline.json"
    with open(timeline_json, "w", encoding="utf-8") as f:
        json.dump({
            "projectName": "IDD_Base_Conhecimento_Ep08",
            "totalDurationSec": total_duration,
            "items": timeline_items
        }, f, indent=2, ensure_ascii=False)
    print(f"[OK] Timeline salva em: {timeline_json}")

    print("\n[Mixagem Master] Criando master_soundtrack_video_ep08.wav...")
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

    # Adicionar leito sonoro sutil de fundo (-36dB)
    t = np.linspace(0, total_duration, total_samples, False)
    room_tone = (np.sin(2 * np.pi * 55 * t) * 60).astype(np.int16)
    room_tone = np.column_stack([room_tone, room_tone])
    master_audio = np.clip(master_audio.astype(np.int32) + room_tone.astype(np.int32), -32768, 32767).astype(np.int16)

    master_wav = BASE_DIR / "master_soundtrack_video_ep08.wav"
    with wave.open(str(master_wav), 'wb') as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(master_audio.tobytes())

    print(f"[OK] Master Soundtrack criada com sucesso: {master_wav.name} ({master_wav.stat().st_size / 1024 / 1024:.1f} MB)")

if __name__ == "__main__":
    asyncio.run(build_all())
