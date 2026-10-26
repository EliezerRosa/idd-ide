import json
from pathlib import Path
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials

BASE_DIR = Path(r"C:\Antigravity - IDD Refrigeração")
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_eliezer.json"

with open(TOKEN_FILE, 'r', encoding='utf-8') as f:
    creds = Credentials.from_authorized_user_info(json.load(f))
yt = build('youtube', 'v3', credentials=creds)

# Test simple keywords string
test_keywords = 'IDD "Intent-Driven Development" "Vibe Coding" "Software Engineering" "Formal Methods" "Neuro-Symbolic AI"'

channel_id = "UCmXhQsrKa5wlO46etZKDkeA"

try:
    res = yt.channels().update(
        part="brandingSettings",
        body={
            "id": channel_id,
            "brandingSettings": {
                "channel": {
                    "keywords": test_keywords
                }
            }
        }
    ).execute()
    print("Sucesso! Keywords salvas:", res.get("brandingSettings", {}).get("channel", {}).get("keywords"))
except Exception as e:
    print("Erro com brandingSettings direto:", e)
