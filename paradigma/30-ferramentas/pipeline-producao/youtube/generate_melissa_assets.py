import asyncio, json, re, subprocess, hashlib
from pathlib import Path
import edge_tts

OUT_DIR = Path(r"C:\Antigravity - IDD Refrigeração\producao_yt\melissa_assets")
OUT_DIR.mkdir(parents=True, exist_ok=True)
HTML_PATH = Path(r"C:\Antigravity - IDD Refrigeração\IDD Paradigma\IDD Prática Melissa\Git-Office-M\nexuslog-crm\apresentacao.html")

VOICES = {
    "carlos": "pt-BR-AntonioNeural",    # Eliézer Rosa
    "melissa": "pt-BR-FranciscaNeural",  # Melissa
    "ai": "pt-BR-AntonioNeural",        # Claude / Narrador IA
}

def extract_slides():
    html = HTML_PATH.read_text(encoding="utf-8")
    m = re.search(r"const slides = (\[.*?\]);\s*\n/\* ═══════════", html, re.DOTALL)
    if not m:
        raise ValueError("Não foi possível encontrar a declaração 'const slides' no HTML")
    js_code = m.group(1)
    
    # Executa node para converter o JS object em JSON limpo com encoding UTF-8 explícito
    res = subprocess.run(["node", "-e", f"console.log(JSON.stringify({js_code}))"],
                         capture_output=True, text=True, encoding="utf-8", check=True)
    return json.loads(res.stdout)

def ffprobe_dur(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
                       capture_output=True, text=True, check=True)
    return float(r.stdout.strip())

async def synth_segment(text, voice, out_path, sem):
    if out_path.exists() and out_path.stat().st_size > 1000:
        return
    # Pronúncias refinadas
    clean_text = re.sub(r"\bIDD\b", "I D D", text)
    clean_text = re.sub(r"\bCRM\b", "C R M", clean_text)
    clean_text = re.sub(r"\bUI\b", "U I", clean_text)
    clean_text = re.sub(r"\bUIs\b", "U I's", clean_text)
    clean_text = re.sub(r"\bReact\b", "Riéct", clean_text)
    clean_text = re.sub(r"\bSupabase\b", "Supabêise", clean_text)
    clean_text = re.sub(r"\bVercel\b", "Vercél", clean_text)
    clean_text = re.sub(r"\bGitHub\b", "guit-râb", clean_text)
    clean_text = re.sub(r"\bApp\b", "Épi", clean_text, flags=re.IGNORECASE)
    clean_text = re.sub(r"\bAuth\b", "Óf", clean_text)
    clean_text = re.sub(r"\bPDF\b", "P D F", clean_text)

    async with sem:
        for attempt in range(1, 6):
            try:
                await edge_tts.Communicate(clean_text, voice).save(str(out_path))
                if out_path.exists() and out_path.stat().st_size > 1000:
                    return
            except Exception as e:
                print(f"  tentativa {attempt} falhou ({e})", flush=True)
            await asyncio.sleep(min(15, 2 * attempt))
        raise RuntimeError(f"Falha ao sintetizar: {text[:30]}")

async def main():
    slides = extract_slides()
    print(f"Total de slides extraídos: {len(slides)}", flush=True)

    items_to_synth = []
    for s_idx, s in enumerate(slides):
        if s.get("final"):
            items_to_synth.append({
                "type": "narration",
                "slide": s_idx,
                "who": "ai",
                "text": s["narration"]
            })
        elif s.get("uiTour"):
            items_to_synth.append({
                "type": "uiIntro",
                "slide": s_idx,
                "who": "ai",
                "text": s["intro"]
            })
            for u_idx, u in enumerate(s["uis"]):
                items_to_synth.append({
                    "type": "uiItem",
                    "slide": s_idx,
                    "uiIdx": u_idx,
                    "who": "ai",
                    "text": u["narr"]
                })
        elif s.get("dialog"):
            for d_idx, d in enumerate(s["dialog"]):
                items_to_synth.append({
                    "type": "dialog",
                    "slide": s_idx,
                    "dialogIdx": d_idx,
                    "who": d["who"],
                    "text": d["text"]
                })

    print(f"Total de trechos falados para síntese: {len(items_to_synth)}", flush=True)
    sem = asyncio.Semaphore(4)
    tasks = []

    for i, it in enumerate(items_to_synth):
        voice = VOICES.get(it["who"], "pt-BR-AntonioNeural")
        h = hashlib.md5((voice + it["text"]).encode("utf-8")).hexdigest()[:10]
        mp3 = OUT_DIR / f"seg_{i:03d}_{it['who']}_{h}.mp3"
        it["mp3"] = str(mp3)
        tasks.append(synth_segment(it["text"], voice, mp3, sem))

    await asyncio.gather(*tasks)
    print("Todos os segmentos sintetizados com sucesso!", flush=True)

    # Medição de duração e montagem da timeline
    timeline = []
    cursor = 0.5 # 0.5s de silêncio inicial
    for i, it in enumerate(items_to_synth):
        dur = ffprobe_dur(it["mp3"])
        it["startSec"] = round(cursor, 3)
        it["durSec"] = round(dur, 3)
        wav = OUT_DIR / f"seg_{i:03d}.wav"
        # Resample para 48kHz estéreo
        subprocess.run(["ffmpeg", "-y", "-i", it["mp3"], "-af", "highpass=f=70", "-ar", "48000", "-ac", "2", str(wav)],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        it["wav"] = str(wav)
        timeline.append(it)
        cursor += dur + 0.55 # pausa de 550ms entre falas

    total_dur = cursor + 1.5
    print(f"Duração total estimada do vídeo da Melissa: {total_dur/60:.1f} minutos ({total_dur:.1f}s)", flush=True)

    # Salva timeline
    timeline_path = OUT_DIR / "melissa_timeline.json"
    timeline_path.write_text(json.dumps({
        "totalDurationSec": total_dur,
        "items": timeline
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Timeline salva em: {timeline_path}", flush=True)

    # Monta a trilha mestre de áudio com numpy
    import numpy as np, wave
    total_samples = int(total_dur * 48000)
    master = np.zeros((total_samples, 2), dtype=np.float32)

    for it in timeline:
        with wave.open(it["wav"], "rb") as w:
            arr = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, 2).astype(np.float32)
        s = int(it["startSec"] * 48000)
        e = min(total_samples, s + len(arr))
        # Micro-fades
        f = min(int(0.012 * 48000), len(arr) // 2)
        if f > 0:
            arr[:f] *= np.linspace(0, 1, f, dtype=np.float32)[:, None]
            arr[-f:] *= np.linspace(1, 0, f, dtype=np.float32)[:, None]
        master[s:e] += arr[:e - s]

    master = master / 32768.0
    master = np.tanh(master * 0.95)
    master_int16 = (master * 32767.0).astype(np.int16)

    raw_wav = OUT_DIR / "temp_melissa_master_raw.wav"
    with wave.open(str(raw_wav), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(48000)
        w.writeframes(master_int16.tobytes())

    # Normalização -14 LUFS oficial
    final_master_wav = OUT_DIR / "melissa_audio_master_lufs.wav"
    print("Normalizando trilha mestre em -14 LUFS...", flush=True)
    subprocess.run([
        "ffmpeg", "-y", "-i", str(raw_wav),
        "-filter:a", "loudnorm=I=-14:LRA=7:TP=-1.5",
        "-ar", "48000", str(final_master_wav)
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

    if raw_wav.exists():
        raw_wav.unlink()

    print(f"Áudio mestre concluído: {final_master_wav}", flush=True)

if __name__ == "__main__":
    asyncio.run(main())
