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
ASSETS_DIR = BASE_DIR / "producao_yt" / "racha_assets" / "ep4"
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_eliezer.json"

VIDEO_FILE = ASSETS_DIR / "IDD_Racha_Episodio_4.mp4"
THUMBNAIL_FILE = ASSETS_DIR / "capa.png"
PLAYLIST_ID = "PLdaNms3TnbXA" # Playlist Racha de Conta & Pix

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

TITLE = "Racha de Conta: Código Exemplo, Bateria de 200 Testes & Deploy com IA | Ep. 4 Racha IDD"

DESCRIPTION = """\
💸 SÉRIE OFICIAL IDD NA PRÁTICA: O APP DE RACHA DE CONTA & PIX ("QUEM PAGA O QUÊ?")
Episódio 4: Código Exemplo, Bateria de 200 Testes Automatizados & Deploy com IA

Depois de definir as intenções, modelar o banco de dados (MER) e mapear os fluxos com máquinas de estado (UML), chegou o momento definitivo: o código executável rodando e a prova matemática de que o sistema é 100% à prova de falhas!

Neste quarto episódio, Eliézer Rosa e a equipe apresentam a Validação Automatizada sob o Paradigma IDD:
O código gerado não é uma caixa preta misteriosa. Cada função de rateio está formalmente amarrada às nossas invariantes sagradas.

Destaques da Suíte de Testes do Paradigma IDD:
• 200 Testes Automatizados em 4.2 segundos: testes de estresse com divisões periódicas de centavos (R$ 10 ÷ 3), gorjetas proporcionais e saídas antecipadas.
• Testes de Provocação de Erro: o sistema tenta de propósito sumir com um centavo, cobrar um amigo por item desmarcado ou pagar mesa finalizada — e em todos os 200 cenários a anomalia é sumariamente rejeitada.
• Governança e Decisão Crítica no Terminal:
  A IA Compilador executa a suíte ao vivo e solicita autorização: "Posso prosseguir com o build de produção?"
  Decisão de Eliézer Rosa: "Build autorizado com louvor! O código honrou 100% das regras estipuladas sem nenhum desvio."
• Deploy Seguro: o app entra em produção blindado contra prejuízos, calotes e inconsistências contábeis.

⏱️ Capítulos do Episódio:
00:00 - Da Arquitetura ao Código Compilado
00:15 - Sem Caixas Pretas: Invariantes no Código
00:38 - A Suíte de 200 Testes Automatizados
00:52 - Cenários Provocativos & Testes de Estresse
01:10 - Terminal ao Vivo: IA Executando a Suíte
01:20 - Auditoria da IA: Zero Discrepâncias no Pix
01:43 - Aprovação Formal de Deploy pelo Orquestrador
01:52 - O App em Produção com Paz de Espírito
02:00 - Convite para o Ep. 4B: O 4º Passo Sagrado IDD!

📺 Playlist Oficial Completa "IDD na Prática — Racha de Conta & Pix":
https://www.youtube.com/playlist?list=PLdaNms3TnbXA

💈 Assista Também à Playlist "IDD na Prática — Barbearia & Salão":
https://www.youtube.com/playlist?list=PLHCqwtNiGbt8

☕ Assista Também à Playlist "IDD na Prática — Cafeteria & Padaria":
https://www.youtube.com/playlist?list=PLLfynRT3_DJs

👤 Eliézer Rosa | Criador do Paradigma IDD (Intent-Driven Development)
#IDD #IntentionDrivenDevelopment #RachaDeConta #TestesAutomatizados #ZeroDefect #Fintech #Pix #SoftwareEngineering #NoCode #IA #EliezerRosa #EliezerJPRosa
"""

TAGS = [
    "IDD",
    "Intention-Driven Development",
    "Racha de Conta",
    "Divisao de Conta",
    "Pix",
    "Testes Automatizados",
    "Zero Defect",
    "Fintech",
    "Engenharia de Software",
    "Playwright",
    "Jest",
    "NoCode",
    "IA",
    "Inteligencia Artificial",
    "Soma Zero",
    "Eliezer Rosa",
    "EliezerJPRosa"
]

def main():
    print("=" * 70)
    print("🚀 UPLOAD DO EPISÓDIO 4 DO RACHA DE PIX NO YOUTUBE")
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

    creds = Credentials(
        token=creds_data["token"],
        refresh_token=creds_data["refresh_token"],
        token_uri=creds_data["token_uri"],
        client_id=creds_data["client_id"],
        client_secret=creds_data["client_secret"],
        scopes=SCOPES
    )

    youtube = build("youtube", "v3", credentials=creds)

    body = {
        "snippet": {
            "title": TITLE,
            "description": DESCRIPTION,
            "tags": TAGS,
            "categoryId": "28", # Science & Technology
            "defaultLanguage": "pt-BR",
            "defaultAudioLanguage": "pt-BR"
        },
        "status": {
            "privacyStatus": "public",
            "selfDeclaredMadeForKids": False
        }
    }

    media = MediaFileUpload(
        str(VIDEO_FILE),
        chunksize=1024*1024*5,
        resumable=True,
        mimetype="video/mp4"
    )

    print("\nIniciando upload para os servidores do YouTube...")
    request = youtube.videos().insert(
        part="snippet,status",
        body=body,
        media_body=media
    )

    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            print(f"  Progresso Upload: {int(status.progress() * 100)}%", end="\r")

    video_id = response["id"]
    video_url = f"https://www.youtube.com/watch?v={video_id}"
    print(f"\n[OK] Upload Concluído! Vídeo ID: {video_id}")
    print(f"     URL: {video_url}")

    if THUMBNAIL_FILE.exists():
        try:
            youtube.thumbnails().set(
                videoId=video_id,
                media_body=MediaFileUpload(str(THUMBNAIL_FILE), mimetype="image/png")
            ).execute()
            print("[OK] Capa personalizada aplicada!")
        except Exception as e:
            print(f"[!] Erro ao enviar capa: {e}")

    try:
        youtube.playlistItems().insert(
            part="snippet",
            body={
                "snippet": {
                    "playlistId": PLAYLIST_ID,
                    "position": 6, # Posição 6 na playlist
                    "resourceId": {
                        "kind": "youtube#video",
                        "videoId": video_id
                    }
                }
            }
        ).execute()
        print(f"[OK] Inserido na Playlist {PLAYLIST_ID} na posição 6!")
    except Exception as e:
        print(f"[!] Erro ao adicionar à playlist: {e}")

    manifest_path = BASE_DIR / "producao_yt" / "upload_manifest.json"
    if manifest_path.exists():
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)
    else:
        manifest = {}

    manifest["Racha_Episodio_4"] = {
        "videoId": video_id,
        "url": video_url,
        "title": TITLE,
        "playlistId": PLAYLIST_ID,
        "position": 6,
        "filename": VIDEO_FILE.name
    }

    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    print("[OK] Manifesto de uploads atualizado com o Ep 4 do Racha!\n")

if __name__ == "__main__":
    main()
