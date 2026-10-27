"""Abre o teleprompter de gravação de Shorts no navegador.

Uso:
    python scripts/canal/teleprompter/gravar.py            # abre o gravador
    python scripts/canal/teleprompter/gravar.py --converter "C:/Users/.../Downloads/short-x.webm"

O gravador roda em http://127.0.0.1:8765 (só nesta máquina). O vídeo é salvo na pasta Downloads.
--converter gera um .mp4 (H.264 + AAC, áudio normalizado a -14 LUFS, padrão do YouTube) ao lado do original.
"""

import argparse
import functools
import http.server
import subprocess
import sys
import threading
import webbrowser
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parents[3]
PORTA = 8765
PAGINA = f"http://127.0.0.1:{PORTA}/scripts/canal/teleprompter/teleprompter.html"


def servir() -> None:
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
    handler.log_message = lambda *a: None
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", PORTA), handler)
    threading.Timer(0.8, lambda: webbrowser.open(PAGINA)).start()
    print(f"Teleprompter em {PAGINA}\nCtrl+C para encerrar.")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


def converter(origem: Path) -> int:
    destino = origem.with_name(origem.stem + "-yt.mp4")
    cmd = ["ffmpeg", "-v", "error", "-y", "-i", str(origem),
           "-vf", "scale=1080:1920,fps=30", "-c:v", "libx264", "-preset", "medium", "-crf", "20",
           "-pix_fmt", "yuv420p", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11",
           "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-movflags", "+faststart", str(destino)]
    r = subprocess.run(cmd)
    if r.returncode == 0:
        print(f"✔ {destino}")
    return r.returncode


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--converter", type=Path, help="arquivo gravado (.webm ou .mp4) a converter para o YouTube")
    a = ap.parse_args()
    sys.exit(converter(a.converter) if a.converter else servir())
