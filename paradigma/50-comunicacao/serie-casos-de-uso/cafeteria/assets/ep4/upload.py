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
ASSETS_DIR = BASE_DIR / "producao_yt" / "cafeteria_assets" / "ep4"
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_eliezer.json"

VIDEO_FILE = ASSETS_DIR / "IDD_Cafeteria_Episodio_4.mp4"
THUMBNAIL_FILE = ASSETS_DIR / "capa.png"
PLAYLIST_ID = "PLLfynRT3_DJs" # Playlist Cafeteria & Padaria

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

TITLE = "240 Testes em 8s & Deploy em 4s na Cafeteria: Validação IDD | Ep. 4 Cafeteria IDD"

DESCRIPTION = """\
☕ SÉRIE OFICIAL IDD NA PRÁTICA: O APP DA CAFETERIA & PADARIA
Episódio 4: Validação Autônoma, 240 Testes Automatizados & Deploy em 4 Segundos

Antes de colocar o aplicativo na mão dos garçons, baristas e do caixa num sábado movimentado com mais de 100 clientes simultâneos, como provar que o sistema nunca falhará?
No Paradigma IDD (Intent-Driven Development), eliminamos completamente os testes manuais subjetivos. A inteligência artificial compila uma esteira de 240 testes automatizados que cobrem todas as camadas do sistema em 8.4 segundos!

Destaques da Validação & Deploy:
• A Matriz dos 240 Testes:
  - 120 Testes de Unidade: regras da comanda, guards da FSM, integridade de centavos e bloqueio de entrega não paga.
  - 80 Testes de Integração SQL: triggers de estoque de café e leite, lock atômico concorrente e integridade referencial.
  - 40 Testes E2E: simulação ponta a ponta do clique na mesa ao monitor KDS e pagamento no Pix.
• Teste de Estresse da Despensa: simulação de 50 pedidos simultâneos forçando ruptura de insumo para garantir o bloqueio atômico.
• Protocolo Confirm-Once: a IA apresenta o relatório com 100% de aprovação e o orquestrador Eliézer Rosa concede o aval definitivo.
• Deploy em 4.1 Segundos: containers ativos, banco migrado e o aplicativo funcionando em nuvem de alta disponibilidade!

⏱️ Capítulos do Episódio:
00:00 - A Prova de Fogo: Como Garantir que o Sistema Nunca Falhará?
00:15 - A Validação Automatizada do IDD: 240 Testes em 8.4 Segundos
00:36 - Matriz de Cobertura: Testes Unitários, Integração e Ponta a Ponta
00:48 - Teste de Estresse de Insumos: Provocando Erros de Propósito
01:05 - Terminal da IA: Execução Paralela da Suíte de Testes da Cafeteria
01:16 - Relatório de Aprovação: 240 Passados, 0 Falhas, 100% Invariantes
01:38 - Aval de Eliézer Rosa: Autorização de Deploy Confirm-Once
01:46 - Deploy em 4.1s na Nuvem: Sistema Ativo e Sincronizado
02:03 - Confiabilidade Corporativa para Pequenos Estabelecimentos
02:22 - Convite para o Episódio 4B Metodológico: Governança Confirm-Once!

📺 Playlist Oficial Completa "IDD na Prática — Cafeteria & Padaria":
https://www.youtube.com/playlist?list=PLLfynRT3_DJs

💈 Assista Também à Playlist "IDD na Prática — Barbearia & Salão":
https://www.youtube.com/playlist?list=PLHCqwtNiGbt8

👤 Eliézer Rosa | Criador do Paradigma IDD (Intent-Driven Development)
#IDD #IntentionDrivenDevelopment #TestesAutomatizados #DevOps #CI_CD #Cafeteria #Padaria #NoCode #SoftwareEngineering #IA #EliezerRosa #EliezerJPRosa
"""

TAGS = [
    "IDD",
    "Intention-Driven Development",
    "Testes Automatizados",
    "DevOps",
    "CI/CD",
    "Deploy",
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
    print("🚀 UPLOAD DO EPISÓDIO 4 DA CAFETERIA NO YOUTUBE")
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

    manifest_path = BASE_DIR / "producao_yt" / "upload_manifest.json"
    if manifest_path.exists():
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                manifest = json.load(f)
            if "cafeteria_videos" not in manifest:
                manifest["cafeteria_videos"] = {}
            manifest["cafeteria_videos"]["ep4"] = new_video_id
            with open(manifest_path, "w", encoding="utf-8") as f:
                json.dump(manifest, f, indent=2, ensure_ascii=False)
            print("[OK] Manifesto de uploads atualizado com o Ep 4 da Cafeteria!")
        except Exception as e:
            print(f"[!] Erro ao atualizar manifesto: {e}")

if __name__ == "__main__":
    main()
