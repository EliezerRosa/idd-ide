import os
import sys
import json
import webbrowser
from pathlib import Path
from google_auth_oauthlib.flow import InstalledAppFlow

BASE_DIR = Path(r"C:\Antigravity - IDD Refrigeração")
SECRETS_DIR = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos"
CLIENT_SECRETS = SECRETS_DIR / "client_secrets.json"
TOKEN_FILE = SECRETS_DIR / "token_youtube.json"

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

print("Iniciando fluxo OAuth2...")
sys.stdout.flush()

flow = InstalledAppFlow.from_client_secrets_file(str(CLIENT_SECRETS), SCOPES)
creds = flow.run_local_server(port=8090, prompt='consent', access_type='offline')

with open(TOKEN_FILE, "w", encoding="utf-8") as f:
    f.write(creds.to_json())

print("\n" + "="*50)
print("[SUCESSO] Token renovado e salvo com sucesso em:")
print(TOKEN_FILE)
print("="*50)
sys.stdout.flush()
