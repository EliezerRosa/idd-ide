"""
Script de publicação e organização no YouTube:
1. Autentica via OAuth2 (usando client_secrets.json)
2. Cria ou localiza a playlist "IDD na Prática - Leigos"
3. Faz upload dos 5 vídeos completos (Melissa + 4 de Refrigeração)
4. Insere todos na playlist na ordem correta
5. Faz upload dos Shorts de alto impacto (formato 9:16 vertical)
6. Salva o progresso em 'upload_manifest.json' para idempotência
"""

import os
import sys
import json
import time
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from googleapiclient.errors import HttpError

BASE_DIR = Path(r"C:\Antigravity - IDD Refrigeração")
PROD_DIR = BASE_DIR / "producao_yt"
SECRETS_DIR = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos"
CLIENT_SECRETS = SECRETS_DIR / "client_secrets.json"
TOKEN_FILE = SECRETS_DIR / "token_youtube.json"
MANIFEST_FILE = PROD_DIR / "upload_manifest.json"

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

PLAYLIST_NAME = "IDD na Prática - Leigos"
PLAYLIST_DESC = """\
Playlist oficial do canal Eliézer J P Rosa: IDD na Prática — Leigos.
Aprenda como pessoas sem experiência prévia em programação utilizam o Paradigma IDD (Desenvolvimento Dirigido por Intenção) para conceber, direcionar e validar softwares completos e robustos com auxílio de Inteligência Artificial autônoma.

📺 CONTEÚDO DESTA PLAYLIST:
• Ep. Especial: Melissa (leiga em código) concebendo e lançando o NexusLog CRM em produção.
• Série Completa Refrigeração IDD (4 Episódios): Da modelagem de domínio à conformidade do PMOC e entrega final.

Criador do Paradigma IDD: Eliézer J P Rosa
#IDD #IntentDrivenDevelopment #IA #EngenhariaDeSoftware #TechParaLeigos
"""

