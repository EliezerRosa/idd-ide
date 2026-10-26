"""Valida um rascunho de descrições contra o GUIA-REDACAO.md e o estado atual do canal.

Uso: python -I scripts/canal/validar_descricoes.py <rascunho.json> [ids esperados separados por vírgula]
Sai com código 1 se houver erro.
"""

import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parents[2]
ATUAL = ROOT / "paradigma" / "_local" / "yt_atual_token_eliezer.json"
PROIBIDAS = re.compile(r"criador do paradigma|paradigma cunhado|alucina..o zero|matematicamente|imposs[íi]vel"
                       r"|intention-driven|blindad|inquebr|certeza absoluta|garantia absoluta|99[,.]\d", re.I)
TS = re.compile(r"^\s*(\d{1,2}:)?\d{1,2}:\d{2}\b", re.M)


def main() -> int:
    draft = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    atual = {v["id"]: v for v in json.loads(ATUAL.read_text(encoding="utf-8"))["videos"]}
    esperados = set(sys.argv[2].split(",")) if len(sys.argv) > 2 else set()
    errs = []
    ids = {v["id"] for v in draft}
    if esperados - ids:
        errs.append(f"faltam ids: {sorted(esperados - ids)}")
    for v in draft:
        i, t, d = v["id"], v["title"], v["description"]
        if len(t) > 100:
            errs.append(f"{i}: título {len(t)} > 100")
        if len(d) > 4900:
            errs.append(f"{i}: descrição {len(d)} > 4900")
        if re.search("[<>]", t + d):
            errs.append(f"{i}: contém < ou >")
        for campo in (t, d, " ".join(v.get("tags", []))):
            if m := PROIBIDAS.search(campo):
                errs.append(f"{i}: frase proibida '{m.group(0)}'")
        if not d.lstrip().startswith(("✅", "🧪", "🔭")):
            errs.append(f"{i}: primeira linha sem selo")
        if "Cânone v1.0-rc1" not in d:
            errs.append(f"{i}: sem rodapé padrão")
        if len(re.findall(r"#\w+", d)) > 8:
            errs.append(f"{i}: mais de 8 hashtags")
        if len(v.get("tags", [])) > 15:
            errs.append(f"{i}: mais de 15 tags")
        if i in atual:
            antes = [m.group(0).strip().split()[0] for m in TS.finditer(atual[i]["description"])]
            depois = [m.group(0).strip().split()[0] for m in TS.finditer(d)]
            if antes and antes != depois:
                errs.append(f"{i}: timestamps de capítulos diferem do original")
        else:
            errs.append(f"{i}: id não existe no canal")
    print(f"{len(draft)} vídeos, {len(errs)} erros")
    print("\n".join(errs))
    return 1 if errs else 0


if __name__ == "__main__":
    sys.exit(main())
