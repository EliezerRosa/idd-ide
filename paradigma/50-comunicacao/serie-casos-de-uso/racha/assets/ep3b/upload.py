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
ASSETS_DIR = BASE_DIR / "producao_yt" / "racha_assets" / "ep3b"
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_eliezer.json"

VIDEO_FILE = ASSETS_DIR / "IDD_Racha_Episodio_3B.mp4"
THUMBNAIL_FILE = ASSETS_DIR / "capa.png"
PLAYLIST_ID = "PLdaNms3TnbXA" # Playlist Racha de Conta & Pix

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

TITLE = "Metodologia IDD: O 3º Passo Sagrado - UML Preliminar com IA | Ep. 3B Racha IDD"

DESCRIPTION = """\
💸 SÉRIE OFICIAL IDD NA PRÁTICA: O APP DE RACHA DE CONTA & PIX ("QUEM PAGA O QUÊ?")
Episódio 3B: Metodologia IDD — O 3º Passo Sagrado: Comportamento & UML Preliminar com IA

Como o desenvolvedor orquestra a inteligência artificial para mapear o comportamento dinâmico e as transições do sistema sem gerar código prematuro?

Neste episódio metodológico, Eliézer Rosa e a equipe apresentam o Terceiro Passo Sagrado do Paradigma IDD: a Modelagem Comportamental UML preliminar (Casos de Uso, Diagrama de Classes e Máquina de Estados Finitos) em parceria com a IA.

Destaques da Modelagem Comportamental IDD:
• Atores e Casos de Uso: fronteiras formais de ação entre o Pagador da Mesa, os Amigos Participantes e o Garçom.
• A Máquina de Estados Finitos (FSM) da Mesa:
  1. ABERTA (amigos marcam seus itens livremente)
  2. EM FECHAMENTO (bloqueio de novos pedidos e conferência de serviço)
  3. COTAS GERADAS (cálculo de centavos atômicos e QR Codes emitidos)
  4. LIQUIDAÇÃO PARCIAL (baixa dinâmica conforme os Pix entram)
  5. FINALIZADA (saldo aberto zero centavos e mesa arquivada)
• Governança e Decisão Crítica no Terminal:
  A IA submete um dilema comportamental ao orquestrador: "Se alguém pedir um chope adicional na saideira pós-fechamento, a mesa bloqueia ou reverte?"
  Decisão de Eliézer Rosa: transição reversa autorizada, com anulação atômica imediata de todos os QR Codes anteriores e novo recálculo da Invariante da Soma Zero.
• O Sistema Totalmente Blindado: agora possuímos Intenções (Ep 1B), Dados MER (Ep 2B) e Comportamento UML (Ep 3B) antes de escrever uma única linha de código.

⏱️ Capítulos do Episódio:
00:00 - Como Modelar o Comportamento Dinâmico com a IA sem Código?
00:15 - O 3º Passo Sagrado: Modelagem Comportamental UML
00:36 - A Máquina de Estados da Mesa: Do Início ao Arquivamento
00:54 - O Rigor das Transições e Bloqueio de Ações Inválidas
01:10 - Terminal da IA: Submetendo o Dilema da Saideira Pós-Fechamento
01:25 - Decisão do Orquestrador: Reversão com Anulação Atômica de Pix
01:45 - Síntese dos 3 Passos Sagrados: Intenções, MER e UML
02:00 - Convite para o Episódio 4: Código Exemplo Amarrado às Invariantes!

📺 Playlist Oficial Completa "IDD na Prática — Racha de Conta & Pix":
https://www.youtube.com/playlist?list=PLdaNms3TnbXA

💈 Assista Também à Playlist "IDD na Prática — Barbearia & Salão":
https://www.youtube.com/playlist?list=PLHCqwtNiGbt8

☕ Assista Também à Playlist "IDD na Prática — Cafeteria & Padaria":
https://www.youtube.com/playlist?list=PLLfynRT3_DJs

👤 Eliézer Rosa | Criador do Paradigma IDD (Intent-Driven Development)
#IDD #IntentionDrivenDevelopment #UML #StateMachines #Fintech #SoftwareEngineering #NoCode #IA #EliezerRosa #EliezerJPRosa
"""

TAGS = [
    "IDD",
    "Intention-Driven Development",
    "UML",
    "Maquina de Estados",
    "Casos de Uso",
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
    print("🚀 UPLOAD DO EPISÓDIO 3B DO RACHA DE PIX NO YOUTUBE")
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
                "position": 5,
                "resourceId": {
                    "kind": "youtube#video",
                    "videoId": new_video_id
                }
            }
        }
        pl_item = yt.playlistItems().insert(part="snippet", body=pl_body).execute()
        print(f"[OK] Inserido na Playlist {PLAYLIST_ID} na posição 5!")
    except Exception as e:
        print(f"[!] Erro ao adicionar à playlist: {e}")

    manifest_path = BASE_DIR / "producao_yt" / "upload_manifest.json"
    if manifest_path.exists():
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                manifest = json.load(f)
            if "racha_videos" not in manifest:
                manifest["racha_videos"] = {}
            manifest["racha_videos"]["ep3b"] = new_video_id
            with open(manifest_path, "w", encoding="utf-8") as f:
                json.dump(manifest, f, indent=2, ensure_ascii=False)
            print("[OK] Manifesto de uploads atualizado com o Ep 3B do Racha!")
        except Exception as e:
            print(f"[!] Erro ao atualizar manifesto: {e}")

if __name__ == "__main__":
    main()
