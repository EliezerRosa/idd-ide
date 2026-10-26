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
OUT_DIR = BASE_DIR / "producao_yt" / "barbearia_assets" / "ep4c"
AUDIO_DIR = OUT_DIR / "audio"
OUT_DIR.mkdir(parents=True, exist_ok=True)
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

VOICES = {
    "eliezer": "pt-BR-AntonioNeural",
    "leigo": "pt-BR-ThalitaMultilingualNeural",
    "ia": "pt-BR-FranciscaNeural"
}

DIALOGUES = [
    # --- ATO 1: CÓDIGO VIVO & FUNÇÕES PURAS DE AGENDA (SLIDE 1) ---
    {
        "id": "seg_01_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 1,
        "chat": False,
        "text": "Eliézer, chegamos na fase de código vivo da Barbearia! Como transformar os modelos visuais em um motor de software puro, que impede que dois clientes agendem a mesma cadeira ao mesmo tempo?"
    },
    {
        "id": "seg_02_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 1,
        "chat": False,
        "text": "No Paradigma IDD, nós não confiamos em travas frágeis de banco ou verificações manuais no frontend. Toda a lógica de agendamento é encapsulada em Funções Puras determinísticas, onde intervalos de tempo são tratados como tipos primitivos imutáveis e testados matematicamente!"
    },

    # --- ATO 2: O DECORADOR @invariant EM RUNTIME (SLIDE 2) ---
    {
        "id": "seg_03_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 2,
        "chat": False,
        "text": "Vejam na tela o editor de código: o método confirmarAgendamento possui o decorador arroba invariant! IA Compilador, como ele blinda o negócio?"
    },
    {
        "id": "seg_04_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "avatar": "ia",
        "slide": 2,
        "chat": False,
        "text": "O decorador atua em tempo de execução como uma barreira intransponível. Antes da alocação, ele valida se o intervalo de tempo solicitado não possui intersecção temporal com nenhum agendamento prévio do barbeiro. E no retorno, ele assegura que a comanda vinculada já foi inicializada com o snapshot de comissão. Se qualquer condição for violada, a operação aborta instantaneamente!"
    },

    # --- ATO 3: 200 TESTES DE ESTRESSE & CONCORRÊNCIA (SLIDE 3) ---
    {
        "id": "seg_05_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 3,
        "chat": False,
        "text": "E se houver dezenas de clientes tentando reservar o mesmo horário de sexta-feira às dezenove horas?"
    },
    {
        "id": "seg_06_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "avatar": "ia",
        "slide": 3,
        "chat": True,
        "text": "Executando agora a suíte de testes de estresse com duzentas simulações de alta concorrência! Cenários extremos: múltiplos acessos simultâneos, tentativas de cancelamento fora de prazo e cálculo de comissões centavo por centavo. Duzentos testes executados: duzentos aprovados com taxa de sucesso de cem por cento e zero conflitos de agenda!"
    },
    {
        "id": "seg_07_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 3,
        "chat": True,
        "text": "Implementação e suíte de testes formalmente homologadas! Essa é a garantia do Paradigma IDD: software em produção sem surpresas, sem bugs e com estabilidade inabalável."
    },

    # --- ATO 4: SÍNTESE & TRILHA DA CAFETERIA (SLIDE 4) ---
    {
        "id": "seg_08_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 4,
        "chat": False,
        "text": "Com o 2C de MER, o 3C de UML e o 4C de Código Vivo, a trilha da Barbearia & Salão está completamente consagrada!"
    },
    {
        "id": "seg_09_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 4,
        "chat": False,
        "text": "Isso mesmo! E agora vamos aplicar esse mesmo padrão de excelência na trilha de Cafeteria & Padaria. Confiram todas as nossas playlists oficiais e dominem o Paradigma IDD!"
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
    print("🎙️ GERANDO ÁUDIO NEURAL BARBEARIA - EP. 4C (CÓDIGO VIVO & INVARIANTES)")
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
        "episode": "4C",
        "title": "Implementação Completa: Funções Puras & Métodos Amarrados às Invariantes",
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
