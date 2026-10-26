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
OUT_DIR = BASE_DIR / "producao_yt" / "racha_assets" / "ep1b"
AUDIO_DIR = OUT_DIR / "audio"
OUT_DIR.mkdir(parents=True, exist_ok=True)
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

VOICES = {
    "eliezer": "pt-BR-AntonioNeural",
    "leigo": "pt-BR-ThalitaMultilingualNeural",
    "ia": "pt-BR-FranciscaNeural"
}

DIALOGUES = [
    # --- ATO 1: A METODOLOGIA DO 1º PASSO (SLIDE 1) ---
    {
        "id": "seg_01_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 1,
        "chat": False,
        "text": "Eliézer, no episódio um nós vimos como é doloroso dividir a conta no papel. Mas como uma pessoa leiga, que não entende de programação, consegue sentar com a inteligência artificial e definir essas regras de rateio de forma infalível?"
    },
    {
        "id": "seg_02_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 1,
        "chat": False,
        "text": "Esse é o Primeiro Passo Sagrado da Metodologia IDD: a Extração de Intenções e Invariantes de Negócio! Você não pede para a IA gerar código nem desenhar telas logo de cara. Primeiro, você ensina para a IA quais são as leis sagradas do seu problema que nunca podem ser violadas sob nenhuma hipótese."
    },

    # --- ATO 2: AS TRÊS INVARIANTES SAGRADAS DO RACHA (SLIDE 2) ---
    {
        "id": "seg_03_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 2,
        "chat": False,
        "text": "Vejam no Slide 2 as três invariantes fundamentais do Racha de Conta: primeiro, a Soma Zero, onde o total das cotas é igual ao total da nota; segundo, a Não-Cobrança Indevida, onde ninguém paga por item que não consumiu; e terceiro, a Distribuição Atômica de Centavos!"
    },
    {
        "id": "seg_04_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 2,
        "chat": False,
        "text": "Perfeito! Quando essas três leis estão blindadas na mente da IA, ela é incapaz de cometer erros clássicos de arredondamento ou de criar brechas onde um amigo sai no prejuízo. A matemática governa o sistema."
    },

    # --- ATO 3: O TERMINAL DA IA & O CONTRATO DE INTENÇÕES (SLIDE 3) ---
    {
        "id": "seg_05_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 3,
        "chat": False,
        "text": "E no Slide 3 a inteligência artificial valida o contrato de intenções do rateio no terminal. Vamos acompanhar a compilação das regras!"
    },
    {
        "id": "seg_06_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "avatar": "ia",
        "slide": 3,
        "chat": True,
        "text": "Compilador IDD processando o Contrato de Intenções do Racha de Pix. Detectei três regras invariantes: cada item possui conjunto estrito de consumidores; taxa de serviço calculada sobre a soma pessoal de itens; e resto de centavos indivisíveis distribuído ciclicamente. Posso gerar a especificação formal de requisitos?"
    },
    {
        "id": "seg_07_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 3,
        "chat": True,
        "text": "Especificação autorizada! Adicione como invariante adicional que toda mesa possui chave Pix vinculada antes de qualquer fechamento. A governança do dinheiro exige destino certo e auditado!"
    },
    {
        "id": "seg_08_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "avatar": "ia",
        "slide": 3,
        "chat": True,
        "text": "Invariante de chave Pix registrada. Contrato de intenções aprovado com cem por cento de rigor formal."
    },

    # --- ATO 4: SÍNTESE E PRÓXIMO PASSO (SLIDE 4) ---
    {
        "id": "seg_09_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 4,
        "chat": False,
        "text": "Incrível! Com as regras declaradas e validadas, nós temos as fundações perfeitas para a construção das telas e do banco de dados!"
    },
    {
        "id": "seg_10_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 4,
        "chat": False,
        "text": "No Episódio 2, vamos desenhar a interface do app de Racha de Conta, com a seleção visual de quem consumiu o quê e o cálculo dinâmico da conta! Nos vemos no próximo vídeo!"
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
    print("🎙️ GERANDO ÁUDIO NEURAL RACHA PIX - EP. 1B (METODOLOGIA: INTENÇÕES & INVARIANTES)")
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
        "projectName": "Racha_Ep1B",
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
