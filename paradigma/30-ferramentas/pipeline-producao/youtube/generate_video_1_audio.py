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
OUT_DIR = BASE_DIR / "motion_graphics_renderer" / "idd_video_1_assets"
AUDIO_DIR = OUT_DIR / "audio"
OUT_DIR.mkdir(parents=True, exist_ok=True)
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

# 3 Vozes Oficiais:
# Eliézer Rosa (Orquestrador): pt-BR-AntonioNeural
# Usuário (Leigo): pt-BR-ThalitaMultilingualNeural
# IA (Agente Compilador): pt-BR-FranciscaNeural

VOICES = {
    "eliezer": "pt-BR-AntonioNeural",
    "leigo": "pt-BR-ThalitaMultilingualNeural",
    "ia": "pt-BR-FranciscaNeural"
}

DIALOGUES = [
    # --- ATO 1: O DILEMA DO LEIGO & O PARADIGMA IDD ---
    {
        "id": "seg_01_leigo",
        "who": "leigo",
        "actor": "Usuário Leigo",
        "avatar": "leigo",
        "slide": 1,
        "text": "Eliézer, eu acompanho o canal e vejo tanta gente falando de inteligência artificial gerando código, mas eu sou leiga em programação. Como alguém sem saber programar consegue construir um sistema sério e complexo para refrigeração industrial?"
    },
    {
        "id": "seg_02_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 1,
        "text": "Essa é a virada de chave fundamental do Paradigma IDD! No desenvolvimento tradicional, o programador passa meses escrevendo sintaxe de código. No IDD, a intenção humana de negócios é o artefato de mais alta ordem. O código se tornou um mero detalhe efêmero de compilação."
    },
    {
        "id": "seg_03_leigo",
        "who": "leigo",
        "actor": "Usuário Leigo",
        "avatar": "leigo",
        "slide": 1,
        "text": "Mas se eu não escrevo código, onde entra a minha responsabilidade e o meu trabalho no dia a dia?"
    },
    {
        "id": "seg_04_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 1,
        "text": "O seu trabalho é o mais nobre da engenharia: o Comando Epistêmico. Você define as regras do negócio, os limites legais e a física real do problema. Veja a nossa primeira apresentação do projeto de refrigeração na tela."
    },

    # --- ATO 2: A PRIMEIRA APRESENTAÇÃO HTML & A FÍSICA REAL DO PMOC ---
    {
        "id": "seg_05_leigo",
        "who": "leigo",
        "actor": "Usuário Leigo",
        "avatar": "leigo",
        "slide": 2,
        "text": "Nesse slide diz que softwares genéricos de manutenção falham na refrigeração. Por que isso acontece?"
    },
    {
        "id": "seg_06_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 2,
        "text": "Porque uma câmara frigorífica ou um chiller não é uma lâmpada ou ventilador comum. Se o técnico apenas anota que a máquina está gelando, mas não mede a pressão de sucção e o superaquecimento no manifold, o compressor quebra dias depois e você perde milhares de reais em produtos."
    },
    {
        "id": "seg_07_leigo",
        "who": "leigo",
        "actor": "Usuário Leigo",
        "avatar": "leigo",
        "slide": 2,
        "text": "E tem também a Lei Federal do PMOC, a 13.589, certo? Se o laudo estiver errado ou em papel solto, a empresa é multada pela Vigilância Sanitária!"
    },
    {
        "id": "seg_08_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 2,
        "text": "Exatamente! Essa é uma invariante de negócio inviolável. A IA não pode ter palpites sobre isso. Nós declaramos a regra: todo checklist de manutenção preventiva deve ter ART ou TRT de um engenheiro responsável e evidências fotográficas criptografadas."
    },

    # --- ATO 3: A IA ENTRA NO CHAT (TERCEIRO AVATAR) ---
    {
        "id": "seg_09_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "avatar": "ia",
        "slide": 3,
        "chat": True,
        "text": "Orquestrador Eliézer, processei a intenção do Módulo Termodinâmico. Para compilar as tabelas de saturação, pergunto: a validação de superaquecimento deve aplicar a curva do fluido ecológico R-410A ou permitir seleção dinâmica pelo mecânico no momento da leitura?"
    },
    {
        "id": "seg_10_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 3,
        "chat": True,
        "text": "Permita seleção dinâmica com cálculo automático de delta T, e bloqueie a conclusão da ordem de serviço se o superaquecimento estiver fora da faixa segura de cinco a nove graus Celsius."
    },
    {
        "id": "seg_11_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "avatar": "ia",
        "slide": 3,
        "chat": True,
        "text": "Invariante aceita com sucesso. Gerando guard rail de segurança na API, isolamento multitenant no banco de dados e interface com leitura de QR Code para smartphone. Zero violações de arquitetura detectadas."
    },
    {
        "id": "seg_12_leigo",
        "who": "leigo",
        "actor": "Usuário Leigo",
        "avatar": "leigo",
        "slide": 3,
        "chat": True,
        "text": "Nossa! Ela não só obedeceu, como perguntou o detalhe crítico da física que eu como leiga preciso decidir! Não teve uma linha de código Python ou React na minha tela!"
    },

    # --- ATO 4: CONEXÃO COM O CAMPO & CONCLUSÃO DO EPISÓDIO 1 ---
    {
        "id": "seg_13_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 4,
        "text": "Esse é o poder do Confirm-Once Pattern e do Desenvolvimento Dirigido por Intenção. O mecânico na ponta lê o QR Code da máquina, o sistema calcula os dados térmicos e gera o laudo do PMOC em PDF na hora. Você governa o negócio, a IA materializa o software."
    },
    {
        "id": "seg_14_leigo",
        "who": "leigo",
        "actor": "Usuário Leigo",
        "avatar": "leigo",
        "slide": 4,
        "text": "Agora entendi perfeitamente! Não é sobre aprender sintaxe de programação. É sobre ter clareza da intenção e saber guiar a IA com método!"
    },
    {
        "id": "seg_15_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 4,
        "text": "Perfeito! Nos próximos episódios da nossa playlist, vamos mostrar a modelagem dos Bounded Contexts, o banco de dados e a entrega final. Sejam muito bem-vindos ao Paradigma IDD!"
    }
]

