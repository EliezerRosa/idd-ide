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
PROD_DIR = BASE_DIR / "producao_yt"
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_eliezer.json"
MANIFEST_FILE = PROD_DIR / "upload_manifest.json"

VIDEO_FILE = PROD_DIR / "IDD_Refrigeracao_Novo_Episodio_5.mp4"
THUMBNAIL_FILE = PROD_DIR / "capas" / "capa_novo_episodio_5.png"

PLAYLIST_ID = "PLNkRuKhFHiBs" # IDD na Prática - Leigos no canal @EliézerJPRosa

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

TITLE = "O Futuro do Software: Paradigma IDD, Múltiplos Agentes & A Morte da Sintaxe Manual"

DESCRIPTION = """\
🎙️ SÉRIE OFICIAL IDD NA PRÁTICA: GRAND FINALE INÉDITO
Episódio 5: O Futuro do Software — Paradigma IDD, Múltiplos Agentes & A Morte da Sintaxe Manual

A programação tradicional morreu? Ou foi a escravidão da sintaxe manual que finalmente chegou ao fim?

Neste episódio final inédito da série "IDD na Prática", o Orquestrador Eliézer Rosa, a Usuária Leiga e a IA Compilador fazem uma retrospectiva profunda de toda a jornada metodológica e revelam os horizontes revolucionários que o Paradigma Intent-Driven Development (IDD) inaugura na engenharia de software mundial.

Destaques deste Grand Finale Metodológico:
• Retrospectiva da Jornada: Da ideia de negócio ao aplicativo corporativo rodando em produção sem digitar uma linha de código
  - Ep. 1 & 1B: Requisitos, Intenções Semânticas & Invariantes Sagradas
  - Ep. 2 & 2B: O MER do Negócio — Modelo de Dados Semântico e Multitenancy
  - Ep. 3 & 3B: Modelagem UML — Atores, Casos de Uso e Máquina de Estados Inviolável
  - Ep. 4 & 4B: Governança por Invariantes, 240 Testes e Deploy em 4 Segundos
• A Grande Virada: O abismo entre a escravidão da sintaxe manual e a soberania da intenção humana
• O Papel do Agente de IA: Por que a IA atua com precisão matemática quando guiada por invariantes
• Os Horizontes do Amanhã com IDD:
  1. Enxame Multiagente: Especialistas de cibersegurança, domínio e UX colaborando e auditando sob governança
  2. Sistemas Auto-regenerativos (Self-Healing): Aplicações que monitoram desvios e sintetizam patches autônomos
  3. Democratização Radical: Médicos, engenheiros industriais e leigos construindo sistemas de missão crítica
• O Manifesto Final: O ser humano volta ao seu verdadeiro lugar — Arquiteto, Maestro e Governante da Tecnologia!

⏱️ Capítulos:
00:00 - Introdução do Grand Finale: O aplicativo corporativo construído sem código
00:20 - Retrospectiva da Jornada: Os 4 passos do Paradigma IDD na prática
00:45 - A Experiência da Leiga: Da caixa preta à conversa transparente de governança
01:05 - A Mudança de Paradigma: Por que a sintaxe manual virou o maior gargalo da tecnologia?
01:30 - A Visão da IA Compilador: Contratos rígidos eliminando alucinações
01:50 - As Três Novas Fronteiras: Enxame Multiagente, Self-Healing e Democratização
02:15 - Sistemas Auto-regenerativos: O monitoramento de invariantes em tempo real
02:35 - Tecnologia para Todos: Especialistas de domínio construindo o próprio futuro
03:00 - O Manifesto Final do Paradigma IDD: A soberania da intenção humana
03:25 - Agradecimentos da Equipe, Encerramento da Série & O Futuro da Engenharia!

📺 Assista a Playlist Oficial Completa "IDD na Prática — Leigos":
https://www.youtube.com/playlist?list=PLNkRuKhFHiBs

👤 Eliézer Rosa | Criador do Paradigma IDD (Intent-Driven Development)
#IDD #IntentionDrivenDevelopment #OFuturoDoSoftware #MultiAgentes #IAAutonoma #EngenhariaDeSoftware #NoCode #Governanca #DevOps #EliezerRosa #EliezerJPRosa #PMOC #Refrigeracao #Vercel #Supabase
"""

