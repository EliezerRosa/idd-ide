import os
import json
import re
from pathlib import Path

ROOT = Path(r"C:\Antigravity - RVM Designações")
IGNORED_DIRS = {".git", ".venv", "node_modules", "__pycache__", "dist", "build"}

print(f"Buscando credenciais e menções a 'eliezer' em {ROOT}...")

found_tokens = []
found_envs = []
found_mentions = []

for dirpath, dirnames, filenames in os.walk(ROOT):
    # Ignora pastas pesadas
    dirnames[:] = [d for d in dirnames if d not in IGNORED_DIRS]
    
    for f in filenames:
        p = Path(dirpath) / f
        fn_lower = f.lower()
        
        # 1. Arquivos de tokens / secrets / credentials / env
        if any(k in fn_lower for k in ["token", "secret", "credential", "oauth", "client_id"]) or fn_lower.startswith(".env"):
            found_tokens.append(p)
            
        # 2. Arquivos de texto ou json pequenos para buscar eliezerjprosa
        if p.suffix.lower() in [".json", ".env", ".py", ".js", ".ts", ".txt", ".yml", ".yaml"]:
            try:
                if p.stat().st_size < 1_000_000: # menor que 1MB
                    text = p.read_text(encoding="utf-8", errors="ignore")
                    if "eliezerjprosa" in text.lower():
                        found_mentions.append(p)
            except Exception:
                pass

print(f"\n--- 1. Arquivos de Credencial / Tokens encontrados ({len(found_tokens)}) ---")
for p in found_tokens:
    print(f" - {p}")

print(f"\n--- 2. Arquivos contendo 'eliezerjprosa' ({len(found_mentions)}) ---")
for p in found_mentions:
    print(f" - {p}")

# Inspeciona os arquivos de token encontrados
print(f"\n--- 3. Inspecionando conteúdo dos arquivos de credencial ---")
for p in found_tokens:
    if p.suffix.lower() == ".json":
        try:
            with open(p, "r", encoding="utf-8", errors="ignore") as fp:
                data = json.load(fp)
            if isinstance(data, dict):
                # Extrai chaves e identificadores seguros
                keys = list(data.keys())
                user = data.get("account") or data.get("client_email") or data.get("email") or data.get("user")
                scopes = data.get("scopes")
                print(f"\n[JSON] {p.name} (em {p.parent.name}):")
                print(f"  Chaves: {keys}")
                if user:
                    print(f"  Conta/Email: {user}")
                if scopes:
                    print(f"  Escopos: {scopes}")
                if "refresh_token" in data:
                    print(f"  Possui refresh_token: SIM")
        except Exception as e:
            print(f"  Não foi possível parsear {p.name}: {e}")
    elif ".env" in p.name:
        try:
            content = p.read_text(encoding="utf-8", errors="ignore")
            lines = [l.strip() for l in content.splitlines() if l.strip() and not l.strip().startswith("#")]
            var_names = [l.split("=")[0] for l in lines if "=" in l]
            print(f"\n[ENV] {p.name} (em {p.parent.name}): Variáveis definidas: {var_names}")
        except Exception as e:
            print(f"  Erro ao ler .env {p.name}: {e}")
