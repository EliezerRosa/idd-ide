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
ASSETS_DIR = BASE_DIR / "producao_yt" / "barbearia_assets" / "ep3b"
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_eliezer.json"

VIDEO_FILE = ASSETS_DIR / "IDD_Barbearia_Episodio_3B.mp4"
THUMBNAIL_FILE = ASSETS_DIR / "capa.png"
PLAYLIST_ID = "PLHCqwtNiGbt8" # Playlist Barbearia

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

TITLE = "Passo 3 da Metodologia IDD: Modelagem UML com IA Sem Código | Ep. 3B Barbearia"

DESCRIPTION = """\
💈 SÉRIE METODOLÓGICA IDD NA PRÁTICA: O APP DA BARBEARIA
Episódio 3B: Passo 3 da Metodologia — Modelagem Comportamental UML, Classes & Máquina de Estados com IA

Como definir a dinâmica, os privilégios dos usuários e o ciclo de vida de um agendamento em um aplicativo antes mesmo de rodar o código de desenvolvimento?

Neste episódio metodológico da série "IDD na Prática", Eliézer Rosa, a Usuária Leiga e o Compilador IA ensinam o Passo 3 do Paradigma IDD: a Modelagem Comportamental UML do aplicativo da barbearia.

Destaques deste Episódio:
• Comportamento Antes do Código: Como o UML complementa o MER definindo a dinâmica e transições de tela
• Casos de Uso & Atores de Contexto: Isolamento rigoroso entre Cliente (auto-agendamento), Barbeiro (cadeira) e Gerente (caixa)
• Máquina de Estados Finita: Transições estritas (Reservado → Confirmado → Na Cadeira → Concluído)
• Terminal da IA em Ação: O compilador detectando o término antecipado do corte e consultando a governança
• Decisão de Negócio de Eliézer: O evento Cadeira_Disponivel_Adiantada para eliminar ociosidade chamando a fila presencial sem atrasar o próximo cliente
• Ponte para o Ep. 4: A preparação conceitual para a bateria de 240 testes automatizados anti-regressão!

⏱️ Capítulos:
00:00 - Como Criar Diagramas UML com IA Sem Programação?
00:17 - Passo 3 da Metodologia IDD: A Modelagem Comportamental UML
00:37 - Diagrama de Casos de Uso: Os 3 Atores do Salão e suas Permissões
00:48 - O Isolamento de Privilégios: Barbeiro, Cliente e Gerente
01:05 - Diagrama de Estados: O Ciclo de Vida da Cadeira de Barbeiro
01:17 - Consulta da IA: O Que Fazer Quando o Corte Termina Antes do Horário?
01:28 - Governança de Eliézer: Evento de Ociosidade Zero com Fila Presencial
01:43 - Confirmação do Compilador: Modelo UML Matematicamente Fechado
01:51 - A Visão da Usuária Leiga: Clareza Comportamental Antes do Deploy
02:05 - Encerramento & Chamada para o Ep. 4 (240 Testes Automatizados)!

📺 Assista a Playlist Oficial Completa "IDD na Prática — Barbearia & Salão":
https://www.youtube.com/playlist?list=PLHCqwtNiGbt8

👤 Eliézer Rosa | Criador do Paradigma IDD (Intent-Driven Development)
#IDD #IntentionDrivenDevelopment #UML #DiagramaDeClasses #MaquinaDeEstados #Barbearia #SalaoDeBeleza #EngenhariaDeSoftware #NoCode #IA #DevOps #EliezerRosa #EliezerJPRosa
"""

TAGS = [
    "IDD",
    "Intention-Driven Development",
    "UML",
    "Maquina de Estados",
    "Casos de Uso",
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
    print("🚀 UPLOAD DO EPISÓDIO 3B DA BARBEARIA NO YOUTUBE")
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

    # Atualizar upload_manifest.json
    manifest_path = BASE_DIR / "producao_yt" / "upload_manifest.json"
    if manifest_path.exists():
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                manifest = json.load(f)
            if "barbearia_videos" not in manifest:
                manifest["barbearia_videos"] = {}
            manifest["barbearia_videos"]["ep3b"] = new_video_id
            with open(manifest_path, "w", encoding="utf-8") as f:
                json.dump(manifest, f, indent=2, ensure_ascii=False)
            print("[OK] Manifesto de uploads atualizado com o Ep 3B!")
        except Exception as e:
            print(f"[!] Erro ao atualizar manifesto: {e}")

if __name__ == "__main__":
    main()
