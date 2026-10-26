"""
youtube_amplify.py — Amplificação de visibilidade do canal IDD
Executa em sequência:
  1. Cria playlist "IDD — Série Completa" e adiciona vídeo principal + 5 Shorts
  2. Atualiza descrição do canal ("Sobre")
  3. Posta comentário rico (capítulos + links) no vídeo principal
"""

import os
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

# ── Config ─────────────────────────────────────────────────────────────────
_SCRIPT_DIR    = os.path.dirname(os.path.abspath(__file__))
_SEGREDOS_DIR  = os.path.join(_SCRIPT_DIR, "..", "segredos")
TOKEN_FILE     = os.path.join(_SEGREDOS_DIR, "token_youtube_captions.json")
SCOPES         = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.force-ssl",
]
CLIENT_SECRETS = os.path.join(_SEGREDOS_DIR, "client_secrets.json")

MAIN_VIDEO_ID  = "lNEr7vb0Gyo"
SHORT_IDS      = [
    "qy1eojBRjXo",   # hook
    "O-ksnt8UlmU",   # vibing
    "TqDIfBcwVts",   # gps
    "b1WExjtVmJ4",   # confirmonce
    "_Ofd-PHLl-4",   # paradigma
]

# API limit: 1000 chars for channel description
CHANNEL_DESCRIPTION = (
    "🎙 Engenharia de Software com IA Autônoma | Eliezer Rosa\n\n"
    "IDD (Intent-Driven Development): o paradigma onde a intenção humana em linguagem natural "
    "governa todo o código. O humano retém o Comando Epistêmico; a IA executa o Comando Operacional. "
    "Augmenting, não automating.\n\n"
    "📺 Série: Base de Conhecimento IDD\n"
    "Ep.1 — O que é IDD? (23 min) | Ep.2 — Genealogia (em breve) | Ep.3 — AEON (em breve)\n\n"
    "💻 Projeto real em produção: RVM Designações\n"
    "github.com/EliezerRosa/rvm-designacoes-antigravity\n\n"
    "#IDD #IntentDrivenDevelopment #GitHubCopilot #VibeCoding #EngenhariaDeSoftware #IA #LLM #AEON"
)

PINNED_COMMENT = """\
📌 ÍNDICE DE CAPÍTULOS — clique para navegar

00:00 Abertura — A evaporação do "porquê" (IBM, 1982)
01:04 Definição operacional do IDD
03:50 As 6 propriedades essenciais
07:19 Analogia do GPS: intenção vs. rota
09:06 O Confirm-Once Pattern explicado
11:30 O que IDD NÃO é (Vibe Coding, BDD, DDD)
14:45 A genealogia: Engelbart → Sutherland → Kay → Brooks → IDD
18:30 IDD em produção: RVM Designações como "living implementation"
21:10 Call-to-action e próximo episódio

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📺 Série completa: https://www.youtube.com/playlist?list=PLkbRMhsplHjbaVoM7tatoBmOKm5k3SHMy
💻 Código-fonte: https://github.com/EliezerRosa/rvm-designacoes-antigravity
🎯 Shorts desta série: #IDD #GitHubCopilot #IntentDrivenDevelopment #VibeCoding #IA
"""


# ── Auth ───────────────────────────────────────────────────────────────────

def get_credentials():
    from google_auth_oauthlib.flow import InstalledAppFlow
    creds = None
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow  = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRETS, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(TOKEN_FILE, "w") as f:
            f.write(creds.to_json())
    return creds


# ── Step 1: playlist "IDD — Série Completa" ───────────────────────────────

