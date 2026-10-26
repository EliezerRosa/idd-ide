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
ASSETS_DIR = BASE_DIR / "producao_yt" / "racha_assets" / "ep1"
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_eliezer.json"

VIDEO_FILE = ASSETS_DIR / "IDD_Racha_Episodio_1.mp4"
THUMBNAIL_FILE = ASSETS_DIR / "capa.png"
PLAYLIST_ID = "PLdaNms3TnbXA" # Playlist Racha de Conta & Pix

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

TITLE = "Racha de Conta & Pix Justo: O Caos da Mesa & Invariante Soma Zero | Ep. 1 Racha IDD"

DESCRIPTION = """\
💸 SÉRIE OFICIAL IDD NA PRÁTICA: O APP DE RACHA DE CONTA & PIX ("QUEM PAGA O QUÊ?")
Episódio 1: O Caos da Conta no Fim de Noite & A Invariante Sagrada da Soma Zero

Quem nunca passou pelo constrangimento na hora de fechar a conta no restaurante ou no barzinho? O garçom traz a notinha de papel, alguém abre a calculadora do celular, um bebeu chope artesanal, outro só tomou água, a conta não fecha e sobra sempre para o anfitrião pagar a diferença!

Neste primeiro episódio da nossa terceira playlist oficial, Eliézer Rosa e a equipe apresentam o domínio do problema e revelam como o Paradigma IDD (Intent-Driven Development) resolve a dor da divisão de contas com rigor matemático absoluto.

Destaques do Episódio:
• A Dor Social do Fechamento de Conta: por que dividir igualmente é injusto e por que os aplicativos comuns falham ao deixar furos de centavos.
• A Invariante Sagrada da Soma Zero: cada item consumido (seja individual ou compartilhado) é atribuído com precisão aos seus consumidores. A taxa de serviço de 10% é rateada proporcionalmente ao consumo real.
• O Dilema do Centavo Indivisível: como R$ 10,00 divididos por 3 geram R$ 3,33 periódicos e qual é o algoritmo IDD para distribuir o resto de centavos sem perdas.
• O Aplicativo que Vamos Construir: interface limpa, rateio transparente por pessoa e geração instantânea de QR Code Pix para liquidação imediata da mesa.

⏱️ Capítulos do Episódio:
00:00 - O Constrangimento na Hora de Fechar a Conta no Restaurante
00:16 - Bem-vindos à Playlist 3: Quem Paga o Quê? - Racha de Pix
00:38 - A Invariante Sagrada da Soma Zero: Rateio Justo por Consumo
00:52 - Taxa de Serviço Proporcional e Tolerância Zero de Erro
01:10 - Terminal da IA: Analisando o Domínio e o Centavo Indivisível
01:28 - Governança IDD: Distribuição Sequencial do Resto de Centavos
01:45 - Visão Geral do Aplicativo e Liquidação Instantânea via Pix
02:07 - Convite para o Episódio 1B Metodológico: Intenções com IA!

📺 Playlist Oficial Completa "IDD na Prática — Racha de Conta & Pix":
https://www.youtube.com/playlist?list=PLdaNms3TnbXA

💈 Assista Também à Playlist "IDD na Prática — Barbearia & Salão":
https://www.youtube.com/playlist?list=PLHCqwtNiGbt8

☕ Assista Também à Playlist "IDD na Prática — Cafeteria & Padaria":
https://www.youtube.com/playlist?list=PLLfynRT3_DJs

👤 Eliézer Rosa | Criador do Paradigma IDD (Intent-Driven Development)
#IDD #IntentionDrivenDevelopment #RachaDeConta #Pix #Fintech #EngenhariaDeSoftware #NoCode #IA #EliezerRosa #EliezerJPRosa
"""

TAGS = [
    "IDD",
    "Intention-Driven Development",
    "Racha de Conta",
    "Divisao de Conta",
    "Pix",
    "Fintech",
    "Engenharia de Software",
    "NoCode",
    "IA",
    "Inteligencia Artificial",
    "Soma Zero",
    "Eliezer Rosa",
    "EliezerJPRosa"
]

def main():
    print("=" * 70)
    print("🚀 UPLOAD DO EPISÓDIO 1 DO RACHA DE PIX NO YOUTUBE")
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
                "position": 0,
                "resourceId": {
                    "kind": "youtube#video",
                    "videoId": new_video_id
                }
            }
        }
        pl_item = yt.playlistItems().insert(part="snippet", body=pl_body).execute()
        print(f"[OK] Inserido na Playlist {PLAYLIST_ID} na posição 0!")
    except Exception as e:
        print(f"[!] Erro ao adicionar à playlist: {e}")

    manifest_path = BASE_DIR / "producao_yt" / "upload_manifest.json"
    if manifest_path.exists():
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                manifest = json.load(f)
            if "racha_videos" not in manifest:
                manifest["racha_videos"] = {}
            manifest["racha_videos"]["ep1"] = new_video_id
            with open(manifest_path, "w", encoding="utf-8") as f:
                json.dump(manifest, f, indent=2, ensure_ascii=False)
            print("[OK] Manifesto de uploads atualizado com o Ep 1 do Racha!")
        except Exception as e:
            print(f"[!] Erro ao atualizar manifesto: {e}")

if __name__ == "__main__":
    main()
