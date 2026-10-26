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

VIDEO_FILE = PROD_DIR / "IDD_Refrigeracao_Novo_Episodio_4.mp4"
THUMBNAIL_FILE = PROD_DIR / "capas" / "capa_novo_episodio_4.png"

PLAYLIST_ID = "PLNkRuKhFHiBs" # IDD na Prática - Leigos no canal @EliézerJPRosa
OLD_VIDEO_IDS = ["2iFSnsmjT00"] # Vídeo antigo do Episódio 4 a ser substituído

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

TITLE = "Construindo App de Refrigeração com IA - Ep. 4: Validação & Entrega em Produção | IDD na Prática"

DESCRIPTION = """\
🎙️ SÉRIE OFICIAL IDD NA PRÁTICA: LEIGOS & ENGENHEIROS
Episódio 4 (Final): Validação pela Experiência, Laudo PMOC em PDF & Deploy em Produção

Chegamos ao grande final da nossa jornada! Construímos o modelo conceitual, as regras de negócio, o banco multitenant no Supabase e os componentes de campo. Mas como alguém leigo testa e valida esse sistema inteiro sem precisar inspecionar linhas de código?

Neste episódio conclusivo, o Orquestrador Eliézer Rosa, a Usuária Leiga e a IA Compilador demonstram o princípio de ouro do Paradigma IDD: Validar pela Experiência! O software é testado na prática operacional de campo, gerando o Laudo Técnico do PMOC em PDF com assinatura digital e fotos, passando por 240 testes automatizados e subindo para produção em 4 segundos.

Destaques deste Grande Final:
• O Princípio de Ouro: Validar pela Experiência dispensando a leitura de código sintático
• Ciclo de Feedback Imediato: Ajustes de intenção em linguagem humana refinados na hora
• Simulação Real de Campo: Leitura de QR Code, medições de manifold e geração de evidências
• Laudo Técnico PMOC em PDF em conformidade estrita com a Lei Federal 13.589/2018
• Blindagem Jurídica e Sanitária: Assinatura na tela do smartphone e hash criptográfico SHA-256
• Terminal da IA em Ação: Auditoria de 240 testes ponta a ponta com 100% de cobertura
• Deploy Corporativo em 4 Segundos: Sistema publicado na nuvem com alta disponibilidade
• Síntese da Série: O Ciclo de 5 Passos do Paradigma IDD que transforma qualquer profissional em construtor de software

⏱️ Capítulos:
00:00 - O Grande Desafio: Como validar um sistema sem ser leitor de código?
00:18 - Validar pela Experiência: O Princípio Fundamental do Paradigma IDD
00:40 - Teste Real de Campo: Ordem de serviço, QR Code e fluxo de intenção
00:50 - Ciclo de Feedback Imediato: Refinamento em tempo real com a IA
01:09 - Simulação no Smartphone: Apontando a câmera e coletando dados de pressão
01:20 - Blindagem Jurídica e Sanitária: A Lei do PMOC 13.589/2018
01:38 - Fiscalização sem Papel: Laudo oficial entregue em menos de dez segundos
01:45 - Hash SHA-256 e Assinatura Digital: Integridade técnica à prova de fraudes
01:58 - Terminal da IA: Auditoria de 240 testes automatizados e pedido de autorização
02:19 - Resposta da Orquestração: Deploy autorizado com observabilidade
02:27 - Publicação Concluída: Sistema no ar em apenas quatro segundos!
02:41 - A Vitória da Visão de Negócio: De uma ideia à produção sem código manual
02:53 - O Futuro do Software: A intenção humana é o verdadeiro código moderno
03:12 - O Poder da Autonomia: Qualquer especialista de negócio pode construir software
03:24 - Encerramento da Série & Próximos Casos Práticos no Paradigma IDD!

📺 Assista a Playlist Oficial Completa "IDD na Prática — Leigos":
https://www.youtube.com/playlist?list=PLNkRuKhFHiBs

👤 Eliézer Rosa | Paradigma IDD
#IDD #IntentionDrivenDevelopment #PMOC #Refrigeracao #Deploy #Producao #DevOps #EngenhariaDeSoftware #NoCode #IAAutonoma #TechParaLeigos #PostgreSQL #Supabase #Inovacao
"""

