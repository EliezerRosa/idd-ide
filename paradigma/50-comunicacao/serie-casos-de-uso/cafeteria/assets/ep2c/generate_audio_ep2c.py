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
OUT_DIR = BASE_DIR / "producao_yt" / "cafeteria_assets" / "ep2c"
AUDIO_DIR = OUT_DIR / "audio"
OUT_DIR.mkdir(parents=True, exist_ok=True)
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

VOICES = {
    "eliezer": "pt-BR-AntonioNeural",
    "leigo": "pt-BR-ThalitaMultilingualNeural",
    "ia": "pt-BR-FranciscaNeural"
}

DIALOGUES = [
    # --- ATO 1: O MODELO CANÔNICO CROW'S FOOT NA CAFETERIA (SLIDE 1) ---
    {
        "id": "seg_01_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 1,
        "chat": False,
        "text": "Eliézer, no negócio da Cafeteria e Padaria nós temos insumos, fichas técnicas de cafés e pães, e pedidos rápidos de balcão. Como desenhar o MER COMPLETO com padrão oficial pé de galinha para não perder o controle do estoque?"
    },
    {
        "id": "seg_02_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 1,
        "chat": False,
        "text": "Vejam na tela o Diagrama Entidade-Relacionamento Canônico na notação Crow's Foot! Temos as entidades mestres: Cliente, ItemCardapio e Insumo. Observem a cardinalidade pé de galinha: um item do cardápio consome muitos insumos através da Ficha Técnica, e cada insumo é controlado por lotes de validade estritos!"
    },

    # --- ATO 2: FICHA TÉCNICA, ENTIDADES DERIVADAS & 3FN (SLIDE 2) ---
    {
        "id": "seg_03_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 2,
        "chat": False,
        "text": "E como o banco trata o pedido do cliente quando ele pede um cappuccino especial com leite vegetal e dose extra de café?"
    },
    {
        "id": "seg_04_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "avatar": "ia",
        "slide": 2,
        "chat": False,
        "text": "Exibindo a modelagem de entidades derivadas e normalização em Terceira Forma Normal! O Pedido se decompõe em ItemPedido. Cada item invoca a associativa FichaTecnica para deduzir gramas de pó de café e mililitros de leite dos Lotes de Estoque. O custo do insumo é congelado em snapshot na venda, eliminando qualquer dependência transitiva contábil!"
    },

    # --- ATO 3: NORMALIZAÇÃO & INVARIANTES DE DADOS (SLIDE 3) ---
    {
        "id": "seg_05_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 3,
        "chat": False,
        "text": "Vejam no terminal da IA a Matriz de Invariantes de Dados da Cafeteria: Primeira, Segunda, Terceira Forma Normal e a proibição matemática de estoque negativo!"
    },
    {
        "id": "seg_06_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "avatar": "ia",
        "slide": 3,
        "chat": True,
        "text": "Submetendo a Matriz de Invariantes de Dados da Padaria. Invariante 1: Atomicidade de insumos em 1FN. Invariante 2: Chave composta na Ficha Técnica em 2FN. Invariante 3: Snapshot auditável de custo em 3FN. Invariante 4: Restrição de Estoque Positivo, impedindo a confirmação de pedidos se a receita exigir insumo indisponível. Posso homologar o modelo de dados?"
    },
    {
        "id": "seg_07_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 3,
        "chat": True,
        "text": "Modelo Entidade-Relacionamento e Matriz de Invariantes homologados! Com essa base relacional, a padaria nunca vende o que não tem e controla cada grama de farinha e grão de café."
    },

    # --- ATO 4: RUMO AO UML DA CAFETERIA (SLIDE 4) ---
    {
        "id": "seg_08_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 4,
        "chat": False,
        "text": "Com a estrutura de dados imune a furos de estoque, o caminho está aberto para a engenharia de software no UML!"
    },
    {
        "id": "seg_09_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 4,
        "chat": False,
        "text": "Com certeza! No Episódio 3C, vamos explorar o Diagrama UML Completo da Cafeteria: Casos de Uso, Classes nos 3 compartimentos e o Statechart de preparo na cozinha. Acompanhem a série!"
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
    print("🎙️ GERANDO ÁUDIO NEURAL CAFETERIA - EP. 2C (MER COMPLETO: CROW'S FOOT)")
    print("=" * 70)

    timeline_items = []
    current_time = 0.5

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
        current_time = end_sec + 0.65

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
        "episode": "2C",
        "title": "MER Completo: Entidades Derivadas, Ficha Técnica & Invariantes de Dados",
        "totalDurationSec": total_duration,
        "items": timeline_items
    }

    timeline_path = OUT_DIR / "timeline.json"
    with open(timeline_path, "w", encoding="utf-8") as f:
        json.dump(timeline_data, f, indent=2, ensure_ascii=False)
    print(f"[OK] Timeline salva em: {timeline_path}")

    print("\nMontando Trilha Sonora Master com EBU R128 (-14 LUFS)...")
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