TAGS = [
    "IDD",
    "Intention-Driven Development",
    "O Futuro do Software",
    "MultiAgentes",
    "Agentes de IA",
    "Self-Healing",
    "Engenharia de Software",
    "NoCode",
    "IA",
    "Inteligencia Artificial",
    "Metodologia",
    "Eliezer Rosa",
    "EliezerJPRosa",
    "Governanca",
    "PMOC",
    "Refrigeracao"
]

def main():
    print("=" * 70)
    print("🚀 UPLOAD DO EPISÓDIO 5 (GRAND FINALE: O FUTURO DO SOFTWARE COM IDD)")
    print("=" * 70)

    if not VIDEO_FILE.exists():
        raise FileNotFoundError(f"Arquivo de vídeo não encontrado: {VIDEO_FILE}")
    if not TOKEN_FILE.exists():
        raise FileNotFoundError(f"Token não encontrado: {TOKEN_FILE}")

    size_mb = VIDEO_FILE.stat().st_size / (1024 * 1024)
    print(f"Vídeo: {VIDEO_FILE.name} ({size_mb:.1f} MB)")
    print(f"Playlist Alvo: {PLAYLIST_ID}")

    with open(TOKEN_FILE, "r", encoding="utf-8") as f:
        creds_data = json.load(f)
    creds = Credentials.from_authorized_user_info(creds_data, SCOPES)
    yt = build("youtube", "v3", credentials=creds)

    ch = yt.channels().list(part="snippet", mine=True).execute()
    channel_name = ch["items"][0]["snippet"]["title"] if ch.get("items") else "Canal"
    print(f"Canal Autenticado: {channel_name} (ID: {ch['items'][0]['id']})")

    # 1. Upload do Vídeo
    print(f"\n[1/3] Fazendo Upload do Episódio Final 5...")
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
    video_url = f"https://www.youtube.com/watch?v={new_video_id}"
    print(f"\n[OK] Upload Concluído! Vídeo ID: {new_video_id}")
    print(f"     URL: {video_url}")

    # 2. Thumbnail
    if THUMBNAIL_FILE.exists():
        print(f"\n[2/3] Definindo Capa Personalizada ({THUMBNAIL_FILE.name})...")
        try:
            yt.thumbnails().set(
                videoId=new_video_id,
                media_body=MediaFileUpload(str(THUMBNAIL_FILE))
            ).execute()
            print("[OK] Capa personalizada aplicada com sucesso!")
        except Exception as e:
            print(f"[!] Aviso ao aplicar capa: {e}")

    # 3. Inserir na Playlist na posição 10 (última posição da playlist oficial)
    print(f"\n[3/3] Inserindo na Playlist {PLAYLIST_ID} na posição 10...")
    try:
        pl_body = {
            "snippet": {
                "playlistId": PLAYLIST_ID,
                "position": 10,
                "resourceId": {
                    "kind": "youtube#video",
                    "videoId": new_video_id
                }
            }
        }
        pl_item = yt.playlistItems().insert(part="snippet", body=pl_body).execute()
        print(f"[OK] Inserido com sucesso na Playlist! (Item ID: {pl_item['id']})")
    except Exception as e:
        print(f"[!] Erro ao adicionar à playlist: {e}")

    # Atualizar upload_manifest.json
    if MANIFEST_FILE.exists():
        try:
            with open(MANIFEST_FILE, "r", encoding="utf-8") as f:
                manifest = json.load(f)
            if "channels" in manifest and "eliezer_rosa" in manifest["channels"]:
                manifest["channels"]["eliezer_rosa"]["videos"]["metodologia_ep5_futuro_software"] = new_video_id
                with open(MANIFEST_FILE, "w", encoding="utf-8") as f:
                    json.dump(manifest, f, indent=2, ensure_ascii=False)
                print("[OK] upload_manifest.json atualizado com o vídeo 5.")
        except Exception as e:
            print(f"[!] Aviso ao atualizar manifest: {e}")

    # Listar a playlist atualizada
    print("\n" + "=" * 70)
    print(f"★ PLAYLIST OFICIAL CONSOLIDADA COMPLETA: IDD na Prática - Leigos ★")
    print("=" * 70)
    p_items = yt.playlistItems().list(part="snippet", playlistId=PLAYLIST_ID, maxResults=50).execute().get("items", [])
    for idx, p in enumerate(p_items):
        sn = p["snippet"]
        vid = sn["resourceId"]["videoId"]
        print(f"  {idx}. {sn['title']} [https://www.youtube.com/watch?v={vid}]")

if __name__ == "__main__":
    main()
