import asyncio
import json
import os
import subprocess
import sys
from pathlib import Path
import edge_tts

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

BASE_DIR = Path(r"C:\Antigravity - IDD Refrigeração")
OUT_DIR = BASE_DIR / "producao_yt" / "barbearia_assets" / "ep5"
AUDIO_DIR = OUT_DIR / "audio"
OUT_DIR.mkdir(parents=True, exist_ok=True)
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

VOICES = {
    "eliezer": "pt-BR-AntonioNeural",
    "leigo": "pt-BR-ThalitaMultilingualNeural",
    "ia": "pt-BR-FranciscaNeural"
}

DIALOGUES = [
    # --- ATO 1: A CELEBRAÇÃO DO RESULTADO (SLIDE 1) ---
    {
        "id": "seg_01_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 1,
        "chat": False,
        "text": "Eliézer, chegamos ao final da nossa série prática da Barbearia! É emocionante ver aquele salão que antes vivia no caos do caderno de papel agora funcionando com um aplicativo de nível corporativo, sem que a gente tenha precisado escrever nenhum código manual!"
    },
    {
        "id": "seg_02_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 1,
        "chat": False,
        "text": "Essa é a grande vitória do Paradigma IDD: democratizar a engenharia de software de altíssimo padrão! O empreendedor não precisa aprender sintaxe nem ficar refém de orçamentos exorbitantes. A clareza da intenção humana guiou a IA na compilação perfeita de cada detalhe."
    },

    # --- ATO 2: A TRILHA METODOLÓGICA COMPLETA (SLIDE 2) ---
    {
        "id": "seg_03_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 2,
        "chat": False,
        "text": "Vamos recapitular no Slide 2 os quatro passos sagrados que percorremos: primeiro Intenções e Invariantes; segundo Telas e MER; terceiro Implementação, Código Vivo e UML; e quarto os Testes Automatizados com Deploy Confirm-Once!"
    },
    {
        "id": "seg_04_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 2,
        "chat": False,
        "text": "Uma esteira metodológica completa, auditável e imutável! Cada passo gerou artefatos concretos que qualquer leigo pode inspecionar e que a IA compila com precisão cirúrgica."
    },

    # --- ATO 3: TERMINAL DA IA & TELEMETRIA REAL (SLIDE 3) ---
    {
        "id": "seg_05_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 3,
        "chat": False,
        "text": "Vejam no Slide 3 a telemetria do aplicativo rodando na Barbearia Imperial no primeiro fim de semana!"
    },
    {
        "id": "seg_06_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "avatar": "ia",
        "slide": 3,
        "chat": True,
        "text": "Relatório de telemetria da Barbearia Imperial: cento e quarenta e dois agendamentos concluídos no sábado. Taxa de sobreposição de horários: zero por cento. Divergência no cálculo de comissões: zero centavos. Redução do tempo ocioso das cadeiras: oitenta e cinco por cento. Sistema operando em cem por cento de estabilidade."
    },
    {
        "id": "seg_07_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 3,
        "chat": True,
        "text": "Resultado extraordinário! A física do salão respeitada no centavo e no minuto. Essa mesma metodologia se aplica a qualquer negócio do planeta."
    },

    # --- ATO 4: O FUTURO E A PRÓXIMA PLAYLIST (SLIDE 4) ---
    {
        "id": "seg_08_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 4,
        "chat": False,
        "text": "E para você que nos acompanhou nesta primeira jornada: na próxima playlist nós vamos criar o aplicativo completo de uma Cafeteria e Padaria, enfrentando o desafio do estoque crítico e da comanda de mesa! Não percam!"
    },
    {
        "id": "seg_09_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 4,
        "chat": False,
        "text": "Inscreva-se no canal, compartilhe esta playlist com quem tem um negócio local e venha fazer parte da era do desenvolvimento guiado por intenção. Um grande abraço e até a próxima série do IDD na Prática!"
    }
]

async def generate_speech(text, voice, out_path):
    communicate = edge_tts.Communicate(text, voice, rate="+2%", pitch="+0Hz")
    await communicate.save(out_path)

