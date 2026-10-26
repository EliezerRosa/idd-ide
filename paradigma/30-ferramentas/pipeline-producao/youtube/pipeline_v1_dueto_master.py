"""Pipeline Mestre de Remasterização do Vídeo 1 em Dueto Neural:
- Duas vozes neurais de estúdio:
  * pt-BR-AntonioNeural (Humano/Dev)
  * pt-BR-FranciscaNeural (IA Assistente em diálogo e apresentações)
- Zero ruído residual analógico (zero chiado de microfone e cooler do notebook)
- Eliminação cirúrgica de lacunas e silêncios excessivos
- Sincronismo rigoroso com o fluxo visual da tela e transições de slides
- Masterização e normalização broadcast oficial a -14 LUFS (EBU R128)
"""

import os
import sys
import json
import re
import time
import asyncio
import hashlib
import wave
import subprocess
from pathlib import Path
import numpy as np

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

BASE = Path(r"C:\Antigravity - IDD Refrigeração")
PROD = BASE / "producao_yt"
OUT = PROD / "v1_dueto_neural"
SEGS = OUT / "audio_segs"
OUT.mkdir(parents=True, exist_ok=True)
SEGS.mkdir(parents=True, exist_ok=True)

SRC_VIDEO = BASE / "apresentacao" / "Refrigeração - IDD Vídeo 1 (Versão Otimizada).mp4"
FINAL_VIDEO = PROD / "Refrigeracao_IDD_Video_1_100_Neural.mp4"
REMASTER_TARGET = PROD / "Refrigeracao_IDD_Video_1_Remasterizado.mp4"

TURBO_TRANSCRIPT = PROD / "v1_verbatim" / "transcricao_turbo.json"
RAW_SCENES_FILE = PROD / "cenas_raw.txt"
SCENES_FILE = OUT / "cenas_v1.json"
SCHEDULE_FILE = OUT / "schedule_v1_dueto.json"
MASTER_WAV = OUT / "temp_master_v1.wav"

VOICE_DEV = "pt-BR-AntonioNeural"
VOICE_AI = "pt-BR-FranciscaNeural"
SR = 48000
MIN_PAUSE_SAME_SPEAKER = 0.50
MIN_PAUSE_SPEAKER_CHANGE = 0.35
MAX_SPEED = 1.28

GLOSSARY = [
    (r"\bIDD\b", "I D D"),
    (r"\bIDE\b", "I D E"),
    (r"\bPMOC\b", "P M O C"),
    (r"\bPUNC\b", "P M O C"),
    (r"\bPUC\b", "P M O C"),
    (r"\bPUMOC\b", "P M O C"),
    (r"\bTUMOC\b", "P M O C"),
    (r"\bOS\b", "O S"),
    (r"\bHTML\b", "agá tê ême éle"),
    (r"\bCSS\b", "C S S"),
    (r"\bAPI\b", "A P I"),
    (r"\bUI\b", "U I"),
    (r"\bIA\b", "I A"),
    (r"\bMER\b", "mér"),
    (r"\bAntigravity\b", "Antigráviti"),
    (r"\bGit\b", "guit"),
    (r"\bGitHub\b", "guit-râb"),
    (r"\bNL\b", "N L"),
    (r"\bdev\b", "dév"),
    (r"\bDEV\b", "dév"),
    (r"\bconfluência\b", "Cônfluensse"),
    (r"\bConfluence\b", "Cônfluensse"),
    (r"\bChiller\b", "Tchíler"),
    (r"\bchillers\b", "tchílers"),
    (r"\bQR[- ]?[cC]ode\b", "que érre códe"),
    (r"\b13\.589\b", "treze mil quinhentos e oitenta e nove"),
    (r"\bCREA\b", "Crea"),
    (r"\bCFT\b", "C F T"),
    (r"\bREADME\b", "Rídimi"),
    (r"\bmarkdown\b", "mark-dáun"),
    (r"\bBounded Contexts\b", "Báunded Cóntexts"),
    (r"\bBounded Context\b", "Báunded Cóntext"),
    (r"\bSuperaquecimento\b", "Superaquecimento"),
    (r"\bSub-resfriamento\b", "Sub-resfriamento"),
    (r"\bConfirm-Once\b", "Confirm Uânce"),
    (r"\bcomissor\b", "compressor"),
    (r"\bcontratos de coque\b", "contratos de P M O C"),
    (r"\bporte predomínio\b", "porte predominante"),
    (r"\bargumentando não automatizar, aumentar não automatizar\b", "aumentar, não automatizar"),
]

