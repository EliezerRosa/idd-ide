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
OUT_DIR = BASE_DIR / "motion_graphics_renderer" / "idd_video_4_assets"
AUDIO_DIR = OUT_DIR / "audio"
OUT_DIR.mkdir(parents=True, exist_ok=True)
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

VOICES = {
    "eliezer": "pt-BR-AntonioNeural",
    "leigo": "pt-BR-ThalitaMultilingualNeural",
    "ia": "pt-BR-FranciscaNeural"
}

DIALOGUES = [
    # --- ATO 1: O PRINCÍPIO DA VALIDAÇÃO PELA EXPERIÊNCIA (SLIDE 1) ---
    {
        "id": "seg_01_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 1,
        "chat": False,
        "text": "Eliézer, chegamos ao quarto e último episódio da nossa jornada! Construímos o modelo, as regras de negócio, o banco no Supabase e os componentes de campo. Mas agora vem a grande pergunta: como alguém leigo testa e valida esse sistema inteiro sem precisar inspecionar linhas de código?"
    },
    {
        "id": "seg_02_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 1,
        "chat": False,
        "text": "Esse é o princípio de ouro do Paradigma IDD: Validar pela Experiência! No desenvolvimento tradicional, as pessoas perdem semanas tentando ler pull requests e código sintático. No IDD, você não precisa ser leitor de código: você coloca o software em operação, testa os fluxos reais de ponta a ponta e sente os atritos como usuária!"
    },
    {
        "id": "seg_03_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 1,
        "chat": False,
        "text": "Então a validação é exatamente como no mundo real: abrir uma ordem de serviço, escanear o equipamento e ver se o sistema se comporta como a intenção mandou?"
    },
    {
        "id": "seg_04_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 1,
        "chat": False,
        "text": "Perfeitamente! Veja no Slide 1: o ciclo de feedback é imediato. Se o mecânico sentir que um botão está difícil de clicar com luvas ou que um cálculo de pressão demorou, isso vira um ajuste de intenção expresso em linguagem humana, e a IA refina na hora."
    },

    # --- ATO 2: TESTE PONTA A PONTA & LAUDO PMOC EM PDF (SLIDE 2) ---
    {
        "id": "seg_05_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 2,
        "chat": False,
        "text": "Vamos simular esse teste prático no Slide 2: o mecânico chega na máquina, aponta a câmera para o QR Code e preenche os dados do manifold. O que o sistema gera em seguida?"
    },
    {
        "id": "seg_06_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 2,
        "chat": False,
        "text": "Ele gera instantaneamente a blindagem jurídica e sanitária! O motor compila as evidências fotográficas de antes e depois, valida a assinatura digital coletada na tela do smartphone e gera o Laudo Técnico do PMOC em PDF de acordo com a Lei 13.589."
    },
    {
        "id": "seg_07_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 2,
        "chat": False,
        "text": "E esse laudo já fica disponível para a fiscalização da Anvisa e para o síndico do prédio sem nenhuma planilha em papel?"
    },
    {
        "id": "seg_08_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 2,
        "chat": False,
        "text": "Exatamente! O PDF é assinado digitalmente, recebe um hash SHA-256 inviolável e é disparado em menos de dez segundos via WhatsApp e e-mail para o gestor do contrato."
    },

    # --- ATO 3: TERMINAL DA IA - AUDITORIA & DEPLOY EM PRODUÇÃO (SLIDE 3) ---
    {
        "id": "seg_09_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "avatar": "ia",
        "slide": 3,
        "chat": True,
        "text": "Orquestrador Eliézer, executando a suíte de testes ponta a ponta e auditoria de segurança pré-deploy. Todos os duzentos e quarenta testes automatizados de integração passaram com cem por cento de cobertura nos Bounded Contexts. Pergunto: autoriza o deploy automático para os clusters de produção e publicação dos endpoints oficiais?"
    },
    {
        "id": "seg_10_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 3,
        "chat": True,
        "text": "Deploy autorizado em ambiente de produção com observabilidade em tempo real e monitoramento de latência e invariantes."
    },
    {
        "id": "seg_11_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "avatar": "ia",
        "slide": 3,
        "chat": True,
        "text": "Comando executado. Deploy corporativo concluído em quatro segundos. Aplicativo publicado, banco sincronizado e rotas protegidas em alta disponibilidade. Sistema IDD Refrigeração em produção."
    },
    {
        "id": "seg_12_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 3,
        "chat": True,
        "text": "Que conquista extraordinária! Em apenas quatro episódios, saímos de uma ideia conceitual para um sistema corporativo completo, robusto e rodando na nuvem sem escrever código manual!"
    },

    # --- ATO 4: SÍNTESE DA SÉRIE & O FUTURO DO SOFTWARE (SLIDE 4) ---
    {
        "id": "seg_13_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 4,
        "chat": False,
        "text": "Esse é o verdadeiro futuro da engenharia de software! O código virou um detalhe efêmero de implementação gerado sob demanda. A intenção humana do negócio, a clareza de propósito e a capacidade de orquestrar a inteligência artificial são as habilidades mais valiosas do profissional moderno."
    },
    {
        "id": "seg_14_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "slide": 4,
        "chat": False,
        "text": "Eu aprendi que não precisamos ter medo da tecnologia nem sermos reféns de sintaxes complexas. Qualquer profissional que domina o seu negócio pode construir softwares de impacto com o IDD!"
    },
    {
        "id": "seg_15_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "slide": 4,
        "chat": False,
        "text": "Muito obrigado a todos que acompanharam a nossa série IDD Refrigeração! Inscrevam-se no canal @EliézerJPRosa, compartilhem a playlist oficial com sua equipe e venham construir o futuro do software no Paradigma IDD!"
    }
]

async def generate_audio():
    print("=" * 70)
    print("🎙️ GERANDO ÁUDIO DO NOVO VÍDEO 4: VALIDAÇÃO & ENTREGA EM PRODUÇÃO")
    print("=" * 70)

    timeline_items = []
    current_time = 0.5

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
    print(f"\nDuração Total do Roteiro Ep. 4: {total_duration}s (~{(total_duration/60):.1f} min)")

    timeline_path = OUT_DIR / "video_4_timeline.json"
    with open(timeline_path, "w", encoding="utf-8") as f:
        json.dump({
            "projectName": "IDD_Refrigeracao_Novo_Video_4",
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

    master_audio_path = OUT_DIR / "master_soundtrack_video_4.wav"
    subprocess.run([
        "ffmpeg", "-y",
        "-i", str(raw_voice_master),
        "-af", "loudnorm=I=-14:LRA=7:TP=-1.5",
        "-c:a", "pcm_s16le",
        str(master_audio_path)
    ], check=True)

    print(f"\n[OK] Trilha Master Estúdio Ep. 4 Finalizada: {master_audio_path}")
    print(f"     Tamanho: {master_audio_path.stat().st_size / (1024*1024):.1f} MB | Loudness: -14 LUFS")

if __name__ == "__main__":
    asyncio.run(generate_audio())
