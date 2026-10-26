import json
import sys
from pathlib import Path
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

BASE_DIR = Path(r"C:\Antigravity - IDD Refrigeração")
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_eliezer.json"

with open(TOKEN_FILE, 'r', encoding='utf-8') as f:
    creds = Credentials.from_authorized_user_info(json.load(f))
yt = build('youtube', 'v3', credentials=creds)

channel_id = "UCmXhQsrKa5wlO46etZKDkeA"

# High-density, impactful academic keywords string under 450 characters:
canonical_keywords = (
    'IDD "Intent-Driven Development" "Vibe Coding" "Software Engineering" '
    '"Formal Methods" "Neuro-Symbolic AI" "Automated Reasoning" "SMT Solvers" '
    '"Z3 Solver" "Dafny" "Intent IR" "Constitutional AI" "Domain Invariants" '
    '"Software 3.0" "Post-Syntax" "Eliezer Rosa" "EliezerJPRosa" "DDD" "Distributed Sagas" '
    '"ICSE" "ASE" "PLDI" "POPL" "Computer Science"'
)

print(f"Keywords length: {len(canonical_keywords)} chars")

try:
    update_res = yt.channels().update(
        part="brandingSettings",
        body={
            "id": channel_id,
            "brandingSettings": {
                "channel": {
                    "keywords": canonical_keywords
                }
            }
        }
    ).execute()
    
    saved_ch = update_res.get("brandingSettings", {}).get("channel", {})
    print("✅ SUCESSO! Keywords salvas na conta do canal YouTube:")
    print(saved_ch.get("keywords"))
except Exception as e:
    print("❌ Erro ao atualizar keywords:", e)
