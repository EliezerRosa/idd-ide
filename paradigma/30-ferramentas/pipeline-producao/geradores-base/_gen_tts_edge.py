"""Gera WAVs faltantes do Ep03 usando edge-tts (fallback por cota Gemini esgotada)."""
import asyncio, json, subprocess, tempfile
from pathlib import Path
import edge_tts

AUDIO_DIR   = Path(r"C:\Antigravity - RVM Designações\IDD Paradigma\04 - Acervo de Episódios\Ep03 - A Genealogia\idd_p3_output\audio")
SCRIPT_JSON = Path(r"C:\Antigravity - RVM Designações\IDD Paradigma\04 - Acervo de Episódios\Ep03 - A Genealogia\idd_p3_output\script.json")

VOICE_ELIEZER = "pt-BR-AntonioNeural"
VOICE_IA      = "pt-BR-FranciscaNeural"
SILENCE_SIZE  = 192044  # bytes de silêncio 4s @ 24kHz

def needs_gen(line_id: int) -> bool:
    p = AUDIO_DIR / f"line_{line_id:04d}.wav"
    return not p.exists() or p.stat().st_size <= SILENCE_SIZE

async def gen_line(text: str, voice: str, out_path: Path) -> int:
    communicate = edge_tts.Communicate(text, voice)
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
        tmp_path = Path(tmp.name)
    try:
        await communicate.save(str(tmp_path))
        # Converte MP3 → WAV 24000 Hz mono (igual ao Gemini TTS)
        result = subprocess.run(
            ["ffmpeg", "-y", "-i", str(tmp_path),
             "-ar", "24000", "-ac", "1", str(out_path)],
            capture_output=True
        )
        if result.returncode != 0:
            raise RuntimeError(result.stderr.decode("utf-8", errors="replace")[-200:])
    finally:
        if tmp_path.exists():
            tmp_path.unlink()
    return out_path.stat().st_size

async def main():
    script = json.loads(SCRIPT_JSON.read_text("utf-8"))
    to_gen = [l for l in script if needs_gen(l["id"])]
    total  = len(script)

    print(f"edge-tts: {len(to_gen)} linhas a gerar de {total} ({total - len(to_gen)} já OK)")
    print(f"Vozes: Eliezer → {VOICE_ELIEZER}  |  IA → {VOICE_IA}\n")

    ok = 0
    for i, line in enumerate(to_gen, 1):
        lid   = line["id"]
        voice = VOICE_ELIEZER if line["speaker"] == "Eliezer" else VOICE_IA
        out   = AUDIO_DIR / f"line_{lid:04d}.wav"
        tag   = f"[{i}/{len(to_gen)}] #{lid} {line['speaker']}"
        try:
            size = await gen_line(line["pt"], voice, out)
            print(f"  ✓ {tag}: {size:,} bytes — {line['pt'][:55]}…")
            ok += 1
        except Exception as e:
            print(f"  ✗ {tag}: {e}")

    valid = [w for w in AUDIO_DIR.glob("*.wav") if w.stat().st_size > SILENCE_SIZE]
    print(f"\nConcluído: {ok}/{len(to_gen)} gerados   |  Total válidos: {len(valid)}/{total}")

asyncio.run(main())
