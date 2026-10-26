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

VIDEO_FILE = PROD_DIR / "IDD_Refrigeracao_Novo_Episodio_3B.mp4"
THUMBNAIL_FILE = PROD_DIR / "capas" / "capa_novo_episodio_3b.png"

PLAYLIST_ID = "PLNkRuKhFHiBs" # IDD na Prática - Leigos no canal @EliézerJPRosa

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

TITLE = "Metodologia IDD na Prática - Ep. 3B: Modelagem UML com IA — Diagramas Sem Código com Governança"

DESCRIPTION = """\
🎙️ SÉRIE OFICIAL IDD NA PRÁTICA: O GUIA METODOLÓGICO
Episódio 3B: Modelagem Orientada a Objetos com UML Preliminar & Máquinas de Estado com IA

Como mapear o comportamento de um sistema corporativo completo, atores humanos, sensores IoT e máquinas de estado de transição estrita sem digitar uma única linha de código em Java, TypeScript ou Python?

Neste terceiro episódio metodológico, o Orquestrador Eliézer Rosa, a Usuária Leiga e a IA Compilador demonstram como o Paradigma Intent-Driven Development (IDD) utiliza diagramas UML como uma linguagem visual universal de alinhamento semântico e governança estrita.

Destaques deste Episódio Metodológico:
• O UML como Linguagem Universal Visual: Alinhando intenções humanas e comportamento do sistema
• Mapeamento de Atores e Contexto: Fronteiras nítidas entre Técnico de Campo, Gestor, Sensor e IA
• Casos de Uso e Classes de Domínio: Encapsulamento de regras físicas térmicas sem dependências externas
• Máquina de Estados da Ordem de Serviço: Aberta → Em Atendimento → Aguardando Peça → Concluída
• Terminal da IA em Ação: A IA detectando dúvidas de transição de estado e submetendo à governança
• Decisão de Orquestração: Bloqueio compulsorio em Alerta de Manutenção para proteger a máquina
• Imutabilidade Absoluta: Como o modelo garante que nenhuma OS é fechada sem medição válida e assinatura digital
• Síntese dos 4 Pilares da Modelagem no Paradigma IDD: Da especificação sem código à certeza operacional

⏱️ Capítulos:
00:00 - Introdução Metodológica: O comportamento do sistema sem programar
00:16 - Terceiro Pilar do IDD: O UML como Linguagem Universal Visual
00:39 - Mapeamento de Atores: Fronteiras entre Mecânico, Gestor, IA e Fiscais
01:01 - Casos de Uso e Classes de Domínio: Verbos e Física Térmica
01:30 - Como Evitar Falhas na OS? O Diagrama de Máquina de Estados
01:50 - Terminal da IA em Ação: Interrupção por falta de peças e status do equipamento
02:16 - Governança do Orquestrador: Transição segura para Alerta de Manutenção
02:34 - Refinamento da IA: Imutabilidade da OS após fechamento
02:49 - A Visão da Usuária Leiga: A máquina de estados como trilho inviolável
03:00 - Síntese dos 4 Pilares da Modelagem no Paradigma IDD
03:25 - Encerramento do Ep. 3B & Chamada para o Ep. 4B: Governança, Testes e Deploy!

📺 Assista a Playlist Oficial Completa "IDD na Prática — Leigos":
https://www.youtube.com/playlist?list=PLNkRuKhFHiBs

👤 Eliézer Rosa | Paradigma IDD
#IDD #IntentionDrivenDevelopment #UML #DiagramaDeClasses #MaquinaDeEstados #CasosDeUso #EngenhariaDeSoftware #NoCode #IAAutonoma #DevOps #EliezerRosa #EliezerJPRosa #PMOC #Refrigeracao
"""

TAGS = [
    "IDD",
    "Intention-Driven Development",
    "UML",
    "Modelagem UML",
    "Casos de Uso",
    "Maquina de Estados",
    "Diagrama de Classes",
    "Engenharia de Software",
    "NoCode",
    "IA",
    "Inteligencia Artificial",
    "Metodologia",
    "Eliezer Rosa",
    "EliezerJPRosa",
    "PMOC",
    "Refrigeracao"
]

def main():
    print("=" * 70)
    print("🚀 UPLOAD DO NOVO VÍDEO 3B (METODOLOGIA: MODELAGEM UML COM IA SEM CÓDIGO)")
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
    print(f"\n[1/3] Fazendo Upload do Novo Vídeo 3B...")
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

    # 3. Inserir na Playlist na posição 7 (após o Ep. 3 de caso prático que está na pos 6)
    print(f"\n[3/3] Inserindo na Playlist {PLAYLIST_ID} na posição 7...")
    try:
        pl_body = {
            "snippet": {
                "playlistId": PLAYLIST_ID,
                "position": 7,
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
                manifest["channels"]["eliezer_rosa"]["videos"]["metodologia_ep3b_uml"] = new_video_id
                with open(MANIFEST_FILE, "w", encoding="utf-8") as f:
                    json.dump(manifest, f, indent=2, ensure_ascii=False)
                print("[OK] upload_manifest.json atualizado com o vídeo 3B.")
        except Exception as e:
            print(f"[!] Aviso ao atualizar manifest: {e}")

    # Listar a playlist atualizada
    print("\n" + "=" * 70)
    print(f"★ PLAYLIST OFICIAL ATUALIZADA: IDD na Prática - Leigos ★")
    print("=" * 70)
    p_items = yt.playlistItems().list(part="snippet", playlistId=PLAYLIST_ID, maxResults=50).execute().get("items", [])
    for idx, p in enumerate(p_items):
        sn = p["snippet"]
        vid = sn["resourceId"]["videoId"]
        print(f"  {idx}. {sn['title']} [https://www.youtube.com/watch?v={vid}]")

if __name__ == "__main__":
    main()
