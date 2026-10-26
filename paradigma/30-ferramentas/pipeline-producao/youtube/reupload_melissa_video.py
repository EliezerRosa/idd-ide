import os
import sys
import json
import time
from pathlib import Path
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

BASE_DIR = Path(r"C:\Antigravity - IDD Refrigeração")
PROD_DIR = BASE_DIR / "producao_yt"
SECRETS_DIR = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos"
TOKEN_FILE = SECRETS_DIR / "token_youtube.json"
MANIFEST_FILE = PROD_DIR / "upload_manifest.json"

MELISSA_VIDEO = PROD_DIR / "Melissa_IDD_Como_uma_leiga_criou_um_CRM.mp4"
SHORT_5 = PROD_DIR / "shorts_idd" / "short_05_melissa_leiga_criou_crm.mp4"

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

TITLE = "Como uma LEIGA Criou um CRM Completo com IA Sem Saber Programar | IDD na Prática"
DESCRIPTION = """\
🎙️ Caso Real IDD na Prática: A jornada de Melissa criando o NexusLog CRM!

Melissa não sabia uma única linha de código (Python, React ou SQL). Mesmo assim, ela concebeu, guiou e colocou em produção um CRM corporativo completo de 8 telas para gestão de fretes, cotações, frotas e PDFs.

Nesta conversa entre Melissa e Eliézer J P Rosa (criador do Paradigma IDD), entenda como a intenção humana de negócios é o artefato de mais alta ordem e como a IA atua como parceiro de execução técnica.

⏱️ Capítulos:
00:00 - Introdução: O desafio de criar um CRM sem saber programar
00:45 - O primeiro passo: Descrevendo o problema em linguagem natural
01:35 - Segurança e incidentes: Como a IA protegeu dados sensíveis
02:30 - O que a IA gerou vs. o que a humana decidiu
04:15 - A comunicação no dia a dia: Sem jargões técnicos
05:30 - O Paradigma IDD (Desenvolvimento Dirigido por Intenção)
07:20 - O ciclo de 5 passos do IDD
08:45 - Tour completo pelas 8 telas do NexusLog CRM em produção

Playlist oficial: IDD na Prática — Leigos
https://www.youtube.com/playlist?list=PLMWN1EWhq5tM

👤 Eliézer J P Rosa | Paradigma IDD
#IDD #IA #DesenvolvimentoSemCodigo #NexusLog #CRM #NoCode #EngenhariaDeSoftware #TechParaLeigos
"""
TAGS = ["IDD", "Desenvolvimento Dirigido por Intenção", "IA para leigos", "criar aplicativo com IA", "CRM sem programar", "NexusLog", "Eliezer Rosa", "Inteligência Artificial", "NoCode"]

def get_service():
    with open(TOKEN_FILE, "r", encoding="utf-8") as f:
        creds = Credentials.from_authorized_user_info(json.load(f), SCOPES)
    return build("youtube", "v3", credentials=creds)

def main():
    yt = get_service()
    with open(MANIFEST_FILE, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    pl_id = manifest.get("playlist_id", "PLMWN1EWhq5tM")
    old_video_id = manifest.get("videos", {}).get("melissa_crm")

    # 1. Deletar vídeo antigo com defeito visual
    if old_video_id:
        print(f"Removendo vídeo antigo com overlay estático ({old_video_id})...")
        try:
            yt.videos().delete(id=old_video_id).execute()
            print("[OK] Vídeo antigo deletado do YouTube.")
        except Exception as e:
            print(f"[!] Aviso ao deletar vídeo antigo: {e}")

    # 2. Upload do novo vídeo com slides dinâmicos
    print(f"\nFazendo upload do novo vídeo renderizado da Melissa: {MELISSA_VIDEO.name} ({MELISSA_VIDEO.stat().st_size / (1024*1024):.1f} MB)...")
    body = {
        "snippet": {
            "title": TITLE,
            "description": DESCRIPTION,
            "tags": TAGS,
            "categoryId": "28",
            "defaultLanguage": "pt",
            "defaultAudioLanguage": "pt"
        },
        "status": {
            "privacyStatus": "public",
            "selfDeclaredMadeForKids": False
        }
    }
    media = MediaFileUpload(str(MELISSA_VIDEO), chunksize=8 * 1024 * 1024, resumable=True)
    req = yt.videos().insert(part="snippet,status", body=body, media_body=media)
    resp = None
    while resp is None:
        status, resp = req.next_chunk()
        if status:
            print(f"  Progresso: {int(status.progress() * 100)}%", end="\r")

    new_video_id = resp["id"]
    print(f"\n[OK] Novo vídeo enviado com sucesso: https://www.youtube.com/watch?v={new_video_id}")
    manifest["videos"]["melissa_crm"] = new_video_id

    # 3. Inserir na playlist na posição 0 (primeiro item)
    try:
        pl_body = {
            "snippet": {
                "playlistId": pl_id,
                "position": 0,
                "resourceId": {
                    "kind": "youtube#video",
                    "videoId": new_video_id
                }
            }
        }
        pl_res = yt.playlistItems().insert(part="snippet", body=pl_body).execute()
        manifest["videos"]["melissa_crm_pl_item"] = pl_res["id"]
        print(f"[OK] Novo vídeo inserido na posição 0 da playlist '{pl_id}'")
    except Exception as e:
        print(f"[!] Erro ao adicionar à playlist: {e}")

    # 4. Atualizar Short 5 (se gerado)
    old_short_id = manifest.get("shorts", {}).get("short_05_melissa_leiga_criou_crm")
    if old_short_id and SHORT_5.exists():
        print(f"\nSubstituindo Short 5 ({old_short_id})...")
        try:
            yt.videos().delete(id=old_short_id).execute()
        except Exception:
            pass

        short_body = {
            "snippet": {
                "title": "Como uma Leiga Criou um CRM Completo com IA sem Programar #Shorts #IDD",
                "description": f"Melissa não sabia programar nada de código e colocou no ar um CRM corporativo de 8 telas guiando a IA com o Paradigma IDD.\n\nAssista o caso completo: https://www.youtube.com/watch?v={new_video_id}\nPlaylist oficial: https://www.youtube.com/playlist?list={pl_id}\n#Shorts #IDD #NoCode #TechParaLeigos #CRM #IA",
                "tags": ["Shorts", "NoCode", "IDD", "IA para Leigos", "NexusLog", "Eliezer Rosa"],
                "categoryId": "28"
            },
            "status": {"privacyStatus": "public"}
        }
        short_media = MediaFileUpload(str(SHORT_5), resumable=True)
        s_resp = yt.videos().insert(part="snippet,status", body=short_body, media_body=short_media).execute()
        manifest["shorts"]["short_05_melissa_leiga_criou_crm"] = s_resp["id"]
        print(f"[OK] Novo Short 5 enviado: https://www.youtube.com/watch?v={s_resp['id']}")

    with open(MANIFEST_FILE, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    print("\nAtualização concluída com sucesso!")

if __name__ == "__main__":
    main()
