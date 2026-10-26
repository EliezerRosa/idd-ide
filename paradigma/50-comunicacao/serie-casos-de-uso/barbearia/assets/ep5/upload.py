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
ASSETS_DIR = BASE_DIR / "producao_yt" / "barbearia_assets" / "ep5"
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_eliezer.json"

VIDEO_FILE = ASSETS_DIR / "IDD_Barbearia_Episodio_5.mp4"
THUMBNAIL_FILE = ASSETS_DIR / "capa.png"
PLAYLIST_ID = "PLHCqwtNiGbt8" # Playlist Barbearia

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

TITLE = "O Futuro do Software Sem Código: Grand Finale da Barbearia | Ep. 5 IDD na Prática"

DESCRIPTION = """\
💈 SÉRIE OFICIAL IDD NA PRÁTICA: O APP DA BARBEARIA & SALÃO
Episódio 5: Grand Finale — O Sucesso Total do Paradigma IDD e a Telemetria Real em Produção

Chegamos ao encerramento triunfal da série prática da Barbearia Imperial! Aquele salão que antes sofria com caderno rasurado, discussões de comissão e clientes esperando 40 minutos agora opera com um aplicativo corporativo em nuvem, com zero código manual digitado pelo empreendedor.

Neste episódio final, Eliézer Rosa, a Usuária Leiga e o Compilador IA celebram os resultados auditados da Barbearia Imperial e revelam os próximos passos do canal com a Playlist 2: O Aplicativo de Cafeteria e Padaria!

Destaques deste Grand Finale:
• Do Caos à Ordem Total: Como a Barbearia Imperial atendeu 142 clientes no sábado com zero sobreposições de horários
• Telemetria Auditada pela IA: 100% de precisão nos centavos das comissões e 85% de redução de ociosidade das cadeiras
• Os 4 Pilares Consolidados:
  1. Intenções e Invariantes Sagradas
  2. Telas Intuitivas e MER do Negócio
  3. Código Vivo Amarrado e UML Comportamental
  4. 240 Testes Automatizados e Deploy Confirm-Once
• Democratização Real da Tecnologia: Criando software de alto padrão para comércios locais sem gastar fortunas com programação
• Chamada Especial: A próxima Playlist já começou — App de Cafeteria e Padaria com Estoque Crítico!

⏱️ Capítulos:
00:00 - A Celebração da Vitória: O Salão Totalmente Digitalizado
00:18 - A Democratização do Software de Alto Padrão com o IDD
00:36 - Recapitulação dos 4 Passos Sagrados da Metodologia
00:54 - A Esteira Auditável: Da Intenção ao Deploy na Nuvem
01:05 - Terminal da IA: Relatório de Telemetria do Primeiro Sábado
01:21 - 142 Clientes Atendidos, Zero Falhas e R$ 0,00 de Divergência
01:35 - A Física do Salão Respeitada com Rigor Matemático
01:45 - Chamada Oficial para a Playlist 2: Cafeteria & Padaria!
01:58 - Encerramento, Inscrição no Canal e Agradecimentos!

📺 Assista a Playlist Oficial Completa "IDD na Prática — Barbearia & Salão":
https://www.youtube.com/playlist?list=PLHCqwtNiGbt8

☕ Próxima Playlist Oficial "IDD na Prática — Cafeteria & Padaria":
https://www.youtube.com/playlist?list=PLLfynRT3_DJs

👤 Eliézer Rosa | Criador do Paradigma IDD (Intent-Driven Development)
#IDD #IntentionDrivenDevelopment #GrandFinale #Barbearia #SalaoDeBeleza #EngenhariaDeSoftware #NoCode #IA #DevOps #EliezerRosa #EliezerJPRosa
"""

TAGS = [
    "IDD",
    "Intention-Driven Development",
    "Grand Finale",
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
    print("🚀 UPLOAD DO EPISÓDIO 5 (GRAND FINALE) DA BARBEARIA NO YOUTUBE")
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
                "position": 8,
                "resourceId": {
                    "kind": "youtube#video",
                    "videoId": new_video_id
                }
            }
        }
        pl_item = yt.playlistItems().insert(part="snippet", body=pl_body).execute()
        print(f"[OK] Inserido na Playlist {PLAYLIST_ID} na posição 8!")
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
            manifest["barbearia_videos"]["ep5"] = new_video_id
            with open(manifest_path, "w", encoding="utf-8") as f:
                json.dump(manifest, f, indent=2, ensure_ascii=False)
            print("[OK] Manifesto de uploads atualizado com o Ep 5!")
        except Exception as e:
            print(f"[!] Erro ao atualizar manifesto: {e}")

if __name__ == "__main__":
    main()