TAGS = [
    "IDD",
    "Intention-Driven Development",
    "PMOC",
    "Refrigeracao Industrial",
    "Deploy",
    "Producao",
    "DevOps",
    "Testes Automatizados",
    "Supabase",
    "PostgreSQL",
    "Laudo Tecnico",
    "Lei 13589",
    "Eliezer Rosa",
    "EliezerJPRosa",
    "NoCode",
    "IA",
    "Inteligencia Artificial"
]

def main():
    print("=" * 70)
    print("🚀 UPLOAD DO NOVO VÍDEO 4 (VALIDAÇÃO & PRODUÇÃO) — CANAL @EliézerJPRosa")
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
    print(f"\n[1/4] Fazendo Upload do Novo Vídeo 4 (Sincronizado)...")
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
        print(f"\n[2/4] Definindo Capa Personalizada ({THUMBNAIL_FILE.name})...")
        try:
            yt.thumbnails().set(
                videoId=new_video_id,
                media_body=MediaFileUpload(str(THUMBNAIL_FILE))
            ).execute()
            print("[OK] Capa personalizada aplicada com sucesso!")
        except Exception as e:
            print(f"[!] Aviso ao aplicar capa: {e}")

    # 3. Inserir na Playlist na posição 5 (logo após o Novo Vídeo 3)
    print(f"\n[3/4] Inserindo na Playlist {PLAYLIST_ID} na posição 5...")
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
        print(f"[OK] Inserido com sucesso na Playlist! (Item ID: {pl_item['id']})")
    except Exception as e:
        print(f"[!] Erro ao adicionar à playlist: {e}")

    # 4. Remover versão antiga da Playlist
    print(f"\n[4/4] Removendo versão antiga ({OLD_VIDEO_IDS}) da playlist...")
    try:
        cur_items = yt.playlistItems().list(part="snippet", playlistId=PLAYLIST_ID, maxResults=50).execute().get("items", [])
        for it in cur_items:
            v_id = it["snippet"]["resourceId"]["videoId"]
            if v_id in OLD_VIDEO_IDS:
                try:
                    yt.playlistItems().delete(id=it["id"]).execute()
                    print(f"[OK] Vídeo anterior {v_id} removido da playlist! (Item ID: {it['id']})")
                except Exception as ex:
                    print(f"[!] Aviso ao remover {v_id}: {ex}")
    except Exception as e:
        print(f"[!] Aviso ao auditar playlist: {e}")

    # 5. Atualizar upload_manifest.json
    if MANIFEST_FILE.exists():
        try:
            with open(MANIFEST_FILE, "r", encoding="utf-8") as f:
                manifest = json.load(f)
            if "channels" in manifest and "eliezer_rosa" in manifest["channels"]:
                manifest["channels"]["eliezer_rosa"]["videos"]["refrigeracao_ep4_remasterizado"] = new_video_id
                with open(MANIFEST_FILE, "w", encoding="utf-8") as f:
                    json.dump(manifest, f, indent=2, ensure_ascii=False)
                print("[OK] upload_manifest.json atualizado com o novo vídeo 4.")
        except Exception as e:
            print(f"[!] Aviso ao atualizar manifest: {e}")

    # 6. Listar a nova playlist
    print("\n" + "=" * 70)
    print(f"★ PLAYLIST OFICIAL COMPLETA: IDD na Prática - Leigos ★")
    print("=" * 70)
    p_items = yt.playlistItems().list(part="snippet", playlistId=PLAYLIST_ID, maxResults=50).execute().get("items", [])
    for idx, p in enumerate(p_items):
        sn = p["snippet"]
        vid = sn["resourceId"]["videoId"]
        print(f"  {idx}. {sn['title']} [https://www.youtube.com/watch?v={vid}]")

if __name__ == "__main__":
    main()
