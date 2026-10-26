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
ASSETS_DIR = BASE_DIR / "producao_yt" / "barbearia_assets" / "ep3"
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_eliezer.json"

VIDEO_FILE = ASSETS_DIR / "IDD_Barbearia_Episodio_3.mp4"
THUMBNAIL_FILE = ASSETS_DIR / "capa.png"
PLAYLIST_ID = "PLHCqwtNiGbt8" # Playlist Barbearia

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

TITLE = "Criando App de Barbearia com IA - Ep. 3: Código Vivo & Amarração | IDD na Prática"

DESCRIPTION = """\
💈 SÉRIE OFICIAL IDD NA PRÁTICA: O APP DA BARBEARIA & SALÃO
Episódio 3: A Geração do Código Vivo e sua Amarração Semântica com Invariantes, MER e UML

Como ter certeza absoluta de que o código gerado pela inteligência artificial para um aplicativo não virou uma "salada mista" e obedece rigorosamente a cada regra do negócio?

Neste terceiro episódio, Eliézer Rosa, a Usuária Leiga e o Compilador IA revelam o pilar central do Paradigma Intent-Driven Development (IDD): a Amarração Semântica Rastreável! Mostramos o código real em PostgreSQL e TypeScript nascendo diretamente das invariantes sagradas.

Destaques deste Episódio:
• Matriz de Rastreabilidade IDD: Intenção Humana → Invariante Sagrada → MER/UML → Código Concreto
• Trigger PostgreSQL da Cadeira Única: Como a instrução tsrange e o trigger fn_check_cadeira_unica barram reservas duplicadas na raiz do banco
• Snapshot Imutável de Preço: Tabela agendamento_itens protegendo o valor pago e a comissão contra reajustes futuros
• Máquina de Estados em TypeScript: Transições rígidas (Reservado → Confirmado → Na Cadeira → Concluído) impedindo fraudes operacionais
• Comissão sem Dízima: Cálculo matemático estrito em centavos inteiros com Math.floor
• Demonstração Visual: O aplicativo rodando no smartphone e bloqueando a agenda em tempo real

⏱️ Capítulos:
00:00 - A Geração do Código: Como Garantir que a IA Obedece às Regras?
00:17 - A Amarração Semântica Rastreável do Paradigma IDD
00:36 - Matriz de Rastreabilidade: Intenção → Invariante → MER/UML → Código
00:47 - Código PostgreSQL: O Trigger Anti-Sobreposição da Cadeira Única
01:06 - Código TypeScript: A Máquina de Estados Finita e Imutabilidade
01:15 - Cálculo de Comissão em Centavos Inteiros Sem Erro de Arredondamento
01:34 - O Aplicativo em Funcionamento no Smartphone
01:50 - Resumo da Implementação & Próximo Episódio Metodológico (Ep. 3B UML)!

📺 Assista a Playlist Oficial Completa "IDD na Prática — Barbearia & Salão":
https://www.youtube.com/playlist?list=PLHCqwtNiGbt8

👤 Eliézer Rosa | Criador do Paradigma IDD (Intent-Driven Development)
#IDD #IntentionDrivenDevelopment #CodigoLimpo #TypeScript #PostgreSQL #Barbearia #SalaoDeBeleza #IA #NoCode #EngenhariaDeSoftware #EliezerRosa #EliezerJPRosa
"""

TAGS = [
    "IDD",
    "Intention-Driven Development",
    "Codigo Limpo",
    "TypeScript",
    "PostgreSQL",
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
    print("🚀 UPLOAD DO EPISÓDIO 3 DA BARBEARIA NO YOUTUBE")
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

    # Atualizar upload_manifest.json
    manifest_path = BASE_DIR / "producao_yt" / "upload_manifest.json"
    if manifest_path.exists():
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                manifest = json.load(f)
            if "barbearia_videos" not in manifest:
                manifest["barbearia_videos"] = {}
            manifest["barbearia_videos"]["ep3"] = new_video_id
            with open(manifest_path, "w", encoding="utf-8") as f:
                json.dump(manifest, f, indent=2, ensure_ascii=False)
            print("[OK] Manifesto de uploads atualizado com o Ep 3!")
        except Exception as e:
            print(f"[!] Erro ao atualizar manifesto: {e}")

if __name__ == "__main__":
    main()
