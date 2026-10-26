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
OUT_DIR = BASE_DIR / "producao_yt" / "racha_assets" / "ep4c"
AUDIO_DIR = OUT_DIR / "audio"
OUT_DIR.mkdir(parents=True, exist_ok=True)
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

VOICES = {
    "eliezer": "pt-BR-AntonioNeural",
    "leigo": "pt-BR-ThalitaMultilingualNeural",
    "ia": "pt-BR-FranciscaNeural"
}

DIALOGUES = [
    # --- ATO 1: INTRODUÇÃO AO CÓDIGO VIVO & FUNÇÕES PURAS (SLIDE 1) ---
    {
        "id": "seg_01_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 1,
        "chat": False,
        "text": "Eliézer, chegamos ao ponto culminante da arquitetura! Depois de definir as Intenções no 1B, o MER Canônico no 2C e o UML padrão oficial no 3C: como esse modelo se transforma em código vivo sem risco de bugs?"
    },
    {
        "id": "seg_02_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 1,
        "chat": False,
        "text": "No Paradigma IDD, a geração de código não é um ato de adivinhação. O código é puramente determinístico, composto por funções puras e métodos amarrados às invariantes de negócio! Vejam no editor: nenhuma dependência mágica, nenhum estado global mutável, tudo previsível e auditável."
    },

    # --- ATO 2: DECORADOR @invariant & MÉTODOS AMARRADOS (SLIDE 2) ---
    {
        "id": "seg_03_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 2,
        "chat": False,
        "text": "Vejam que impressionante esse decorador arroba invariant em cima da função calcularRateio! IA Compilador, como ele garante que nenhum centavo se perca na execução?"
    },
    {
        "id": "seg_04_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "avatar": "ia",
        "slide": 2,
        "chat": False,
        "text": "O decorador de invariante atua como um fiscal em tempo real de execução. Antes de rodar, ele valida pré-condições: mesa ativa e participantes válidos. Ao término, ele executa a asserção matemática da Invariante Universal: o somatório rigoroso de cada cota individual gerada tem que ser estritamente igual ao valor total da comanda. Se houver desvio de um único centavo, o sistema lança InvariantViolationException e aborta a operação!"
    },

    # --- ATO 3: 200 TESTES DE ESTRESSE & PROPERTY-BASED TESTING (SLIDE 3) ---
    {
        "id": "seg_05_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 3,
        "chat": False,
        "text": "E como o código se comporta em cenários difíceis, como dízimas periódicas onde cem reais são divididos entre três pessoas?"
    },
    {
        "id": "seg_06_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "avatar": "ia",
        "slide": 3,
        "chat": True,
        "text": "Disparando suíte de testes de estresse com duzentos cenários de fuzzing no terminal! Nosso algoritmo de partição de centavos distribui os restos de forma determinística por ordem de prioridade. Duzentos testes executados: duzentos aprovados com sucesso absoluto, zero centavos perdidos e hash de integridade validado!"
    },
    {
        "id": "seg_07_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 3,
        "chat": True,
        "text": "Código e suíte de testes formalmente homologados! É assim que eliminamos o medo de deploy: a matemática valida o modelo, o compilador amarra os contratos e o código nasce blindado para produção."
    },

    # --- ATO 4: SÍNTESE & EVOLUÇÃO PARA AS DEMAIS TRILHAS (SLIDE 4) ---
    {
        "id": "seg_08_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 4,
        "chat": False,
        "text": "Com Intenções, MER, UML e Código Vivo com duzentos testes, a trilha do Racha de Pix atinge a perfeição do Paradigma IDD!"
    },
    {
        "id": "seg_09_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 4,
        "chat": False,
        "text": "Exatamente! E aplicaremos essa mesma maestria nos episódios de aprofundamento das trilhas de Barbearia e Cafeteria. Acompanhem cada vídeo das nossas playlists oficiais e dominem o futuro do desenvolvimento guiado por intenção!"
    }
]

def get_audio_duration(file_path):
    cmd = [
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        str(file_path)
    ]
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
    return float(result.stdout.strip())

