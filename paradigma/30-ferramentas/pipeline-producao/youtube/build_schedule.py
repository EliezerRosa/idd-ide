import json, subprocess, hashlib, re, sys
from pathlib import Path

OUT = Path("v1_verbatim")
SEGS = OUT / "audio_segs"
SRC = OUT / "transcricao_turbo.json"
VOICE = "pt-BR-AntonioNeural"
VIDEO_DUR = 4331.19
GUARD = 0.12
MAX_SPEED = 1.35
GAP_NEW_BLOCK = 0.7
MAX_CHARS = 380

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
    (r"\bNL\b", "N L"),
    (r"\bdev\b", "dév"),
    (r"\bDEV\b", "dév"),
    (r"\bconfluência\b", "Cônfluensse"),
    (r"\bConfluence\b", "Cônfluensse"),
    (r"\bQR[- ]?[cC]ode\b", "que érre códe"),
    (r"\bPUNC\b", "P M O C"),
    (r"\bPUC\b", "P M O C"),
    (r"\bPUMOC\b", "P M O C"),
    (r"\bTUMOC\b", "P M O C"),
    (r"\bcomissor\b", "compressor"),
    (r"\bcontratos de coque\b", "contratos de P M O C"),
    (r"\bporte predomínio\b", "porte predominante"),
    (r"\b13\.589\b", "treze mil quinhentos e oitenta e nove"),
    (r"\bCREA\b", "Crea"),
    (r"\bCFT\b", "C F T"),
    (r"\bargumentando não automatizar, aumentar não automatizar\b", "aumentar, não automatizar"),
]

def tts_text(t: str) -> str:
    for pat, rep in GLOSSARY:
        t = re.sub(pat, rep, t, flags=re.IGNORECASE)
    return re.sub(r"\s+", " ", t).strip()

def ffprobe_dur(p):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(p)],
                       capture_output=True, text=True, check=True)
    return float(r.stdout.strip())

def main():
    print("1. Carregando transcrição e agrupando blocos...", flush=True)
    segs = json.loads(SRC.read_text(encoding="utf-8"))
    blocks, cur = [], None
    for s in segs:
        txt = s["text"].strip()
        if not txt:
            continue
        new = cur is None or (s["start"] - cur["end"] > GAP_NEW_BLOCK) or (len(cur["text"]) + len(txt) > MAX_CHARS)
        if new:
            cur = {"start": s["start"], "end": s["end"], "text": txt}
            blocks.append(cur)
        else:
            cur["end"] = s["end"]
            cur["text"] += " " + txt

    print(f"Total de blocos: {len(blocks)}", flush=True)

    print("2. Vinculando MP3s e medindo duração...", flush=True)
    for i, b in enumerate(blocks, 1):
        b["id"] = i
        b["tts"] = tts_text(b["text"])
        h = hashlib.md5((VOICE + b["tts"]).encode("utf-8")).hexdigest()[:10]
        matched = list(SEGS.glob(f"*_{h}.mp3"))
        if not matched:
            raise RuntimeError(f"MP3 faltando para bloco {i}: {b['tts'][:40]}")
        b["mp3"] = str(matched[0])
        b["nat_dur"] = ffprobe_dur(b["mp3"])

    print("3. Processando alinhamento temporal e exportando WAVs 48kHz...", flush=True)
    cursor, warns = 0.0, []
    for i, b in enumerate(blocks):
        start = max(b["start"], cursor)
        nxt = blocks[i + 1]["start"] if i + 1 < len(blocks) else VIDEO_DUR
        window = max(0.5, nxt - GUARD - start)
        speed = 1.0
        if b["nat_dur"] > window:
            speed = min(MAX_SPEED, b["nat_dur"] / window)
        dur = b["nat_dur"] / speed
        bid = b["id"]
        wav = SEGS / f"b{bid:03d}.wav"
        af = "highpass=f=70" + (f",atempo={speed:.4f}" if speed > 1.001 else "")
        res = subprocess.run(["ffmpeg", "-y", "-i", b["mp3"], "-af", af, "-ar", "48000", "-ac", "2", str(wav)],
                             capture_output=True, text=True)
        if res.returncode != 0:
            print(f"Erro no ffmpeg bloco {bid}: {res.stderr}", flush=True)
            sys.exit(1)
        b.update(sched_start=round(start, 3), dur=round(dur, 3), speed=round(speed, 3), wav=str(wav))
        cursor = start + dur + GUARD
        if i % 25 == 0 or i == len(blocks) - 1:
            print(f"  processado bloco {bid}/{len(blocks)} (speed={speed:.2f}x)", flush=True)

    out1 = OUT / "schedule_100_neural.json"
    out2 = OUT / "schedule.json"
    out1.write_text(json.dumps(blocks, ensure_ascii=False, indent=1), encoding="utf-8")
    out2.write_text(json.dumps(blocks, ensure_ascii=False, indent=1), encoding="utf-8")

    print("\n==================================================", flush=True)
    print("CRONOGRAMA E ARQUIVOS WAV 100% CONCLUÍDOS!", flush=True)
    print(f"Arquivo 1: {out1}")
    print(f"Arquivo 2: {out2}")
    print("==================================================", flush=True)

if __name__ == "__main__":
    main()
