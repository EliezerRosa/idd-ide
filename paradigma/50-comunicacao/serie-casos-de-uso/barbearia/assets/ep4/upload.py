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
ASSETS_DIR = BASE_DIR / "producao_yt" / "barbearia_assets" / "ep4"
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_eliezer.json"

VIDEO_FILE = ASSETS_DIR / "IDD_Barbearia_Episodio_4.mp4"
THUMBNAIL_FILE = ASSETS_DIR / "capa.png"
PLAYLIST_ID = "PLHCqwtNiGbt8" # Playlist Barbearia

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

TITLE = "Criando App de Barbearia com IA - Ep. 4: 240 Testes & Deploy 4s | IDD na Prática"

DESCRIPTION = """\
💈 SÉRIE OFICIAL IDD NA PRÁTICA: O APP DA BARBEARIA & SALÃO
Episódio 4: Validação Total de Invariantes, Bateria de 240 Testes & Deploy Autônomo em 4 Segundos

Como ter a certeza absoluta de que o aplicativo da sua barbearia ou salão de beleza não vai travar nem duplicar horários no sábado de manhã sob o movimento mais pesado da semana?

Neste quarto episódio da série "IDD na Prática", Eliézer Rosa, a Usuária Leiga e o Compilador IA mostram como a suíte de 240 testes automatizados valida cada invariante de negócio em menos de 1 segundo e como o padrão Confirm-Once realiza o deploy global em nuvem em 4.2 segundos.

Destaques deste Episódio:
• Bateria de 240 Testes Automatizados: 60 testes de concorrência na cadeira única, 80 testes de precisão no centavo e 100 testes de tolerância a atrasos
• Execução Brutal em 820ms: 100% de aprovação e cobertura completa de invariantes
• Terminal da IA em Ação: A solicitação de autorização final para disparo do deploy autônomo
• Governança Confirm-Once: O padrão de Eliézer para eliminar burocracia manual com segurança técnica
• Deploy em 4.2 Segundos: Subindo banco de dados, containers e rotas HTTPS em tempo recorde
• Barbearia Digitalizada: O aplicativo rodando no smartphone dos clientes com estabilidade corporativa

⏱️ Capítulos:
00:00 - Como Garantir que o App Não Vai Falhar no Sábado de Pico?
00:16 - A Validação Automatizada de Invariantes do Paradigma IDD
00:35 - Terminal de Testes: 240 Passing em Menos de 1 Segundo
00:46 - Ataque à Cadeira Única e Testes de Borda
01:05 - Consulta da IA: Autorização para o Deploy Autônomo
01:17 - Governança Confirm-Once: Publicação Imediata com Suíte Verde
01:30 - Deploy Concluído em 4.2 Segundos na Nuvem
01:42 - O Aplicativo em Produção Global para a Barbearia Imperial
01:54 - Encerramento & Próximos Passos (Ep. 4B Metodologia & Ep. 5 Grand Finale)!

📺 Assista a Playlist Oficial Completa "IDD na Prática — Barbearia & Salão":
https://www.youtube.com/playlist?list=PLHCqwtNiGbt8

👤 Eliézer Rosa | Criador do Paradigma IDD (Intent-Driven Development)
#IDD #IntentionDrivenDevelopment #TestesAutomatizados #DevOps #Deploy #Barbearia #SalaoDeBeleza #IA #NoCode #EngenhariaDeSoftware #EliezerRosa #EliezerJPRosa
"""

TAGS = [
    "IDD",
    "Intention-Driven Development",
    "Testes Automatizados",
    "DevOps",
    "Deploy",
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
    print("🚀 UPLOAD DO EPISÓDIO 4 DA BARBEARIA NO YOUTUBE")
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
                "position": 6,
                "resourceId": {
                    "kind": "youtube#video",
                    "videoId": new_video_id
                }
            }
        }
        pl_item = yt.playlistItems().insert(part="snippet", body=pl_body).execute()
        print(f"[OK] Inserido na Playlist {PLAYLIST_ID} na posição 6!")
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
            manifest["barbearia_videos"]["ep4"] = new_video_id
            with open(manifest_path, "w", encoding="utf-8") as f:
                json.dump(manifest, f, indent=2, ensure_ascii=False)
            print("[OK] Manifesto de uploads atualizado com o Ep 4!")
        except Exception as e:
            print(f"[!] Erro ao atualizar manifesto: {e}")

if __name__ == "__main__":
    main()
