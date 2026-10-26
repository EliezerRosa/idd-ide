"""Pipeline 100% Antonio Neural para o Vídeo 2:
1. Extração do áudio 16kHz e detecção de cenas/slides
2. Transcrição com Whisper (small int8)
3. Agrupamento em blocos semânticos com cadência natural (sem lacunas mortas)
4. Síntese via Edge-TTS (pt-BR-AntonioNeural) com glossário técnico
5. Montagem cirúrgica alinhada com as exibições dos slides
6. Mixagem com zero resquício do áudio original e normalização -14 LUFS
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
OUT = PROD / "v2_neural"
SEGS = OUT / "audio_segs"
OUT.mkdir(parents=True, exist_ok=True)
SEGS.mkdir(parents=True, exist_ok=True)

SRC_VIDEO = BASE / "apresentacao" / "Refrigeração - IDD Vídeo 2 (Versão Otimizada).mp4"
FINAL_VIDEO = PROD / "Refrigeracao_IDD_Video_2_100_Neural.mp4"
REMASTER_TARGET = PROD / "Refrigeracao_IDD_Video_2_Remasterizado.mp4"

WAV_16K = OUT / "v2_16k.wav"
TRANSCRIPT_FILE = OUT / "transcricao_v2.json"
SCENES_FILE = OUT / "cenas_v2.json"
SCHEDULE_FILE = OUT / "schedule_v2.json"
MASTER_WAV = OUT / "temp_master_v2.wav"

VOICE = "pt-BR-AntonioNeural"
SR = 48000
MAX_PAUSE_SAME_SCENE = 1.2   # Máxima pausa permitida entre falas do mesmo contexto (evita lacunas mortas)
MIN_PAUSE_BETWEEN_BLOCKS = 0.45 # Pausa respiratória natural
MAX_SPEED = 1.30             # Aceleração máxima segura sem distorcer

GLOSSARY = [
    (r"\bIDD\b", "I D D"),
    (r"\bIDE\b", "I D E"),
    (r"\bPMOC\b", "P M O C"),
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
    (r"\bdev\b", "dév"),
    (r"\bDEV\b", "dév"),
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
    (r"\bGemini\b", "Djêminai"),
    (r"\bCLI\b", "C L I"),
    (r"\bPID\b", "P I D"),
    (r"\bIoT\b", "I o T")
]

def tts_text(t: str) -> str:
    for pat, rep in GLOSSARY:
        t = re.sub(pat, rep, t, flags=re.IGNORECASE)
    # Remove marcas de hesitação analógica
    t = re.sub(r"\b(é+|hum+|eh+|humm)\b", "", t, flags=re.IGNORECASE)
    return re.sub(r"\s+", " ", t).strip()

def ffprobe_dur(p):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(p)],
                       capture_output=True, text=True, check=True)
    return float(r.stdout.strip())

def step1_extract_audio_and_scenes(video_dur):
    print("\n--- ETAPA 1: Extração de áudio 16kHz e detecção de cenas ---")
    if not WAV_16K.exists():
        print(f"Extraindo áudio mono 16kHz para: {WAV_16K.name}...")
        subprocess.run(["ffmpeg", "-y", "-i", str(SRC_VIDEO), "-vn", "-ar", "16000", "-ac", "1", str(WAV_16K)],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print("[OK] Áudio 16kHz extraído.")
    else:
        print("[CACHE] Áudio 16kHz já existe.")

    if not SCENES_FILE.exists():
        print("Detectando mudanças de cenas/slides visuais no vídeo...")
        cmd = [
            "ffmpeg", "-i", str(SRC_VIDEO),
            "-filter_complex", "select='gt(scene,0.06)',metadata=print:file=-",
            "-f", "null", "-"
        ]
        res = subprocess.run(cmd, capture_output=True, text=True, errors="ignore")
        scenes = [0.0]
        for line in res.stdout.splitlines() + res.stderr.splitlines():
            if "pts_time:" in line:
                m = re.search(r"pts_time:([0-9\.]+)", line)
                if m:
                    t = float(m.group(1))
                    if t - scenes[-1] > 4.0: # Transição de cena relevante (> 4s)
                        scenes.append(round(t, 2))
        scenes.append(round(video_dur, 2))
        SCENES_FILE.write_text(json.dumps(scenes, indent=2), encoding="utf-8")
        print(f"[OK] {len(scenes)} âncoras de cena detectadas.")
    else:
        print("[CACHE] Arquivo de cenas já existe.")

def step2_transcribe():
    print("\n--- ETAPA 2: Transcrição com Whisper (small int8) ---")
    if TRANSCRIPT_FILE.exists() and TRANSCRIPT_FILE.stat().st_size > 5000:
        print(f"[CACHE] Transcrição já existe em {TRANSCRIPT_FILE.name}")
        return json.loads(TRANSCRIPT_FILE.read_text(encoding="utf-8"))

    from faster_whisper import WhisperModel
    print("Carregando modelo Whisper 'small' com quantização int8...")
    model = WhisperModel("small", device="cpu", compute_type="int8")
    
    print(f"Transcrevendo {WAV_16K.name} em português...")
    t0 = time.time()
    segments, info = model.transcribe(str(WAV_16K), language="pt", beam_size=5, vad_filter=True)
    
    results = []
    count = 0
    for s in segments:
        txt = s.text.strip()
        if txt:
            results.append({
                "start": round(s.start, 2),
                "end": round(s.end, 2),
                "text": txt
            })
            count += 1
            if count % 50 == 0:
                print(f"  processados {count} trechos ({s.end/60:.1f} min transcritos)...", flush=True)

    elapsed = time.time() - t0
    print(f"[OK] Transcrição concluída em {elapsed/60:.1f} min! Total de {len(results)} segmentos.")
    TRANSCRIPT_FILE.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    return results

def step3_build_blocks(raw_segs, scenes):
    print("\n--- ETAPA 3: Agrupamento em blocos semânticos e eliminação de lacunas mortas ---")
    blocks, cur = [], None
    
    # Agrupa segmentos contínuos respeitando frases e tamanho natural
    for s in raw_segs:
        txt = s["text"].strip()
        if not txt:
            continue
        
        # Inicia novo bloco se o gap for grande (> 2.0s), se ultrapassar 300 caracteres ou cruzar âncora de cena
        crosses_scene = any(cur and cur["start"] < sc <= s["start"] for sc in scenes)
        gap = (s["start"] - cur["end"]) if cur else 0.0
        
        if cur is None or gap > 2.0 or (len(cur["text"]) + len(txt) > 300) or crosses_scene:
            cur = {
                "start": s["start"],
                "end": s["end"],
                "text": txt
            }
            blocks.append(cur)
        else:
            cur["end"] = s["end"]
            cur["text"] += " " + txt

    for idx, b in enumerate(blocks, 1):
        b["id"] = idx
        b["tts"] = tts_text(b["text"])

    print(f"[OK] {len(blocks)} blocos semânticos consolidados.")
    return blocks

async def step4_synthesize_blocks(blocks):
    print(f"\n--- ETAPA 4: Síntese de áudio com voz {VOICE} ---")
    import edge_tts

    sem = asyncio.Semaphore(4)
    done = 0
    cached = 0

    async def synth_one(b):
        nonlocal done, cached
        h = hashlib.md5((VOICE + b["tts"]).encode("utf-8")).hexdigest()[:10]
        mp3 = SEGS / f"b{b['id']:03d}_{h}.mp3"
        b["mp3"] = str(mp3)

        if mp3.exists() and mp3.stat().st_size > 500:
            cached += 1
            done += 1
            return

        async with sem:
            for attempt in range(1, 8):
                try:
                    await edge_tts.Communicate(b["tts"], VOICE).save(str(mp3))
                    if mp3.exists() and mp3.stat().st_size > 500:
                        done += 1
                        if done % 20 == 0 or done == len(blocks):
                            print(f"  progresso síntese: {done}/{len(blocks)}", flush=True)
                        return
                except Exception as e:
                    pass
                await asyncio.sleep(min(15, 2 * attempt))
            raise RuntimeError(f"Falha ao sintetizar bloco {b['id']}: {b['tts'][:30]}")

    await asyncio.gather(*(synth_one(b) for b in blocks))
    print(f"[OK] Todos os {len(blocks)} blocos sintetizados! (Reaproveitados em cache: {cached})")

def step5_schedule_audio(blocks, scenes, video_dur):
    print("\n--- ETAPA 5: Agendamento Cirúrgico e Eliminação de Lacunas Mortas ---")
    for b in blocks:
        b["nat_dur"] = ffprobe_dur(b["mp3"])

    cursor = 0.0
    for i, b in enumerate(blocks):
        orig_start = b["start"]
        nat_dur = b["nat_dur"]

        # Determina a cena/âncora visual onde este bloco pertence
        scene_start = 0.0
        scene_end = video_dur
        for sc_idx in range(len(scenes) - 1):
            if scenes[sc_idx] <= orig_start < scenes[sc_idx + 1]:
                scene_start = scenes[sc_idx]
                scene_end = scenes[sc_idx + 1]
                break

        # Regra de eliminação de lacunas:
        # Se o cursor atual está na mesma cena e o gap até a fala original seria > MAX_PAUSE_SAME_SCENE,
        # puxamos a fala para frente mantendo uma pausa fluida natural de MIN_PAUSE_BETWEEN_BLOCKS (0.45s a 0.7s)
        # NUNCA deixando 5 ou 10 segundos de silêncio morto entre frases do mesmo raciocínio!
        ideal_start = max(cursor + MIN_PAUSE_BETWEEN_BLOCKS, orig_start)
        if cursor > scene_start and (orig_start - cursor) > MAX_PAUSE_SAME_SCENE:
            # Puxa para manter a cadência fluida do apresentador
            sched_start = cursor + MIN_PAUSE_BETWEEN_BLOCKS
        else:
            sched_start = ideal_start

        # Limite da janela: próximo bloco ou fim da cena atual
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
        wav = SEGS / f"b{b['id']:03d}.wav"
        
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

    SCHEDULE_FILE.write_text(json.dumps(blocks, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[OK] Cronograma sem lacunas salvo em: {SCHEDULE_FILE.name}")
    print(f"Duração final prevista: {cursor:.1f}s / Vídeo total: {video_dur:.1f}s")
    return blocks

def step6_render_master(blocks, video_dur):
    print("\n--- ETAPA 6: Renderização e Mux 100% Neural (Zero Cooler, Zero Analógico) ---")
    total_samples = int(video_dur * SR)
    narr_track = np.zeros((total_samples, 2), dtype=np.float32)

    fade_len = int(0.015 * SR) # 15ms anti-clique
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

    # Soft-limiter suave
    master = narr_track / 32768.0
    del narr_track
    master = np.tanh(master * 0.95)
    master_int16 = (master * 32767.0).astype(np.int16)
    del master

    print(f"Gravando WAV intermediário mestre: {MASTER_WAV.name}...")
    with wave.open(str(MASTER_WAV), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(master_int16.tobytes())
    del master_int16

    print("Muxing final com vídeo original e normalização em -14 LUFS (EBU R128)...")
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

    # Substitui também o arquivo remasterizado oficial
    if FINAL_VIDEO.exists():
        import shutil
        shutil.copy2(str(FINAL_VIDEO), str(REMASTER_TARGET))
        print(f"[OK] Atualizado também: {REMASTER_TARGET.name}")

    if MASTER_WAV.exists():
        MASTER_WAV.unlink()

    print("\n==================================================")
    print("VÍDEO 2 100% NEURAL CONCLUÍDO COM SUCESSO!")
    print(f"Destino: {FINAL_VIDEO} ({FINAL_VIDEO.stat().st_size / (1024*1024):.1f} MB)")
    print("==================================================")

async def main():
    video_dur = ffprobe_dur(SRC_VIDEO)
    print("==================================================")
    print(f"INICIANDO PIPELINE VÍDEO 2 (Duração: {video_dur:.1f}s / {video_dur/60:.1f} min)")
    print("==================================================")
    
    step1_extract_audio_and_scenes(video_dur)
    scenes = json.loads(SCENES_FILE.read_text(encoding="utf-8"))
    
    raw_segs = step2_transcribe()
    blocks = step3_build_blocks(raw_segs, scenes)
    
    await step4_synthesize_blocks(blocks)
    sched_blocks = step5_schedule_audio(blocks, scenes, video_dur)
    step6_render_master(sched_blocks, video_dur)

if __name__ == "__main__":
    asyncio.run(main())