async def generate_audio():
    print("=" * 70)
    print("🎙️ GERANDO ÁUDIO DO NOVO VÍDEO 1: 3 AVATARES & DIÁLOGO IDD")
    print("=" * 70)

    timeline_items = []
    current_time = 0.5 # 0.5s de respiro inicial

    for idx, d in enumerate(DIALOGUES):
        voice = VOICES[d["who"]]
        mp3_path = AUDIO_DIR / f"{d['id']}.mp3"
        wav_path = AUDIO_DIR / f"{d['id']}.wav"

        print(f"[{idx+1}/{len(DIALOGUES)}] Gerando fala de {d['actor']} ({voice})...")
        comm = edge_tts.Communicate(d["text"], voice, rate="+2%", pitch="+0Hz")
        await comm.save(str(mp3_path))

        # Converte para WAV 48kHz estéreo para precisão cirúrgica de corte
        subprocess.run([
            "ffmpeg", "-y", "-i", str(mp3_path),
            "-ar", "48000", "-ac", "2", str(wav_path)
        ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        # Mede duração exata via ffprobe
        res = subprocess.run([
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", str(wav_path)
        ], capture_output=True, text=True, check=True)
        dur = float(res.stdout.strip())

        item = {
            "index": idx,
            "id": d["id"],
            "who": d["who"],
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
        current_time += dur + 0.65 # Pausa natural de 650ms entre falas

    total_duration = round(current_time + 1.5, 2)
    print(f"\nDuração Total do Roteiro: {total_duration}s (~{(total_duration/60):.1f} min)")

    # Salva timeline.json
    timeline_path = OUT_DIR / "video_1_timeline.json"
    with open(timeline_path, "w", encoding="utf-8") as f:
        json.dump({
            "projectName": "IDD_Refrigeracao_Novo_Video_1",
            "totalDurationSec": total_duration,
            "items": timeline_items
        }, f, indent=2, ensure_ascii=False)
    print(f"[OK] Timeline salva em: {timeline_path}")

    # Monta a trilha sonora master procedural sincronizada
    print("\nMontando Trilha Sonora Master com EBU R128 (-14 LUFS)...")
    concat_list_file = OUT_DIR / "audio_concat.txt"
    # Cria os silêncios entre os arquivos
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
        f.write(f"file '{initial_silence_wav.name}'\n")
        for idx, item in enumerate(timeline_items):
            f.write(f"file '{Path(item['wav']).name}'\n")
            if idx < len(timeline_items) - 1:
                f.write(f"file '{silence_wav.name}'\n")

    raw_voice_master = OUT_DIR / "raw_voice_master.wav"
    subprocess.run([
        "ffmpeg", "-y", "-f", "concat", "-safe", "0",
        "-i", str(concat_list_file),
        "-c", "copy", str(raw_voice_master)
    ], check=True, cwd=str(AUDIO_DIR), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # Gera ambiência sonora procedural suave e aplica ducking
    master_audio_path = OUT_DIR / "master_soundtrack_video_1.wav"
    # Ambiência harmônica suave sintetizada: frequências harmônicas em 130.81Hz (C3) e 196Hz (G3)
    synth_ambience = (
        f"aevalsrc=sin(2*PI*130.81*t)*0.012+sin(2*PI*196.00*t)*0.008+sin(2*PI*261.63*t)*0.005:s=48000:d={total_duration}"
    )

    filter_complex = (
        f"[0:a]{synth_ambience}[bg];"
        "[1:a]asplit=2[v_audio][v_sc];"
        "[bg][v_sc]sidechaincompress=threshold=0.04:ratio=4:attack=50:release=300[bg_ducked];"
        "[bg_ducked][v_audio]amix=inputs=2:weights=0.35 1.0[mixed];"
        "[mixed]loudnorm=I=-14:LRA=7:TP=-1.5[out_audio]"
    )

    subprocess.run([
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", f"anullsrc=r=48000:cl=stereo:d={total_duration}",
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
