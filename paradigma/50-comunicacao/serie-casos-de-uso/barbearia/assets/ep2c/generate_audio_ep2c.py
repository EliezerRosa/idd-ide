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
OUT_DIR = BASE_DIR / "producao_yt" / "barbearia_assets" / "ep2c"
AUDIO_DIR = OUT_DIR / "audio"
OUT_DIR.mkdir(parents=True, exist_ok=True)
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

VOICES = {
    "eliezer": "pt-BR-AntonioNeural",
    "leigo": "pt-BR-ThalitaMultilingualNeural",
    "ia": "pt-BR-FranciscaNeural"
}

DIALOGUES = [
    # --- ATO 1: O MODELO ENTIDADE-RELACIONAMENTO CANÔNICO (SLIDE 1) ---
    {
        "id": "seg_01_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 1,
        "chat": False,
        "text": "Eliézer, no sistema da Barbearia e Salão, nós vimos os conceitos no Episódio 2B. Mas para construir um banco de dados profissional, precisamos ver o MER COMPLETO com o padrão gráfico canônico pé de galinha, entidades derivadas e relacionamentos estritos!"
    },
    {
        "id": "seg_02_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 1,
        "chat": False,
        "text": "Perfeito! Observem na tela a notação Crow's Foot oficial. Temos as entidades centrais: Cliente, Barbeiro, Serviço e a entidade associativa Agendamento. Um cliente pode possuir zero ou muitos agendamentos, mas cada agendamento pertence a um único cliente e a um único barbeiro no mesmo instante de tempo!"
    },

    # --- ATO 2: ENTIDADES DERIVADAS, COMISSÕES & SNAPSHOT FISCAL (SLIDE 2) ---
    {
        "id": "seg_03_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 2,
        "chat": False,
        "text": "E como o modelo resolve o pagamento dos serviços e a comissão do barbeiro sem criar dependências perigosas no banco?"
    },
    {
        "id": "seg_04_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "avatar": "ia",
        "slide": 2,
        "chat": False,
        "text": "Exibindo a modelagem de entidades derivadas e normalização até a Terceira Forma Normal! A entidade ComandaAtendimento se relaciona com a associativa ItemComanda para múltiplos serviços e insumos. Para eliminar dependências transitivas, a comissão do barbeiro é gravada como snapshot imutável na comanda. Se o percentual de comissão do barbeiro for renegociado no futuro, o histórico financeiro passado permanece inviolável!"
    },

    # --- ATO 3: NORMALIZAÇÃO & INVARIANTES DE DADOS (SLIDE 3) ---
    {
        "id": "seg_05_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 3,
        "chat": False,
        "text": "Vejam no terminal da IA as Invariantes Universais de Projeto sendo validadas: Primeira, Segunda e Terceira Forma Normal e a exclusividade de horário da cadeira!"
    },
    {
        "id": "seg_06_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "avatar": "ia",
        "slide": 3,
        "chat": True,
        "text": "Submetendo a Matriz de Invariantes de Dados do Salão. Regra 1: Atomicidade rigorosa de serviços em 1FN. Regra 2: Chave primária composta na associativa em 2FN. Regra 3: Snapshot financeiro auditável em 3FN. Regra 4: Invariante Temporal de Cadeira, impedindo sobreposição de agendamentos no mesmo slot de horário. Orquestrador Eliézer Rosa, posso homologar o modelo de dados?"
    },
    {
        "id": "seg_07_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 3,
        "chat": True,
        "text": "Modelo de Entidade-Relacionamento e Matriz de Invariantes de Dados formalmente aprovados! Nenhuma cadeira terá conflito de agenda e nenhuma comissão será perdida."
    },

    # --- ATO 4: RUMO AO UML COMPLETO (SLIDE 4) ---
    {
        "id": "seg_08_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 4,
        "chat": False,
        "text": "Com o banco de dados blindado pelo MER canônico, a fundação está pronta para a modelagem comportamental!"
    },
    {
        "id": "seg_09_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 4,
        "chat": False,
        "text": "Com certeza! E no próximo episódio, o 3C, vamos mergulhar no Diagrama UML Completo da Barbearia, de Atores a Métodos, no padrão oficial da OMG. Continuem conosco!"
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
    print("🎙️ GERANDO ÁUDIO NEURAL BARBEARIA - EP. 2C (MER COMPLETO: CROW'S FOOT)")
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
        "title": "MER Completo: Entidades Derivadas, Normalização & Invariantes de Dados",
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
