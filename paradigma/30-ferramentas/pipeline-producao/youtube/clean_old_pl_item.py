import json
import sys
from pathlib import Path
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

if sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

TOKEN_FILE = Path(r"C:\Antigravity - IDD Refrigeração\IDD Paradigma\05 - Operação do Canal\segredos\token_eliezer.json")
OLD_ITEM_ID = "UExXLVAwck1OYUtEcy4yODlGNEE0NkRGMEEzMEQy"

with open(TOKEN_FILE, "r", encoding="utf-8") as f:
    creds = Credentials.from_authorized_user_info(json.load(f))
yt = build("youtube", "v3", credentials=creds)

try:
    yt.playlistItems().delete(id=OLD_ITEM_ID).execute()
    print("Versão anterior removida da playlist com sucesso!")
except Exception as e:
    print(f"Erro ao remover: {e}")
