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
ASSETS_DIR = BASE_DIR / "producao_yt" / "cafeteria_assets" / "ep2b"
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_eliezer.json"

VIDEO_FILE = ASSETS_DIR / "IDD_Cafeteria_Episodio_2B.mp4"
THUMBNAIL_FILE = ASSETS_DIR / "capa.png"
PLAYLIST_ID = "PLLfynRT3_DJs" # Playlist Cafeteria & Padaria

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

TITLE = "MER do Negócio com IA sem Código: Modelagem da Cafeteria | Ep. 2B Cafeteria IDD"

DESCRIPTION = """\
☕ SÉRIE OFICIAL IDD NA PRÁTICA: O APP DA CAFETERIA & PADARIA
Episódio 2B Metodológico: Como o Desenvolvedor e o Leigo Criam o MER do Negócio com a IA sem Escrever SQL

No episódio dois vimos as telas do salão e da cozinha. Agora, neste episódio metodológico, mergulhamos no Passo 2 do Paradigma IDD (Intent-Driven Development): o Modelo de Entidade e Relacionamento (MER) do Negócio com a IA!

Por que não gerar código SQL ou migrations nesta fase?
Porque o modelo de dados de um negócio é a espinha dorsal de sua sustentabilidade. O foco absoluto do orquestrador humano deve ser auditar as cardinalidades, as chaves de domínio e as regras de integridade conceitual, deixando a sintaxe física para a compilação posterior!

Destaques deste Episódio Metodológico:
• As 6 Entidades Fundamentais: Mesas, Comandas, Itens, Produtos, Ingredientes e a associativa Receitas
• A Relação N:M de Receitas: Como cada item sabe a gramatura exata que deduz da despensa
• Dilema Contábil no Terminal da IA: Se o preço do cardápio aumentar no próximo mês, o que acontece com os relatórios das comandas antigas?
• Governança Humana no Loop: Eliézer Rosa define a Invariante Sagrada de Snapshot Histórico Obrigatório na tabela de itens
• O que vem a seguir: A preparação direta para o Episódio 3 e 3B com UML, FSM e a compilação do Código Vivo!

⏱️ Capítulos do Episódio:
00:00 - O Segundo Passo Metodológico: MER com IA sem Gerar SQL
00:16 - Mapeando as Entidades Reais: Mesas, Comandas e Cozinha
00:36 - Cardinalidades: Como Produtos e Ingredientes se Conectam via Receitas
00:49 - A Baixa Atômica de Gramas e Mililitros na Despensa
01:06 - Interação com a IA: Armadilha Temporal de Reajuste de Preços
01:18 - Terminal da IA: Risco de Mutabilidade dos Relatórios Financeiros Passados
01:41 - Decisão de Eliézer Rosa: Invariante de Snapshot Histórico Obrigatório
02:00 - Integridade Referencial e Cardinalidades Auditadas com Rigor
02:17 - Convite para o Episódio 3 & 3B: Diagramas UML e o Código Vivo do App!

📺 Playlist Oficial Completa "IDD na Prática — Cafeteria & Padaria":
https://www.youtube.com/playlist?list=PLLfynRT3_DJs

💈 Assista Também à Playlist "IDD na Prática — Barbearia & Salão":
https://www.youtube.com/playlist?list=PLHCqwtNiGbt8

👤 Eliézer Rosa | Criador do Paradigma IDD (Intent-Driven Development)
#IDD #IntentionDrivenDevelopment #MetodologiaIDD #MER #BancoDeDados #Cafeteria #Padaria #NoCode #SoftwareEngineering #IA #EliezerRosa #EliezerJPRosa
"""

TAGS = [
    "IDD",
    "Metodologia IDD",
    "Intention-Driven Development",
    "MER",
    "Banco de Dados",
    "Modelagem de Dados",
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
    print("🚀 UPLOAD DO EPISÓDIO 2B DA CAFETERIA NO YOUTUBE")
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
                "position": 3,
                "resourceId": {
                    "kind": "youtube#video",
                    "videoId": new_video_id
                }
            }
        }
        pl_item = yt.playlistItems().insert(part="snippet", body=pl_body).execute()
        print(f"[OK] Inserido na Playlist {PLAYLIST_ID} na posição 3!")
    except Exception as e:
        print(f"[!] Erro ao adicionar à playlist: {e}")

    manifest_path = BASE_DIR / "producao_yt" / "upload_manifest.json"
    if manifest_path.exists():
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                manifest = json.load(f)
            if "cafeteria_videos" not in manifest:
                manifest["cafeteria_videos"] = {}
            manifest["cafeteria_videos"]["ep2b"] = new_video_id
            with open(manifest_path, "w", encoding="utf-8") as f:
                json.dump(manifest, f, indent=2, ensure_ascii=False)
            print("[OK] Manifesto de uploads atualizado com o Ep 2B da Cafeteria!")
        except Exception as e:
            print(f"[!] Erro ao atualizar manifesto: {e}")

if __name__ == "__main__":
    main()
