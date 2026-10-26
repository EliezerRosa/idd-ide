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
ASSETS_DIR = BASE_DIR / "producao_yt" / "barbearia_assets" / "ep4b"
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_eliezer.json"

VIDEO_FILE = ASSETS_DIR / "IDD_Barbearia_Episodio_4B.mp4"
THUMBNAIL_FILE = ASSETS_DIR / "capa.png"
PLAYLIST_ID = "PLHCqwtNiGbt8" # Playlist Barbearia

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

TITLE = "Passo 4 da Metodologia IDD: Governança & O Padrão Confirm-Once | Ep. 4B Barbearia"

DESCRIPTION = """\
💈 SÉRIE METODOLÓGICA IDD NA PRÁTICA: O APP DA BARBEARIA
Episódio 4B: Passo 4 da Metodologia — Governança Humana Ativa, O Padrão Confirm-Once & Auditoria de Deploy

Como manter o controle completo sobre o aplicativo do seu negócio sem cair na exaustão mental de aprovar cada arquivo ou comando de programação?

Neste episódio metodológico da série "IDD na Prática", Eliézer Rosa, a Usuária Leiga e o Compilador IA revelam o Passo 4 do Paradigma IDD: a Governança Humana Ativa através do Padrão Confirm-Once.

Destaques deste Episódio:
• Governança Sem Fadiga: A eliminação das micro-aprovações que levam desenvolvedores e gestores ao erro
• O Padrão Confirm-Once: Um único portão de autorização final após a validação total dos 240 testes em memória
• Terminal da IA em Ação: A geração do hash criptográfico SHA-256 amarrando todas as diretivas de negócio
• Auditoria de Conformidade: Tolerância de 10 minutos, Cópia Histórica de Preço e Otimização de Cadeira ratificadas no deploy
• Soberania Humana: A IA executa a matemática e a infraestrutura; o humano governa as regras do negócio
• Rumo ao Grand Finale: A preparação para o episódio de encerramento da série da Barbearia Imperial!

⏱️ Capítulos:
00:00 - Como Governar Aplicativos com IA Sem Exaustão Mental?
00:18 - Passo 4 da Metodologia IDD: A Governança Humana Ativa
00:38 - O Padrão Confirm-Once vs Micro-Aprovações Cansativas
00:49 - A Soberania do Negócio: O Humano Decide, a IA Compila
01:05 - Terminal da IA: Assinatura Digital e Hash Criptográfico SHA-256
01:17 - Ratificação das Diretivas: Tolerância, Preço Histórico e Cadeira
01:30 - Contrato Semântico Fechado: A Máquina Responde pelas Invariantes
01:42 - A Visão da Usuária Leiga: Segurança Absoluta Sem Linha de Código
01:54 - Encerramento & Chamada para o Ep. 5 (Grand Finale da Barbearia)!

📺 Assista a Playlist Oficial Completa "IDD na Prática — Barbearia & Salão":
https://www.youtube.com/playlist?list=PLHCqwtNiGbt8

👤 Eliézer Rosa | Criador do Paradigma IDD (Intent-Driven Development)
#IDD #IntentionDrivenDevelopment #Governanca #DevOps #ConfirmOnce #Barbearia #SalaoDeBeleza #EngenhariaDeSoftware #NoCode #IA #EliezerRosa #EliezerJPRosa
"""

TAGS = [
    "IDD",
    "Intention-Driven Development",
    "Governanca",
    "DevOps",
    "Confirm-Once",
    "Barbearia",
    "Salao de Beleza",
    "NoCode",
    "IA",
    "Inteligencia Artificial",
    "Engenharia de Software",
    "Eliezer Rosa",
    "EliezerJPRosa"
]

def main():
    print("=" * 70)
    print("🚀 UPLOAD DO EPISÓDIO 4B DA BARBEARIA NO YOUTUBE")
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

    # Atualizar upload_manifest.json
    manifest_path = BASE_DIR / "producao_yt" / "upload_manifest.json"
    if manifest_path.exists():
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                manifest = json.load(f)
            if "barbearia_videos" not in manifest:
                manifest["barbearia_videos"] = {}
            manifest["barbearia_videos"]["ep4b"] = new_video_id
            with open(manifest_path, "w", encoding="utf-8") as f:
                json.dump(manifest, f, indent=2, ensure_ascii=False)
            print("[OK] Manifesto de uploads atualizado com o Ep 4B!")
        except Exception as e:
            print(f"[!] Erro ao atualizar manifesto: {e}")

if __name__ == "__main__":
    main()
