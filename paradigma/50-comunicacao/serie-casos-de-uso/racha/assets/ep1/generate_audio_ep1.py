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
OUT_DIR = BASE_DIR / "producao_yt" / "racha_assets" / "ep1"
AUDIO_DIR = OUT_DIR / "audio"
OUT_DIR.mkdir(parents=True, exist_ok=True)
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

VOICES = {
    "eliezer": "pt-BR-AntonioNeural",
    "leigo": "pt-BR-ThalitaMultilingualNeural",
    "ia": "pt-BR-FranciscaNeural"
}

DIALOGUES = [
    # --- ATO 1: O CAOS DA CONTA NA MESA (SLIDE 1) ---
    {
        "id": "seg_01_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 1,
        "chat": False,
        "text": "Quem nunca passou pelo constrangimento na hora de fechar a conta no restaurante ou no barzinho? O garçom traz aquela notinha de papel, alguém abre a calculadora do celular, um bebeu chope artesanal, outro só tomou água, a conta não fecha e sobra sempre para o mesmo pagar o prejuízo!"
    },
    {
        "id": "seg_02_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 1,
        "chat": False,
        "text": "Esse é um dos problemas mais universais e estressantes do convívio social! Bem-vindos à nossa terceira playlist oficial da Série IDD na Prática: Quem Paga o Quê: o Aplicativo de Racha de Conta e Divisão de Pix! Vamos mostrar como o Paradigma IDD resolve essa dor de ponta a ponta com rigor matemático absoluto."
    },

    # --- ATO 2: A INVARIANTE SAGRADA DA SOMA ZERO (SLIDE 2) ---
    {
        "id": "seg_03_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 2,
        "chat": False,
        "text": "Vejam no Slide 2 qual é o grande segredo: a Invariante Sagrada da Soma Zero! Cada item consumido na mesa, seja uma pizza compartilhada ou uma porção individual, é atribuído com precisão a quem realmente consumiu."
    },
    {
        "id": "seg_04_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 2,
        "chat": False,
        "text": "Exatamente! A taxa de serviço de dez por cento é rateada de forma estritamente proporcional ao consumo de cada um. E a soma do que todos pagam tem que bater no centavo exato com a nota do restaurante. Margem de erro permitida: zero centavos!"
    },

    # --- ATO 3: TERMINAL DA IA & O DILEMA DOS CENTAVOS (SLIDE 3) ---
    {
        "id": "seg_05_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 3,
        "chat": False,
        "text": "E no Slide 3 a inteligência artificial já compila o modelo do problema no terminal e expõe o dilema clássico da divisão de centavos!"
    },
    {
        "id": "seg_06_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "avatar": "ia",
        "slide": 3,
        "chat": True,
        "text": "Compilando domínio do Racha de Conta: quando dividimos um item de dez reais entre três pessoas, a divisão fracionária resulta em três reais e trinta e três centavos periódicos, totalizando nove reais e noventa e nove centavos. Como resolver o centavo indivisível sem violar a Invariante da Soma Zero?"
    },
    {
        "id": "seg_07_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 3,
        "chat": True,
        "text": "Diretriz de domínio IDD: o resto da divisão em centavos inteiros é distribuído sequencialmente entre os consumidores participantes! Dois pagam três e trinta e três e um paga três e trinta e quatro. A soma dá exatamente dez reais e a integridade financeira é preservada sem perdas!"
    },

    # --- ATO 4: O QUE VAMOS CONSTRUIR & PRÓXIMO EPISÓDIO (SLIDE 4) ---
    {
        "id": "seg_08_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 4,
        "chat": False,
        "text": "Que elegância! Cada participante vê exatamente a sua cota justa na tela do celular e paga na hora via Pix Copia e Cola ou QR Code direto para o responsável da mesa!"
    },
    {
        "id": "seg_09_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 4,
        "chat": False,
        "text": "No próximo episódio, o Um B Metodológico, vamos mostrar como extrair e formalizar as intenções e as invariantes sagradas de rateio com a inteligência artificial antes de escrever qualquer código. Acompanhe a nossa esteira e venha para o próximo vídeo!"
    }
]