def create_idd_serie_playlist(youtube):
    print("\n── 1. Playlist IDD — Série Completa ────────────────────")

    # Verificar se já existe
    resp = youtube.playlists().list(part="snippet", mine=True, maxResults=50).execute()
    for pl in resp.get("items", []):
        if "IDD" in pl["snippet"]["title"] and "rie" in pl["snippet"]["title"]:
            pl_id = pl["id"]
            print(f"  ℹ Playlist já existe: {pl['snippet']['title']} ({pl_id})")
            return pl_id

    # Criar
    pl = youtube.playlists().insert(
        part="snippet,status",
        body={
            "snippet": {
                "title":       "IDD — Base de Conhecimento (Série Completa)",
                "description": (
                    "Série completa sobre Intent-Driven Development (IDD) — o paradigma "
                    "de engenharia de software onde a intenção humana em linguagem natural "
                    "governa todo o sistema.\n\n"
                    "Criado por Eliezer Rosa em parceria com GitHub Copilot Agent.\n\n"
                    "#IDD #IntentDrivenDevelopment #GitHubCopilot #EngenhariaDeSoftware #IA"
                ),
                "defaultLanguage": "pt",
            },
            "status": {"privacyStatus": "public"},
        }
    ).execute()
    pl_id = pl["id"]
    print(f"  ✅ Playlist criada: {pl['snippet']['title']} ({pl_id})")
    return pl_id


def add_videos_to_playlist(youtube, pl_id):
    all_ids = [MAIN_VIDEO_ID] + SHORT_IDS
    for pos, vid in enumerate(all_ids):
        youtube.playlistItems().insert(
            part="snippet",
            body={
                "snippet": {
                    "playlistId": pl_id,
                    "resourceId": {"kind": "youtube#video", "videoId": vid},
                    "position":   pos,
                }
            }
        ).execute()
        label = "vídeo principal" if vid == MAIN_VIDEO_ID else f"Short {pos}"
        print(f"  ✅ Adicionado ({label}): {vid}")


# ── Step 2: Descrição do canal ─────────────────────────────────────────────

def update_channel_description(youtube):
    print("\n── 2. Descrição do canal ────────────────────────────────")
    ch_resp = youtube.channels().list(part="brandingSettings", mine=True).execute()
    channel = ch_resp["items"][0]
    ch_id   = channel["id"]

    youtube.channels().update(
        part="brandingSettings",
        body={
            "id": ch_id,
            "brandingSettings": {
                "channel": {
                    "description": CHANNEL_DESCRIPTION,
                }
            }
        }
    ).execute()
    print(f"  ✅ Descrição do canal atualizada ({len(CHANNEL_DESCRIPTION)} chars)")


# ── Step 3: Comentário rico ────────────────────────────────────────────────

def post_pinned_comment(youtube):
    print("\n── 3. Comentário rico no vídeo principal ────────────────")

    # Verificar se já existe comentário do canal com o índice
    threads = youtube.commentThreads().list(
        part="snippet", videoId=MAIN_VIDEO_ID, maxResults=20
    ).execute()
    for t in threads.get("items", []):
        text = t["snippet"]["topLevelComment"]["snippet"]["textOriginal"]
        if "ÍNDICE DE CAPÍTULOS" in text:
            print("  ℹ Comentário de índice já existe — pulando")
            return

    resp = youtube.commentThreads().insert(
        part="snippet",
        body={
            "snippet": {
                "videoId": MAIN_VIDEO_ID,
                "topLevelComment": {
                    "snippet": {"textOriginal": PINNED_COMMENT}
                }
            }
        }
    ).execute()
    comment_id = resp["snippet"]["topLevelComment"]["id"]
    print(f"  ✅ Comentário postado (ID: {comment_id})")
    print(f"  ⚠ Para FIXAR: YouTube Studio → vídeo → comentários → pino no comentário")


# ── Main ───────────────────────────────────────────────────────────────────

SERIE_PLAYLIST_ID = "PLkbRMhsplHjaLEi9O7SsJN3pH8TvsS6k7"  # criada na run anterior

def main():
    creds   = get_credentials()
    youtube = build("youtube", "v3", credentials=creds)

    update_channel_description(youtube)
    post_pinned_comment(youtube)

    print("\n✅ Amplificação concluída!")
    print(f"   Playlist série: https://www.youtube.com/playlist?list={SERIE_PLAYLIST_ID}")


if __name__ == "__main__":
    main()
