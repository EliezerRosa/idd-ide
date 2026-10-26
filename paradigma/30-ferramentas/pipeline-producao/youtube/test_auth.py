import sys
import os
import json
from pathlib import Path
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow

BASE_DIR = Path(r"C:\Antigravity - IDD Refrigeração")
SECRETS_DIR = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos"
CLIENT_SECRETS = SECRETS_DIR / "client_secrets.json"
TOKEN_FILE = SECRETS_DIR / "token_youtube.json"

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

print("Verificando arquivos...")
sys.stdout.flush()

if TOKEN_FILE.exists():
    try:
        with open(TOKEN_FILE, "r") as f:
            data = json.load(f)
            creds = Credentials.from_authorized_user_info(data, SCOPES)
            print(f"Token carregado. Valid: {creds.valid}, Expired: {creds.expired}")
            sys.stdout.flush()
            if creds.expired and creds.refresh_token:
                print("Tentando refresh_token...")
                sys.stdout.flush()
                creds.refresh(Request())
                print(f"Sucesso no refresh! Novo valid: {creds.valid}")
                with open(TOKEN_FILE, "w") as f_out:
                    f_out.write(creds.to_json())
                sys.stdout.flush()
                sys.exit(0)
    except Exception as e:
        print(f"Erro ao carregar/atualizar: {e}")
        sys.stdout.flush()

print("Iniciando InstalledAppFlow...")
sys.stdout.flush()
flow = InstalledAppFlow.from_client_secrets_file(str(CLIENT_SECRETS), SCOPES)
print("Gerando URL de autenticação...")
sys.stdout.flush()
auth_url, _ = flow.authorization_url(prompt='consent', access_type='offline')
print("\n" + "="*70)
print("ACESSE ESTA URL NO NAVEGADOR PARA AUTORIZAR O YOUTUBE:")
print(auth_url)
print("="*70 + "\n")
sys.stdout.flush()
