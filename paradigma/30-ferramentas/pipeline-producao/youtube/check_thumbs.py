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

EPISODES = [
    {"ep": 1, "id": "lNEr7vb0Gyo"},
    {"ep": 2, "id": "a3tIPjowBMk"},
    {"ep": 3, "id": "Kb0EynowDH4"},
    {"ep": 4, "id": "cRx5yKG8n1k"},
    {"ep": 5, "id": "TluPKmbwKmg"},
    {"ep": 6, "id": "BZeVG2CffjU"},
    {"ep": 7, "id": "hQrqyx0uZk8"},
    {"ep": 8, "id": "cDeFecLHP9A"},
    {"ep": 9, "id": "HAneRk6kqlE"},
    {"ep": 10, "id": "6pvk9PbkuoE"}
]

ids_str = ",".join([e["id"] for e in EPISODES])
res = yt.videos().list(part="snippet", id=ids_str).execute()

for item in res.get("items", []):
    vid = item["id"]
    sn = item["snippet"]
    thumbs = sn.get("thumbnails", {})
    maxres = thumbs.get("maxres", {}).get("url")
    standard = thumbs.get("standard", {}).get("url")
    high = thumbs.get("high", {}).get("url")
    print(f"[{vid}] {sn.get('title')[:45]} | maxres: {bool(maxres)} | standard: {bool(standard)} | high: {bool(high)}")
