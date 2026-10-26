import json
import sys
from pathlib import Path
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

BASE_DIR = Path(r"C:\Antigravity - IDD Refrigeração")
PROD_DIR = BASE_DIR / "producao_yt"
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_eliezer.json"
MANIFEST_FILE = PROD_DIR / "upload_manifest.json"

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

PLAYLISTS_CONFIG = [
    {
        "key": "barbearia",
        "title": "IDD na Prática: App de Barbearia & Salão com IA",
        "description": "Série oficial demonstrando o Paradigma IDD (Intent-Driven Development) na prática com um aplicativo de Barbearia e Salão de Beleza. Do agendamento à comissão, sem escrever código manual, com foco em intenções, invariantes sagradas, MER, UML e deploy autônomo."
    },
    {
        "key": "cafeteria",
        "title": "IDD na Prática: App de Cafeteria & Padaria com IA",
        "description": "Série oficial demonstrando o Paradigma IDD (Intent-Driven Development) na prática com um aplicativo de Cafeteria e Padaria de Bairro. Comandas em tempo real, controle de estoque crítico e cozinha sincronizada sem digitar código manual."
    },
    {
        "key": "racha_conta",
        "title": "IDD na Prática: App de Racha de Conta & Pix com IA",
        "description": "Série oficial demonstrando o Paradigma IDD (Intent-Driven Development) na prática com um aplicativo de Racha de Conta de Bar e Restaurante. Invariante da Soma Zero, divisão no centavo e Pix copia-e-cola sem código manual."
    }
]

def main():
    print("=" * 70)
    print("🚀 CRIANDO AS 3 NOVAS PLAYLISTS OFICIAIS NO YOUTUBE")
    print("=" * 70)

    if not TOKEN_FILE.exists():
        raise FileNotFoundError(f"Token não encontrado: {TOKEN_FILE}")

    with open(TOKEN_FILE, "r", encoding="utf-8") as f:
        creds_data = json.load(f)
    creds = Credentials.from_authorized_user_info(creds_data, SCOPES)
    yt = build("youtube", "v3", credentials=creds)

    manifest = {}
    if MANIFEST_FILE.exists():
        with open(MANIFEST_FILE, "r", encoding="utf-8") as f:
            manifest = json.load(f)

    if "playlists_leigos_novas" not in manifest:
        manifest["playlists_leigos_novas"] = {}

    for pl in PLAYLISTS_CONFIG:
        key = pl["key"]
        print(f"\nCriando Playlist: {pl['title']}...")
        body = {
            "snippet": {
                "title": pl["title"],
                "description": pl["description"],
                "defaultLanguage": "pt"
            },
            "status": {
                "privacyStatus": "public"
            }
        }
        res = yt.playlists().insert(part="snippet,status", body=body).execute()
        pl_id = res["id"]
        print(f"[OK] Playlist criada com sucesso! ID: {pl_id}")
        print(f"     URL: https://www.youtube.com/playlist?list={pl_id}")

        manifest["playlists_leigos_novas"][key] = {
            "id": pl_id,
            "title": pl["title"],
            "url": f"https://www.youtube.com/playlist?list={pl_id}"
        }

    with open(MANIFEST_FILE, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    print("\n" + "=" * 70)
    print("✅ TODAS AS 3 PLAYLISTS FORAM CRIADAS E REGISTRADAS NO MANIFEST!")
    print("=" * 70)

if __name__ == "__main__":
    main()