def get_audio_duration(file_path):
    cmd = [
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        str(file_path)
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
    return float(res.stdout.strip())

async def generate_audio():
    print("=" * 70)
    print("🎙️ GERANDO ÁUDIO NEURAL BARBEARIA - EP. 5 (GRAND FINALE)")
    print("=" * 70)

    timeline_items = []
    current_time = 0.5

    for idx, d in enumerate(DIALOGUES):
        seg_id = d["id"]
        who = d["who"]
        voice = VOICES[who]
        wav_path = AUDIO_DIR / f"{seg_id}.wav"
        mp3_path = AUDIO_DIR / f"{seg_id}.mp3"

        print(f"[{idx+1}/{len(DIALOGUES)}] Sintetizando {seg_id} ({d['actor']})...")
        await generate_speech(d["text"], voice, str(mp3_path))

        subprocess.run([
            "ffmpeg", "-y", "-i", str(mp3_path),
            "-ar", "48000", "-ac", "2",
            str(wav_path)
        ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        if mp3_path.exists():
            mp3_path.unlink()

        dur = get_audio_duration(wav_path)
        item = {
            "index": idx,
            "id": seg_id,
            "who": who,
            "actor": d["actor"],
            "avatar": d["avatar"],
            "slide": d["slide"],
            "chat": d.get("chat", False),
            "text": d["text"],
            "wav": str(wav_path),
            "startSec": round(current_time, 3),
            "durSec": round(dur, 3),
            "endSec": round(current_time + dur, 3)
        }
        timeline_items.append(item)
        print(f"       Duração: {dur:.2f}s | Início: {current_time:.2f}s -> Fim: {current_time + dur:.2f}s")
        current_time += dur + 0.65

    total_duration = round(current_time + 1.5, 2)
    print(f"\nDuração Total do Roteiro: {total_duration}s (~{(total_duration/60):.1f} min)")

    timeline_path = OUT_DIR / "timeline.json"
    with open(timeline_path, "w", encoding="utf-8") as f:
        json.dump({
            "projectName": "Barbearia_Ep5",
            "totalDurationSec": total_duration,
            "items": timeline_items
        }, f, indent=2, ensure_ascii=False)
    print(f"[OK] Timeline salva em: {timeline_path}")

    print("\nMontando Trilha Sonora Master com EBU R128 (-14 LUFS)...")
    concat_list_file = OUT_DIR / "audio_concat.txt"
    silence_wav = AUDIO_DIR / "silence_065s.wav"
    subprocess.run([
        "ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
        "-t", "0.65", str(silence_wav)
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    initial_silence_wav = AUDIO_DIR / "silence_050s.wav"
    subprocess.run([
        "ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
        "-t", "0.50", str(initial_silence_wav)
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    with open(concat_list_file, "w", encoding="utf-8") as f:
        f.write(f"file '{initial_silence_wav.as_posix()}'\n")
        for idx, item in enumerate(timeline_items):
            f.write(f"file '{Path(item['wav']).as_posix()}'\n")
            if idx < len(timeline_items) - 1:
                f.write(f"file '{silence_wav.as_posix()}'\n")

    raw_voice_master = OUT_DIR / "raw_voice_master.wav"
    subprocess.run([
        "ffmpeg", "-y", "-f", "concat", "-safe", "0",
        "-i", str(concat_list_file),
        "-c", "copy", str(raw_voice_master)
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    master_audio_path = OUT_DIR / "master_soundtrack.wav"
    synth_ambience = (
        f"aevalsrc=sin(2*PI*130.81*t)*0.012+sin(2*PI*196.00*t)*0.008+sin(2*PI*261.63*t)*0.005:s=48000:d={total_duration}"
    )

    filter_complex = (
        f"{synth_ambience}[bg];"
        "[0:a]asplit=2[v_audio][v_sc];"
        "[bg][v_sc]sidechaincompress=threshold=0.04:ratio=4:attack=50:release=300[bg_ducked];"
        "[bg_ducked][v_audio]amix=inputs=2:weights=0.35 1.0[mixed];"
        "[mixed]loudnorm=I=-14:LRA=7:TP=-1.5[out_audio]"
    )

    subprocess.run([
        "ffmpeg", "-y",
        "-i", str(raw_voice_master),
        "-filter_complex", filter_complex,
        "-map", "[out_audio]",
        "-c:a", "pcm_s16le",
        str(master_audio_path)
    ], check=True)

    print(f"\n[OK] Trilha Master Estúdio Finalizada: {master_audio_path}")
    print(f"     Tamanho: {master_audio_path.stat().st_size / (1024*1024):.1f} MB | Loudness: -14 LUFS")

if __name__ == "__main__":
    asyncio.run(generate_audio())
