"""Inspeciona as palavras-chave, metadados e configurações atuais do canal do YouTube."""

import json
import sys
from pathlib import Path
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

TOKEN_FILE = Path(r"C:\Antigravity - IDD Refrigeração\IDD Paradigma\05 - Operação do Canal\segredos\token_eliezer.json")

def get_yt_service():
    with open(TOKEN_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    creds = Credentials.from_authorized_user_info(data)
    return build('youtube', 'v3', credentials=creds)

def inspect_channel():
    yt = get_yt_service()
    res = yt.channels().list(
        part="snippet,brandingSettings,contentDetails,statistics",
        mine=True
    ).execute()

    for item in res.get("items", []):
        snippet = item.get("snippet", {})
        branding = item.get("brandingSettings", {})
        channel_info = branding.get("channel", {})

        print("=" * 70)
        print("CANAL DO YOUTUBE ENCONTRADO:")
        print(f"ID: {item.get('id')}")
        print(f"Título: {snippet.get('title')}")
        print(f"Handle / Custom URL: {snippet.get('customUrl')}")
        print(f"Descrição: {snippet.get('description')[:150]}...")
        print(f"Keywords atuais do Canal: {channel_info.get('keywords', 'NENHUMA DEFINIDA')}")
        print("=" * 70)

if __name__ == "__main__":
    inspect_channel()
