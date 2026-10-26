import os
import json
from pathlib import Path
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

BASE_DIR = Path(r"C:\Antigravity - IDD Refrigeração")
SECRETS_DIR = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos"
TOKEN_FILE = SECRETS_DIR / "token_youtube.json"
MANIFEST_FILE = BASE_DIR / "producao_yt" / "upload_manifest.json"

SCOPES = ["https://www.googleapis.com/auth/youtube"]

SHORTS_METADATA = {
    "short_01_softwares_falham": {
        "title": "Por que softwares de manutenção falham na Refrigeração? #Shorts #IDD",
        "desc": "Por que softwares genéricos de manutenção falham na Refrigeração Industrial? Entenda a importância do domínio termodinâmico e do Paradigma IDD.\n\nPlaylist oficial: https://www.youtube.com/playlist?list=PLMWN1EWhq5tM\n#Shorts #IDD #Refrigeracao #PMOC #Engenharia",
        "tags": ["Shorts", "IDD", "Refrigeração", "PMOC", "Engenharia de Software", "IA", "Manutenção"]
    },
    "short_02_regras_inviolaveis": {
        "title": "A Regra Inviolável do PMOC e Termodinâmica #Shorts #Engenharia #IDD",
        "desc": "Compliance térmico e as leis invioláveis da termodinâmica que nenhuma IA ou programador pode quebrar no PMOC.\n\nPlaylist oficial: https://www.youtube.com/playlist?list=PLMWN1EWhq5tM\n#Shorts #PMOC #Engenharia #Termodinamica #IDD",
        "tags": ["Shorts", "PMOC", "Termodinâmica", "Compliance", "Engenharia", "IDD"]
    },
    "short_03_artefato_mais_alta_ordem": {
        "title": "A Intenção Humana é o Artefato de Mais Alta Ordem #Shorts #IDD",
        "desc": "No Paradigma IDD, código é apenas detalhe de implementação efêmero. A intenção humana é o verdadeiro artefato de mais alta ordem.\n\nPlaylist oficial: https://www.youtube.com/playlist?list=PLMWN1EWhq5tM\n#Shorts #IDD #IA #FilosofiaTech #EngenhariaDeSoftware",
        "tags": ["Shorts", "IDD", "Intenção", "Inteligência Artificial", "Engenharia de Software", "Tech"]
    },
    "short_04_aumentar_nao_automatizar": {
        "title": "Aumentar, NÃO Automatizar: O Papel Humano com IA #Shorts #IA #IDD",
        "desc": "O objetivo da IA autônoma não é substituir a sensibilidade humana, mas sim amplificar e aumentar a capacidade do especialista de negócios.\n\nPlaylist oficial: https://www.youtube.com/playlist?list=PLMWN1EWhq5tM\n#Shorts #IA #Automação #ParadigmaIDD #FuturoDoTrabalho",
        "tags": ["Shorts", "IA", "Futuro Do Trabalho", "IDD", "Inteligência Artificial"]
    },
    "short_05_melissa_leiga_criou_crm": {
        "title": "Como uma Leiga Criou um CRM Completo com IA sem Programar #Shorts #IDD",
        "desc": "Melissa não sabia programar nada de código e colocou no ar um CRM corporativo de 8 telas guiando a IA com o Paradigma IDD.\n\nAssista o caso completo: https://www.youtube.com/watch?v=7LB4MYBPu1M\nPlaylist oficial: https://www.youtube.com/playlist?list=PLMWN1EWhq5tM\n#Shorts #IDD #NoCode #TechParaLeigos #CRM #IA",
        "tags": ["Shorts", "NoCode", "IDD", "IA para Leigos", "NexusLog", "Eliezer Rosa"]
    }
}

def main():
    with open(TOKEN_FILE, "r") as f:
        creds = Credentials.from_authorized_user_info(json.load(f), SCOPES)
    yt = build("youtube", "v3", credentials=creds)

    with open(MANIFEST_FILE, "r") as f:
        manifest = json.load(f)

    for key, info in SHORTS_METADATA.items():
        vid = manifest.get("shorts", {}).get(key)
        if not vid:
            continue
        print(f"Atualizando metadata de {vid} ({key})...")
        try:
            body = {
                "id": vid,
                "snippet": {
                    "title": info["title"],
                    "description": info["desc"],
                    "tags": info["tags"],
                    "categoryId": "28"
                }
            }
            yt.videos().update(part="snippet", body=body).execute()
            print(f"[OK] Atualizado: {info['title']}")
        except Exception as e:
            print(f"[!] Erro ao atualizar {vid}: {e}")

if __name__ == "__main__":
    main()
