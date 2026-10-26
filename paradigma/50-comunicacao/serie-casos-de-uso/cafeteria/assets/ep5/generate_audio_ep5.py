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
OUT_DIR = BASE_DIR / "producao_yt" / "cafeteria_assets" / "ep5"
AUDIO_DIR = OUT_DIR / "audio"
OUT_DIR.mkdir(parents=True, exist_ok=True)
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

VOICES = {
    "eliezer": "pt-BR-AntonioNeural",
    "leigo": "pt-BR-ThalitaMultilingualNeural",
    "ia": "pt-BR-FranciscaNeural"
}

DIALOGUES = [
    # --- ATO 1: A CELEBRAÇÃO DO RESULTADO (SLIDE 1) ---
    {
        "id": "seg_01_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 1,
        "chat": False,
        "text": "Eliézer, chegamos ao Grand Finale da nossa série prática da Cafeteria e Padaria! É impressionante ver aquele salão que antes sofria com comandas de papel perdidas, furos no estoque de leite e café e filas no caixa, agora operando com um sistema profissional de nível internacional sem que ninguém precisasse escrever uma linha de código!"
    },
    {
        "id": "seg_02_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 1,
        "chat": False,
        "text": "Essa é a materialização do Paradigma IDD: transformar a intenção clara do empreendedor em software à prova de falhas com rigor matemático. A inteligência artificial assumiu toda a complexidade de compilação, testes e infraestrutura, enquanto o dono do negócio manteve a governança total sobre as regras sagradas do seu estabelecimento!"
    },

    # --- ATO 2: A TRILHA METODOLÓGICA COMPLETA (SLIDE 2) ---
    {
        "id": "seg_03_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 2,
        "chat": False,
        "text": "Vamos rever no Slide 2 os quatro pilares sagrados que construímos na Cafeteria: primeiro as Intenções e Invariantes Sagradas de estoque atômico; segundo o Design de Telas e o Modelo Entidade-Relacionamento; terceiro o Código Vivo com triggers SQL e FSM da cozinha; e quarto a suíte de duzentos e quarenta testes com o Deploy Confirm-Once em quatro segundos!"
    },
    {
        "id": "seg_04_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 2,
        "chat": False,
        "text": "Uma esteira industrial de software onde cada elemento do código está diretamente amarrado à intenção humana original. Sem gambiarras, sem dívida técnica e com total transparência para o gestor leigo."
    },

    # --- ATO 3: TERMINAL DA IA & TELEMETRIA REAL (SLIDE 3) ---
    {
        "id": "seg_05_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 3,
        "chat": False,
        "text": "Vejam no Slide 3 o relatório de telemetria da Cafeteria Grão & Arte operando no fim de semana de inauguração do sistema!"
    },
    {
        "id": "seg_06_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "avatar": "ia",
        "slide": 3,
        "chat": True,
        "text": "Relatório de telemetria da Cafeteria Grão e Arte: trezentas e oitenta e quatro comandas finalizadas com sucesso no fim de semana. Divergência no estoque físico versus digital de café em grãos e leite fresco: zero gramas e zero mililitros. Comandas entregues sem pagamento: zero registros. Tempo médio de sincronização entre o garçom e o monitor KDS da cozinha: trezentos e cinquenta milissegundos. Zero falhas operacionais registradas."
    },
    {
        "id": "seg_07_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 3,
        "chat": True,
        "text": "Eficiência absoluta! As mesas girando com rapidez, a cozinha trabalhando sem papel e o caixa fechando no centavo exato. A padaria e a cafeteria ganharam a segurança operacional de uma grande rede corporativa!"
    },

    # --- ATO 4: O FUTURO E A PRÓXIMA PLAYLIST (SLIDE 4) ---
    {
        "id": "seg_08_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 4,
        "chat": False,
        "text": "Com isso, concluímos com orgulho os nove episódios da nossa segunda playlist oficial! E agora, Eliézer, qual é o próximo desafio prático do canal?"
    },
    {
        "id": "seg_09_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 4,
        "chat": False,
        "text": "Na Playlist 3, vamos enfrentar uma das maiores dores sociais e financeiras de quem sai com os amigos: o Aplicativo de Racha de Conta e Pix: Quem Paga o Quê! Vamos resolver a divisão matemática de contas com centavos indivisíveis, gorjeta customizada e cobrança Pix instantânea com tolerância zero para erros!"
    },
    {
        "id": "seg_10_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 4,
        "chat": False,
        "text": "Fantástico! Inscreva-se no canal, comente o que você achou desta série e maratone a próxima playlist com a gente. Até lá!"
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
    print("🎙️ GERANDO ÁUDIO NEURAL CAFETERIA - EP. 5 (GRAND FINALE & TELEMETRIA)")
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
        "projectName": "Cafeteria_Ep5",
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
