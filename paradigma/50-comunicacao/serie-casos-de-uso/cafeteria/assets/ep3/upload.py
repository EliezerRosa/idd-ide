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
ASSETS_DIR = BASE_DIR / "producao_yt" / "cafeteria_assets" / "ep3"
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_eliezer.json"

VIDEO_FILE = ASSETS_DIR / "IDD_Cafeteria_Episodio_3.mp4"
THUMBNAIL_FILE = ASSETS_DIR / "capa.png"
PLAYLIST_ID = "PLLfynRT3_DJs" # Playlist Cafeteria & Padaria

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

TITLE = "Código Vivo & Amarração com Invariantes na Cafeteria: Do MER ao SQL | Ep. 3 Cafeteria IDD"

DESCRIPTION = """\
☕ SÉRIE OFICIAL IDD NA PRÁTICA: O APP DA CAFETERIA & PADARIA
Episódio 3: O Código Vivo do App & Sua Amarração Total com as Invariantes e Modelos MER/UML

Chegamos ao ponto alto da engenharia de software no Paradigma IDD (Intent-Driven Development)!
Neste episódio, revelamos como o compilador IDD traduz as intenções do restaurante e o modelo MER diretamente para o Código Vivo em PostgreSQL e TypeScript com rastreabilidade absoluta!

Destaques da Amarração Direta do Código:
• O Arquivo schema.sql:
  - Trigger check_estoque_ingrediente(): consulta a tabela produto_receita antes de cada inserção de item e aborta atômica e matematicamente se faltar grão especial ou leite na despensa.
  - Constraint check_valor_total: valida com rigor de centavos que valor_total = subtotal - desconto.
• O Arquivo domain_rules.ts:
  - Máquina de Estados Finitos da Comanda: RECEBIDO → EM_PREPARO → PRONTO → ENTREGUE.
  - Invariante de Liquidação Prévia: o método transicionarPara() bloqueia a entrega na mesa se pago !== true, eliminando o calote e esquecimento de cobrança no restaurante.
• Zero Código Órfão: cada classe e trigger possui certidão de nascimento rastreável até a regra de negócio.

⏱️ Capítulos do Episódio:
00:00 - A Geração do Código Vivo: Do Modelo Conceitual à Execução Real
00:15 - A Mágica da Engenharia Reversa do IDD: Código Amarrado às Invariantes
00:38 - Arquivo schema.sql: A Trigger check_estoque_ingrediente() em Ação
00:49 - Blindagem do Banco de Dados: Abortando Pedidos sem Insumos na Despensa
01:10 - Arquivo domain_rules.ts: A Classe ComandaDominio em TypeScript
01:23 - Dilema da FSM no Terminal: O Garçom Pode Entregar sem Pagamento no Caixa?
01:44 - Decisão de Eliézer Rosa: Invariante Sagrada de Liquidação Prévia
02:07 - Software Correto por Construção: Zero Ambiguidade e Zero Bugs
02:28 - Convite para o Episódio 3B Metodológico: Modelagem UML & FSM com IA!

📺 Playlist Oficial Completa "IDD na Prática — Cafeteria & Padaria":
https://www.youtube.com/playlist?list=PLLfynRT3_DJs

💈 Assista Também à Playlist "IDD na Prática — Barbearia & Salão":
https://www.youtube.com/playlist?list=PLHCqwtNiGbt8

👤 Eliézer Rosa | Criador do Paradigma IDD (Intent-Driven Development)
#IDD #IntentionDrivenDevelopment #CodigoVivo #TypeScript #PostgreSQL #Cafeteria #Padaria #NoCode #SoftwareEngineering #IA #EliezerRosa #EliezerJPRosa
"""

TAGS = [
    "IDD",
    "Intention-Driven Development",
    "Codigo Vivo",
    "TypeScript",
    "PostgreSQL",
    "Cafeteria",
    "Padaria",
    "NoCode",
    "IA",
    "Inteligencia Artificial",
    "Eliezer Rosa",
    "EliezerJPRosa"
]

def main():
    print("=" * 70)
    print("🚀 UPLOAD DO EPISÓDIO 3 DA CAFETERIA NO YOUTUBE")
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
                "position": 4,
                "resourceId": {
                    "kind": "youtube#video",
                    "videoId": new_video_id
                }
            }
        }
        pl_item = yt.playlistItems().insert(part="snippet", body=pl_body).execute()
        print(f"[OK] Inserido na Playlist {PLAYLIST_ID} na posição 4!")
    except Exception as e:
        print(f"[!] Erro ao adicionar à playlist: {e}")

    manifest_path = BASE_DIR / "producao_yt" / "upload_manifest.json"
    if manifest_path.exists():
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                manifest = json.load(f)
            if "cafeteria_videos" not in manifest:
                manifest["cafeteria_videos"] = {}
            manifest["cafeteria_videos"]["ep3"] = new_video_id
            with open(manifest_path, "w", encoding="utf-8") as f:
                json.dump(manifest, f, indent=2, ensure_ascii=False)
            print("[OK] Manifesto de uploads atualizado com o Ep 3 da Cafeteria!")
        except Exception as e:
            print(f"[!] Erro ao atualizar manifesto: {e}")

if __name__ == "__main__":
    main()
