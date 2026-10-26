import json
import sys
from pathlib import Path
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

SECRETS_DIR = Path(r"C:\Antigravity - IDD Refrigeração\IDD Paradigma\05 - Operação do Canal\segredos")
for tf in SECRETS_DIR.glob("*.json"):
    if "client_secrets" in tf.name:
        continue
    print(f"\n==========================================")
    print(f"VERIFICANDO: {tf.name}")
    print(f"==========================================")
    try:
        with open(tf, "r", encoding="utf-8") as f:
            data = json.load(f)
        creds = Credentials.from_authorized_user_info(data)
        yt = build("youtube", "v3", credentials=creds)
        ch_resp = yt.channels().list(part="snippet", mine=True).execute()
        items = ch_resp.get("items", [])
        if not items:
            print("  Nenhum canal associado a este token.")
        for ch in items:
            print(f"  -> Título do Canal: {ch['snippet']['title']}")
            print(f"  -> ID do Canal: {ch['id']}")
            print(f"  -> CustomUrl: {ch['snippet'].get('customUrl', 'N/A')}")
    except Exception as e:
        print(f"  -> Erro ao inspecionar {tf.name}: {e}")
