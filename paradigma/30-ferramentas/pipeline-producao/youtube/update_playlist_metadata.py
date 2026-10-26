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
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_youtube.json"

with open(TOKEN_FILE, "r", encoding="utf-8") as f:
    creds = Credentials.from_authorized_user_info(json.load(f))
yt = build("youtube", "v3", credentials=creds)

PLAYLIST_ID = "PLMWN1EWhq5tM"

PLAYLIST_TITLE = "IDD na Prática - Leigos"
PLAYLIST_DESC = """\
Playlist oficial do canal Eliézer J P Rosa: IDD na Prática — Leigos.
Aprenda como pessoas sem experiência prévia em programação utilizam o Paradigma IDD (Desenvolvimento Dirigido por Intenção) para conceber, direcionar e validar softwares corporativos completos com auxílio de Inteligência Artificial autônoma.

📺 ORDEM RECOMENDADA DOS VÍDEOS:
1. Caso Real Especial: Melissa (leiga em código) concebendo e colocando o NexusLog CRM em produção (8 telas, frotas, cotações e PDFs).
2. Série Refrigeração IDD - Ep. 1: Domínio e Intenção (Por que softwares tradicionais falham, intenção como artefato de alta ordem e regras do PMOC).
3. Série Refrigeração IDD - Ep. 2: Arquitetura e Regras (Regime de pré-intenção, bounded contexts para chillers e confirm-once pattern).
4. Série Refrigeração IDD - Ep. 3: Implementação e Dados (Supabase, PostgreSQL, multitenant, RLS e QR Codes para ativos em campo).
5. Série Refrigeração IDD - Ep. 4: Validação e Entrega (Validação pela experiência, emissão de laudos PMOC em PDF e sistema em produção).

👤 Criador do Paradigma IDD: Eliézer J P Rosa
#IDD #IntentDrivenDevelopment #IA #EngenhariaDeSoftware #TechParaLeigos #NoCode #Refrigeracao #PMOC
"""

print(f"Atualizando Playlist: {PLAYLIST_ID}...")
try:
    body = {
        "id": PLAYLIST_ID,
        "snippet": {
            "title": PLAYLIST_TITLE,
            "description": PLAYLIST_DESC
        },
        "status": {
            "privacyStatus": "public"
        }
    }
    resp = yt.playlists().update(part="snippet,status", body=body).execute()
    print(f"[OK] Playlist atualizada com sucesso!")
    print(f"Título: {resp['snippet']['title']}")
    print(f"Status: {resp['status']['privacyStatus']}")
except Exception as e:
    print(f"[!] Erro ao atualizar playlist: {e}")