VIDEOS_CONFIG = [
    {
        "key": "melissa_crm",
        "file": str(PROD_DIR / "Melissa_IDD_Como_uma_leiga_criou_um_CRM.mp4"),
        "title": "Como uma LEIGA Criou um CRM Completo com IA Sem Saber Programar | IDD na Prática",
        "description": """\
🎙️ Caso Real IDD na Prática: A jornada de Melissa criando o NexusLog CRM!

Melissa não sabia uma única linha de código (Python, React ou SQL). Mesmo assim, ela concebeu, guiou e colocou em produção um CRM corporativo completo de 8 telas para gestão de fretes, cotações, frotas e PDFs.

Nesta conversa entre Melissa e Eliézer J P Rosa (criador do Paradigma IDD), entenda como a intenção humana de negócios é o artefato de mais alta ordem e como a IA atua como parceiro de execução técnica.

⏱️ Capítulos:
00:00 - Introdução: O desafio de criar um CRM sem saber programar
00:45 - O primeiro passo: Descrevendo o problema em linguagem natural
01:35 - Segurança e incidentes: Como a IA protegeu dados sensíveis
02:30 - O que a IA gerou vs. o que a humana decidiu
04:15 - A comunicação no dia a dia: Sem jargões técnicos
05:30 - O Paradigma IDD (Desenvolvimento Dirigido por Intenção)
07:20 - O ciclo de 5 passos do IDD
08:45 - Tour completo pelas 8 telas do NexusLog CRM em produção

👤 Eliézer J P Rosa | Paradigma IDD
#IDD #IA #DesenvolvimentoSemCodigo #NexusLog #CRM #NoCode #EngenhariaDeSoftware #TechParaLeigos
""",
        "tags": ["IDD", "Desenvolvimento Dirigido por Intenção", "IA para leigos", "criar aplicativo com IA", "CRM sem programar", "NexusLog", "Eliezer Rosa", "Inteligência Artificial", "NoCode"],
        "category": "28" # Science & Technology
    },
    {
        "key": "refrigeracao_ep1",
        "file": str(PROD_DIR / "Refrigeracao_IDD_Video_1_Narrador.mp4"),
        "title": "Construindo App de Refrigeração do Zero com IA - Ep. 1: Domínio e Intenção | IDD na Prática",
        "description": """\
❄️ Construção do Sistema IDD Refrigeração (Parte 1 de 4).
Episódio completo com narração 100% neural em alta fidelidade (-14 LUFS).

Veja na prática como a intenção humana direciona a inteligência artificial para modelar um sistema de refrigeração industrial e conformidade PMOC sem se perder em armadilhas de código.

📌 Tópicos deste episódio:
• Por que softwares tradicionais de manutenção falham na refrigeração
• A intenção humana como o artefato de mais alta ordem
• Aumentar a capacidade humana em vez de automatizar cegamente
• Compliance termodinâmico e regras invioláveis do PMOC
• Modelagem visual e arquitetura dirigida por intenção

Playlist oficial: IDD na Prática — Leigos
#IDD #Refrigeracao #PMOC #EngenhariaDeSoftware #IA #Climatizacao #SistemasIndustriais
""",
        "tags": ["IDD", "Refrigeração Industrial", "PMOC", "Engenharia Térmica", "Manutenção Climatização", "IA na Manutenção", "Eliezer Rosa"],
        "category": "28"
    },
    {
        "key": "refrigeracao_ep2",
        "file": str(BASE_DIR / "apresentacao" / "Refrigeração - IDD Vídeo 2 (Versão Otimizada).mp4"),
        "title": "Construindo App de Refrigeração do Zero com IA - Ep. 2: Arquitetura e Regras | IDD na Prática",
        "description": """\
❄️ Construção do Sistema IDD Refrigeração (Parte 2 de 4).

Aprofundando nas regras de negócio e arquitetura do software de manutenção e auditoria de chillers e câmaras frias com IA autônoma guiada por intenção.

Playlist oficial: IDD na Prática — Leigos
#IDD #Refrigeração #PMOC #EngenhariaDeSoftware #IA
""",
        "tags": ["IDD", "Refrigeração", "PMOC", "Arquitetura de Software", "IA", "Eliezer Rosa"],
        "category": "28"
    },
    {
        "key": "refrigeracao_ep3",
        "file": str(BASE_DIR / "apresentacao" / "Refrigeração - IDD Vídeo 3 (Versão Otimizada).mp4"),
        "title": "Construindo App de Refrigeração do Zero com IA - Ep. 3: Implementação e Dados | IDD na Prática",
        "description": """\
❄️ Construção do Sistema IDD Refrigeração (Parte 3 de 4).

Conexão com bancos de dados, modelagem operacional e refinamento dos módulos técnicos de conformidade do PMOC.

Playlist oficial: IDD na Prática — Leigos
#IDD #Refrigeração #PMOC #BancoDeDados #IA
""",
        "tags": ["IDD", "Refrigeração", "PMOC", "Supabase", "IA", "Eliezer Rosa"],
        "category": "28"
    },
    {
        "key": "refrigeracao_ep4",
        "file": str(BASE_DIR / "apresentacao" / "Refrigeração - IDD Vídeo 4 (Versão Otimizada).mp4"),
        "title": "Construindo App de Refrigeração do Zero com IA - Ep. 4: Validação e Entrega | IDD na Prática",
        "description": """\
❄️ Construção do Sistema IDD Refrigeração (Parte 4 de 4 - Conclusão).

Validação pela experiência, testes práticos de ciclo fechado e entrega do sistema final de refrigeração.

Playlist oficial: IDD na Prática — Leigos
#IDD #Refrigeração #PMOC #EngenhariaDeSoftware #EntregaContínua
""",
        "tags": ["IDD", "Refrigeração", "PMOC", "Validação", "IA Autônoma", "Eliezer Rosa"],
        "category": "28"
    }
]

