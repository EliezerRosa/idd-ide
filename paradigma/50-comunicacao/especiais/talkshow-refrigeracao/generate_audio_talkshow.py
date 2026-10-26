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
OUT_DIR = BASE_DIR / "producao_yt" / "refrigeracao_talkshow"
AUDIO_DIR = OUT_DIR / "audio"
OUT_DIR.mkdir(parents=True, exist_ok=True)
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

VOICES = {
    "eliezer": "pt-BR-AntonioNeural",
    "leigo": "pt-BR-ThalitaMultilingualNeural",
    "ia": "pt-BR-FranciscaNeural"
}

DIALOGUES = [
    # --- ATO 1: ABERTURA DO TALK SHOW & PROPÓSITO DO EPISÓDIO ---
    {
        "id": "seg_01_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "view": "mer",
        "action": "intro_overview",
        "text": "Olá a todos da nossa comunidade no YouTube! Sejam muito bem-vindos ao episódio especial de homologação arquitetural do IDD Refrigeração! Hoje, eu, a nossa Usuária Leiga e a IA Compilador vamos apresentar a modelagem completa: o MER Canônico e o Modelo UML Vivo antes de gerarmos qualquer linha de código."
    },
    {
        "id": "seg_02_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "view": "mer",
        "action": "listen",
        "text": "Eliézer, eu confesso que no início achava que refrigeração comercial era só trocar peça e limpar filtro. Mas ao acompanhar os requisitos reais de câmaras frias, laudos sanitários e medições térmicas, vi que sem essa modelagem visual seria um desastre construir esse software!"
    },
    {
        "id": "seg_03_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "avatar": "ia",
        "view": "mer",
        "action": "highlight_mer_center",
        "text": "Exatamente! No Paradigma Intent-Driven Development, a engenharia de software substitui palpites por invariantes invioláveis. Eliézer, mostre para a plateia como estruturamos a base de dados relacional sem ambiguidades."
    },

    # --- ATO 2: MER - ENTIDADES DERIVADAS & INVARIANTE TERMODINÂMICA ---
    {
        "id": "seg_04_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "view": "mer",
        "action": "hover_equipamento",
        "text": "Vejam aqui no palco central o nosso MER completo. A entidade-mestre é o EQUIPAMENTO, atrelada ao QR Code imutável. Reparem no que acontece quando inspecionamos a tabela de medições técnicas e ordens de serviço."
    },
    {
        "id": "seg_05_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "avatar": "ia",
        "view": "mer",
        "action": "focus_thermo_rule",
        "text": "Destaque para a Invariante Termodinâmica Fundamental: no ciclo frigorífico por compressão mecânica, a pressão de descarga é estritamente maior que a pressão de sucção. O banco de dados rejeita no nível de constraint qualquer leitura espúria ou invertida!"
    },
    {
        "id": "seg_06_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "view": "mer",
        "action": "listen",
        "text": "E isso impede que o mecânico registre dados errados no aplicativo por distração em campo! Agora, Eliézer, como essa riqueza de dados se traduz nos casos de uso do dia a dia?"
    },

    # --- ATO 3: TRANSIÇÃO PARA O UML INTERATIVO COM FOCO NO MECÂNICO ---
    {
        "id": "seg_07_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "view": "uml",
        "action": "click_btn_mecanico",
        "text": "Transitamos agora para o nosso Modelo UML Interativo com seleção de foco! Vejam: quando eu clico no botão do Mecânico de Campo, a interface filtra dinamicamente os casos de uso, destacando o fluxo offline-first, a leitura por QR Code e a coleta de medições sem poluição visual."
    },
    {
        "id": "seg_08_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "view": "uml",
        "action": "drag_canvas_pan",
        "text": "Podemos arrastar suavemente a visualização pelo canvas e acompanhar as elipses de include e extend, como a solicitação de peças no estoque móvel e a coleta de fotos com assinatura na tela."
    },
    {
        "id": "seg_09_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "view": "uml",
        "action": "click_btn_gestor",
        "text": "E para o Gestor de Contratos e o Síndico? O que eles enxergam nessa mesma arquitetura?"
    },
    {
        "id": "seg_10_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "view": "uml",
        "action": "click_btn_gestor_action",
        "text": "Basta selecionar o foco do Gestor! Aqui vemos a esteira automatizada: abertura de chamados, despacho inteligente de técnicos habilitados e a geração automática do PMOC mensal no dia primeiro de cada mês via cron."
    },

    # --- ATO 4: DIAGRAMA DE CLASSES (3 COMPARTIMENTOS OMG) & MÁQUINA DE ESTADOS ---
    {
        "id": "seg_11_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "view": "uml",
        "action": "zoom_classes",
        "text": "Descendo para a Seção 2, temos o Diagrama de Classes de Domínio no padrão estrito da OMG! Vamos dar um zoom in nos três compartimentos: atributos privados desacoplados e métodos de domínio puros que calculam rendimento térmico e compatibilidade de fluidos refrigerantes."
    },
    {
        "id": "seg_12_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "avatar": "ia",
        "view": "uml",
        "action": "focus_statechart",
        "text": "E na Seção 3, observem a Máquina de Estados da Ordem de Serviço! O ciclo de vida parte de RASCUNHO, passa por AGENDADA, EM DESLOCAMENTO e EM ATENDIMENTO, exigindo checklist sanitário e fotos antes de atingir o estado CONCLUIDA, onde é selada com Hash SHA-256 criptográfico."
    },

    # --- ATO 5: HOMOLOGAÇÃO & ENCERRAMENTO ---
    {
        "id": "seg_13_leigo",
        "who": "leigo",
        "actor": "Usuária Leiga",
        "avatar": "leigo",
        "view": "uml",
        "action": "reset_zoom_overview",
        "text": "Incrível! Tudo está conectado: as regras do mundo real, o banco de dados e o comportamento do aplicativo. Como validadora do domínio, o modelo está cem por cento aprovado!"
    },
    {
        "id": "seg_14_ia",
        "who": "ia",
        "actor": "IA Compilador",
        "avatar": "ia",
        "view": "uml",
        "action": "approve_model",
        "text": "Invariantes verificadas e consistência estrita homologada. O modelo de domínio está pronto para a compilação autônoma de código em Supabase e Flutter PWA!"
    },
    {
        "id": "seg_15_eliezer",
        "who": "eliezer",
        "actor": "Eliézer Rosa",
        "avatar": "eliezer",
        "view": "uml",
        "action": "farewell",
        "text": "Perfeito! Esse é o poder do Paradigma IDD: transformar complexidade operacional em engenharia de software de altíssima precisão. Deixe seu like, inscreva-se no canal IDD na Prática e acompanhe no próximo episódio a compilação do código completo! Até lá!"
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
    print("=" * 75)
    print("🎙️ GERANDO ÁUDIO NEURAL TALK SHOW - IDD REFRIGERAÇÃO (MER & UML)")
    print("=" * 75)

    timeline_items = []
    current_time = 0.8  # pequena folga inicial após a vinheta

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
            "view": d.get("view", "mer"),
            "action": d.get("action", "none"),
            "text": d["text"],
            "wav": str(wav_path),
            "startSec": round(current_time, 3),
            "durSec": round(dur, 3),
            "endSec": round(current_time + dur, 3)
        }
        timeline_items.append(item)
        print(f"       Duração: {dur:.2f}s | Início: {current_time:.2f}s -> Fim: {current_time + dur:.2f}s")
        current_time += dur + 0.60  # pausa humana natural entre falas

    total_duration = round(current_time + 1.8, 2)
    print(f"\nDuração Total do Talk Show: {total_duration}s (~{(total_duration/60):.1f} min)")

    timeline_path = OUT_DIR / "timeline.json"
    with open(timeline_path, "w", encoding="utf-8") as f:
        json.dump({
            "projectName": "IDD_Refrigeracao_TalkShow_MER_UML",
            "totalDurationSec": total_duration,
            "items": timeline_items
        }, f, indent=2, ensure_ascii=False)
    print(f"[OK] Timeline salva em: {timeline_path}")

    print("\nMontando Trilha Sonora Master com EBU R128 (-14 LUFS) e Sidechain Ducking...")
    concat_list_file = OUT_DIR / "audio_concat.txt"
    silence_wav = AUDIO_DIR / "silence_060s.wav"
    subprocess.run([
        "ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
        "-t", "0.60", str(silence_wav)
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    initial_silence_wav = AUDIO_DIR / "silence_080s.wav"
    subprocess.run([
        "ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
        "-t", "0.80", str(initial_silence_wav)
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

    master_audio_path = OUT_DIR / "master_soundtrack.wav"
    # Sintetizador ambiental harmônico Lo-Fi Tech (C-Major chord suave)
    synth_ambience = (
        f"aevalsrc=sin(2*PI*130.81*t)*0.012+sin(2*PI*196.00*t)*0.008+sin(2*PI*261.63*t)*0.005:s=48000:d={total_duration}"
    )

    filter_complex = (
        f"{synth_ambience}[bg];"
        "[0:a]asplit=2[v_audio][v_sc];"
        "[bg][v_sc]sidechaincompress=threshold=0.04:ratio=4:attack=50:release=300[bg_ducked];"
        "[bg_ducked][v_audio]amix=inputs=2:weights=0.30 1.0[mixed];"
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

    print(f"\n[OK] Trilha Sonora Master Finalizada: {master_audio_path}")
    print(f"     Tamanho: {master_audio_path.stat().st_size / (1024*1024):.1f} MB | Loudness: -14 LUFS")

if __name__ == "__main__":
    asyncio.run(main())
