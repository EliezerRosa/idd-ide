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
OUT_DIR = BASE_DIR / "motion_graphics_renderer" / "idd_video_1b_assets"
AUDIO_DIR = OUT_DIR / "audio"
OUT_DIR.mkdir(parents=True, exist_ok=True)
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

VOICES = {
    "eliezer": "pt-BR-AntonioNeural",
    "leigo": "pt-BR-ThalitaMultilingualNeural",
    "ia": "pt-BR-FranciscaNeural"
}

DIALOGUES = [
    # --- ATO 1: INTRODUÇÃO METODOLÓGICA & ESPECIFICAÇÃO DE REQUISITOS (SLIDE 1) ---
    {
        "id": "seg_01_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 1,
        "chat": False,
        "text": "Eliézer, iniciamos agora os episódios metodológicos da nossa série! No episódio um nós vimos o caso prático da refrigeração. Mas hoje eu quero entender a engenharia por trás: como um profissional começa a especificar um software com a inteligência artificial sem escrever nenhuma linha de código?"
    },
    {
        "id": "seg_02_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 1,
        "chat": False,
        "text": "Seja muito bem-vinda ao coração do Paradigma IDD! No desenvolvimento tradicional, as pessoas tentam pular direto para telas ou código, e isso gera retrabalho infinito. No IDD, o primeiro passo é a Especificação de Requisitos Orientada à Intenção. Nós definimos o objetivo central do negócio, as fronteiras do domínio e delimitamos o escopo de forma cirúrgica."
    },
    {
        "id": "seg_03_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 1,
        "chat": False,
        "text": "E como a inteligência artificial participa dessa fase inicial sem começar a cuspir código aleatório?"
    },
    {
        "id": "seg_04_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 1,
        "chat": False,
        "text": "A IA atua como um Analista de Domínio e Espelho Epistêmico! Ela não gera código; ela nos ajuda a mapear os fluxos, identificar ambiguidades na linguagem humana e transformar intenções de negócio em um catálogo estruturado. Veja no Slide 1 a nossa Matriz de Intenção e Escopo."
    },

    # --- ATO 2: O CONCEITO FUNDAMENTAL DE INVARIANTES (SLIDE 2) ---
    {
        "id": "seg_05_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 2,
        "chat": False,
        "text": "No Slide 2 temos um termo que você sempre enfatiza: as Invariantes! O que é exatamente uma invariante e por que ela é mais importante do que qualquer algoritmo?"
    },
    {
        "id": "seg_06_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 2,
        "chat": False,
        "text": "Invariantes são as leis sagradas do seu negócio que jamais podem ser violadas pelo sistema sob nenhuma hipótese! Na refrigeração, por exemplo: uma ordem de serviço nunca pode ser concluída sem medição de pressão do manifold, e um laudo do PMOC nunca pode ser emitido sem a assinatura do responsável técnico."
    },
    {
        "id": "seg_07_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 2,
        "chat": False,
        "text": "Entendi! O código pode mudar ou ser reescrito cem vezes pela IA, mas as invariantes de negócio continuam fixas como rocha protegendo a empresa!"
    },
    {
        "id": "seg_08_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 2,
        "chat": False,
        "text": "Exatamente! O código é efêmero e descartável; a intenção e as invariantes são o ativo definitivo. Agora vamos chamar a nossa IA Compilador para vermos a interação real dessa fase de requisitos!"
    },

    # --- ATO 3: INTERAÇÃO COM A IA & CHAT METODOLÓGICO (SLIDE 3) ---
    {
        "id": "seg_09_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "avatar": "ia",
        "slide": 3,
        "chat": True,
        "text": "Orquestrador Eliézer e Usuária Leiga, analisei a intenção preliminar para o sistema de HVAC-R. Mapeei quatro invariantes de domínio invioláveis e identifiquei uma bifurcação de escopo: devemos incluir no módulo preliminar a pesagem de cilindros de gás refrigerante ou mantemos o escopo estrito em diagnóstico de ciclo térmico e laudo PMOC?"
    },
    {
        "id": "seg_10_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 3,
        "chat": True,
        "text": "Excelente provocação, IA! Para o escopo da primeira versão, mantemos o foco estrito no diagnóstico termodinâmico e conformidade com a Lei 13.589 do PMOC. A pesagem de cilindros fica para a fase dois."
    },
    {
        "id": "seg_11_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "avatar": "ia",
        "slide": 3,
        "chat": True,
        "text": "Entendido. Escopo refinado e fronteiras de Bounded Context consolidadas. Apresento na tela o Produto Final da Especificação: documento formal de requisitos sem código, com tabela de invariantes ativas e matriz de rastreabilidade de negócio pronta para governança."
    },
    {
        "id": "seg_12_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 3,
        "chat": True,
        "text": "Impressionante como a IA não apenas aceita ordens, mas atua como consultora técnica apontando onde o escopo poderia inchar desnecessariamente!"
    },

    # --- ATO 4: SÍNTESE METODOLÓGICA & PRÓXIMO PASSO (SLIDE 4) ---
    {
        "id": "seg_13_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 4,
        "chat": False,
        "text": "Veja no Slide 4 a síntese do nosso método: começamos com a intenção humana em linguagem natural, refinamos com a IA, blindamos com as invariantes e congelamos o escopo. Nenhuma linha de código foi escrita, mas o sistema já possui noventa por cento da sua inteligência estruturada."
    },
    {
        "id": "seg_14_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 4,
        "chat": False,
        "text": "E no próximo episódio metodológico, como essa especificação de requisitos se transforma no Modelo Entidade-Relacionamento do banco de dados?"
    },
    {
        "id": "seg_15_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 4,
        "chat": False,
        "text": "No Episódio 2B, nós veremos a IA compilando essas intenções diretamente em diagramas MER completos, relacionando tenants, equipamentos e medições técnicas sem código manual! Até o próximo vídeo!"
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
    print("🎙️ GERANDO ÁUDIO NEURAL EPISÓDIO 1B (METODOLOGIA: REQUISITOS & INVARIANTES)")
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
    print(f"\nDuração Total do Roteiro Ep. 1B: {total_duration}s (~{(total_duration/60):.1f} min)")

    timeline_path = OUT_DIR / "video_1b_timeline.json"
    with open(timeline_path, "w", encoding="utf-8") as f:
        json.dump({
            "projectName": "IDD_Refrigeracao_Novo_Video_1B",
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

    master_audio_path = OUT_DIR / "master_soundtrack_video_1b.wav"
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

    print(f"\n[OK] Trilha Master Estúdio Ep. 1B Finalizada: {master_audio_path}")
    print(f"     Tamanho: {master_audio_path.stat().st_size / (1024*1024):.1f} MB | Loudness: -14 LUFS")

if __name__ == "__main__":
    asyncio.run(generate_audio())
