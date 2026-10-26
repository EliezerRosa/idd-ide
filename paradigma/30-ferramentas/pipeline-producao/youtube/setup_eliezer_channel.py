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
SECRETS_DIR = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos"
TOKEN_ELIEZER = SECRETS_DIR / "token_eliezer.json"
CAPAS_DIR = BASE_DIR / "producao_yt" / "capas"

with open(TOKEN_ELIEZER, "r", encoding="utf-8") as f:
    creds = Credentials.from_authorized_user_info(json.load(f))
yt = build("youtube", "v3", credentials=creds)

print("==================================================")
print("1. VERIFICANDO VÍDEO DA MELISSA NO CANAL ELIÉZER ROSA")
print("==================================================")
MELISSA_ID = "oPcNC5FXnHY"

# Atualiza título e descrição rica da Melissa
melissa_title = "Como uma LEIGA Criou um CRM Completo com IA Sem Saber Programar | IDD na Prática"
melissa_desc = """\
🎙️ Caso Real IDD na Prática: A jornada inspiradora de Melissa criando o NexusLog CRM!
Playlist Oficial: https://www.youtube.com/playlist?list=PLMWN1EWhq5tM

Melissa nunca havia escrito uma única linha de código (sem Python, React, SQL ou Docker). Mesmo assim, utilizando o Paradigma IDD (Desenvolvimento Dirigido por Intenção), ela concebeu, guiou e colocou em produção um CRM corporativo completo de 8 telas para gestão logística de fretes, cotações, frotas, motoristas e relatórios em PDF.

Neste vídeo completo de apresentação e diálogo com Eliézer J P Rosa (criador do Paradigma IDD), descubra como a intenção humana de negócios é o artefato de mais alta ordem e como a IA atua como um executor técnico de alta velocidade.

⏱️ Capítulos / Minutagem:
00:00 - Introdução: O Desafio de Criar um CRM sem Saber Programar
00:45 - O Primeiro Passo: Descrevendo o Problema em Linguagem Natural
01:35 - Segurança e Incidentes: Como a IA Protegeu Dados Sensíveis
02:30 - O Que a IA Gerou vs. O Que a Humana Decidiu
04:15 - A Comunicação Diária: Eliminando Jargões Técnicos
05:30 - O Paradigma IDD (Desenvolvimento Dirigido por Intenção)
07:20 - O Ciclo de 5 Passos do IDD
08:45 - Tour Completo pelas 8 Telas do NexusLog CRM em Produção

📌 Principais Lições deste Caso:
• A intenção humana orienta o propósito; o código é efêmero e gerado sob demanda.
• Não é "NoCode" limitado a templates: é software real de ponta a ponta com banco de dados e APIs.
• O profissional do futuro não precisa ser refém da sintaxe para construir soluções de alto impacto.

Participantes:
• Melissa (Gestora & Criadora do NexusLog CRM)
• Eliézer J P Rosa (Criador do Paradigma IDD)

#IDD #IA #DesenvolvimentoSemCodigo #NexusLog #CRM #NoCode #EngenhariaDeSoftware #TechParaLeigos #InteligenciaArtificial
"""
melissa_tags = ["IDD", "Desenvolvimento Dirigido por Intenção", "IA para leigos", "criar aplicativo com IA", "CRM sem programar", "NexusLog", "Eliezer Rosa", "Inteligência Artificial", "NoCode", "Engenharia de Software"]

try:
    print(f"Atualizando metadados de {MELISSA_ID}...")
    body = {
        "id": MELISSA_ID,
        "snippet": {
            "title": melissa_title,
            "description": melissa_desc,
            "tags": melissa_tags,
            "categoryId": "28"
        }
    }
    yt.videos().update(part="snippet", body=body).execute()
    print("[OK] Título e descrição do vídeo da Melissa atualizados com sucesso!")
except Exception as e:
    print(f"[!] Erro ao atualizar metadados da Melissa: {e}")

# Atualiza thumbnail do vídeo da Melissa
capa_melissa = CAPAS_DIR / "capa_melissa_crm.png"
if capa_melissa.exists():
    try:
        print(f"Enviando capa para o vídeo da Melissa ({capa_melissa.name})...")
        yt.thumbnails().set(
            videoId=MELISSA_ID,
            media_body=MediaFileUpload(str(capa_melissa), mimetype="image/png")
        ).execute()
        print("[OK] Capa do vídeo da Melissa enviada com sucesso!")
    except Exception as e:
        print(f"[!] Erro ao enviar capa da Melissa: {e}")