def tts_text(t: str) -> str:
    for pat, rep in GLOSSARY:
        t = re.sub(pat, rep, t, flags=re.IGNORECASE)
    t = re.sub(r"\b(é+|hum+|eh+|humm)\b", "", t, flags=re.IGNORECASE)
    return re.sub(r"\s+", " ", t).strip()

def ffprobe_dur(p):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(p)],
                       capture_output=True, text=True, check=True)
    return float(r.stdout.strip())

def step1_load_scenes(video_dur):
    print("\n--- ETAPA 1: Carregamento de Âncoras Visuais de Cena (Vídeo 1) ---", flush=True)
    if SCENES_FILE.exists():
        scenes = json.loads(SCENES_FILE.read_text(encoding="utf-8"))
        print(f"[CACHE] {len(scenes)} âncoras de cena carregadas de {SCENES_FILE.name}", flush=True)
        return scenes

    scenes = [0.0]
    if RAW_SCENES_FILE.exists():
        raw = RAW_SCENES_FILE.read_text(encoding="utf-8")
        for line in raw.splitlines():
            if "pts_time:" in line:
                m = re.search(r"pts_time:([0-9\.]+)", line)
                if m:
                    t = float(m.group(1))
                    if t - scenes[-1] > 3.0:
                        scenes.append(round(t, 2))
    
    if scenes[-1] < video_dur - 5.0:
        scenes.append(round(video_dur, 2))

    SCENES_FILE.write_text(json.dumps(scenes, indent=2), encoding="utf-8")
    print(f"[OK] {len(scenes)} âncoras visuais estabelecidas.", flush=True)
    return scenes

def step2_load_and_tag_segments():
    print("\n--- ETAPA 2: Classificação das Vozes do Dueto (Antonio vs Francisca) ---", flush=True)
    raw_segs = json.loads(TURBO_TRANSCRIPT.read_text(encoding="utf-8"))

    # Conjunto exato de falas da Francisca no Intervalo 1 (45s a 210s)
    FRANCISCA_INTERVAL_1_SEGS = {3, 5, 6, 7, 8, 12, 13, 14, 19, 20, 23, 28, 29, 33, 34, 35, 36}

    for s in raw_segs:
        idx = s.get("i", 0)
        t_start = s["start"]

        if 45.0 <= t_start < 210.0:
            if idx in FRANCISCA_INTERVAL_1_SEGS:
                s["speaker"] = "Francisca"
                s["voice"] = VOICE_AI
            else:
                s["speaker"] = "Antonio"
                s["voice"] = VOICE_DEV
        elif 3506.0 <= t_start < 3577.4:
            s["speaker"] = "Francisca"
            s["voice"] = VOICE_AI
        elif 3932.0 <= t_start < 4145.0:
            s["speaker"] = "Francisca"
            s["voice"] = VOICE_AI
        else:
            s["speaker"] = "Antonio"
            s["voice"] = VOICE_DEV

    f_count = sum(1 for s in raw_segs if s["speaker"] == "Francisca")
    a_count = sum(1 for s in raw_segs if s["speaker"] == "Antonio")
    print(f"[OK] 483 segmentos mapeados: {a_count} falas do Dev (Antonio) | {f_count} falas da IA (Francisca).", flush=True)
    return raw_segs

def step3_build_dueto_blocks(raw_segs, scenes):
    print("\n--- ETAPA 3: Agrupamento em Blocos Semânticos e Eliminação de Lacunas Mortas ---", flush=True)
    blocks, cur = [], None

    for s in raw_segs:
        txt = s["text"].strip()
        if not txt:
            continue

        crosses_speaker = cur and (cur["speaker"] != s["speaker"])
        crosses_scene = any(cur and cur["start"] < sc <= s["start"] for sc in scenes)
        gap = (s["start"] - cur["end"]) if cur else 0.0

        if cur is None or gap > 2.0 or (len(cur["text"]) + len(txt) > 320) or crosses_speaker or crosses_scene:
            cur = {
                "start": s["start"],
                "end": s["end"],
                "text": txt,
                "speaker": s["speaker"],
                "voice": s["voice"]
            }
            blocks.append(cur)
        else:
            cur["end"] = s["end"]
            cur["text"] += " " + txt

    for idx, b in enumerate(blocks, 1):
        b["id"] = idx
        b["tts"] = tts_text(b["text"])

    print(f"[OK] {len(blocks)} blocos semânticos gerados para o dueto neural.", flush=True)
    return blocks

