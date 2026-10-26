import os
import sys
import json
import urllib.parse
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"

BASE_DIR = Path(r"C:\Antigravity - IDD Refrigeração")
SECRETS_DIR = BASE_DIR / "IDD Paradigma" / "05 - Operação do Canal" / "segredos"
CLIENT_SECRETS = SECRETS_DIR / "client_secrets.json"
TOKEN_ELIEZER = SECRETS_DIR / "token_eliezer.json"
TOKEN_CLAUDE = Path(r"C:\IDE IDD Claude-VS Code\IDD Paradigma\05 - Operação do Canal\segredos\token_youtube.json")

SCOPES = [
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.upload"
]

PORT = 8090
REDIRECT_URI = f"http://localhost:{PORT}/"

code_holder = {}

class OAuthCallbackHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        query = urllib.parse.urlparse(self.path).query
        params = urllib.parse.parse_qs(query)
        if "code" in params:
            code_holder["code"] = params["code"][0]
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write("""
            <!DOCTYPE html>
            <html>
            <head><title>Autorização Concluída</title></head>
            <body style="font-family:'Segoe UI',sans-serif; text-align:center; padding:60px; background:#0f172a; color:#f8fafc;">
                <div style="background:#1e293b; max-width:550px; margin:0 auto; padding:40px; border-radius:16px; border:1px solid #38bdf8;">
                    <div style="font-size:48px; margin-bottom:16px;">✅</div>
                    <h1 style="color:#38bdf8; margin:0 0 12px 0;">Autenticação Concluída!</h1>
                    <p style="color:#94a3b8; font-size:18px; line-height:1.6;">O canal <strong>Eliézer Rosa</strong> foi conectado com sucesso.<br>Você já pode fechar esta aba.</p>
                </div>
            </body>
            </html>
            """.encode("utf-8"))
        else:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b"Erro: parametro code nao encontrado.")

    def log_message(self, format, *args):
        pass

print("==================================================")
print("INICIANDO FLUXO DE AUTORIZAÇÃO: ELIEZER J P ROSA")
print("==================================================")

flow = InstalledAppFlow.from_client_secrets_file(
    str(CLIENT_SECRETS),
    scopes=SCOPES,
    redirect_uri=REDIRECT_URI
)

auth_url, _ = flow.authorization_url(prompt='consent', access_type='offline')

print(f"\nAcesse esta URL para autorizar (ou aguarde abrir no navegador):\n{auth_url}\n")
sys.stdout.flush()

# Abre no navegador do Windows
try:
    os.system(f'start "" "{auth_url}"')
except Exception:
    pass

# Inicia servidor local para capturar exatamente a requisição
server = HTTPServer(('localhost', PORT), OAuthCallbackHandler)
print(f"Servidor local ativo e ouvindo em http://localhost:{PORT}/...")
sys.stdout.flush()

while "code" not in code_holder:
    server.handle_request()

auth_code = code_holder["code"]
print("\n[OK] Código de autorização recebido do Google!")
sys.stdout.flush()

# Troca o código pelas credenciais oficiais
flow.fetch_token(code=auth_code)
creds = flow.credentials

# Salva token_eliezer.json
with open(TOKEN_ELIEZER, "w", encoding="utf-8") as f:
    f.write(creds.to_json())
print(f"[OK] Token salvo com sucesso em: {TOKEN_ELIEZER}")

# Atualiza também no projeto Claude-VS Code
if TOKEN_CLAUDE.parent.exists():
    try:
        with open(TOKEN_CLAUDE, "w", encoding="utf-8") as f:
            f.write(creds.to_json())
        print(f"[OK] Token sincronizado no projeto Claude-VS Code: {TOKEN_CLAUDE}")
    except Exception as e:
        print(f"[!] Erro ao salvar no Claude-VS Code: {e}")

# Valida canal conectado
try:
    yt = build("youtube", "v3", credentials=creds)
    ch_resp = yt.channels().list(part="snippet", mine=True).execute()
    for ch in ch_resp.get("items", []):
        print(f"\n[SUCESSO ABSOLUTO] Canal Autenticado: {ch['snippet']['title']} (ID: {ch['id']})")
        print(f"Canal 100% pronto para automações, upload e atualizações!")
except Exception as e:
    print(f"Token salvo! Erro ao ler canal: {e}")

sys.stdout.flush()
