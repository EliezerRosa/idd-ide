"""V1 verbatim - etapa 2: agrupa a transcrição literal em blocos, sintetiza com Antonio Neural (edge-tts),
ajusta o tempo (atempo só quando excede a janela) e gera o cronograma -> v1_verbatim/schedule.json

Uso: python 21_sintetizar_v1.py [caminho_transcricao.json]
"""
import asyncio, json, re, subprocess, sys, hashlib
from pathlib import Path
import edge_tts

OUT = Path(r"C:\Antigravity - IDD Refrigeração\producao_yt\v1_verbatim")
SEGS = OUT / "audio_segs"
SEGS.mkdir(parents=True, exist_ok=True)
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else OUT / "transcricao_turbo.json"
VOICE = "pt-BR-AntonioNeural"
VIDEO_DUR = 4331.19

# Trechos em que a voz é de IA (preservados intactos): (início, fim) em segundos.
PRESERVED = [(45.6, 212.0), (3508.7, 3577.4), (3932.2, 4145.4)]

GAP_NEW_BLOCK = 0.7      # pausa (s) que inicia um novo bloco
MAX_CHARS = 380          # tamanho máximo de um bloco
MAX_SPEED = 1.35         # aceleração máxima (atempo)
GUARD = 0.12             # folga entre blocos (s)

# Ajustes só para pronúncia (o texto literal em "text" não é alterado).
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
]

def tts_text(t: str) -> str:
    for pat, rep in GLOSSARY:
        t = re.sub(pat, rep, t)
    return re.sub(r"\s+", " ", t).strip()

def overlap(a0, a1, b0, b1):
    return max(0.0, min(a1, b1) - max(a0, b0))

def load_blocks():
    segs = json.loads(SRC.read_text(encoding="utf-8"))
    keep, dropped = [], []
    for s in segs:
        dur = max(0.01, s["end"] - s["start"])
        ov = sum(overlap(s["start"], s["end"], p0, p1) for p0, p1 in PRESERVED)
        (dropped if ov / dur >= 0.5 else keep).append(s)
    blocks, cur = [], None
    for s in keep:
        txt = s["text"].strip()
        if not txt:
            continue
        new = cur is None or (s["start"] - cur["end"] > GAP_NEW_BLOCK) or (len(cur["text"]) + len(txt) > MAX_CHARS)
        if not new:  # não atravessar trecho preservado
            for p0, p1 in PRESERVED:
                if cur["end"] <= p0 < s["start"]:
                    new = True
        if new:
            cur = {"start": s["start"], "end": s["end"], "text": txt}
            blocks.append(cur)
        else:
            cur["end"] = s["end"]
            cur["text"] += " " + txt
    for i, b in enumerate(blocks, 1):
        b["id"] = i
        b["tts"] = tts_text(b["text"])
    return blocks, dropped

def ffprobe_dur(p):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(p)],
                       capture_output=True, text=True, check=True)
    return float(r.stdout.strip())

async def synth(b, sem):
    h = hashlib.md5((VOICE + b["tts"]).encode("utf-8")).hexdigest()[:10]
    mp3 = SEGS / f"b{b['id']:03d}_{h}.mp3"
    b["mp3"] = str(mp3)
    if mp3.exists() and mp3.stat().st_size > 1000:
        return
    async with sem:
        for tent in range(1, 9):
            try:
                await edge_tts.Communicate(b["tts"], VOICE).save(str(mp3))
                if mp3.exists() and mp3.stat().st_size > 1000:
                    return
            except Exception as e:
                print(f"  bloco {b['id']}: tentativa {tent} falhou ({type(e).__name__})", flush=True)
            await asyncio.sleep(min(30, 3 * tent))
        raise RuntimeError(f"Falha ao sintetizar bloco {b['id']}")

async def main():
    blocks, dropped = load_blocks()
    print(f"{len(blocks)} blocos | {len(dropped)} segmentos de IA descartados | fonte: {SRC.name}", flush=True)
    sem = asyncio.Semaphore(3)
    done = 0
    async def run(b):
        nonlocal done
        await synth(b, sem)
        done += 1
        if done % 10 == 0 or done == len(blocks):
            print(f"  sintetizados {done}/{len(blocks)}", flush=True)
    await asyncio.gather(*(run(b) for b in blocks))

    for b in blocks:
        b["nat_dur"] = ffprobe_dur(b["mp3"])

    # Agenda sequencial: cada bloco começa na fala original, empurrado só se o anterior ainda estiver falando.
    cursor, warns = 0.0, []
    for i, b in enumerate(blocks):
        start = max(b["start"], cursor)
        nxt = blocks[i + 1]["start"] if i + 1 < len(blocks) else VIDEO_DUR
        for p0, p1 in PRESERVED:               # janela termina antes de um trecho de IA
            if start < p0 <= nxt:
                nxt = p0
        window = max(0.5, nxt - GUARD - start)
        speed = 1.0
        if b["nat_dur"] > window:
            speed = min(MAX_SPEED, b["nat_dur"] / window)
        dur = b["nat_dur"] / speed
        wav = SEGS / f"b{b['id']:03d}.wav"
        af = "highpass=f=70" + (f",atempo={speed:.4f}" if speed > 1.001 else "")
        subprocess.run(["ffmpeg", "-y", "-i", b["mp3"], "-af", af, "-ar", "48000", "-ac", "2", str(wav)],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        b.update(sched_start=round(start, 3), dur=round(dur, 3), speed=round(speed, 3), wav=str(wav))
        cursor = start + dur + GUARD
        for p0, p1 in PRESERVED:
            if start < p0 < start + dur:
                warns.append(f"bloco {b['id']} invade trecho de IA em {p0}s")
        if start - b["start"] > 3.0:
            warns.append(f"bloco {b['id']} atrasado {start - b['start']:.1f}s")

    (OUT / "schedule.json").write_text(json.dumps(blocks, ensure_ascii=False, indent=1), encoding="utf-8")
    sp = [b["speed"] for b in blocks]
    print(f"Concluído: {len(blocks)} blocos | acelerados: {sum(1 for s in sp if s > 1.001)} | velocidade máx: {max(sp):.2f}x")
    print(f"Atraso máximo vs fala original: {max(b['sched_start'] - b['start'] for b in blocks):.1f}s")
    for w in warns:
        print("AVISO:", w)

if __name__ == "__main__":
    asyncio.run(main())
