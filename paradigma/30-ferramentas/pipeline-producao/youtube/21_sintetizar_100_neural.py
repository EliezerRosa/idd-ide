"""V1 Verbatim 100% Neural - Etapa 2:
Agrupa a transcrição literal em blocos, sintetiza TODOS os segmentos (inclusive os 3 trechos de IA anteriores)
com a voz neural pt-BR-AntonioNeural (edge-tts), ajusta o tempo (atempo só quando excede a janela)
e gera o cronograma -> v1_verbatim/schedule_100_neural.json.
Zero resquício de ruído de cooler/ventoinha em todo o vídeo.
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

# 100% Neural: NENHUM trecho preservado do áudio analógico com cooler!
PRESERVED = []

GAP_NEW_BLOCK = 0.7      # pausa (s) que inicia um novo bloco
MAX_CHARS = 380          # tamanho máximo de um bloco
MAX_SPEED = 1.35         # aceleração máxima (atempo)
GUARD = 0.12             # folga entre blocos (s)

# Glossário refinado para pronúncia perfeita de termos técnicos e correção de lapsos do Whisper nos slides
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

def load_blocks():
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

    for i, b in enumerate(blocks, 1):
        b["id"] = i
        b["tts"] = tts_text(b["text"])
    return blocks

def ffprobe_dur(p):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(p)],
                       capture_output=True, text=True, check=True)
    return float(r.stdout.strip())

async def synth(b, sem):
    h = hashlib.md5((VOICE + b["tts"]).encode("utf-8")).hexdigest()[:10]
    matched = list(SEGS.glob(f"*_{h}.mp3"))
    if matched and matched[0].stat().st_size > 1000:
        b["mp3"] = str(matched[0])
        return

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
            await asyncio.sleep(min(30, 2 * tent))
        raise RuntimeError(f"Falha ao sintetizar bloco {b['id']}")

async def main():
    blocks = load_blocks()
    print(f"Total de blocos: {len(blocks)} (100% Neural, sem exceções) | fonte: {SRC.name}", flush=True)

    sem = asyncio.Semaphore(3)
    done = 0
    cached = 0

    # Contagem de cache
    for b in blocks:
        h = hashlib.md5((VOICE + b["tts"]).encode("utf-8")).hexdigest()[:10]
        if list(SEGS.glob(f"*_{h}.mp3")):
            cached += 1
    print(f"Cache de áudio reaproveitado: {cached}/{len(blocks)} blocos. A sintetizar: {len(blocks) - cached}", flush=True)

    async def run(b):
        nonlocal done
        await synth(b, sem)
        done += 1
        if done % 15 == 0 or done == len(blocks):
            print(f"  progresso síntese: {done}/{len(blocks)}", flush=True)

    await asyncio.gather(*(run(b) for b in blocks))
    print("Todos os blocos de áudio sintetizados com sucesso!", flush=True)

    print("Calculando durações naturais e ajustando timing (atempo)...", flush=True)
    for b in blocks:
        b["nat_dur"] = ffprobe_dur(b["mp3"])

    # Agenda sequencial: cada bloco começa na fala original, empurrado só se o anterior ainda estiver falando.
    cursor, warns = 0.0, []
    for i, b in enumerate(blocks):
        start = max(b["start"], cursor)
        nxt = blocks[i + 1]["start"] if i + 1 < len(blocks) else VIDEO_DUR
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
        if start - b["start"] > 3.0:
            warns.append(f"bloco {b['id']} atrasado {start - b['start']:.1f}s")

    out_sched = OUT / "schedule_100_neural.json"
    out_sched.write_text(json.dumps(blocks, ensure_ascii=False, indent=1), encoding="utf-8")
    # Também sobrescreve o schedule.json padrão para compatibilidade
    (OUT / "schedule.json").write_text(json.dumps(blocks, ensure_ascii=False, indent=1), encoding="utf-8")

    sp = [b["speed"] for b in blocks]
    print(f"\nConcluído: {len(blocks)} blocos gerados!")
    print(f"Blocos com atempo: {sum(1 for s in sp if s > 1.001)} | Velocidade máx: {max(sp):.2f}x")
    print(f"Atraso máximo vs fala original: {max(b['sched_start'] - b['start'] for b in blocks):.1f}s")
    print(f"Cronograma salvo em: {out_sched}")
    if warns:
        print(f"Avisos de atraso ({len(warns)}):", warns[:5])

if __name__ == "__main__":
    asyncio.run(main())
