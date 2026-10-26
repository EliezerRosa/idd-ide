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
OUT_DIR = BASE_DIR / "motion_graphics_renderer" / "idd_video_2_assets"
AUDIO_DIR = OUT_DIR / "audio"
OUT_DIR.mkdir(parents=True, exist_ok=True)
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

VOICES = {
    "eliezer": "pt-BR-AntonioNeural",
    "leigo": "pt-BR-ThalitaMultilingualNeural",
    "ia": "pt-BR-FranciscaNeural"
}

DIALOGUES = [
    # --- ATO 1: BOUNDED CONTEXTS & MULTITENANCY NATIVO (SLIDE 1) ---
    {
        "id": "seg_01_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 1,
        "text": "Eliézer, no primeiro episódio nós entendemos que a intenção de negócio comanda a IA. Mas agora me surgiu uma dúvida prática: em refrigeração nós temos dezenas de clientes com centenas de câmaras frias e chillers. Como a gente organiza isso na arquitetura para que os dados de uma empresa nunca se misturem com os de outra?"
    },
    {
        "id": "seg_02_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 1,
        "text": "Essa é uma das decisões mais críticas da engenharia de software: o Bounded Context e o Multitenancy nativo! No Paradigma IDD, nós não começamos abrindo um banco de dados para criar tabelas avulsas. Nós delimitamos as fronteiras de negócio. Cada empresa tem seu Tenant estritamente isolado por criptografia e chaves estrangeiras invioláveis."
    },
    {
        "id": "seg_03_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 1,
        "text": "E como a física real que vimos antes, a pressão do manifold e o superaquecimento, é representada no banco de dados sem a gente precisar virar especialista em SQL?"
    },
    {
        "id": "seg_04_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 1,
        "text": "Veja na tela a nossa segunda apresentação técnica: o Modelo Entidade-Relacionamento do IDD Refrigeração. Nós modelamos as entidades a partir dos objetivos de campo. A intenção de negócio se desdobra em três pilares: o Equipamento com seu Prontuário, a Medição Técnica dos parâmetros térmicos, e o Laudo do PMOC."
    },

    # --- ATO 2: O PRONTUÁRIO DO EQUIPAMENTO & AS TABELAS DE DOMÍNIO (SLIDE 2) ---
    {
        "id": "seg_05_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 2,
        "text": "Olhando esse diagrama do Slide 2, vejo que o Equipamento tem campos para tipo de gás refrigerante e capacidade em BTUs ou TR. Por que esses dados são tão vitais logo no cadastro?"
    },
    {
        "id": "seg_06_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 2,
        "text": "Porque o fluido define a curva de pressão e temperatura de saturação! Se o equipamento usa R-410A, a pressão de sucção esperada é em torno de cento e vinte PSI. Se for R-22, é em torno de sessenta e cinco PSI. Se o sistema não souber isso com precisão no prontuário, nenhuma validação de segurança termodinâmica funciona em campo!"
    },
    {
        "id": "seg_07_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 2,
        "text": "Entendi! E a Ordem de Serviço se conecta diretamente com a Medição Técnica e com o Laudo. O mecânico consegue burlar a medição ou assinar a OS sem medir as pressões?"
    },
    {
        "id": "seg_08_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 2,
        "text": "De forma alguma! Essa é uma Invariante de Arquitetura Inviolável. No IDD, as regras de negócio são barreiras intransponíveis. Se o técnico não registrar a medição com foto criptografada do manifold, o sistema simplesmente não emite o hash de validação da ordem de serviço. Veja agora como a IA valida essa regra em tempo real no nosso terminal."
    },

    # --- ATO 3: A IA ENTRA NO CHAT TERMINAL - CONFIRM-ONCE PATTERN (SLIDE 3) ---
    {
        "id": "seg_09_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "avatar": "ia",
        "slide": 3,
        "chat": True,
        "text": "Orquestrador Eliézer, analisando os Bounded Contexts do MER. Para compilar a entidade MEDICAO_TECNICA, pergunto: as pressões de sucção e descarga devem aceitar valores nulos em chamados de emergência ou a leitura termodinâmica completa é obrigatória para gerar o hash do Laudo PMOC?"
    },
    {
        "id": "seg_10_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 3,
        "chat": True,
        "text": "Invariante estrita: Leitura termodinâmica sempre obrigatória. Em caso de sensor avariado em campo, o mecânico deve justificar com foto do manômetro analógico e coletar a contra-assinatura do cliente no smartphone."
    },
    {
        "id": "seg_11_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "avatar": "ia",
        "slide": 3,
        "chat": True,
        "text": "Invariante compilada com sucesso. Gerando esquema relacional PostgreSQL com constraints CHECK, índices parciais por Tenant e endpoints GraphQL com validação de invariante. Zero anomalias estruturais detectadas."
    },
    {
        "id": "seg_12_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 3,
        "chat": True,
        "text": "Que fantástico! A própria IA questionou o ponto de falha do processo e já gerou as travas de segurança no banco de dados! Eu como usuária fico completamente segura de que ninguém vai burlar o laudo."
    },

    # --- ATO 4: OPERAÇÃO EM CAMPO & CONCLUSÃO DO EPISÓDIO 2 (SLIDE 4) ---
    {
        "id": "seg_13_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 4,
        "text": "Exatamente! E no Slide 4 você vê o resultado prático para o mecânico: o Prontuário por QR Code, a sincronização offline mesmo em subsolos sem sinal, e o histórico completo de manutenções na palma da mão. O banco de dados serve à operação real, e não o contrário."
    },
    {
        "id": "seg_14_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 4,
        "text": "Agora vejo como tudo se conecta perfeitamente! Do conceito de negócio à modelagem dos dados, tudo é transparente e guiado pela intenção!"
    },
    {
        "id": "seg_15_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 4,
        "text": "Esse é o coração do Paradigma IDD! No próximo episódio da nossa playlist, vamos mostrar a implementação prática dos componentes, o código gerado e os testes automatizados. Inscrevam-se no canal e continuem conosco no IDD na Prática!"
    }
]

