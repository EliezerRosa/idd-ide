import re
import sys
from pathlib import Path

if sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

GEN_FILE = Path(r"c:\Antigravity - IDD Refrigeração\apresentacao\generate_all_20_gifs.py")

with open(GEN_FILE, "r", encoding="utf-8") as f:
    code = f.read()

# Substituições de caracteres especiais para terminal ASCII limpo sem glitches
replacements = [
    ("ALUCINAÇÃO!", "ALUCINACAO!"),
    ("USUÁRIO: Negócio", "USUARIO: Negocio"),
    ("DEV: Revelação", "DEV: Revelacao"),
    ("USUÁRIO: Alívio", "USUARIO: Alivio"),
    ("DEV: Compilação", "DEV: Compilacao"),
    ("USUÁRIO: Precisão", "USUARIO: Precisao"),
    ("USUÁRIO: Proteção", "USUARIO: Protecao"),
    ("USUÁRIO: Clareza", "USUARIO: Clareza"),
    ("USUÁRIO: Sucesso", "USUARIO: Sucesso"),
    ("USUÁRIO: Conforto", "USUARIO: Conforto"),
    ("USUÁRIO: Mestre", "USUARIO: Mestre"),
    ("DEV: Evolução", "DEV: Evolucao"),
    ("DEV: Inspiração", "DEV: Inspiracao"),
    ("DEV: Soberania", "DEV: Soberania"),
    ("DEV: Produção", "DEV: Producao"),
    ("DEV: Validação", "DEV: Validacao"),
    ("Cobrou no cartão e o pedido sumiu?!", "Cobrou no cartao e o pedido sumiu?!"),
    ("MCP é o cano, IDD é a inteligência!", "MCP e o cano, IDD e a inteligencia!"),
    ("Pressão perfeita e zero vazamento!", "Pressao perfeita e zero vazamento!"),
    ("Adeus rezas, olá tipagem e AST!", "Adeus rezas, ola tipagem e AST!"),
    ("100% de precisão nos cálculos!", "100% de precisao nos calculos!"),
    ("Git agora lê intenção, não texto!", "Git agora le intencao, nao texto!"),
    ("Contra dados empíricos, não há hype!", "Contra dados empiricos, nao ha hype!"),
    ("Economizamos R$ 200 mil em refatoração!", "Economizamos R$ 200 mil em refatoracao!"),
    ("Eu governo a intenção, a IA toca a música!", "Eu governo a intencao, a IA toca a musica!"),
    ("Finalmente entendi como software é criado!", "Finalmente entendi como software e criado!"),
    ("Não digito linhas, governo catedrais!", "Nao digito linhas, governo catedrais!"),
    ("⁉️", "?!"),
    ("👍", "OK"),
    ("🎉", "*"),
    ("💥", "*"),
    ("✨", "*"),
    ("😎", ":)"),
    ("💡", "*"),
    ("💧", "*"),
    ("⏰", "@"),
    ("❌", "X"),
    ("💻", "#"),
    ("👤", "#"),
    ("⚡", "*"),
    ("😠", ">:("),
    ("🧠", "*")
]

for old, new in replacements:
    code = code.replace(old, new)

with open(GEN_FILE, "w", encoding="utf-8") as f:
    f.write(code)

print("✅ generate_all_20_gifs.py sanitizado com sucesso!")
