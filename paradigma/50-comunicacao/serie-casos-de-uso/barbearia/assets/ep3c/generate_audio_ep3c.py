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
OUT_DIR = BASE_DIR / "producao_yt" / "barbearia_assets" / "ep3c"
AUDIO_DIR = OUT_DIR / "audio"
OUT_DIR.mkdir(parents=True, exist_ok=True)
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

VOICES = {
    "eliezer": "pt-BR-AntonioNeural",
    "leigo": "pt-BR-ThalitaMultilingualNeural",
    "ia": "pt-BR-FranciscaNeural"
}

DIALOGUES = [
    # --- ATO 1: CASOS DE USO & ATORES CANÔNICOS (SLIDE 1) ---
    {
        "id": "seg_01_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 1,
        "chat": False,
        "text": "Eliézer, após blindar o banco de dados da Barbearia no 2C, queremos ver o UML COMPLETO no padrão oficial da OMG: Atores, Limites do Sistema e Casos de Uso com relações estritas de include e extend!"
    },
    {
        "id": "seg_02_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 1,
        "chat": False,
        "text": "Vejam na tela o Diagrama de Casos de Uso oficial da Barbearia! Nossos atores são o Cliente que agenda, o Barbeiro que executa o serviço e o Gateway de Pagamento. Observem os casos de uso: Agendar Horário, Cancelar Agendamento que possui uma relação de extensão extend para aplicar taxa de cancelamento tardio, e Faturar Comanda que obrigatoriamente inclui a geração do snapshot auditável de comissão!"
    },

    # --- ATO 2: DIAGRAMA DE CLASSES NOS 3 COMPARTIMENTOS OFICIAIS (SLIDE 2) ---
    {
        "id": "seg_03_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 2,
        "chat": False,
        "text": "E como esses comportamentos são traduzidos em classes com visibilidade privada de atributos e métodos com assinaturas puras?"
    },
    {
        "id": "seg_04_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "avatar": "ia",
        "slide": 2,
        "chat": False,
        "text": "Exibindo o Diagrama de Classes nos três compartimentos canônicos da UML! No compartimento superior, os estereótipos de entidade e agregado; no compartimento central, os atributos privados tipados menos: menos id, menos horarioInicio, menos snapshotComissaoCentavos; e no compartimento inferior, os métodos com mais: mais confirmarAgendamento, mais faturarComanda e mais calcularComissaoBarbeiro com retornos imutáveis!"
    },

    # --- ATO 3: STATECHART DO AGENDAMENTO & TERMINAL (SLIDE 3) ---
    {
        "id": "seg_05_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 3,
        "chat": False,
        "text": "Vejam no Slide 3 a Máquina de Estados do Agendamento: as transições com guardas entre colchetes e a validação em tempo real no terminal da IA!"
    },
    {
        "id": "seg_06_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "avatar": "ia",
        "slide": 3,
        "chat": True,
        "text": "Submetendo a Matriz de Invariantes Comportamentais do Salão. Guarda 1: Agendamento só transita para Confirmado se a cadeira estiver livre no slot. Guarda 2: Bloqueio de cancelamento sem taxa se a antecedência for inferior a duas horas. Guarda 3: Estado final Concluído exige liquidação total da comanda. Posso homologar a máquina de estados?"
    },
    {
        "id": "seg_07_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 3,
        "chat": True,
        "text": "Invariantes comportamentais homologadas! O sistema não permite estados inconsistentes nem atendimentos fantasmas."
    },

    # --- ATO 4: RUMO AO CÓDIGO VIVO (SLIDE 4) ---
    {
        "id": "seg_08_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 4,
        "chat": False,
        "text": "Com os Casos de Uso, as Classes e a Máquina de Estados formalmente homologados, a Barbearia tem sua arquitetura comportamental completa!"
    },
    {
        "id": "seg_09_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 4,
        "chat": False,
        "text": "Exato! E no Episódio 4C, vamos ver o Código Vivo da Barbearia compilado com o decorador de invariantes em runtime e testes de estresse de agenda. Não percam!"
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
    print("🎙️ GERANDO ÁUDIO NEURAL BARBEARIA - EP. 3C (UML COMPLETO: OMG STANDARD)")
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
        "episode": "3C",
        "title": "UML Completo: Atores, Classes, Casos de Uso, Estados & Métodos",
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