async def step4_synthesize_dueto(blocks):
    print("\n--- ETAPA 4: Síntese de Vozes de Estúdio (Antonio & Francisca) ---", flush=True)
    import edge_tts

    sem = asyncio.Semaphore(4)
    done = 0
    cached = 0

    async def synth_one(b):
        nonlocal done, cached
        voice = b["voice"]
        h = hashlib.md5((voice + b["tts"]).encode("utf-8")).hexdigest()[:10]
        prefix = "f" if b["speaker"] == "Francisca" else "a"
        mp3 = SEGS / f"{prefix}_{b['id']:03d}_{h}.mp3"
        b["mp3"] = str(mp3)

        if mp3.exists() and mp3.stat().st_size > 500:
            cached += 1
            done += 1
            return

        async with sem:
            for attempt in range(1, 8):
                try:
                    await edge_tts.Communicate(b["tts"], voice).save(str(mp3))
                    if mp3.exists() and mp3.stat().st_size > 500:
                        done += 1
                        if done % 25 == 0 or done == len(blocks):
                            print(f"  progresso síntese: {done}/{len(blocks)} blocos prontos...", flush=True)
                        return
                except Exception:
                    pass
                await asyncio.sleep(min(15, 2 * attempt))
            raise RuntimeError(f"Falha ao sintetizar bloco {b['id']} ({b['speaker']}): {b['tts'][:30]}")

    await asyncio.gather(*(synth_one(b) for b in blocks))
    print(f"[OK] Todos os {len(blocks)} blocos sintetizados com sucesso! (Reaproveitados: {cached})", flush=True)

