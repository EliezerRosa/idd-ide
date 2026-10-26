import json
import sys
from pathlib import Path
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from googleapiclient.errors import HttpError

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

BASE_DIR = Path(r"C:\Antigravity - IDD Refrigeração")
PROD_DIR = BASE_DIR / "producao_yt"
CAPAS_DIR = PROD_DIR / "capas"
TOKEN_FILE = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos" / "token_youtube.json"

with open(TOKEN_FILE, "r", encoding="utf-8") as f:
    creds = Credentials.from_authorized_user_info(json.load(f))
yt = build("youtube", "v3", credentials=creds)

METADATA = [
    {
        "id": "LSeoDp7cOno",
        "title": "Construindo App de Refrigeração do Zero com IA - Ep. 1: Domínio e Intenção | IDD na Prática",
        "capa": CAPAS_DIR / "capa_episodio_1.png",
        "tags": ["IDD", "Refrigeração Industrial", "PMOC", "Engenharia Térmica", "Manutenção Climatização", "IA na Manutenção", "Eliezer Rosa", "Paradigma IDD", "Inteligência Artificial"],
        "description": """\
❄️ Construção do Sistema IDD Refrigeração — Episódio 1 de 4: Domínio e Intenção.
Playlist Oficial: https://www.youtube.com/playlist?list=PLMWN1EWhq5tM

Neste primeiro episódio prático, veja como a intenção humana direciona a inteligência artificial autônoma para modelar um sistema corporativo de refrigeração industrial e conformidade do PMOC (Lei Federal 13.589/2018) sem se perder em armadilhas de código efêmero.

⏱️ Capítulos / Minutagem:
00:00 - Introdução: O Desafio da Manutenção em Refrigeração Industrial
01:02 - O Paradigma IDD: A Intenção Humana como Artefato de Mais Alta Ordem
02:42 - Aumentar a Capacidade Humana vs. Automatizar Cegamente
05:30 - As Regras Invioláveis do PMOC e Termodinâmica
12:15 - Modelagem de Domínio: Chillers, Câmaras Frigoríficas e Pressões
25:40 - A IA Autônoma em Ação: Gerando a Estrutura Guiada por Intenção
45:10 - Do Caos do Código à Arquitetura Dirigida por Intenção
01:05:00 - Conclusão do Episódio 1 e Próximos Passos

📌 Destaques do Paradigma IDD:
• O código virou detalhe efêmero de implementação; a intenção do negócio é perene.
• Engenharia de Prompt foca na sintaxe; o IDD foca na regra de negócio e domínio físico.
• Conformidade legal e segurança termodinâmica não aceitam palpites alucinados da IA.

📺 Assista a Playlist Completa "IDD na Prática — Leigos":
https://www.youtube.com/playlist?list=PLMWN1EWhq5tM

Criador do Paradigma IDD: Eliézer J P Rosa
#IDD #Refrigeracao #PMOC #EngenhariaDeSoftware #InteligenciaArtificial #Climatizacao #TechParaLeigos #NoCode
"""
    },
    {
        "id": "7SUj0N_hNqI",
        "title": "Construindo App de Refrigeração do Zero com IA - Ep. 2: Arquitetura e Regras | IDD na Prática",
        "capa": CAPAS_DIR / "capa_episodio_2.png",
        "tags": ["IDD", "Refrigeração", "PMOC", "Arquitetura de Software", "Engenharia Térmica", "IA Autônoma", "Eliezer Rosa", "Chillers", "Confirm-Once"],
        "description": """\
❄️ Construção do Sistema IDD Refrigeração — Episódio 2 de 4: Arquitetura e Regras.
Playlist Oficial: https://www.youtube.com/playlist?list=PLMWN1EWhq5tM

Neste segundo episódio, aprofundamos na arquitetura de regras e isolamento de contextos delimitados (Bounded Contexts) para manutenção preventiva, preditiva e corretiva de chillers, compressores e câmaras frias.

⏱️ Capítulos / Minutagem:
00:00 - Recapitulação e Objetivos do Episódio 2
00:40 - O Regime de Pré-Intenção: Como Alimentar a Memória da IA
03:15 - Modelagem do Domínio Físico: Superaquecimento, Sub-resfriamento e Pressões
10:50 - Arquitetura de Software: Bounded Contexts e Regras do PMOC
22:30 - O Confirm-Once Pattern: Autonomia Máxima da IA com Controle Humano Crítico
38:40 - Estruturação de Entidades e Contratos de Dados
52:10 - Síntese Arquitetural e Preparação para o Banco de Dados

📌 Destaques do Paradigma IDD:
• Regime de Pré-Intenção: Documentar o estado e objetivos claros antes de delegar para a IA.
• A IA opera de forma autônoma nas tarefas de implementação enquanto o humano atua como arquiteto e auditor.
• Física e Lei: Pressões de trabalho e planos de manutenção padronizados.

📺 Assista a Playlist Completa:
https://www.youtube.com/playlist?list=PLMWN1EWhq5tM

Criador do Paradigma IDD: Eliézer J P Rosa
#IDD #Refrigeracao #PMOC #ArquiteturaDeSoftware #EngenhariaTermica #IAAutonoma #TechParaLeigos
"""
    },
    {
        "id": "rUaJn-r-p8I",
        "title": "Construindo App de Refrigeração do Zero com IA - Ep. 3: Implementação e Dados | IDD na Prática",
        "capa": CAPAS_DIR / "capa_episodio_3.png",
        "tags": ["IDD", "Refrigeração", "PMOC", "Supabase", "PostgreSQL", "Banco de Dados", "IA", "Eliezer Rosa", "Row Level Security"],
        "description": """\
❄️ Construção do Sistema IDD Refrigeração — Episódio 3 de 4: Implementação e Banco de Dados.
Playlist Oficial: https://www.youtube.com/playlist?list=PLMWN1EWhq5tM

Neste terceiro episódio, passamos da concepção arquitetural para a implementação física do banco de dados relacional (PostgreSQL via Supabase), modelo entidade-relacionamento (MER) e isolamento multitenant.

⏱️ Capítulos / Minutagem:
00:00 - Introdução: Do Diagrama ao Banco de Dados Real
00:54 - Aplicação Prática dos Princípios do IDD do Zero no Terminal
04:20 - Modelagem Entidade-Relacionamento (MER): Clientes, Contratos e Ativos
12:30 - Supabase & PostgreSQL: Configuração de Tabelas e Chaves Estrangeiras
24:15 - Segurança Multitenant: Row Level Security (RLS) para Isolamento Estrito
38:00 - Geração de QR Codes Únicos para Identificação de Chillers em Campo
50:40 - Integração entre Frontend e API com Validação de Tipos

📌 Destaques do Paradigma IDD:
• Dados auditáveis: Rastreabilidade total de ordens de serviço por QR Code.
• Segurança por padrão: Cada cliente e técnico acessa estritamente o seu escopo via RLS.
• Execução acelerada com IA sob supervisão determinística.

📺 Assista a Playlist Completa:
https://www.youtube.com/playlist?list=PLMWN1EWhq5tM

Criador do Paradigma IDD: Eliézer J P Rosa
#IDD #Refrigeracao #PMOC #Supabase #PostgreSQL #BancoDeDados #IA #TechParaLeigos
"""
    },
    {
        "id": "2iFSnsmjT00",
        "title": "Construindo App de Refrigeração do Zero com IA - Ep. 4: Validação e Entrega | IDD na Prática",
        "capa": CAPAS_DIR / "capa_episodio_4.png",
        "tags": ["IDD", "Refrigeração", "PMOC", "Validação", "IA Autônoma", "Eliezer Rosa", "Entrega Contínua", "Sistemas Industriais"],
        "description": """\
❄️ Construção do Sistema IDD Refrigeração — Episódio 4 de 4 (Conclusão): Validação e Entrega.
Playlist Oficial: https://www.youtube.com/playlist?list=PLMWN1EWhq5tM

No episódio final da série, fechamos o ciclo do Paradigma IDD com o princípio "Validar pela Experiência". Você não precisa inspecionar linha por linha de código: você usa o sistema em produção, sente os atritos reais e refina a intenção em ciclo contínuo.

⏱️ Capítulos / Minutagem:
00:00 - Introdução ao Episódio Final: Fechando o Ciclo do IDD
00:12 - O Princípio da Validação pela Experiência: Usar em vez de apenas Ler Código
05:30 - Teste Ponta a Ponta: Abertura e Conclusão de Ordem de Serviço
14:20 - Emissão Automática de Relatórios em PDF e Laudo Técnico do PMOC
25:00 - Painel Operacional em Tempo Real e Gestão de Alertas Críticos
39:40 - Deploy Corporativo em Nuvem e Entrega do Software em Produção
51:00 - Síntese Geral da Série: O Futuro da Engenharia de Software com IDD

📌 O Ciclo Completo do IDD (Intention-Driven Development):
1. Captura da Intenção Pura em Linguagem Humana
2. Regime de Pré-Intenção e Restrições Invioláveis
3. Geração Técnica Autônoma por Agentes de IA
4. Validação pela Experiência Prática
5. Refinamento Contínuo com Rastreabilidade Total

📺 Assista a Série Completa na Playlist Oficial:
https://www.youtube.com/playlist?list=PLMWN1EWhq5tM

Criador do Paradigma IDD: Eliézer J P Rosa
#IDD #Refrigeracao #PMOC #EngenhariaDeSoftware #EntregaContinua #IAAutonoma #TechParaLeigos
"""
    }
]

