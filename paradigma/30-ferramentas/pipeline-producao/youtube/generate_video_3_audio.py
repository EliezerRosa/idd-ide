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
OUT_DIR = BASE_DIR / "motion_graphics_renderer" / "idd_video_3_assets"
AUDIO_DIR = OUT_DIR / "audio"
OUT_DIR.mkdir(parents=True, exist_ok=True)
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

VOICES = {
    "eliezer": "pt-BR-AntonioNeural",
    "leigo": "pt-BR-ThalitaMultilingualNeural",
    "ia": "pt-BR-FranciscaNeural"
}

DIALOGUES = [
    # --- ATO 1: DO MER AO BANCO FÍSICO (SLIDE 1) ---
    {
        "id": "seg_01_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 1,
        "chat": False,
        "text": "Eliézer, no episódio dois nós vimos o modelo conceitual e as regras de negócio. Mas como tudo isso sai do papel e vira um banco de dados real na nuvem sem que a gente precise escrever centenas de linhas de comandos SQL?"
    },
    {
        "id": "seg_02_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 1,
        "chat": False,
        "text": "Esse é o poder do Paradigma IDD! A intenção formalizada no MER alimenta o compilador de IA. Nós usamos o PostgreSQL gerenciado via Supabase. O compilador gera as tabelas, as chaves primárias UUID e, o mais importante: as políticas de segurança Row Level Security, garantindo que cada cliente só enxergue seus próprios dados."
    },
    {
        "id": "seg_03_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 1,
        "chat": False,
        "text": "E essa segurança por linha, o RLS, funciona mesmo se alguém tentar invadir a API ou errar uma consulta?"
    },
    {
        "id": "seg_04_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 1,
        "chat": False,
        "text": "Funciona no nível mais profundo do motor do banco! O PostgreSQL rejeita a leitura antes mesmo de processar os dados. Veja no Slide 1: o isolamento multitenant é uma muralha criptográfica inviolável em cada tabela do sistema."
    },

    # --- ATO 2: COMPONENTES REATIVOS & OFFLINE-FIRST (SLIDE 2) ---
    {
        "id": "seg_05_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 2,
        "chat": False,
        "text": "E na parte visual, nas telas que o mecânico vai usar no celular e o gestor no computador? Como a IA constrói as telas para que elas não fiquem confusas ou cheias de campos desnecessários?"
    },
    {
        "id": "seg_06_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 2,
        "chat": False,
        "text": "Construímos componentes web reativos modernos! Observe no Slide 2: o formulário de medição tem máscaras automáticas para as pressões em PSI, calcula o Delta T e o superaquecimento em tempo real e já avisa se a serpentina estiver com baixo rendimento térmico."
    },
    {
        "id": "seg_07_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 2,
        "chat": False,
        "text": "E se o técnico estiver numa câmara frigorífica subterrânea ou numa casa de máquinas blindada sem internet 4G ou Wi-Fi?"
    },
    {
        "id": "seg_08_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 2,
        "chat": False,
        "text": "A arquitetura é estritamente Offline-First! O app armazena as medições no IndexedDB local do aparelho e, assim que o técnico volta para a área de sinal, sincroniza tudo em lote com o banco central com validação de conflitos."
    },

    # --- ATO 3: TERMINAL DA IA - CONFIRM-ONCE & LIVE EXECUTION (SLIDE 3) ---
    {
        "id": "seg_09_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "avatar": "ia",
        "slide": 3,
        "chat": True,
        "text": "Orquestrador Eliézer, compilando as migrações SQL e endpoints da API offline. Detectei uma decisão de integridade: em caso de trabalho offline estendido por mais de vinte e quatro horas em áreas remotas, os tokens de autorização local devem expirar ou aceitamos tolerância estendida de quarenta e oito horas com contra-assinatura biométrica?"
    },
    {
        "id": "seg_10_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 3,
        "chat": True,
        "text": "Tolerância estendida de quarenta e oito horas com criptografia de chave pública no dispositivo e assinatura biométrica do técnico. A operação de campo em locais remotos não pode ser travada por burocracia de rede."
    },
    {
        "id": "seg_11_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "avatar": "ia",
        "slide": 3,
        "chat": True,
        "text": "Diretriz compilada. Gerando migrações com suporte a idempotência, chaves locais de encriptação AES-256 e sincronização assíncrona tolerante a falhas. Compilação concluída com sucesso."
    },
    {
        "id": "seg_12_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 3,
        "chat": True,
        "text": "É impressionante como a IA não apenas gera o código, mas antecipa o imprevisto da vida real do técnico antes mesmo do sistema ir para campo!"
    },

    # --- ATO 4: QR CODE CONECTADO & PREPARAÇÃO PARA O EP. 4 (SLIDE 4) ---
    {
        "id": "seg_13_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 4,
        "chat": False,
        "text": "Exatamente! E no Slide 4 você vê o resultado da integração total: o sistema gera as etiquetas inteligentes de QR Code para cada câmara fria, chiller ou split. O mecânico aponta o celular, o prontuário abre em menos de cinquenta milissegundos e a ordem de serviço já está pronta para execução."
    },
    {
        "id": "seg_14_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 4,
        "chat": False,
        "text": "Isso transforma completamente a rotina de manutenção! E no próximo episódio, como garantimos que tudo isso funciona sem falhas antes de colocar na mão dos clientes?"
    },
    {
        "id": "seg_15_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 4,
        "chat": False,
        "text": "No quarto e último episódio da série, vamos mostrar a Validação pela Experiência: os testes ponta a ponta, a emissão automatizada dos Laudos PMOC em PDF e o deploy definitivo em produção. Continuem conosco no IDD na Prática!"
    }
]

async def generate_audio():
    print("=" * 70)
    print("🎙️ GERANDO ÁUDIO DO NOVO VÍDEO 3: IMPLEMENTAÇÃO & BANCO DE DADOS")
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

            subprocess.run([
                "ffmpeg", "-y", "-i", str(mp3_path),
                "-ar", "48000", "-ac", "2", str(wav_path)
            ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        else:
            print(f"[{idx+1}/{len(DIALOGUES)}] Usando áudio já sintetizado: {d['id']}.wav")

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
        current_time += dur + 0.65

    total_duration = round(current_time + 1.5, 2)
    print(f"\nDuração Total do Roteiro Ep. 3: {total_duration}s (~{(total_duration/60):.1f} min)")

    # Salva timeline.json
    timeline_path = OUT_DIR / "video_3_timeline.json"
    with open(timeline_path, "w", encoding="utf-8") as f:
        json.dump({
            "projectName": "IDD_Refrigeracao_Novo_Video_3",
            "totalDurationSec": total_duration,
            "items": timeline_items
        }, f, indent=2, ensure_ascii=False)
    print(f"[OK] Timeline salva em: {timeline_path}")

    # Monta a trilha sonora master
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

    master_audio_path = OUT_DIR / "master_soundtrack_video_3.wav"
    subprocess.run([
        "ffmpeg", "-y",
        "-i", str(raw_voice_master),
        "-af", "loudnorm=I=-14:LRA=7:TP=-1.5",
        "-c:a", "pcm_s16le",
        str(master_audio_path)
    ], check=True)

    print(f"\n[OK] Trilha Master Estúdio Ep. 3 Finalizada: {master_audio_path}")
    print(f"     Tamanho: {master_audio_path.stat().st_size / (1024*1024):.1f} MB | Loudness: -14 LUFS")

if __name__ == "__main__":
    asyncio.run(generate_audio())