async def generate_audio():
    print("=" * 70)
    print("🎙️ GERANDO ÁUDIO DO NOVO VÍDEO 2: ARQUITETURA, REGRAS & MER")
    print("=" * 70)

    timeline_items = []
    current_time = 0.5 # 0.5s de respiro inicial

    for idx, d in enumerate(DIALOGUES):
        voice = VOICES[d["who"]]
        mp3_path = AUDIO_DIR / f"{d['id']}.mp3"
        wav_path = AUDIO_DIR / f"{d['id']}.wav"

        if not wav_path.exists() or wav_path.stat().st_size == 0:
            print(f"[{idx+1}/{len(DIALOGUES)}] Gerando fala de {d['actor']} ({voice})...")
            comm = edge_tts.Communicate(d["text"], voice, rate="+2%", pitch="+0Hz")
            await comm.save(str(mp3_path))

            # Converte para WAV 48kHz estéreo para corte cirúrgico
            subprocess.run([
                "ffmpeg", "-y", "-i", str(mp3_path),
                "-ar", "48000", "-ac", "2", str(wav_path)
            ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        else:
            print(f"[{idx+1}/{len(DIALOGUES)}] Usando áudio já sintetizado: {d['id']}.wav")

        # Mede duração exata via ffprobe
        res = subprocess.run([
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", str(wav_path)
        ], capture_output=True, text=True, check=True)
        dur = float(res.stdout.strip())

        item = {
            "index": idx,
            "id": d["id"],
            "who": d["who"],
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
        current_time += dur + 0.65 # Pausa natural de 650ms entre falas

    total_duration = round(current_time + 1.5, 2)
    print(f"\nDuração Total do Roteiro Ep. 2: {total_duration}s (~{(total_duration/60):.1f} min)")

    # Salva timeline.json
    timeline_path = OUT_DIR / "video_2_timeline.json"
    with open(timeline_path, "w", encoding="utf-8") as f:
        json.dump({
            "projectName": "IDD_Refrigeracao_Novo_Video_2",
            "totalDurationSec": total_duration,
            "items": timeline_items
        }, f, indent=2, ensure_ascii=False)
    print(f"[OK] Timeline salva em: {timeline_path}")

    # Monta a trilha sonora master procedural sincronizada
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

    # Trilha sonora com ambiência sutil e ducking
    master_audio_path = OUT_DIR / "master_soundtrack_video_2.wav"
    synth_ambience = (
        f"aevalsrc=sin(2*PI*130.81*t)*0.012+sin(2*PI*196.00*t)*0.008+sin(2*PI*261.63*t)*0.005:s=48000:d={total_duration}"
    )

    filter_complex = (
        f"[0:a]{synth_ambience}[bg];"
        "[1:a]asplit=2[v_audio][v_sc];"
        "[bg][v_sc]sidechaincompress=threshold=0.04:ratio=4:attack=50:release=300[bg_ducked];"
        "[bg_ducked][v_audio]amix=inputs=2:weights=0.35 1.0[mixed];"
        "[mixed]loudnorm=I=-14:LRA=7:TP=-1.5[out_audio]"
    )

    subprocess.run([
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", f"anullsrc=r=48000:cl=stereo:d={total_duration}",
        "-i", str(raw_voice_master),
        "-filter_complex", filter_complex,
        "-map", "[out_audio]",
        "-c:a", "pcm_s16le",
        str(master_audio_path)
    ], check=True)

    print(f"\n[OK] Trilha Master Estúdio Ep. 2 Finalizada: {master_audio_path}")
    print(f"     Tamanho: {master_audio_path.stat().st_size / (1024*1024):.1f} MB | Loudness: -14 LUFS")

if __name__ == "__main__":
    asyncio.run(generate_audio())