print("=== ATUALIZANDO METADADOS NO YOUTUBE (TÍTULOS, DESCRIÇÕES, TAGS, CAPAS) ===")
for v in METADATA:
    vid = v["id"]
    print(f"\n--- Atualizando Vídeo: {vid} ---")
    try:
        # Obter vídeo atual para manter categoryId
        cur = yt.videos().list(part="snippet", id=vid).execute().get("items", [])[0]
        cat_id = cur["snippet"].get("categoryId", "28")
        
        body = {
            "id": vid,
            "snippet": {
                "title": v["title"],
                "description": v["description"],
                "tags": v["tags"],
                "categoryId": cat_id
            }
        }
        resp = yt.videos().update(part="snippet", body=body).execute()
        print(f"[OK] Metadados atualizados com sucesso: {resp['snippet']['title'][:50]}...")
    except Exception as e:
        print(f"[!] Erro ao atualizar metadados do vídeo {vid}: {e}")

    # Tentativa de atualizar thumbnail
    capa_file = v["capa"]
    if capa_file.exists():
        try:
            print(f"Enviando thumbnail: {capa_file.name}...")
            yt.thumbnails().set(
                videoId=vid,
                media_body=MediaFileUpload(str(capa_file), mimetype="image/png")
            ).execute()
            print(f"[OK] Thumbnail enviada com sucesso para {vid}!")
        except HttpError as he:
            print(f"[INFO] Thumbnail via API requer verificação de telefone no canal: {he.reason}")
        except Exception as e:
            print(f"[!] Erro ao enviar thumbnail: {e}")

print("\nProcesso de sincronização de metadados no YouTube finalizado!")
