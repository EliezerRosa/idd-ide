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
OUT_DIR = BASE_DIR / "motion_graphics_renderer" / "idd_video_3b_assets"
AUDIO_DIR = OUT_DIR / "audio"
OUT_DIR.mkdir(parents=True, exist_ok=True)
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

VOICES = {
    "eliezer": "pt-BR-AntonioNeural",
    "leigo": "pt-BR-ThalitaMultilingualNeural",
    "ia": "pt-BR-FranciscaNeural"
}

DIALOGUES = [
    # --- ATO 1: INTRODUÇÃO À MODELAGEM UML COM IA (SLIDE 1) ---
    {
        "id": "seg_01_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 1,
        "chat": False,
        "text": "Eliézer, no episódio dois B nós vimos o banco de dados nascer sem digitar SQL. Mas e o comportamento do aplicativo? Como as pessoas interagem com o sistema e como as regras do negócio são orquestradas sem que a gente precise programar em Java ou Python?"
    },
    {
        "id": "seg_02_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 1,
        "chat": False,
        "text": "Chegamos ao terceiro pilar do Paradigma IDD: a Modelagem Orientada a Objetos com UML preliminar! O UML não é para gerar código burocrático; ele serve como uma linguagem universal visual. Nós mapeamos os Atores do mundo real, o Contexto do sistema, os Casos de Uso e o ciclo de vida dos objetos."
    },
    {
        "id": "seg_03_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 1,
        "chat": False,
        "text": "Veja no Slide 1 os Atores: temos o Mecânico com seu celular, o Orquestrador, o Síndico, a própria IA e até o Fiscal da Anvisa!"
    },
    {
        "id": "seg_04_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 1,
        "chat": False,
        "text": "Perfeitamente! Cada ator possui responsabilidades claras e fronteiras semânticas bem delimitadas. Nenhum ator pode executar ações fora da sua intenção de negócio."
    },

    # --- ATO 2: CASOS DE USO & CLASSES DE DOMÍNIO (SLIDE 2) ---
    {
        "id": "seg_05_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 2,
        "chat": False,
        "text": "E no Slide 2 nós temos os Casos de Uso e as Classes de Domínio. Como a IA constrói essa estrutura a partir da intenção?"
    },
    {
        "id": "seg_06_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 2,
        "chat": False,
        "text": "A IA mapeia os verbos da operação: escanear QR Code, registrar medição de manifold, gerar laudo PMOC e assinar na tela. As classes de domínio, como Equipamento e OrdemServico, encapsulam os dados e os métodos da física térmica sem nenhuma dependência de infraestrutura externa."
    },
    {
        "id": "seg_07_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 2,
        "chat": False,
        "text": "E como garantir que uma ordem de serviço não seja concluída pela metade ou sem medição de pressão?"
    },
    {
        "id": "seg_08_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 2,
        "chat": False,
        "text": "Através do Diagrama de Máquina de Estados! Vamos acionar o nosso Agente IA para vermos o diagrama de estados do IDD Refrigeração e as decisões de transição que ele identificou!"
    },

    # --- ATO 3: MÁQUINA DE ESTADOS & CHAT DA IA (SLIDE 3) ---
    {
        "id": "seg_09_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "avatar": "ia",
        "slide": 3,
        "chat": True,
        "text": "Orquestrador Eliézer e Usuária Leiga, modelei o Diagrama de Estados da Ordem de Serviço em UML. Mapeei os estados Aberta, Em_Atendimento, Aguardando_Peca e Concluida. Identifiquei uma dúvida de transição: se o mecânico precisar interromper o atendimento para aguardar peças, o equipamento deve entrar em status de Alerta_Manutencao ou permanece liberado para outras equipes?"
    },
    {
        "id": "seg_10_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 3,
        "chat": True,
        "text": "Excelente detalhamento, IA! O equipamento deve entrar compulsoriamente no estado 'Alerta_Manutencao' para proteger a máquina contra acionamento indevido, e a OS transiciona para 'Aguardando_Peca' preservando todas as evidências já coletadas."
    },
    {
        "id": "seg_11_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "avatar": "ia",
        "slide": 3,
        "chat": True,
        "text": "Transição de estado refinada e validada. A máquina de estados UML garante que a transição final para 'Concluida' exija medição válida e assinatura digital, tornando a ordem estritamente imutável após o fechamento."
    },
    {
        "id": "seg_12_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 3,
        "chat": True,
        "text": "Que elegância! A máquina de estados atua como um trilho de trem inviolável: o mecânico não tem como pular etapas ou esquecer medições porque o modelo impede transições ilegais!"
    },

    # --- ATO 4: SÍNTESE DO UML & RUMO AOS TESTES (SLIDE 4) ---
    {
        "id": "seg_13_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 4,
        "chat": False,
        "text": "Veja no Slide 4 a síntese desta etapa: unimos Requisitos, Modelo de Dados no MER e Modelagem de Comportamento no UML. O sistema está completamente especificado, modelado e blindado sem escrevermos código manual."
    },
    {
        "id": "seg_14_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 4,
        "chat": False,
        "text": "E no próximo episódio metodológico, como a gente valida e testa tudo isso para garantir que a IA gerou o software exatamente como a intenção mandou?"
    },
    {
        "id": "seg_15_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 4,
        "chat": False,
        "text": "No Episódio 4B, nós veremos a Governança Técnica, a suíte de 240 testes automatizados de invariantes e o deploy autônomo na nuvem em apenas 4 segundos! Até o próximo vídeo!"
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
    print("🎙️ GERANDO ÁUDIO NEURAL EPISÓDIO 3B (METODOLOGIA: MODELAGEM UML COM IA)")
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
    print(f"\nDuração Total do Roteiro Ep. 3B: {total_duration}s (~{(total_duration/60):.1f} min)")

    timeline_path = OUT_DIR / "video_3b_timeline.json"
    with open(timeline_path, "w", encoding="utf-8") as f:
        json.dump({
            "projectName": "IDD_Refrigeracao_Novo_Video_3B",
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

    master_audio_path = OUT_DIR / "master_soundtrack_video_3b.wav"
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

    print(f"\n[OK] Trilha Master Estúdio Ep. 3B Finalizada: {master_audio_path}")
    print(f"     Tamanho: {master_audio_path.stat().st_size / (1024*1024):.1f} MB | Loudness: -14 LUFS")

if __name__ == "__main__":
    asyncio.run(generate_audio())
