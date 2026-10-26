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
ASSETS_DIR = BASE_DIR / "producao_yt" / "cafeteria_assets" / "ep5"
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_eliezer.json"

VIDEO_FILE = ASSETS_DIR / "IDD_Cafeteria_Episodio_5.mp4"
THUMBNAIL_FILE = ASSETS_DIR / "capa.png"
PLAYLIST_ID = "PLLfynRT3_DJs" # Playlist Cafeteria & Padaria

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

TITLE = "O App da Cafeteria no Ar! 384 Comandas, Zero Erros & Fim da Série | Ep. 5 Cafeteria IDD"

DESCRIPTION = """\
☕ SÉRIE OFICIAL IDD NA PRÁTICA: O APP DA CAFETERIA & PADARIA
Episódio 5: Grand Finale — O App da Cafeteria no Ar, 384 Comandas Reais & Zero Falhas!

Chegamos ao encerramento triunfal da nossa série completa da Cafeteria & Padaria!
Aquele estabelecimento que antes sofria com perda de comandas de papel, desperdício de café em grãos e leite fresco, e filas estressantes no caixa, agora opera com um sistema completo de nível internacional compilado de forma autônoma sem que ninguém escrevesse uma linha de código manual.

Destaques do Grand Finale:
• A Celebração da Intenção: como a clareza das intenções humanas guiou a IA na geração de telas, banco relacional e regras de negócio à prova de falhas.
• Recapitulação dos 4 Passos Sagrados:
  1. Intenções e Invariantes Sagradas de Estoque Atômico.
  2. Design de Telas e Modelo Entidade-Relacionamento (MER).
  3. Código Vivo, Triggers SQL e Máquina de Estados (FSM) da Cozinha.
  4. Suíte de 240 Testes em 8.4s e Deploy Confirm-Once em 4.1s.
• Telemetria Real em Produção:
  - 384 comandas atendidas no fim de semana.
  - 0.00g de divergência no estoque de café em grãos e leite fresco.
  - ZERO comandas não pagas entregues.
  - 350ms de latência entre mesa e monitor KDS da cozinha.
  - Faturamento 100% auditado sem nenhum furo no caixa.
• Abertura da Playlist 3: conheça o próximo aplicativo prático do canal: Racha de Conta & Pix ("Quem Paga o Quê?"), resolvendo divisões com centavos indivisíveis!

⏱️ Capítulos do Episódio:
00:00 - A Celebração: O Aplicativo da Cafeteria Rodando no Salão
00:20 - A Força do Paradigma IDD: Engenharia de Alto Padrão sem Código
00:40 - Os Quatro Pilares Percorridos na Cafeteria e Padaria
01:02 - Terminal da IA: Relatório de Telemetria do Fim de Semana
01:14 - Métricas Auditadas: 384 Comandas, 0g Perda de Insumos, Caixa 100%
01:35 - Agilidade das Mesas e Cozinha Integrada sem Papel
01:52 - Conclusão Oficial dos 9 Episódios da Playlist 2
02:08 - Apresentação da Playlist 3: Aplicativo de Racha de Conta & Pix!
02:30 - Mensagem de Agradecimento e Encerramento com Eliézer Rosa

📺 Playlist Oficial Completa "IDD na Prática — Cafeteria & Padaria" (9 Vídeos 100% Concluídos!):
https://www.youtube.com/playlist?list=PLLfynRT3_DJs

💈 Assista Também à Playlist "IDD na Prática — Barbearia & Salão":
https://www.youtube.com/playlist?list=PLHCqwtNiGbt8

💸 Próxima Série: "IDD na Prática — Racha de Conta & Pix":
https://www.youtube.com/playlist?list=PLdaNms3TnbXA

👤 Eliézer Rosa | Criador do Paradigma IDD (Intent-Driven Development)
#IDD #IntentionDrivenDevelopment #Cafeteria #Padaria #EngenhariaDeSoftware #NoCode #IA #KDS #Deploy #EliezerRosa #EliezerJPRosa
"""

TAGS = [
    "IDD",
    "Intention-Driven Development",
    "Grand Finale",
    "Cafeteria",
    "Padaria",
    "Engenharia de Software",
    "NoCode",
    "IA",
    "Inteligencia Artificial",
    "Telemetria",
    "KDS",
    "Eliezer Rosa",
    "EliezerJPRosa"
]

def main():
    print("=" * 70)
    print("🚀 UPLOAD DO EPISÓDIO 5 DA CAFETERIA NO YOUTUBE (GRAND FINALE)")
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
        print(f"[OK] Inserido na Playlist {PLAYLIST_ID} na posição 8 (ÚLTIMA POSIÇÃO - PLAYLIST 100% COMPLETA)!")
    except Exception as e:
        print(f"[!] Erro ao adicionar à playlist: {e}")

    manifest_path = BASE_DIR / "producao_yt" / "upload_manifest.json"
    if manifest_path.exists():
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                manifest = json.load(f)
            if "cafeteria_videos" not in manifest:
                manifest["cafeteria_videos"] = {}
            manifest["cafeteria_videos"]["ep5"] = new_video_id
            with open(manifest_path, "w", encoding="utf-8") as f:
                json.dump(manifest, f, indent=2, ensure_ascii=False)
            print("[OK] Manifesto de uploads atualizado com o Ep 5 da Cafeteria!")
        except Exception as e:
            print(f"[!] Erro ao atualizar manifesto: {e}")

if __name__ == "__main__":
    main()
