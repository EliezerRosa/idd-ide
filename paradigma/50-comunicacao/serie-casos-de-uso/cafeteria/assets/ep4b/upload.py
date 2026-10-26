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
ASSETS_DIR = BASE_DIR / "producao_yt" / "cafeteria_assets" / "ep4b"
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_eliezer.json"

VIDEO_FILE = ASSETS_DIR / "IDD_Cafeteria_Episodio_4B.mp4"
THUMBNAIL_FILE = ASSETS_DIR / "capa.png"
PLAYLIST_ID = "PLLfynRT3_DJs" # Playlist Cafeteria & Padaria

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

TITLE = "Governança Confirm-Once com IA: A Máquina Executa, o Humano Governa | Ep. 4B Cafeteria IDD"

DESCRIPTION = """\
☕ SÉRIE OFICIAL IDD NA PRÁTICA: O APP DA CAFETERIA & PADARIA
Episódio 4B: Metodologia IDD — O Princípio da Governança Confirm-Once com IA

No episódio anterior, assistimos ao deploy em apenas 4 segundos após 240 testes automatizados rigorosos. Mas por que a inteligência artificial não deve nunca realizar deploy autônomo diretamente para produção sem autorização humana?

Neste episódio metodológico, Eliézer Rosa e a equipe apresentam o Quarto Passo Sagrado da Metodologia IDD: o Princípio da Governança Confirm-Once e a Soberania Humana no Loop.

Destaques da Metodologia de Governança:
• A Máquina Executa, o Humano Governa: a IA possui capacidade sobre-humana de teste e compilação, mas a soberania dos negócios e a segurança do caixa pertencem sempre ao ser humano.
• O Portão de Produção (Production Gate): para liberar o deploy, a IA deve provar matematicamente conformidade absoluta com as intenções e as invariantes sagradas.
• Intervenção no Terminal em Caso Real: durante varredura pré-deploy, a IA detecta instabilidade em dependência externa do Pix e suspende a esteira protetivamente.
• Decisão de Eliézer Rosa: congelamento na versão estável e revalidação total dos 240 testes antes da chancela única de autorização.
• Confiabilidade Corporativa para Pequenos Estabelecimentos: o mesmo nível de segurança de bancos globais aplicado à cafeteria e padaria local.

⏱️ Capítulos do Episódio:
00:00 - Por que a IA Não Deve Fazer Deploy Direto sem o Humano?
00:15 - O 4º Passo Sagrado: Princípio da Governança Confirm-Once
00:38 - O Portão de Produção: Conformidade Matemática com Invariantes
00:53 - Pausa Protetiva da Esteira: A IA Não Toma Atalhos de Risco
01:09 - Terminal da IA: Detecção de Anomalia em Biblioteca Externa Pix
01:20 - Intervenção de Governança: Congelamento na Versão Estável
01:40 - Re-teste Verde e Liberação do Deploy Confirm-Once
02:12 - Confiabilidade Corporativa e Soberania Humana no Loop
02:20 - Encerramento e Convite para o Grand Finale (Episódio 5)!

📺 Playlist Oficial Completa "IDD na Prática — Cafeteria & Padaria":
https://www.youtube.com/playlist?list=PLLfynRT3_DJs

💈 Assista Também à Playlist "IDD na Prática — Barbearia & Salão":
https://www.youtube.com/playlist?list=PLHCqwtNiGbt8

👤 Eliézer Rosa | Criador do Paradigma IDD (Intent-Driven Development)
#IDD #IntentionDrivenDevelopment #Governança #ConfirmOnce #DevOps #IA #Cafeteria #EngenhariaDeSoftware #EliezerRosa #EliezerJPRosa
"""

TAGS = [
    "IDD",
    "Intention-Driven Development",
    "Governança",
    "Confirm-Once",
    "Deploy",
    "DevOps",
    "Cafeteria",
    "Padaria",
    "Engenharia de Software",
    "IA",
    "Inteligencia Artificial",
    "Eliezer Rosa",
    "EliezerJPRosa"
]

def main():
    print("=" * 70)
    print("🚀 UPLOAD DO EPISÓDIO 4B DA CAFETERIA NO YOUTUBE")
    print("=" * 70)

    if not VIDEO_FILE.exists():
        raise FileNotFoundError(f"Vídeo não encontrado: {VIDEO_FILE}")
    if not TOKEN_FILE.exists():
        raise FileNotFoundError(f"Token não encontrado: {TOKEN_FILE}")

    size_mb = VIDEO_FILE.stat().st_size / (1024 * 1024)
    print(f"Vídeo: {VIDEO_FILE.name} ({size_mb:.1f} MB)")
    print(f"Playlist: {PLAYLIST_ID}")

    with open(TOKEN_FILE, "r", encoding="utf-8") as f:
        creds_data = json.load(f)
    creds = Credentials.from_authorized_user_info(creds_data, SCOPES)
    yt = build("youtube", "v3", credentials=creds)

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
    print(f"\n[OK] Upload Concluído! Vídeo ID: {new_video_id}")
    print(f"     URL: https://www.youtube.com/watch?v={new_video_id}")

    if THUMBNAIL_FILE.exists():
        try:
            yt.thumbnails().set(
                videoId=new_video_id,
                media_body=MediaFileUpload(str(THUMBNAIL_FILE))
            ).execute()
            print("[OK] Capa personalizada aplicada!")
        except Exception as e:
            print(f"[!] Erro ao aplicar capa: {e}")

    try:
        pl_body = {
            "snippet": {
                "playlistId": PLAYLIST_ID,
                "position": 7,
                "resourceId": {
                    "kind": "youtube#video",
                    "videoId": new_video_id
                }
            }
        }
        pl_item = yt.playlistItems().insert(part="snippet", body=pl_body).execute()
        print(f"[OK] Inserido na Playlist {PLAYLIST_ID} na posição 7!")
    except Exception as e:
        print(f"[!] Erro ao adicionar à playlist: {e}")

    manifest_path = BASE_DIR / "producao_yt" / "upload_manifest.json"
    if manifest_path.exists():
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                manifest = json.load(f)
            if "cafeteria_videos" not in manifest:
                manifest["cafeteria_videos"] = {}
            manifest["cafeteria_videos"]["ep4b"] = new_video_id
            with open(manifest_path, "w", encoding="utf-8") as f:
                json.dump(manifest, f, indent=2, ensure_ascii=False)
            print("[OK] Manifesto de uploads atualizado com o Ep 4B da Cafeteria!")
        except Exception as e:
            print(f"[!] Erro ao atualizar manifesto: {e}")

if __name__ == "__main__":
    main()
