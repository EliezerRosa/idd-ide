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
OUT_DIR = BASE_DIR / "producao_yt" / "cafeteria_assets" / "ep2b"
AUDIO_DIR = OUT_DIR / "audio"
OUT_DIR.mkdir(parents=True, exist_ok=True)
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

VOICES = {
    "eliezer": "pt-BR-AntonioNeural",
    "leigo": "pt-BR-ThalitaMultilingualNeural",
    "ia": "pt-BR-FranciscaNeural"
}

DIALOGUES = [
    # --- ATO 1: O SEGUNDO PASSO METODOLÓGICO (SLIDE 1) ---
    {
        "id": "seg_01_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 1,
        "chat": False,
        "text": "Eliézer, no episódio dois nós vimos as telas funcionais da cafeteria. Mas do ponto de vista da orquestração metodológica: como o desenvolvedor e a IA modelam o banco de dados e as entidades sem escrever nenhuma linha de código SQL prematuro?"
    },
    {
        "id": "seg_02_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 1,
        "chat": False,
        "text": "Esse é o Segundo Passo Sagrado do Paradigma IDD: a Construção do Modelo Entidade-Relacionamento do Negócio! A inteligência artificial mapeia as entidades do restaurante, as cardinalidades e as dependências puras, mantendo o desenvolvedor e o empreendedor no comando da arquitetura sem escovação de bits."
    },

    # --- ATO 2: AS ENTIDADES & RELACIONAMENTOS DO RESTAURANTE (SLIDE 2) ---
    {
        "id": "seg_03_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 2,
        "chat": False,
        "text": "Vejam no Slide 2 como a IA estruturou o diagrama conceitual: Mesas, Comandas, Itens do Pedido, Produtos do Cardápio e a tabela de Receitas ligada aos Ingredientes da despensa!"
    },
    {
        "id": "seg_04_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 2,
        "chat": False,
        "text": "Perceba a elegância: a entidade Produto se relaciona com Ingrediente através de uma relação muitos-para-muitos chamada Receita. É essa amarração relacional que permite ao sistema saber exatamente quantos gramas de café especial ou mililitros de leite cada pedido consome!"
    },

    # --- ATO 3: TERMINAL DA IA & GOVERNANÇA DE SNAPSHOT HISTÓRICO DE PREÇOS (SLIDE 3) ---
    {
        "id": "seg_05_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 3,
        "chat": False,
        "text": "E no Slide 3 a inteligência artificial expõe um dilema contábil clássico que destrói muitos sistemas: o que acontece quando o preço do cardápio muda? Vamos acompanhar a consulta ao orquestrador no terminal!"
    },
    {
        "id": "seg_06_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "avatar": "ia",
        "slide": 3,
        "chat": True,
        "text": "Orquestrador Eliézer e Usuária Leiga, ao modelar o MER da cafeteria, identifiquei uma armadilha relacional: se o valor do café espresso for reajustado de oito para dez reais no cardápio na próxima semana, os relatórios de comandas do mês passado sofrerão mutação indevida caso o item aponte apenas para o preço atual do produto. Como devemos modelar essa persistência?"
    },
    {
        "id": "seg_07_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 3,
        "chat": True,
        "text": "Decisão de governança: Invariante de Snapshot Histórico Obrigatório! A entidade 'Item da Comanda' deve gravar uma cópia imutável do preço unitário cobrado no instante exato da compra. O passado contábil é sagrado e jamais pode sofrer mutação por alterações futuras do cardápio."
    },
    {
        "id": "seg_08_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "avatar": "ia",
        "slide": 3,
        "chat": True,
        "text": "Regra de Snapshot Histórico incorporada ao MER preliminar. Cardinalidades auditadas com integridade referencial garantida. O compilador aguarda autorização para o terceiro passo: Modelagem Comportamental UML e Geração do Código Vivo!"
    },

    # --- ATO 4: SÍNTESE E PRÓXIMO PASSO (SLIDE 4) ---
    {
        "id": "seg_09_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 4,
        "chat": False,
        "text": "Que tranquilidade! O banco de dados nasce blindado contra erros contábeis sem termos precisado escrever CREATE TABLE na mão!"
    },
    {
        "id": "seg_10_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 4,
        "chat": False,
        "text": "No Episódio 3 e 3B, entraremos na etapa mais esperada: a Modelagem UML com diagramas de classe e máquina de estados, e a compilação do Código Vivo em SQL e TypeScript com rastreabilidade total às invariantes! Até lá!"
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
    print("🎙️ GERANDO ÁUDIO NEURAL CAFETERIA - EP. 2B (METODOLOGIA: MER DO NEGÓCIO COM IA)")
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
            "projectName": "Cafeteria_Ep2B",
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
