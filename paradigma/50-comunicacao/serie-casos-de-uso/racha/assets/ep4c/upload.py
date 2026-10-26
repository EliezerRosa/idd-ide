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
ASSETS_DIR = BASE_DIR / "producao_yt" / "racha_assets" / "ep4c"
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_eliezer.json"

VIDEO_FILE = ASSETS_DIR / "IDD_Racha_Episodio_4C.mp4"
THUMBNAIL_FILE = ASSETS_DIR / "capa.png"
PLAYLIST_ID = "PLdaNms3TnbXA" # Playlist Racha de Conta & Pix

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

TITLE = "Implementação Completa: Funções Puras & Métodos Amarrados às Invariantes | Ep. 4C Racha IDD"

DESCRIPTION = """\
💸 SÉRIE OFICIAL IDD NA PRÁTICA: O APP DE RACHA DE CONTA & PIX ("QUEM PAGA O QUÊ?")
Episódio 4C: Implementação Completa — Funções Puras, Decorador @invariant e 200 Testes de Estresse

Como o Paradigma IDD traduz especificações visuais de MER e UML em código vivo, puramente determinístico e matematicamente imune a bugs em tempo de execução?

Neste episódio de fechamento técnico da trilha Racha de Pix, Eliézer Rosa e a equipe dissecam o motor de código compilado da aplicação:

Destaques da Implementação Canônica IDD:
• Funções Puras & Imutabilidade Absoluta:
  - Eliminação de variáveis mutáveis globais e floats imprecisos.
  - Uso de Centavos inteiros (BigInt) e estruturas de dados imutáveis (ReadonlyMap).
• O Decorador @invariant em Runtime:
  - Interceptação de pré e pós-condições em cada método de fechamento de mesa.
  - Asserção matemática universal: somatório rigoroso das cotas individuais igual ao total da comanda até o último centavo.
  - Aborto imediato com InvariantViolationException em caso de desvio.
• Bateria de 200 Testes de Estresse (Property-Based Testing / Fuzzing):
  - Dízimas periódicas extremas (divisão de contas ímpares por múltiplos participantes).
  - Algoritmo determinístico de alocação de centavos residuais.
  - 200 testes executados: 200 aprovados com 100% de sucesso e zero centavos perdidos!

⏱️ Capítulos do Episódio:
00:00 - Introdução: Da Especificação Visual ao Código Vivo
00:15 - Comparativo: Abordagem Convencional vs Funções Puras IDD
00:36 - O Decorador @invariant em Tempo de Execução
00:54 - Blindagem Fail-Fast: Pré e Pós-Condições Matemáticas
01:12 - Terminal da IA: Execução da Suíte de 200 Testes de Estresse
01:28 - Homologação do Código pelo Orquestrador Eliézer Rosa
01:45 - Os Quatro Pilares do IDD (Intenções, MER, UML e Código)
02:00 - Próximos Passos: As Trilhas de Barbearia e Cafeteria!

📺 Playlist Oficial Completa "IDD na Prática — Racha de Conta & Pix":
https://www.youtube.com/playlist?list=PLdaNms3TnbXA

💈 Assista Também à Playlist "IDD na Prática — Barbearia & Salão":
https://www.youtube.com/playlist?list=PLHCqwtNiGbt8

☕ Assista Também à Playlist "IDD na Prática — Cafeteria & Padaria":
https://www.youtube.com/playlist?list=PLLfynRT3_DJs

👤 Eliézer Rosa | Criador do Paradigma IDD (Intent-Driven Development)
#IDD #IntentionDrivenDevelopment #TypeScript #FuncoesPuras #Invariantes #Decorators #TestesAutomatizados #Fuzzing #Fintech #Pix #SoftwareEngineering #NoCode #IA #EliezerRosa #EliezerJPRosa
"""

TAGS = [
    "IDD",
    "Intention-Driven Development",
    "TypeScript",
    "Funcoes Puras",
    "Invariantes",
    "Decorators",
    "Metaprogramacao",
    "Testes de Software",
    "Fuzzing",
    "Engenharia de Software",
    "Racha de Conta",
    "Pix",
    "Fintech",
    "Software Engineering",
    "NoCode",
    "IA",
    "Eliezer Rosa",
    "EliezerJPRosa"
]

def main():
    print("=" * 70)
    print("🚀 UPLOAD DO EPISÓDIO 4C DO RACHA DE PIX NO YOUTUBE (CÓDIGO VIVO)")
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

    manifest["Racha_Episodio_4C"] = {
        "videoId": video_id,
        "url": video_url,
        "title": TITLE,
        "playlistId": PLAYLIST_ID,
        "position": 10,
        "filename": VIDEO_FILE.name
    }

    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    print("[OK] Manifesto de uploads atualizado com o Ep 4C do Racha!\n")

if __name__ == "__main__":
    main()
