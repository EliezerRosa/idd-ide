"""
update_channel_keywords.py
Atualiza as palavras-chave (keywords) do canal do YouTube via API.
Requer token_youtube.json com escopo youtube completo.
"""

import os
import json
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_SEGREDOS_DIR = os.path.join(_SCRIPT_DIR, '..', 'segredos')
TOKEN_FILE  = os.path.join(_SEGREDOS_DIR, 'token_youtube.json')
SCOPES      = ["https://www.googleapis.com/auth/youtube"]

# Limite da API: 500 chars para a string final (incluindo aspas e espaços).
# Termos multi-palavra ficam entre aspas; single-word sem aspas.
# Total calibrado em ~480 chars.
KEYWORDS = [
    "IDD",
    "Intent-Driven Development",
    "IntentDrivenDevelopment",
    "IDD paradigma",
    "GitHub Copilot",
    "GitHubCopilot",
    "GitHub Copilot Agent",
    "Vibe Coding",
    "Vibe Coding vs IDD",
    "DDD vs IDD",
    "Confirm-Once",
    "Augmenting Human Intellect",
    "Engelbart",
    "Eliezer Rosa",
    "Eliezer Rosa IDD",
    "AEON",
    "RVM Designacoes",
    "Engenharia de Software",
    "software com IA",
    "IA autonoma",
    "agente de IA",
    "AI coding",
    "dev Brasil",
    "podcast tecnologia",
    "LLM",
    "Supabase",
    "Python",
    "TypeScript",
    "copilot",
]

def get_credentials():
    creds = None
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
            with open(TOKEN_FILE, "w") as f:
                f.write(creds.to_json())
        else:
            raise RuntimeError("Token inválido ou ausente. Execute o fluxo OAuth primeiro.")
    return creds

def main():
    creds   = get_credentials()
    youtube = build("youtube", "v3", credentials=creds)

    # Buscar o canal do usuário autenticado
    ch_resp = youtube.channels().list(part="brandingSettings", mine=True).execute()
    if not ch_resp.get("items"):
        raise RuntimeError("Nenhum canal encontrado para este usuário.")

    channel = ch_resp["items"][0]
    channel_id = channel["id"]
    print(f"Canal: {channel_id}")

    # Montar keywords como string separada por espaços (formato aceito pela API)
    keywords_str = " ".join(f'"{k}"' if " " in k else k for k in KEYWORDS)

    body = {
        "id": channel_id,
        "brandingSettings": {
            "channel": {
                "keywords": keywords_str,
            }
        }
    }

    update_resp = youtube.channels().update(part="brandingSettings", body=body).execute()
    saved = update_resp.get("brandingSettings", {}).get("channel", {}).get("keywords", "")
    print(f"\n✅ Keywords atualizadas com sucesso!")
    print(f"   Valor salvo:\n   {saved}")

if __name__ == "__main__":
    main()