async def synthesize_all():
    print("=" * 70)
    print("🎙️ GERANDO ÁUDIO NEURAL RACHA DE PIX - EP. 4C (CÓDIGO VIVO & INVARIANTES)")
    print("=" * 70)

    timeline_items = []
    current_time = 0.5 # Margem inicial de respiro

    for idx, item in enumerate(DIALOGUES):
        seg_id = item["id"]
        voice = VOICES[item["who"]]
        text = item["text"]
        out_file = AUDIO_DIR / f"{seg_id}.mp3"

        print(f"[{idx+1}/{len(DIALOGUES)}] Sintetizando {seg_id} ({item['actor']})...")
        communicate = edge_tts.Communicate(text, voice)
        await communicate.save(str(out_file))

        dur = get_audio_duration(out_file)
        start_sec = round(current_time, 2)
        end_sec = round(start_sec + dur, 2)
        current_time = end_sec + 0.65 # Intervalo confortável de fala

        print(f"       Duração: {dur:.2f}s | Início: {start_sec:.2f}s -> Fim: {end_sec:.2f}s")

        timeline_items.append({
            "id": seg_id,
            "who": item["who"],
            "actor": item["actor"],
            "slide": item["slide"],
            "chat": item["chat"],
            "startSec": start_sec,
            "endSec": end_sec,
            "durationSec": round(dur, 2),
            "text": text,
            "file": f"audio/{seg_id}.mp3"
        })

    total_duration = round(current_time + 1.5, 2)
    print(f"\nDuração Total do Roteiro: {total_duration}s (~{(total_duration/60):.1f} min)")

    timeline_data = {
        "episode": "4C",
        "title": "Implementação Completa: Funções Puras & Métodos Amarrados às Invariantes",
        "totalDurationSec": total_duration,
        "items": timeline_items
    }

    timeline_path = OUT_DIR / "timeline.json"
    with open(timeline_path, "w", encoding="utf-8") as f:
        json.dump(timeline_data, f, indent=2, ensure_ascii=False)
    print(f"[OK] Timeline salva em: {timeline_path}")

    # Monta a trilha master com FFmpeg
    print("\nMontando Trilha Sonora Master com EBU R128 (-14 LUFS)...")
    concat_list_file = OUT_DIR / "concat_list.txt"
    with open(concat_list_file, "w", encoding="utf-8") as f:
        for idx, item in enumerate(timeline_items):
            audio_path = AUDIO_DIR / f"{item['id']}.mp3"
            f.write(f"file '{audio_path.name}'\n")

    # Criamos o áudio contínuo usando delays exatos via concat ou filter
    # Abordagem padronizada de concatenação com silêncios ajustados
    filter_inputs = []
    filter_parts = []
    for idx, item in enumerate(timeline_items):
        audio_path = AUDIO_DIR / f"{item['id']}.mp3"
        filter_inputs.extend(["-i", str(audio_path)])
        delay_ms = int(item["startSec"] * 1000)
        filter_parts.append(f"[{idx}:a]adelay={delay_ms}|{delay_ms}[a{idx}];")

    amix_inputs = "".join([f"[a{i}]" for i in range(len(timeline_items))])
    filter_complex = "".join(filter_parts) + f"{amix_inputs}amix=inputs={len(timeline_items)}:dropout_transition=0:normalize=0[aout]"

    raw_voice = OUT_DIR / "raw_voice_master.wav"
    cmd_mix = [
        "ffmpeg", "-y",
        *filter_inputs,
        "-filter_complex", filter_complex,
        "-map", "[aout]",
        "-c:a", "pcm_s16le",
        "-ar", "48000",
        "-t", str(total_duration),
        str(raw_voice)
    ]
    subprocess.run(cmd_mix, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

    # Master final normalizado para streaming (-14 LUFS)
    master_wav = OUT_DIR / "master_soundtrack.wav"
    cmd_loudnorm = [
        "ffmpeg", "-y",
        "-i", str(raw_voice),
        "-af", "loudnorm=I=-14:LRA=7:tp=-1.0",
        "-c:a", "pcm_s16le",
        str(master_wav)
    ]
    subprocess.run(cmd_loudnorm, check=True)

    size_mb = master_wav.stat().st_size / (1024 * 1024)
    print(f"\n[OK] Trilha Master Estúdio Finalizada: {master_wav}")
    print(f"     Tamanho: {size_mb:.1f} MB | Loudness: -14 LUFS\n")

if __name__ == "__main__":
    asyncio.run(synthesize_all())
