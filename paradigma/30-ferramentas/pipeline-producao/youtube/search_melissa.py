import os, sys
from pathlib import Path

video_exts = {".mp4", ".mkv", ".avi", ".mov", ".webm", ".wmv", ".ts", ".m4v"}

search_roots = [
    Path(r"C:\Antigravity - IDD Refrigeração"),
    Path(r"C:\Antigravity - RVM Designações"),
    Path(r"C:\Antigravity - Gestão Reforma"),
    Path(r"C:\Antigravity Viagens"),
    Path(r"C:\IDE IDD Claude-VS Code"),
    Path(r"C:\Users\Eliez\Videos"),
    Path(r"C:\Users\Eliez\Downloads"),
    Path(r"C:\Users\Eliez\Desktop"),
    Path(r"C:\Users\Eliez\Documents"),
]

print("=== 1. BUSCANDO ARQUIVOS DE VÍDEO COM 'MELISSA' NO NOME ===", flush=True)
found_videos = []
for root in search_roots:
    if not root.exists():
        continue
    try:
        for p in root.rglob("*"):
            try:
                if p.is_file() and p.suffix.lower() in video_exts:
                    if "melissa" in p.name.lower() or "melissa" in str(p).lower():
                        found_videos.append(p)
                        print(f"VÍDEO ENCONTRADO: {p} ({p.stat().st_size / (1024*1024):.1f} MB)", flush=True)
            except (PermissionError, OSError):
                pass
    except (PermissionError, OSError):
        pass

if not found_videos:
    print("Nenhum arquivo de vídeo explicitamente nomeado com 'melissa' encontrado nessas pastas.", flush=True)

print("\n=== 2. BUSCANDO QUALQUER ARQUIVO OU PASTA COM 'MELISSA' ===", flush=True)
for root in search_roots:
    if not root.exists():
        continue
    try:
        for p in root.rglob("*melissa*"):
            try:
                is_d = "DIR" if p.is_dir() else "FILE"
                sz = f" ({p.stat().st_size} bytes)" if p.is_file() else ""
                print(f"[{is_d}] {p}{sz}", flush=True)
            except (PermissionError, OSError):
                pass
    except (PermissionError, OSError):
        pass

print("\n=== 3. TODOS OS VÍDEOS ENCONTRADOS NAS PASTAS DE PRODUÇÃO / APRESENTAÇÃO ===", flush=True)
for root in [Path(r"C:\Antigravity - IDD Refrigeração"), Path(r"C:\Antigravity - RVM Designações"), Path(r"C:\IDE IDD Claude-VS Code")]:
    if not root.exists():
        continue
    try:
        for p in root.rglob("*"):
            try:
                if p.is_file() and p.suffix.lower() in video_exts:
                    print(f"Vídeo: {p} ({p.stat().st_size / (1024*1024):.1f} MB)", flush=True)
            except (PermissionError, OSError):
                pass
    except (PermissionError, OSError):
        pass
