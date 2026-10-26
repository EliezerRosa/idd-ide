import json
import sys
from pathlib import Path
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

SECRETS_DIR = Path(r"C:\IDE IDD Claude-VS Code\IDD Paradigma\05 - Operação do Canal\segredos")
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
        for ch in ch_resp.get("items", []):
            print(f"  -> Título do Canal: {ch['snippet']['title']}")
            print(f"  -> ID do Canal: {ch['id']}")
            print(f"  -> CustomUrl: {ch['snippet'].get('customUrl', 'N/A')}")
    except Exception as e:
        print(f"  -> Erro ao inspecionar {tf.name}: {e}")

SCRIPTS_DIR = Path(r"C:\IDE IDD Claude-VS Code\IDD Paradigma\05 - Operação do Canal\scripts-api")
print(f"\n==========================================")
print(f"SCRIPTS DISPONÍVEIS EM {SCRIPTS_DIR.name}:")
print(f"==========================================")
for pyf in SCRIPTS_DIR.glob("*.py"):
    print(f" - {pyf.name}")
