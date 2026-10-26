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
ASSETS_DIR = BASE_DIR / "producao_yt" / "barbearia_assets" / "ep4c"
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_eliezer.json"

VIDEO_FILE = ASSETS_DIR / "IDD_Barbearia_Episodio_4C.mp4"
THUMBNAIL_FILE = ASSETS_DIR / "capa.png"
PLAYLIST_ID = "PLHCqwtNiGbt8" # Playlist Barbearia & Salão

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

TITLE = "Implementação Completa: Funções Puras & Métodos Amarrados às Invariantes | Ep. 4C Barbearia IDD"

DESCRIPTION = """\
💈 SÉRIE OFICIAL IDD NA PRÁTICA: O SISTEMA DE GESTÃO PARA BARBEARIA & SALÃO
Episódio 4C: Implementação Completa — Funções Puras de Agenda, Decorador @invariant e 200 Testes de Estresse

Como implementar um motor de agendamentos e faturamento no Paradigma IDD com funções puras e validação em tempo de execução, garantindo conflito zero de cadeiras e fidelidade contábil de comissões?

Neste episódio de fechamento técnico da trilha de Barbearia, Eliézer Rosa e a equipe dissecam a arquitetura de código compilado da aplicação:

Destaques da Implementação Canônica IDD:
• Funções Puras & Imutabilidade de Intervalos:
  - Eliminação de race conditions no banco através de testes de intersecção temporal puros.
  - Intervalos de tempo como objetos imutáveis e centavos inteiros (BigInt) para controle de faturamento.
• O Decorador @invariant em Runtime:
  - Interceptação de chamadas no método confirmarAgendamento: validação prévia de disponibilidade e pós-condição de snapshot financeiro.
  - Aborto imediato com InvariantViolationException em caso de sobreposição.
• Bateria de 200 Testes de Estresse & Alta Concorrência:
  - Simulação de 20 requisições simultâneas disputando o mesmo horário nobre.
  - Validação estrita de cancelamentos tardios e cálculo de comissão.
  - 200 testes executados: 200 aprovados com 100% de sucesso e zero conflitos de cadeira!

⏱️ Capítulos do Episódio:
00:00 - Introdução: Da Especificação Visual ao Código Vivo da Barbearia
00:15 - Comparativo: Race Conditions Convencionais vs Funções Puras IDD
00:36 - O Decorador @invariant em Tempo de Execução de Agendamentos
00:54 - Blindagem de Cadeiras e Imutabilidade Financeira
01:12 - Terminal da IA: Execução da Bateria de 200 Testes de Alta Concorrência
01:28 - Homologação do Código pelo Orquestrador Eliézer Rosa
01:45 - Os Quatro Pilares do IDD (Intenções, MER, UML e Código)
02:00 - Próxima Trilha: Cafeteria & Padaria!

📺 Playlist Oficial Completa "IDD na Prática — Barbearia & Salão":
https://www.youtube.com/playlist?list=PLHCqwtNiGbt8

💸 Assista Também à Playlist "IDD na Prática — Racha de Conta & Pix":
https://www.youtube.com/playlist?list=PLdaNms3TnbXA

☕ Assista Também à Playlist "IDD na Prática — Cafeteria & Padaria":
https://www.youtube.com/playlist?list=PLLfynRT3_DJs

👤 Eliézer Rosa | Criador do Paradigma IDD (Intent-Driven Development)
#IDD #IntentionDrivenDevelopment #TypeScript #FuncoesPuras #Invariantes #Decorators #TestesAutomatizados #Barbearia #SalaoDeBeleza #SoftwareEngineering #NoCode #IA #EliezerRosa #EliezerJPRosa
"""

TAGS = [
    "IDD",
    "Intention-Driven Development",
    "TypeScript",
    "Funcoes Puras",
    "Invariantes",
    "Decorators",
    "Barbearia",
    "Salao de Beleza",
    "Testes de Software",
    "Concorrencia",
    "Software Engineering",
    "NoCode",
    "IA",
    "Eliezer Rosa",
    "EliezerJPRosa"
]

def main():
    print("=" * 70)
    print("🚀 UPLOAD DO EPISÓDIO 4C DA BARBEARIA NO YOUTUBE (CÓDIGO VIVO)")
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
                    "position": 10, # Posição 10 na playlist (logo após Ep 4B)
                    "resourceId": {
                        "kind": "youtube#video",
                        "videoId": video_id
                    }
                }
            }
        ).execute()
        print(f"[OK] Inserido na Playlist {PLAYLIST_ID} na posição 10!")
    except Exception as e:
        print(f"[!] Erro ao adicionar à playlist: {e}")

    manifest_path = BASE_DIR / "producao_yt" / "upload_manifest.json"
    if manifest_path.exists():
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)
    else:
        manifest = {}

    manifest["Barbearia_Episodio_4C"] = {
        "videoId": video_id,
        "url": video_url,
        "title": TITLE,
        "playlistId": PLAYLIST_ID,
        "position": 10,
        "filename": VIDEO_FILE.name
    }

    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    print("[OK] Manifesto de uploads atualizado com o Ep 4C da Barbearia!\n")

if __name__ == "__main__":
    main()