def step5_schedule_and_render_wavs(blocks, scenes, video_dur):
    print("\n--- ETAPA 5: Agendamento Cirúrgico e Conversão de Áudio (Eliminando Lacunas) ---", flush=True)
    
    # Pré-conversão rápida para WAV e leitura de duração precisa via cabeçalho wave (sem spawn de ffprobe!)
    for b in blocks:
        raw_wav = SEGS / f"raw_{b['id']:03d}.wav"
        subprocess.run(["ffmpeg", "-y", "-i", b["mp3"], "-ar", "48000", "-ac", "2", str(raw_wav)],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        with wave.open(str(raw_wav), "rb") as w:
            b["nat_dur"] = w.getnframes() / float(SR)
        raw_wav.unlink()

    cursor = 0.0
    prev_speaker = None

    for i, b in enumerate(blocks):
        orig_start = b["start"]
        nat_dur = b["nat_dur"]
        speaker = b["speaker"]
        is_change = (prev_speaker is not None and prev_speaker != speaker)

        # Encontra a janela de cena visual
        scene_start = 0.0
        scene_end = video_dur
        for sc_idx in range(len(scenes) - 1):
            if scenes[sc_idx] <= orig_start < scenes[sc_idx + 1]:
                scene_start = scenes[sc_idx]
                scene_end = scenes[sc_idx + 1]
                break

        # Regra de Sincronismo Cirúrgico:
        # Pausa entre falas: 0.35s se troca de locutor (diálogo ágil), 0.50s se mesmo locutor
        min_pause = MIN_PAUSE_SPEAKER_CHANGE if is_change else MIN_PAUSE_SAME_SPEAKER
        min_allowed = max(scene_start, cursor + min_pause)

        # Se dentro da mesma cena e gap for de hesitação (<= 4.0s):
        # elimina o silêncio morto do Vídeo 1 e começa na pausa respiratória
        # Se gap for > 4.0s (digitação longa no chat ou espera de resultado):
        # mantém ancorado ao momento da tela, antecipando no máximo 1.0s para sincronia estrita
        if cursor >= scene_start:
            gap_to_orig = orig_start - cursor
            if gap_to_orig <= 4.0:
                sched_start = min_allowed
            else:
                sched_start = max(min_allowed, orig_start - 1.0)
        else:
            sched_start = max(min_allowed, min(orig_start, scene_start + 0.3))

        # Determina o limite da janela antes do próximo bloco ou fim da cena
        if i + 1 < len(blocks):
            nxt_orig = blocks[i + 1]["start"]
            nxt_bound = min(nxt_orig, scene_end)
        else:
            nxt_bound = scene_end

        window = max(0.6, nxt_bound - sched_start)
        speed = 1.0
        if nat_dur > window:
            speed = min(MAX_SPEED, nat_dur / window)

        dur = nat_dur / speed
        wav = SEGS / f"final_{b['id']:03d}.wav"

        af = "highpass=f=75" + (f",atempo={speed:.4f}" if speed > 1.002 else "")
        subprocess.run(["ffmpeg", "-y", "-i", b["mp3"], "-af", af, "-ar", "48000", "-ac", "2", str(wav)],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        b.update(
            sched_start=round(sched_start, 3),
            dur=round(dur, 3),
            speed=round(speed, 3),
            wav=str(wav)
        )
        cursor = sched_start + dur
        prev_speaker = speaker

    SCHEDULE_FILE.write_text(json.dumps(blocks, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[OK] Cronograma do dueto sem lacunas salvo em: {SCHEDULE_FILE.name}", flush=True)
    print(f"Duração final prevista: {cursor:.1f}s / Vídeo total: {video_dur:.1f}s", flush=True)
    return blocks

def step6_render_master_dueto(blocks, video_dur):
    print("\n--- ETAPA 6: Renderização e Muxing Mestre em -14 LUFS (Zero Ruído de Cooler) ---", flush=True)
    total_samples = int(video_dur * SR)
    narr_track = np.zeros((total_samples, 2), dtype=np.float32)

    fade_len = int(0.012 * SR)
    for i, b in enumerate(blocks, 1):
        with wave.open(b["wav"], "rb") as w:
            data = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, 2).astype(np.float32)

        f = min(fade_len, len(data) // 2)
        if f > 0:
            fade_in = np.linspace(0, 1, f, dtype=np.float32)[:, None]
            fade_out = np.linspace(1, 0, f, dtype=np.float32)[:, None]
            data[:f] *= fade_in
            data[-f:] *= fade_out

        s = int(b["sched_start"] * SR)
        e = min(total_samples, s + len(data))
        narr_track[s:e] += data[: e - s]

    master = narr_track / 32768.0
    del narr_track
    master = np.tanh(master * 0.95)
    master_int16 = (master * 32767.0).astype(np.int16)
    del master

    print(f"Gravando WAV mestre intermediário: {MASTER_WAV.name}...", flush=True)
    with wave.open(str(MASTER_WAV), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(master_int16.tobytes())
    del master_int16

    print("Muxing com vídeo original e normalização oficial -14 LUFS (EBU R128)...", flush=True)
    cmd = [
        "ffmpeg", "-y",
        "-i", str(SRC_VIDEO),
        "-i", str(MASTER_WAV),
        "-map", "0:v:0",
        "-map", "1:a:0",
        "-c:v", "copy",
        "-filter:a:0", "loudnorm=I=-14:LRA=7:TP=-1.5",
        "-c:a", "aac",
        "-b:a", "192k",
        "-ar", "48000",
        "-movflags", "+faststart",
        str(FINAL_VIDEO)
    ]
    subprocess.run(cmd, check=True)

    if FINAL_VIDEO.exists():
        import shutil
        shutil.copy2(str(FINAL_VIDEO), str(REMASTER_TARGET))
        print(f"[OK] Atualizado também: {REMASTER_TARGET.name}", flush=True)

    if MASTER_WAV.exists():
        MASTER_WAV.unlink()

    print("\n==================================================", flush=True)
    print("VÍDEO 1 DUETO NEURAL CONCLUÍDO COM SUCESSO!", flush=True)
    print(f"Destino: {FINAL_VIDEO} ({FINAL_VIDEO.stat().st_size / (1024*1024):.1f} MB)", flush=True)
    print("==================================================", flush=True)

async def main():
    video_dur = ffprobe_dur(SRC_VIDEO)
    print("==================================================")
    print(f"INICIANDO REMASTERIZAÇÃO VÍDEO 1 DUETO NEURAL (Duração: {video_dur:.1f}s / {video_dur/60:.1f} min)")
    print("==================================================")

    scenes = step1_load_scenes(video_dur)
    raw_segs = step2_load_and_tag_segments()
    blocks = step3_build_dueto_blocks(raw_segs, scenes)

    await step4_synthesize_dueto(blocks)
    sched_blocks = step5_schedule_and_render_wavs(blocks, scenes, video_dur)
    step6_render_master_dueto(sched_blocks, video_dur)

if __name__ == "__main__":
    asyncio.run(main())
