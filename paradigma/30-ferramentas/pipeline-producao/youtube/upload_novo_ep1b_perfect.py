import json
import sys
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
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_eliezer.json"
MANIFEST_FILE = PROD_DIR / "upload_manifest.json"

VIDEO_FILE = PROD_DIR / "IDD_Refrigeracao_Novo_Episodio_1B.mp4"
THUMBNAIL_FILE = PROD_DIR / "capas" / "capa_novo_episodio_1b.png"

PLAYLIST_ID = "PLNkRuKhFHiBs" # IDD na Prática - Leigos no canal @EliézerJPRosa

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

TITLE = "Metodologia IDD na Prática - Ep. 1B: Especificação de Requisitos, Intenções & Invariantes com IA"

DESCRIPTION = """\
🎙️ SÉRIE OFICIAL IDD NA PRÁTICA: O GUIA METODOLÓGICO
Episódio 1B: Especificação de Requisitos Orientada à Intenção (IDD) & Invariantes Sagradas

Como um engenheiro de software ou profissional de negócio começa a construir uma solução com inteligência artificial sem cair na armadilha de tentar gerar código antes da hora?

Neste primeiro episódio metodológico da nossa série, o Orquestrador Eliézer Rosa, a Usuária Leiga e a IA Compilador demonstram passo a passo como conduzir a fase de Especificação de Requisitos no Paradigma Intent-Driven Development (IDD), sem escrever nenhuma linha de código.

Destaques deste Episódio Metodológico:
• Da Dor de Mercado ao Propósito: A formulação da intenção humana em linguagem natural
• Delimitação Cirúrgica de Escopo: O que entra no MVP (Ciclo Térmico & PMOC) e o que fica de fora
• O Conceito Fundamental de Invariantes: As regras sagradas de domínio que jamais podem ser violadas
• A IA como Espelho Epistêmico: Como o compilador detecta ambiguidades e desafia o escopo
• Terminal de Requisitos em Tempo Real: A IA consultando o mentor sobre a pesagem de cilindros de gás
• Os 4 Pilares da Especificação IDD: O alicerce sólido que viabiliza a geração autônoma de software

⏱️ Capítulos:
00:00 - Introdução Metodológica: Como especificar requisitos com IA sem código?
00:20 - O Primeiro Passo do IDD: Intenção Humana e Delimitação de Escopo
00:42 - O Papel da IA: Analista de Domínio e Espelho Epistêmico
00:58 - Matriz de Intenção: Separando o que entra no MVP do que fica para depois
01:14 - O Conceito de Invariantes: As leis sagradas do negócio que protegem o app
01:32 - Invariante 1 e 2 na Refrigeração: Medição obrigatória e laudo PMOC auditado
01:50 - Invariantes 3 e 4: Vínculo territorial compulsório e isolamento multitenant
02:05 - Terminal da IA em Ação: A IA detectando bifurcação de escopo na pesagem de gás
02:27 - Resposta da Orquestração: Foco estrito no ciclo térmico e governança mantida
02:44 - O Produto Final da Fase 1: Matriz formal de requisitos sem código manual
03:00 - A Vitória da Governança: A IA como consultora ativa contra escopo fantasma
03:12 - Síntese dos 4 Pilares da Especificação no Paradigma IDD
03:32 - Encerramento do Ep. 1B & Chamada para o Ep. 2B: Modelagem MER com IA!

📺 Assista a Playlist Oficial Completa "IDD na Prática — Leigos":
https://www.youtube.com/playlist?list=PLNkRuKhFHiBs

👤 Eliézer Rosa | Paradigma IDD
#IDD #IntentionDrivenDevelopment #EngenhariaDeSoftware #RequisitosDeSoftware #Invariantes #Escopo #NoCode #IAAutonoma #DevOps #EliezerRosa #EliezerJPRosa #MetodologiaAgil
"""

TAGS = [
    "IDD",
    "Intention-Driven Development",
    "Engenharia de Software",
    "Especificacao de Requisitos",
    "Invariantes",
    "Escopo",
    "Bounded Contexts",
    "NoCode",
    "IA",
    "Inteligencia Artificial",
    "Metodologia",
    "Eliezer Rosa",
    "EliezerJPRosa",
    "PMOC",
    "Refrigeracao"
]