print("\n==================================================")
print("2. CONFIGURANDO PLAYLIST NO CANAL ELIÉZER ROSA")
print("==================================================")
PLAYLIST_TITLE = "IDD na Prática - Leigos"
PLAYLIST_DESC = """\
Playlist oficial do canal Eliézer J P Rosa: IDD na Prática — Leigos.
Aprenda como pessoas sem experiência prévia em programação utilizam o Paradigma IDD (Desenvolvimento Dirigido por Intenção) para conceber, direcionar e validar softwares corporativos completos com auxílio de Inteligência Artificial autônoma.

📺 ORDEM RECOMENDADA DOS VÍDEOS:
1. Caso Real Especial: Melissa (leiga em código) concebendo e colocando o NexusLog CRM em produção (8 telas, frotas, cotações e PDFs).
2. Série Refrigeração IDD - Ep. 1: Domínio e Intenção (Por que softwares tradicionais falham, intenção como artefato de alta ordem e regras do PMOC).
3. Série Refrigeração IDD - Ep. 2: Arquitetura e Regras (Regime de pré-intenção, bounded contexts para chillers e confirm-once pattern).
4. Série Refrigeração IDD - Ep. 3: Implementação e Dados (Supabase, PostgreSQL, multitenant, RLS e QR Codes para ativos em campo).
5. Série Refrigeração IDD - Ep. 4: Validação e Entrega (Validação pela experiência, emissão de laudos PMOC em PDF e sistema em produção).

👤 Criador do Paradigma IDD: Eliézer J P Rosa
#IDD #IntentDrivenDevelopment #IA #EngenhariaDeSoftware #TechParaLeigos #NoCode #Refrigeracao #PMOC
"""

# Verifica se a playlist já existe no canal
pl_id = None
req = yt.playlists().list(part="snippet,status", mine=True, maxResults=50)
while req:
    resp = req.execute()
    for it in resp.get("items", []):
        if it["snippet"]["title"].strip().lower() == PLAYLIST_TITLE.strip().lower():
            pl_id = it["id"]
            print(f"Playlist já existe no canal Eliézer Rosa: {pl_id}")
            break
    if pl_id:
        break
    req = yt.playlists().list_next(req, resp)

if not pl_id:
    print("Criando playlist no canal Eliézer Rosa...")
    body = {
        "snippet": {
            "title": PLAYLIST_TITLE,
            "description": PLAYLIST_DESC
        },
        "status": {
            "privacyStatus": "public"
        }
    }
    resp = yt.playlists().insert(part="snippet,status", body=body).execute()
    pl_id = resp["id"]
    print(f"[OK] Playlist criada com sucesso! ID: {pl_id}")

# Vídeos da playlist na ordem solicitada
VIDEOS_ORDER = [
    ("Melissa CRM", "oPcNC5FXnHY"),
    ("Refrigeração Ep 1", "LSeoDp7cOno"),
    ("Refrigeração Ep 2", "7SUj0N_hNqI"),
    ("Refrigeração Ep 3", "rUaJn-r-p8I"),
    ("Refrigeração Ep 4", "2iFSnsmjT00"),
]

# Obter itens atuais para não duplicar
cur_items = yt.playlistItems().list(part="snippet", playlistId=pl_id, maxResults=50).execute().get("items", [])
cur_vids = [it["snippet"]["resourceId"]["videoId"] for it in cur_items]

for name, vid in VIDEOS_ORDER:
    if vid in cur_vids:
        print(f"  [PULANDO] {name} ({vid}) já está na playlist.")
        continue
    try:
        body = {
            "snippet": {
                "playlistId": pl_id,
                "resourceId": {
                    "kind": "youtube#video",
                    "videoId": vid
                }
            }
        }
        resp = yt.playlistItems().insert(part="snippet", body=body).execute()
        print(f"  [OK] Inserido {name} ({vid}) na playlist! Item ID: {resp['id']}")
    except Exception as e:
        print(f"  [!] Erro ao inserir {name} ({vid}): {e}")

# Exibir playlist final no canal Eliézer Rosa
final_items = yt.playlistItems().list(part="snippet", playlistId=pl_id, maxResults=50).execute().get("items", [])
print(f"\n==========================================")
print(f"PLAYLIST FINAL NO CANAL ELIÉZER ROSA ({len(final_items)} itens)")
print(f"URL: https://www.youtube.com/playlist?list={pl_id}")
print(f"==========================================")
for idx, p in enumerate(final_items, 1):
    sn = p["snippet"]
    print(f"{idx}. {sn['title']} [https://www.youtube.com/watch?v={sn['resourceId']['videoId']}]")