def load_manifest():
    if MANIFEST_FILE.exists():
        try:
            with open(MANIFEST_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {"playlist_id": None, "videos": {}, "shorts": {}}

def save_manifest(manifest):
    with open(MANIFEST_FILE, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

def get_authenticated_service():
    creds = None
    if TOKEN_FILE.exists():
        try:
            with open(TOKEN_FILE, "r", encoding="utf-8") as f:
                creds = Credentials.from_authorized_user_info(json.load(f), SCOPES)
        except Exception as e:
            print(f"[!] Token existente invalido: {e}")
            creds = None

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                print("Atualizando token OAuth expirado...")
                creds.refresh(Request())
            except Exception as e:
                print(f"[!] Erro ao atualizar token: {e}. Iniciando novo fluxo interativo...")
                creds = None
        if not creds:
            print("Abrindo navegador para autorização do YouTube...")
            flow = InstalledAppFlow.from_client_secrets_file(str(CLIENT_SECRETS), SCOPES)
            creds = flow.run_local_server(port=0)

        with open(TOKEN_FILE, "w", encoding="utf-8") as f:
            f.write(creds.to_json())
        print(f"[OK] Token salvo com sucesso em: {TOKEN_FILE}")

    return build("youtube", "v3", credentials=creds)

def ensure_playlist(yt, manifest):
    if manifest.get("playlist_id"):
        try:
            resp = yt.playlists().list(part="snippet", id=manifest["playlist_id"]).execute()
            if resp.get("items"):
                print(f"[OK] Playlist encontrada no manifesto: ID {manifest['playlist_id']}")
                return manifest["playlist_id"]
        except Exception:
            pass

    print(f"Buscando se a playlist '{PLAYLIST_NAME}' já existe no canal...")
    req = yt.playlists().list(part="snippet", mine=True, maxResults=50)
    while req:
        resp = req.execute()
        for item in resp.get("items", []):
            if item["snippet"]["title"].strip().lower() == PLAYLIST_NAME.lower():
                pl_id = item["id"]
                print(f"[OK] Playlist já existente: '{item['snippet']['title']}' (ID: {pl_id})")
                manifest["playlist_id"] = pl_id
                save_manifest(manifest)
                return pl_id
        req = yt.playlists().list_next(req, resp)

    print(f"Criando nova playlist pública: '{PLAYLIST_NAME}'...")
    body = {
        "snippet": {
            "title": PLAYLIST_NAME,
            "description": PLAYLIST_DESC,
            "defaultLanguage": "pt"
        },
        "status": {
            "privacyStatus": "public"
        }
    }
    resp = yt.playlists().insert(part="snippet,status", body=body).execute()
    pl_id = resp["id"]
    print(f"[OK] Playlist criada com sucesso: ID {pl_id}")
    manifest["playlist_id"] = pl_id
    save_manifest(manifest)
    return pl_id

def upload_single_video(yt, file_path, title, description, tags, category="28"):
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Arquivo de video não encontrado: {file_path}")

    size_mb = os.path.getsize(file_path) / (1024 * 1024)
    print(f"\n==================================================")
    print(f"Iniciando Upload: {os.path.basename(file_path)} ({size_mb:.1f} MB)")
    print(f"Título: {title}")
    print(f"Visibilidade: PÚBLICO")
    print(f"==================================================")

    body = {
        "snippet": {
            "title": title[:100],
            "description": description,
            "tags": tags,
            "categoryId": category,
            "defaultLanguage": "pt",
            "defaultAudioLanguage": "pt"
        },
        "status": {
            "privacyStatus": "public",
            "selfDeclaredMadeForKids": False
        }
    }

    media = MediaFileUpload(file_path, chunksize=8 * 1024 * 1024, resumable=True)
    request = yt.videos().insert(part="snippet,status", body=body, media_body=media)

    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            pct = int(status.progress() * 100)
            print(f"  Progresso: {pct}%", end="\r")

    video_id = response["id"]
    print(f"\n[OK] Upload Concluído: https://www.youtube.com/watch?v={video_id}")
    return video_id

def add_video_to_playlist(yt, playlist_id, video_id):
    try:
        body = {
            "snippet": {
                "playlistId": playlist_id,
                "resourceId": {
                    "kind": "youtube#video",
                    "videoId": video_id
                }
            }
        }
        res = yt.playlistItems().insert(part="snippet", body=body).execute()
        print(f"  [OK] Vídeo {video_id} adicionado à playlist '{playlist_id}' (Item ID: {res['id']})")
        return res["id"]
    except Exception as e:
        print(f"  [!] Aviso ao adicionar à playlist: {e}")
        return None

def upload_shorts(yt, manifest, playlist_id):
    shorts_dir = PROD_DIR / "shorts_idd"
    if not shorts_dir.exists():
        return

    short_files = sorted(list(shorts_dir.glob("*.mp4")))
    if not short_files:
        return

    print(f"\nEncontrados {len(short_files)} shorts para envio...")
    for s_file in short_files:
        s_id = s_file.stem
        if s_id in manifest.get("shorts", {}):
            print(f"Short {s_id} já enviado (ID: {manifest['shorts'][s_id]}). Pulando.")
            continue

        clean_title = s_id.replace("short_", "").replace("_", " ").title()
        title = f"{clean_title} #Shorts #IDD"[:100]
        desc = f"""\
Destaque do Paradigma IDD (Desenvolvimento Dirigido por Intenção).
Assista a série completa e a apresentação da Melissa na playlist "IDD na Prática - Leigos":
https://www.youtube.com/playlist?list={playlist_id}

#Shorts #IDD #EngenhariaDeSoftware #IA #Tech
"""
        tags = ["Shorts", "IDD", "Inteligência Artificial", "Engenharia de Software"]
        try:
            vid = upload_single_video(yt, str(s_file), title, desc, tags)
            manifest["shorts"][s_id] = vid
            save_manifest(manifest)
            time.sleep(2)
        except Exception as e:
            print(f"[!] Erro ao subir Short {s_id}: {e}")

def main():
    print("==================================================")
    print("PUBLICADOR AUTOMATIZADO YOUTUBE — IDD NA PRÁTICA")
    print("==================================================")

    manifest = load_manifest()
    yt = get_authenticated_service()

    # 1. Garante a Playlist
    pl_id = ensure_playlist(yt, manifest)

    # 2. Upload e inclusão dos 5 vídeos principais
    for idx, cfg in enumerate(VIDEOS_CONFIG, 1):
        key = cfg["key"]
        print(f"\n--- Processando Vídeo {idx}/{len(VIDEOS_CONFIG)}: {cfg['title']} ---")

        video_id = manifest.get("videos", {}).get(key)
        if not video_id:
            try:
                video_id = upload_single_video(
                    yt=yt,
                    file_path=cfg["file"],
                    title=cfg["title"],
                    description=cfg["description"],
                    tags=cfg["tags"],
                    category=cfg.get("category", "28")
                )
                manifest["videos"][key] = video_id
                save_manifest(manifest)
            except Exception as e:
                print(f"[!] Erro ao fazer upload de {key}: {e}")
                continue
        else:
            print(f"[OK] Vídeo já enviado previamente: {video_id}")

        # Adiciona na playlist se ainda não registrado
        pl_item_key = f"{key}_pl_item"
        if not manifest.get("videos", {}).get(pl_item_key):
            pl_item_id = add_video_to_playlist(yt, pl_id, video_id)
            if pl_item_id:
                manifest["videos"][pl_item_key] = pl_item_id
                save_manifest(manifest)
        else:
            print(f"  [OK] Vídeo já vinculado à playlist.")

    # 3. Upload dos Shorts
    upload_shorts(yt, manifest, pl_id)

    print("\n==================================================")
    print("RELATÓRIO FINAL DE PUBLICAÇÃO")
    print("==================================================")
    print(f"Playlist Pública: https://www.youtube.com/playlist?list={pl_id}")
    for k, v in manifest.get("videos", {}).items():
        if not k.endswith("_pl_item"):
            print(f"  - Vídeo [{k}]: https://www.youtube.com/watch?v={v}")
    for k, v in manifest.get("shorts", {}).items():
        print(f"  - Short [{k}]: https://www.youtube.com/watch?v={v}")
    print("==================================================")

if __name__ == "__main__":
    main()