def main():
    print("=" * 70)
    print("🚀 UPLOAD DO NOVO VÍDEO 1B (METODOLOGIA: REQUISITOS & INVARIANTES)")
    print("=" * 70)

    if not VIDEO_FILE.exists():
        raise FileNotFoundError(f"Arquivo de vídeo não encontrado: {VIDEO_FILE}")
    if not TOKEN_FILE.exists():
        raise FileNotFoundError(f"Token não encontrado: {TOKEN_FILE}")

    size_mb = VIDEO_FILE.stat().st_size / (1024 * 1024)
    print(f"Vídeo: {VIDEO_FILE.name} ({size_mb:.1f} MB)")
    print(f"Playlist Alvo: {PLAYLIST_ID}")

    with open(TOKEN_FILE, "r", encoding="utf-8") as f:
        creds_data = json.load(f)
    creds = Credentials.from_authorized_user_info(creds_data, SCOPES)
    yt = build("youtube", "v3", credentials=creds)

    ch = yt.channels().list(part="snippet", mine=True).execute()
    channel_name = ch["items"][0]["snippet"]["title"] if ch.get("items") else "Canal"
    print(f"Canal Autenticado: {channel_name} (ID: {ch['items'][0]['id']})")

    # 1. Upload do Vídeo
    print(f"\n[1/3] Fazendo Upload do Novo Vídeo 1B...")
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
    media = MediaFileUpload(str(VIDEO_FILE), chunksize=4 * 1024 * 1024, resumable=True)
    req = yt.videos().insert(part="snippet,status", body=body, media_body=media)

    resp = None
    while resp is None:
        status, resp = req.next_chunk()
        if status:
            print(f"  Progresso Upload: {int(status.progress() * 100)}%", end="\r")

    new_video_id = resp["id"]
    video_url = f"https://www.youtube.com/watch?v={new_video_id}"
    print(f"\n[OK] Upload Concluído! Vídeo ID: {new_video_id}")
    print(f"     URL: {video_url}")

    # 2. Thumbnail
    if THUMBNAIL_FILE.exists():
        print(f"\n[2/3] Definindo Capa Personalizada ({THUMBNAIL_FILE.name})...")
        try:
            yt.thumbnails().set(
                videoId=new_video_id,
                media_body=MediaFileUpload(str(THUMBNAIL_FILE))
            ).execute()
            print("[OK] Capa personalizada aplicada com sucesso!")
        except Exception as e:
            print(f"[!] Aviso ao aplicar capa: {e}")

    # 3. Inserir na Playlist na posição 3 (logo após o Ep. 1)
    print(f"\n[3/3] Inserindo na Playlist {PLAYLIST_ID} na posição 3...")
    try:
        pl_body = {
            "snippet": {
                "playlistId": PLAYLIST_ID,
                "position": 3,
                "resourceId": {
                    "kind": "youtube#video",
                    "videoId": new_video_id
                }
            }
        }
        pl_item = yt.playlistItems().insert(part="snippet", body=pl_body).execute()
        print(f"[OK] Inserido com sucesso na Playlist! (Item ID: {pl_item['id']})")

        # 4. Localiza e remove o vídeo antigo com defeito (0MvLVSgigBk) da playlist
        OLD_DEFEITUOSO_ID = "0MvLVSgigBk"
        items_resp = yt.playlistItems().list(
            part="snippet",
            playlistId=PLAYLIST_ID,
            maxResults=50
        ).execute()
        for it in items_resp.get("items", []):
            if it["snippet"]["resourceId"]["videoId"] == OLD_DEFEITUOSO_ID:
                try:
                    yt.playlistItems().delete(id=it["id"]).execute()
                    print(f"[OK] Removido item antigo com defeito da playlist (item {it['id']}, video {OLD_DEFEITUOSO_ID})")
                except Exception as del_err:
                    print(f"[!] Não foi possível remover item antigo: {del_err}")
                try:
                    yt.videos().update(
                        part="status",
                        body={
                            "id": OLD_DEFEITUOSO_ID,
                            "status": {"privacyStatus": "unlisted"}
                        }
                    ).execute()
                    print(f"[OK] Vídeo antigo {OLD_DEFEITUOSO_ID} marcado como não-listado (unlisted).")
                except Exception as unl_err:
                    print(f"[!] Não foi possível alterar privacidade do vídeo antigo: {unl_err}")
    except Exception as e:
        print(f"[!] Erro ao adicionar à playlist: {e}")

    # Atualizar upload_manifest.json
    if MANIFEST_FILE.exists():
        try:
            with open(MANIFEST_FILE, "r", encoding="utf-8") as f:
                manifest = json.load(f)
            if "channels" in manifest and "eliezer_rosa" in manifest["channels"]:
                manifest["channels"]["eliezer_rosa"]["videos"]["metodologia_ep1b_requisitos"] = new_video_id
                with open(MANIFEST_FILE, "w", encoding="utf-8") as f:
                    json.dump(manifest, f, indent=2, ensure_ascii=False)
                print("[OK] upload_manifest.json atualizado com o vídeo 1B.")
        except Exception as e:
            print(f"[!] Aviso ao atualizar manifest: {e}")

    # Listar a playlist atualizada
    print("\n" + "=" * 70)
    print(f"★ PLAYLIST OFICIAL ATUALIZADA: IDD na Prática - Leigos ★")
    print("=" * 70)
    p_items = yt.playlistItems().list(part="snippet", playlistId=PLAYLIST_ID, maxResults=50).execute().get("items", [])
    for idx, p in enumerate(p_items):
        sn = p["snippet"]
        vid = sn["resourceId"]["videoId"]
        print(f"  {idx}. {sn['title']} [https://www.youtube.com/watch?v={vid}]")

if __name__ == "__main__":
    main()
