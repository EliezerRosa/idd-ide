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

VIDEO_FILE = PROD_DIR / "IDD_Refrigeracao_Novo_Episodio_4B.mp4"
THUMBNAIL_FILE = PROD_DIR / "capas" / "capa_novo_episodio_4b.png"

PLAYLIST_ID = "PLNkRuKhFHiBs" # IDD na Prática - Leigos no canal @EliézerJPRosa

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

TITLE = "Metodologia IDD na Prática - Ep. 4B: Governança, Testes de Invariantes & Deploy com IA"

DESCRIPTION = """\
🎙️ SÉRIE OFICIAL IDD NA PRÁTICA: O GUIA METODOLÓGICO
Episódio 4B: Governança Técnica por Invariantes, Suíte de 240 Testes & Deploy com IA em 4 Segundos

Como confiar em um aplicativo corporativo completo gerado por Inteligência Artificial sem precisar inspecionar manualmente milhares de linhas de código em busca de erros?

Neste quarto episódio metodológico, o Orquestrador Eliézer Rosa, a Usuária Leiga e a IA Compilador revelam a resposta definitiva do Paradigma Intent-Driven Development (IDD): a Governança por Invariantes e Contratos Invioláveis ("Trust, but Verify").

Destaques deste Episódio Metodológico:
• O Fim do Code Review Linha-a-Linha: Por que ler milhares de linhas geradas pela IA causa fadiga e falsas sensações de segurança
• A Blindagem por Invariantes: Se o código relaxar qualquer regra do negócio ou da termodinâmica, a esteira aborta imediatamente
• A Suíte de 240 Testes Automatizados:
  - 60 Testes de Física Térmica: Superaquecimento, sub-resfriamento e rejeição de pressões absurdas
  - 60 Testes de Multitenancy RLS: Tentativas de injeção e isolamento criptográfico absoluto entre empresas
  - 60 Testes da Máquina de Estados: Nenhuma OS pode ser fechada sem medição válida e assinatura digital
  - 60 Testes de Performance & Latência: Leitura de QR Code em menos de 50 milissegundos e modo offline
• Terminal da IA em Ação: A IA executando os 240 testes em 1.42 segundos e solicitando autorização no padrão Confirm-Once
• Deploy Autônomo em Nuvem: Migrações aplicadas no Supabase e bordas sincronizadas na Vercel em apenas 3.8 segundos
• Síntese do Ciclo Completo IDD: Do desejo humano ao sistema em produção pronto para uso industrial

⏱️ Capítulos:
00:00 - Introdução Metodológica: Como confiar no código da IA sem ler linha por linha?
00:20 - O Quarto Passo do IDD: Governança por Invariantes ("Trust, but Verify")
00:44 - O Paradoxo da Revisão Manual: A suíte de contratos matemáticos
01:00 - A Suíte de 240 Testes Automatizados: Os 4 pilares de validação
01:18 - Física Térmica, Segurança Multitenant, Máquina de Estados e QR Code
01:45 - Terminal da IA em Ação: Execução dos 240 testes em 1.42 segundos
02:10 - O Padrão Confirm-Once: A governança humana aprovando a promoção para produção
02:26 - Deploy Autônomo na Nuvem: Vercel e Supabase ativos em 3.8 segundos
02:44 - A Visão da Usuária Leiga: Segurança militar e entrega instantânea
03:00 - Síntese do Ciclo Completo do Paradigma IDD
03:22 - Encerramento do Ep. 4B & Chamada para o Grande Vídeo Final Inédito!

📺 Assista a Playlist Oficial Completa "IDD na Prática — Leigos":
https://www.youtube.com/playlist?list=PLNkRuKhFHiBs

👤 Eliézer Rosa | Paradigma IDD
#IDD #IntentionDrivenDevelopment #Governanca #TestesAutomatizados #CI_CD #Deploy #DevOps #EngenhariaDeSoftware #NoCode #IAAutonoma #EliezerRosa #EliezerJPRosa #PMOC #Refrigeracao #Vercel #Supabase
"""

TAGS = [
    "IDD",
    "Intention-Driven Development",
    "Governanca",
    "Testes de Invariantes",
    "Testes Automatizados",
    "Deploy",
    "CI/CD",
    "Engenharia de Software",
    "NoCode",
    "IA",
    "Inteligencia Artificial",
    "Metodologia",
    "Eliezer Rosa",
    "EliezerJPRosa",
    "PMOC",
    "Refrigeracao",
    "Vercel",
    "Supabase"
]

def main():
    print("=" * 70)
    print("🚀 UPLOAD DO NOVO VÍDEO 4B (METODOLOGIA: GOVERNANÇA, TESTES & DEPLOY COM IA)")
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
    print(f"\n[1/3] Fazendo Upload do Novo Vídeo 4B...")
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

    # 3. Inserir na Playlist na posição 9 (logo após o Ep. 4 de caso prático que está na pos 8)
    print(f"\n[3/3] Inserindo na Playlist {PLAYLIST_ID} na posição 9...")
    try:
        pl_body = {
            "snippet": {
                "playlistId": PLAYLIST_ID,
                "position": 9,
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
                manifest["channels"]["eliezer_rosa"]["videos"]["metodologia_ep4b_governanca"] = new_video_id
                with open(MANIFEST_FILE, "w", encoding="utf-8") as f:
                    json.dump(manifest, f, indent=2, ensure_ascii=False)
                print("[OK] upload_manifest.json atualizado com o vídeo 4B.")
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