async def generate_speech(text, voice, out_path):
    communicate = edge_tts.Communicate(text, voice, rate="+2%", pitch="+0Hz")
    await communicate.save(out_path)

def get_audio_duration(file_path):
    cmd = [
        "ffprobe", "-v", "error", "-show_entries",
        "format=duration", "-of", "default=noprint_wrappers=1:nokey=1",
        str(file_path)
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
    return float(res.stdout.strip())

async def main():
    print("=" * 70)
    print("🎙️ GERANDO ÁUDIO NEURAL RACHA PIX - EP. 1 (DOMÍNIO & SOMA ZERO)")
    print("=" * 70)

    timeline_items = []
    current_time = 0.5
    concat_list = []

    for idx, item in enumerate(DIALOGUES):
        audio_name = f"{item['id']}.wav"
        audio_path = AUDIO_DIR / audio_name
        voice = VOICES[item["who"]]

        print(f"[{idx+1}/{len(DIALOGUES)}] Sintetizando {item['id']} ({item['actor']})...")
        await generate_speech(item["text"], voice, str(audio_path))

        dur = get_audio_duration(audio_path)
        end_time = current_time + dur

        timeline_items.append({
            "index": idx,
            "id": item["id"],
            "who": item["who"],
            "actor": item["actor"],
            "avatar": item["avatar"],
            "slide": item["slide"],
            "chat": item["chat"],
            "text": item["text"],
            "wav": str(audio_path),
            "startSec": round(current_time, 3),
            "durSec": round(dur, 3),
            "endSec": round(end_time, 3)
        })

        print(f"       Duração: {dur:.2f}s | Início: {current_time:.2f}s -> Fim: {end_time:.2f}s")
        concat_list.append(audio_path)
        current_time = end_time + 0.65

    timeline_data = {
        "projectName": "Racha_Ep1",
        "totalDurationSec": round(current_time + 1.5, 2),
        "items": timeline_items
    }

    print(f"\nDuração Total do Roteiro: {timeline_data['totalDurationSec']}s (~{timeline_data['totalDurationSec']/60:.1f} min)")

    with open(OUT_DIR / "timeline.json", "w", encoding="utf-8") as f:
        json.dump(timeline_data, f, indent=2, ensure_ascii=False)
    print(f"[OK] Timeline salva em: {OUT_DIR / 'timeline.json'}")

    concat_file = OUT_DIR / "audio_concat.txt"
    with open(concat_file, "w", encoding="utf-8") as f:
        for p in concat_list:
            safe_p = str(p).replace("\\", "/")
            f.write(f"file '{safe_p}'\n")

    raw_voice = OUT_DIR / "raw_voice_master.wav"
    ffmpeg_concat = [
        "ffmpeg", "-y", "-f", "concat", "-safe", "0",
        "-i", str(concat_file), "-c", "copy", str(raw_voice)
    ]
    subprocess.run(ffmpeg_concat, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

    master_soundtrack = OUT_DIR / "master_soundtrack.wav"
    print("\nMontando Trilha Sonora Master com EBU R128 (-14 LUFS)...")
    ffmpeg_master = [
        "ffmpeg", "-y",
        "-i", str(raw_voice),
        "-filter_complex",
        "[0:a]loudnorm=I=-14:LRA=7:TP=-1[out]",
        "-map", "[out]",
        str(master_soundtrack)
    ]
    subprocess.run(ffmpeg_master, check=True)

    size_mb = master_soundtrack.stat().st_size / (1024 * 1024)
    print(f"\n[OK] Trilha Master Estúdio Finalizada: {master_soundtrack}")
    print(f"     Tamanho: {size_mb:.1f} MB | Loudness: -14 LUFS\n")

if __name__ == "__main__":
    asyncio.run(main())
