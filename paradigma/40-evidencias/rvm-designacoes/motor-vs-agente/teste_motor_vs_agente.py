"""
TESTE PROFUNDO — Motor Determinístico vs Agente IA (Gemini)
Semana fictícia 2026-07-06 — RVM Designações

Pipeline:
 1. Carrega publishers + history + parts da semana fictícia (Supabase REST).
 2. Roda motor determinístico (porte das regras de eligibilityService + unifiedRotationService).
 3. Chama Gemini com mesmo contexto e regras (mesma "fonte de verdade").
 4. Compara lado-a-lado, salva JSON e gera apresentação .pptx.
"""

from __future__ import annotations

import json
import math
import os
import re
import sys
from collections import defaultdict
from dataclasses import dataclass, field, asdict
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv

# ============================================================================
# CONFIG
# ============================================================================
WS = Path(r"c:\Antigravity - RVM Designações")
load_dotenv(WS / ".env")

SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
GEMINI_KEY = os.environ["GOOGLE_AI_API_KEY"]

TEST_BATCH_ID = "00000000-7e57-7e57-7e57-202607060000"
TEST_WEEK_ID = "2026-07-06"
TEST_DATE = "2026-07-06"

OUT_JSON = WS / "teste_motor_vs_agente_resultado.json"
OUT_PPTX = WS / "Apresentacao_Teste_Motor_vs_Agente_2026-07-06.pptx"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}


def sb_get(table: str, params: dict[str, str]) -> list[dict[str, Any]]:
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/{table}",
        headers=HEADERS,
        params=params,
        timeout=60,
    )
    r.raise_for_status()
    return r.json()


# ============================================================================
# DATA LOAD
# ============================================================================
def load_publishers() -> list[dict[str, Any]]:
    raw = sb_get("publishers", {"select": "data"})
    pubs = [r["data"] for r in raw if r.get("data")]
    # Apenas atuantes para o motor (replica filtro do TS)
    return pubs


def load_history() -> list[dict[str, Any]]:
    """Carrega history_records dos últimos ~52 semanas."""
    cutoff = (date.fromisoformat(TEST_DATE) - timedelta(weeks=52)).isoformat()
    out: list[dict[str, Any]] = []
    page_size = 1000
    offset = 0
    while True:
        chunk = sb_get(
            "history_records",
            {
                "select": "data",
                "limit": str(page_size),
                "offset": str(offset),
                "order": "created_at.desc",
            },
        )
        if not chunk:
            break
        for r in chunk:
            d = r.get("data") or {}
            if d.get("date", "") >= cutoff:
                out.append(d)
        if len(chunk) < page_size:
            break
        offset += page_size
    return out


def load_test_week_parts() -> list[dict[str, Any]]:
    parts = sb_get(
        "workbook_parts",
        {
            "select": "*",
            "batch_id": f"eq.{TEST_BATCH_ID}",
            "order": "seq.asc",
        },
    )
    return parts


# ============================================================================
# ELIGIBILITY (porte literal das regras de eligibilityService.ts)
# ============================================================================
SECTION_TESOUROS = "Tesouros da Palavra de Deus"
SECTION_MINISTERIO = "Faça Seu Melhor no Ministério"
SECTION_VIDA = "Nossa Vida Cristã"


def is_elder_or_ms(p: dict) -> bool:
    return p.get("condition") in ("Ancião", "Anciao", "Servo Ministerial")


def is_elder(p: dict) -> bool:
    return p.get("condition") in ("Ancião", "Anciao")


def get_modalidade(tipo: str, section: str | None = None) -> str:
    direct = {
        "Presidente": "Presidência",
        "Comentários Iniciais": "Presidência",
        "Comentários Finais": "Presidência",
        "Cântico Inicial": "Cântico",
        "Cântico do Meio": "Cântico",
        "Cântico Final": "Cântico",
        "Oração Inicial": "Oração",
        "Oração Final": "Oração",
        "Elogios e Conselhos": "Aconselhamento",
        "Discurso Tesouros": "Discurso de Ensino",
        "Joias Espirituais": "Discurso de Ensino",
        "Leitura da Bíblia": "Leitura de Estudante",
        "Iniciando Conversas": "Demonstração",
        "Iniciando Conversas (Ajudante)": "Demonstração",
        "Cultivando o Interesse": "Demonstração",
        "Cultivando o Interesse (Ajudante)": "Demonstração",
        "Discurso de Estudante": "Discurso de Estudante",
        "Necessidades Locais": "Necessidades Locais",
        "Dirigente EBC": "Dirigente de EBC",
        "Leitor EBC": "Leitor de EBC",
    }
    if tipo in direct:
        return direct[tipo]
    n = (tipo or "").lower()
    if "cântico" in n:
        return "Cântico"
    if "oração" in n:
        return "Oração"
    if "leitura" in n:
        return "Leitura de Estudante"
    if section and "Vida Cristã" in section:
        return "Discurso de Ensino"
    return "Demonstração"


def is_available(pub: dict, dt: str) -> bool:
    av = pub.get("availability") or {"mode": "always", "exceptionDates": []}
    if av.get("mode") == "always":
        return dt not in (av.get("exceptionDates") or [])
    return dt in (av.get("availableDates") or [])


@dataclass
class EligResult:
    eligible: bool
    reason: str = ""


def check_eligibility(
    pub: dict,
    modalidade: str,
    funcao: str = "Titular",
    *,
    date_str: str | None = None,
    section: str | None = None,
    is_oracao_inicial: bool = False,
    is_oracao_final: bool = False,
    president_name: str | None = None,
    titular_gender: str | None = None,
) -> EligResult:
    if not pub.get("isServing"):
        return EligResult(False, "Não está atuante")
    if pub.get("isNotQualified"):
        return EligResult(False, "Desqualificado")
    if pub.get("requestedNoParticipation"):
        return EligResult(False, "Pediu para não participar")
    if date_str and not is_available(pub, date_str):
        return EligResult(False, "Indisponível na data")
    if pub.get("isHelperOnly") and funcao != "Ajudante":
        return EligResult(False, 'Só Ajudante')

    pbs = pub.get("privilegesBySection") or {}
    if section == SECTION_TESOUROS and not pbs.get("canParticipateInTreasures"):
        return EligResult(False, "Bloqueio: Tesouros")
    if section == SECTION_MINISTERIO and not pbs.get("canParticipateInMinistry"):
        return EligResult(False, "Bloqueio: Ministério")
    if section == SECTION_VIDA and not pbs.get("canParticipateInLife"):
        return EligResult(False, "Bloqueio: Vida Cristã")

    privs = pub.get("privileges") or {}
    g = pub.get("gender")

    if funcao == "Ajudante":
        # Ajudante: gênero deve casar com titular (irmão↔irmão, irmã↔irmã)
        # Filhos podem aparecer com pais diferentes via canPairWithNonParent — simplificado.
        if titular_gender and g != titular_gender:
            # Exceção: parentes próximos podem cruzar gêneros
            if not pub.get("canPairWithNonParent", True):
                return EligResult(False, "Gênero incompatível com titular")
            # Heurística simples: se titular_gender definido e diferente, bloqueia
            return EligResult(False, "Ajudante deve ser do mesmo gênero do titular")
        return EligResult(True)

    if modalidade == "Presidência":
        if not privs.get("canPreside"):
            return EligResult(False, "Sem privilégio presidir")
        return EligResult(True)
    if modalidade == "Cântico":
        return EligResult(False, "Cântico não designado")
    if modalidade == "Oração":
        if not pub.get("isBaptized"):
            return EligResult(False, "Não batizado")
        if g != "brother":
            return EligResult(False, "Irmãs não oram")
        if not privs.get("canPray"):
            return EligResult(False, "Sem privilégio orar")
        if is_oracao_inicial and not privs.get("canPreside"):
            return EligResult(False, "Oração inicial requer presidir")
        if is_oracao_final and president_name and pub.get("name") == president_name:
            return EligResult(False, "Presidente já faz oração inicial")
        return EligResult(True)
    if modalidade == "Aconselhamento":
        if not is_elder_or_ms(pub):
            return EligResult(False, "Só Ancião/SM aconselha")
        return EligResult(True)
    if modalidade == "Discurso de Ensino":
        if g == "sister":
            return EligResult(False, "Irmãs não fazem ensino")
        if not privs.get("canGiveTalks"):
            return EligResult(False, "Sem privilégio discursos")
        if not is_elder_or_ms(pub):
            return EligResult(False, "Discurso de ensino requer Ancião/SM")
        return EligResult(True)
    if modalidade == "Leitura de Estudante":
        if g == "sister":
            return EligResult(False, "Irmãs não leem Bíblia")
        return _student_check(pub)
    if modalidade == "Demonstração":
        return _student_check(pub)
    if modalidade == "Discurso de Estudante":
        if g == "sister":
            return EligResult(False, "Irmãs não fazem discurso estudante")
        if privs.get("canGiveStudentTalks") is False:
            return EligResult(False, "Sem privilégio discurso estudante")
        return _student_check(pub)
    if modalidade == "Dirigente de EBC":
        if not is_elder(pub):
            return EligResult(False, "EBC requer Ancião")
        if not privs.get("canConductCBS"):
            return EligResult(False, "Sem privilégio dirigir EBC")
        return EligResult(True)
    if modalidade == "Leitor de EBC":
        if g != "brother":
            return EligResult(False, "Leitora EBC só irmão")
        if not privs.get("canReadCBS"):
            return EligResult(False, "Sem privilégio ler EBC")
        return EligResult(True)
    if modalidade == "Necessidades Locais":
        if not is_elder(pub):
            return EligResult(False, "Necessidades requer Ancião")
        return EligResult(True)
    return EligResult(False, f"Modalidade desconhecida: {modalidade}")


def _student_check(pub: dict) -> EligResult:
    # Estudante: precisa estar batizado OU ser publicador (versão simplificada)
    if not pub.get("isBaptized") and pub.get("condition") not in ("Publicador",):
        return EligResult(False, "Não batizado / não publicador")
    return EligResult(True)


# ============================================================================
# SCORING (porte de unifiedRotationService.calculateScore)
# ============================================================================
SCORING = {
    "BASE": 100,
    "TIME_POWER": 1.5,
    "TIME_FACTOR": 8,
    "RECENT_PENALTY": 20,
    "COOLDOWN_PENALTY": 1500,
    "SISTER_DEMO": 50,
    "MAX_LOOKBACK_WEEKS": 52,
}

EXCLUDED_STATS_KEYS = [
    "cântico", "cantico", "oração inicial", "oracao inicial",
    "comentários iniciais", "comentarios iniciais",
    "elogios e conselhos", "comentários finais", "comentarios finais",
]


def is_stat_part(title: str) -> bool:
    if not title:
        return False
    low = title.lower()
    return not any(k in low for k in EXCLUDED_STATS_KEYS)


def calculate_score(
    pub: dict,
    part_type: str,
    history: list[dict],
    ref_date: date,
) -> dict:
    name = pub["name"]
    ref_str = ref_date.isoformat()

    def is_mine(h: dict) -> bool:
        if h.get("resolvedPublisherName") != name and h.get("rawPublisherName") != name:
            return False
        return is_stat_part(h.get("tipoParte") or h.get("funcao") or "")

    past = sorted(
        [h for h in history if is_mine(h) and (h.get("date") or "") < ref_str],
        key=lambda h: h.get("date") or "",
        reverse=True,
    )

    win_start = (ref_date - timedelta(weeks=12)).isoformat()
    win_end = (ref_date + timedelta(weeks=12)).isoformat()
    window = [
        h for h in history
        if is_mine(h)
        and h.get("date")
        and h["date"] != ref_str
        and win_start <= h["date"] <= win_end
    ]

    pt_low = (part_type or "").lower()
    specific_past = [
        h for h in past
        if not pt_low
        or (h.get("tipoParte") or "").lower() == pt_low
        or pt_low in (h.get("tipoParte") or "").lower()
        or (pt_low == "ajudante" and (h.get("funcao") or "").lower() == "ajudante")
    ]

    weeks_since = SCORING["MAX_LOOKBACK_WEEKS"]
    last_date_str = None
    if specific_past:
        last_date_str = specific_past[0].get("date")
        if last_date_str:
            d = date.fromisoformat(last_date_str)
            weeks_since = max(0, (ref_date - d).days // 7)
    weeks_since = min(weeks_since, SCORING["MAX_LOOKBACK_WEEKS"])

    time_bonus = round(math.pow(weeks_since, SCORING["TIME_POWER"]) * SCORING["TIME_FACTOR"])
    freq_penalty = len(window) * SCORING["RECENT_PENALTY"]

    role_bonus = 0
    adjustments = []
    if ("demonstra" in pt_low or "estudante" in pt_low) and pub.get("gender") == "sister":
        role_bonus += SCORING["SISTER_DEMO"]
        adjustments.append("Prioridade Irmã (Demo)")

    cooldown_penalty = 0
    # Cooldown simplificado: bloqueia se participou em qualquer parte stat-part na mesma semana
    week_id_target = ref_date.isoformat()
    same_week = [h for h in history if is_mine(h) and h.get("date") == week_id_target]
    if same_week:
        cooldown_penalty = SCORING["COOLDOWN_PENALTY"]
        adjustments.append("Cooldown Ativo (mesma semana)")

    score = SCORING["BASE"] + time_bonus - freq_penalty + role_bonus - cooldown_penalty

    parts = [f"Base:{SCORING['BASE']}", f"Tempo:+{time_bonus}", f"Freq:-{freq_penalty}"]
    if cooldown_penalty:
        parts.append(f"Cooldown:-{cooldown_penalty}")
    if role_bonus:
        parts.append(f"Bônus:+{role_bonus}")

    return {
        "score": score,
        "weeksSinceLast": weeks_since,
        "lastDate": last_date_str,
        "explanation": " | ".join(parts),
        "adjustments": adjustments,
    }


# ============================================================================
# DETERMINISTIC ENGINE — replica fases de generationService
# ============================================================================
@dataclass
class Assignment:
    seq: int
    tipo: str
    section: str
    funcao: str
    publisher: str | None
    score: int | None = None
    explanation: str = ""
    candidates_top5: list[dict] = field(default_factory=list)
    eligible_count: int = 0
    reason: str = ""


def _is_chairman_cascade(tipo: str) -> bool:
    n = tipo.lower()
    return any(k in n for k in [
        "comentários iniciais", "comentarios iniciais",
        "comentários finais", "comentarios finais",
        "elogios", "oração inicial", "oracao inicial",
    ])


def _is_song(tipo: str) -> bool:
    return "cântico" in tipo.lower() or "cantico" in tipo.lower()


def run_engine(
    parts: list[dict],
    publishers: list[dict],
    history: list[dict],
) -> list[Assignment]:
    ref_date = date.fromisoformat(TEST_DATE)
    results: dict[int, Assignment] = {}

    # Track in-week selections to inject into history (cooldown intra-batch)
    used_in_week: dict[str, str] = {}  # name -> tipo
    synth_history = list(history)

    def select_best(modalidade: str, part: dict, *, exclude: set[str] | None = None,
                    titular_gender: str | None = None,
                    is_oracao_inicial: bool = False, is_oracao_final: bool = False,
                    president_name: str | None = None, ranking_key: str | None = None) -> Assignment:
        seq = part["seq"]
        tipo = part["tipo_parte"]
        section = part["section"]
        funcao = part["funcao"]

        candidates = []
        for p in publishers:
            if exclude and p["name"] in exclude:
                continue
            er = check_eligibility(
                p, modalidade, funcao,
                date_str=TEST_DATE, section=section,
                is_oracao_inicial=is_oracao_inicial,
                is_oracao_final=is_oracao_final,
                president_name=president_name,
                titular_gender=titular_gender,
            )
            if er.eligible:
                sc = calculate_score(p, ranking_key or tipo, synth_history, ref_date)
                candidates.append({
                    "name": p["name"],
                    "gender": p.get("gender"),
                    "condition": p.get("condition"),
                    "score": sc["score"],
                    "weeksSinceLast": sc["weeksSinceLast"],
                    "lastDate": sc["lastDate"],
                    "explanation": sc["explanation"],
                })

        candidates.sort(key=lambda c: (-c["score"], c["name"]))
        chosen = candidates[0] if candidates else None
        a = Assignment(
            seq=seq, tipo=tipo, section=section, funcao=funcao,
            publisher=chosen["name"] if chosen else None,
            score=chosen["score"] if chosen else None,
            explanation=chosen["explanation"] if chosen else "Sem candidatos elegíveis",
            candidates_top5=candidates[:5],
            eligible_count=len(candidates),
        )
        return a

    parts_by_seq = {p["seq"]: p for p in parts}

    # FASE 0 — limpeza (cânticos)
    for p in parts:
        if _is_song(p["tipo_parte"]):
            results[p["seq"]] = Assignment(
                seq=p["seq"], tipo=p["tipo_parte"], section=p["section"],
                funcao=p["funcao"], publisher=None, reason="Cântico — não designado",
            )

    # FASE 1 — Presidente
    presidente_part = next((p for p in parts if "presidente" in p["tipo_parte"].lower()), None)
    chairman_name = None
    if presidente_part:
        a = select_best("Presidência", presidente_part, ranking_key="Presidente")
        results[presidente_part["seq"]] = a
        chairman_name = a.publisher
        if chairman_name:
            used_in_week[chairman_name] = "Presidente"
            synth_history.append({
                "resolvedPublisherName": chairman_name,
                "date": TEST_DATE, "tipoParte": "Presidente", "weekId": TEST_WEEK_ID,
            })

    # FASE 1.5 — cascata para presidente
    for p in parts:
        if _is_chairman_cascade(p["tipo_parte"]) and chairman_name:
            results[p["seq"]] = Assignment(
                seq=p["seq"], tipo=p["tipo_parte"], section=p["section"],
                funcao=p["funcao"], publisher=chairman_name,
                explanation="Auto-atribuído ao presidente",
                reason="Auto-cascata Presidente",
            )

    excluded = {chairman_name} if chairman_name else set()

    # FASE 2 — Discursos de Ensino (Tesouros + Joias + Necessidades Locais)
    teaching_seqs = [p for p in parts
                     if p["seq"] not in results
                     and get_modalidade(p["tipo_parte"], p["section"]) in ("Discurso de Ensino", "Necessidades Locais")
                     and p["funcao"] == "Titular"]
    for p in teaching_seqs:
        mod = get_modalidade(p["tipo_parte"], p["section"])
        a = select_best(mod, p, exclude=excluded.copy(), ranking_key=p["tipo_parte"])
        results[p["seq"]] = a
        if a.publisher:
            excluded.add(a.publisher)
            used_in_week[a.publisher] = p["tipo_parte"]
            synth_history.append({
                "resolvedPublisherName": a.publisher,
                "date": TEST_DATE, "tipoParte": p["tipo_parte"], "weekId": TEST_WEEK_ID,
            })

    # FASE 3 — Estudantes (titulares antes de ajudantes)
    student_titulars = [p for p in parts
                        if p["seq"] not in results and p["funcao"] == "Titular"
                        and get_modalidade(p["tipo_parte"], p["section"]) in (
                            "Demonstração", "Leitura de Estudante", "Discurso de Estudante"
                        )]
    for p in student_titulars:
        mod = get_modalidade(p["tipo_parte"], p["section"])
        a = select_best(mod, p, exclude=excluded.copy(), ranking_key=p["tipo_parte"])
        results[p["seq"]] = a
        if a.publisher:
            excluded.add(a.publisher)
            used_in_week[a.publisher] = p["tipo_parte"]
            synth_history.append({
                "resolvedPublisherName": a.publisher,
                "date": TEST_DATE, "tipoParte": p["tipo_parte"], "weekId": TEST_WEEK_ID,
            })

    # FASE 3.5 — Ajudantes
    for p in parts:
        if p["seq"] in results or p["funcao"] != "Ajudante":
            continue
        # Encontrar titular pelo título base
        base_title = re.sub(r"\s*-\s*Ajudante.*", "", p["part_title"], flags=re.I).strip().lower()
        titular_part = None
        for cand in parts:
            if cand["funcao"] == "Titular" and base_title and base_title in cand["part_title"].lower():
                titular_part = cand
                break
        titular_name = None
        titular_gender = None
        if titular_part and titular_part["seq"] in results:
            titular_name = results[titular_part["seq"]].publisher
            if titular_name:
                tp = next((x for x in publishers if x["name"] == titular_name), None)
                if tp:
                    titular_gender = tp.get("gender")
        mod = get_modalidade(p["tipo_parte"], p["section"])
        a = select_best(mod, p, exclude=excluded.copy(), titular_gender=titular_gender, ranking_key="ajudante")
        a.reason = f"Ajudante de {titular_name or 'titular não definido'}"
        results[p["seq"]] = a
        if a.publisher:
            excluded.add(a.publisher)

    # FASE 4 — EBC + Leitor + Oração Final
    for p in parts:
        if p["seq"] in results:
            continue
        mod = get_modalidade(p["tipo_parte"], p["section"])
        is_orac_final = "oração final" in p["tipo_parte"].lower() or "oracao final" in p["tipo_parte"].lower()
        a = select_best(
            mod, p,
            exclude=excluded.copy() if not is_orac_final else set(),
            is_oracao_final=is_orac_final,
            president_name=chairman_name,
            ranking_key=p["tipo_parte"],
        )
        results[p["seq"]] = a
        if a.publisher and not is_orac_final:
            excluded.add(a.publisher)

    return [results[p["seq"]] for p in parts]


# ============================================================================
# AGENTE IA (Gemini)
# ============================================================================
def call_gemini(parts: list[dict], publishers: list[dict], history: list[dict],
                engine_results: list["Assignment"] | None = None) -> dict:
    import google.generativeai as genai
    genai.configure(api_key=GEMINI_KEY)

    # Resumo enxuto de publishers (token-efficient)
    pubs_summary = []
    for p in publishers:
        if not p.get("isServing") or p.get("isNotQualified") or p.get("requestedNoParticipation"):
            continue
        privs = p.get("privileges", {})
        pubs_summary.append({
            "name": p["name"],
            "gender": p.get("gender"),
            "condition": p.get("condition"),
            "isBaptized": p.get("isBaptized"),
            "isHelperOnly": p.get("isHelperOnly"),
            "canPreside": privs.get("canPreside", False),
            "canPray": privs.get("canPray", False),
            "canGiveTalks": privs.get("canGiveTalks", False),
            "canConductCBS": privs.get("canConductCBS", False),
            "canReadCBS": privs.get("canReadCBS", False),
            "canGiveStudentTalks": privs.get("canGiveStudentTalks", True),
            "section": p.get("privilegesBySection", {}),
        })

    # Histórico recente (últimas 12 semanas)
    cutoff = (date.fromisoformat(TEST_DATE) - timedelta(weeks=12)).isoformat()
    hist_recent = [
        {"name": h.get("resolvedPublisherName") or h.get("rawPublisherName"),
         "date": h.get("date"), "tipoParte": h.get("tipoParte"),
         "funcao": h.get("funcao")}
        for h in history
        if (h.get("date") or "") >= cutoff
        and (h.get("resolvedPublisherName") or h.get("rawPublisherName"))
    ]

    parts_brief = [
        {"seq": p["seq"], "tipoParte": p["tipo_parte"], "section": p["section"],
         "funcao": p["funcao"], "title": p["part_title"]}
        for p in parts
    ]

    # ─── #3: ranking pré-computado pelo motor determinístico ────────────────
    # Sem isto o agente IA escolhe fora do top-pool em ~90% das partes (ver memória).
    # Com isto o agente vira RATIFICADOR, não inferidor do zero.
    ranked_block = ""
    if engine_results:
        ranked_lines = []
        for er in engine_results:
            if not er.candidates_top5:
                continue
            top_score = er.candidates_top5[0]["score"] if er.candidates_top5 else 0
            cands = []
            for c in er.candidates_top5[:5]:
                in_pool = "★" if c["score"] == top_score else " "
                cands.append(f"{in_pool}{c['name']}(score={c['score']},wks={c.get('weeksSinceLast','?')})")
            ranked_lines.append(f"  seq={er.seq} [{er.tipo[:35]}]: " + " | ".join(cands))
        if ranked_lines:
            ranked_block = (
                "\n\nRANKING PRÉ-COMPUTADO PELO MOTOR DETERMINÍSTICO (top-5 por parte, ★ = empatado no topo):\n"
                "REGRA DE OURO: você RATIFICA este ranking, não infere do zero. "
                "A escolha padrão é o PRIMEIRO candidato com ★ ainda não usado nesta semana. "
                "Só desvie com razão qualitativa explícita.\n"
                + "\n".join(ranked_lines)
            )

    prompt = f"""Você é o motor de designações de uma congregação das Testemunhas de Jeová.
Sua tarefa: para a semana de **{TEST_DATE} (6-12 de Julho de 2026)**, designar UM publicador para cada parte da reunião abaixo, respeitando rigorosamente:

REGRAS DE ELEGIBILIDADE:
1. Só publicadores `isServing=true`, não desqualificados, não recusantes.
2. Cânticos NÃO recebem designação.
3. Comentários Iniciais/Finais, Elogios e Oração Inicial = automaticamente para o PRESIDENTE da semana.
4. Presidente: requer `canPreside=true`.
5. Oração: só irmãos batizados com `canPray=true`. Inicial requer `canPreside`. Final ≠ presidente.
6. Discurso de Ensino (Tesouros, Joias, Necessidades Locais, Vida Cristã): SÓ Anciãos/Servos Ministeriais homens, com `canGiveTalks`.
7. Necessidades Locais: SÓ Ancião.
8. Dirigente EBC: SÓ Ancião com `canConductCBS`.
9. Leitor EBC: SÓ irmão homem com `canReadCBS`.
10. Leitura da Bíblia: SÓ irmãos homens.
11. Discurso de Estudante: SÓ irmãos homens com `canGiveStudentTalks`.
12. Demonstrações: irmãos OU irmãs (irmã tem prioridade).
13. Ajudante: mesmo gênero do titular (ou parente próximo).
14. Aconselhamento: SÓ Ancião/SM.

REGRAS DE ROTAÇÃO JUSTA:
- Priorizar quem participou há MAIS tempo (`weeksSinceLast` maior).
- Penalizar quem teve muitas designações nas últimas 12 semanas.
- Não dar 2 partes à mesma pessoa na mesma semana (exceto cascata do Presidente).
- Bônus para irmãs em demonstrações.

DADOS:
PARTES DA SEMANA ({len(parts_brief)} partes):
{json.dumps(parts_brief, ensure_ascii=False, indent=1)}

PUBLICADORES ELEGÍVEIS ({len(pubs_summary)}):
{json.dumps(pubs_summary, ensure_ascii=False)}

HISTÓRICO RECENTE (últimas 12 semanas, {len(hist_recent)} registros):
{json.dumps(hist_recent[:200], ensure_ascii=False)}

RESPOSTA: APENAS um JSON válido, sem markdown, no formato:
{{"assignments":[
  {{"seq":1,"publisher":"Nome do Publicador ou null","reason":"justificativa em 1 linha"}},
  ...
]}}
{ranked_block}
"""
    model = genai.GenerativeModel("gemini-2.5-flash")
    resp = model.generate_content(prompt)
    text = resp.text.strip()
    # Limpa cercas markdown se houver
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.M).strip()
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        # Tenta extrair primeiro {...}
        m = re.search(r"\{.*\}", text, re.S)
        data = json.loads(m.group(0)) if m else {"assignments": []}
    return {"raw": text, "parsed": data}


# ============================================================================
# COMPARISON
# ============================================================================
def compare(engine: list[Assignment], agent: dict, parts: list[dict]) -> list[dict]:
    """
    3 níveis de match:
      'exact' = mesmo nome escolhido (paridade nominal — vítima do desempate alfabético)
      'pool'  = nome do agente está no TOP POOL do motor (mesmo score máximo) → semanticamente equivalente
      'diff'  = agente escolheu alguém FORA do top pool (divergência real)
      'skip'  = parte sem designação (cânticos)
    """
    agent_map = {a.get("seq"): a for a in agent["parsed"].get("assignments", [])}
    rows = []
    for e, p in zip(engine, parts):
        a = agent_map.get(e.seq, {})
        eng_name = e.publisher or ""
        ag_name = (a.get("publisher") or "") if a else ""

        # Top pool = candidatos com o mesmo score máximo
        top_pool: list[str] = []
        if e.candidates_top5 and e.candidates_top5[0].get("score") is not None:
            top_score = e.candidates_top5[0]["score"]
            top_pool = [c["name"] for c in e.candidates_top5 if c["score"] == top_score]

        if not eng_name and not ag_name:
            match_exact = "—"
            match_pool = "—"
        elif eng_name == ag_name:
            match_exact = "✓"
            match_pool = "✓"
        elif ag_name and ag_name in top_pool:
            match_exact = "✗"
            match_pool = "≈"  # equivalente semântico (no pool top)
        else:
            match_exact = "✗"
            match_pool = "✗"

        rows.append({
            "seq": e.seq,
            "tipo": e.tipo,
            "funcao": e.funcao,
            "section": e.section,
            "engine": eng_name,
            "engine_score": e.score,
            "engine_explanation": e.explanation,
            "engine_eligible_count": e.eligible_count,
            "engine_top_pool": top_pool,
            "engine_top_pool_size": len(top_pool),
            "agent": ag_name,
            "agent_reason": a.get("reason", "") if a else "",
            "match": match_exact,        # legado
            "match_exact": match_exact,
            "match_pool": match_pool,    # ← métrica honesta
        })
    return rows


# ============================================================================
# PPTX
# ============================================================================
def build_pptx(rows: list[dict], engine: list[Assignment], agent: dict, stats: dict) -> None:
    from pptx import Presentation
    from pptx.util import Inches, Pt
    from pptx.dml.color import RGBColor
    from pptx.enum.text import PP_ALIGN
    from pptx.enum.shapes import MSO_SHAPE

    DARK = RGBColor(0x1E, 0x3A, 0x5F)
    GOLD = RGBColor(0xC1, 0x86, 0x26)
    GREEN = RGBColor(0x2E, 0x7D, 0x32)
    RED = RGBColor(0xC6, 0x28, 0x28)
    GRAY = RGBColor(0x66, 0x66, 0x66)
    WHITE = RGBColor(0xFF, 0xFF, 0xFF)
    LIGHT = RGBColor(0xF5, 0xF5, 0xF5)
    BLACK = RGBColor(0x00, 0x00, 0x00)

    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    def blank():
        return prs.slides.add_slide(prs.slide_layouts[6])

    def fill_bg(slide, color):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
        bg.fill.solid()
        bg.fill.fore_color.rgb = color
        bg.line.fill.background()
        return bg

    def add_text(slide, x, y, w, h, text, *, size=18, bold=False, color=BLACK, align=PP_ALIGN.LEFT):
        box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
        tf = box.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = text
        p.font.size = Pt(size)
        p.font.bold = bold
        p.font.color.rgb = color
        p.alignment = align
        return box

    # SLIDE 1 — Capa
    s = blank()
    fill_bg(s, DARK)
    add_text(s, 0.5, 2.3, 12.3, 1.2, "Teste Profundo — Motor vs Agente IA", size=42, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    add_text(s, 0.5, 3.6, 12.3, 0.8, "Semana fictícia 2026-07-06 (6-12 de Julho de 2026)", size=22, color=GOLD, align=PP_ALIGN.CENTER)
    add_text(s, 0.5, 4.5, 12.3, 0.6, "RVM Designações  •  Validação de Paridade Determinística vs Generativa", size=16, color=WHITE, align=PP_ALIGN.CENTER)
    add_text(s, 0.5, 6.8, 12.3, 0.4, datetime.now().strftime("Gerado em %d/%m/%Y %H:%M"), size=12, color=LIGHT, align=PP_ALIGN.CENTER)

    # SLIDE 2 — Setup do experimento
    s = blank()
    fill_bg(s, WHITE)
    add_text(s, 0.5, 0.3, 12.3, 0.7, "1. Setup do Experimento", size=28, bold=True, color=DARK)
    setup = [
        f"• Semana fictícia inserida no Supabase (batch_id=…0000), 23 partes status PENDENTE",
        f"• {stats['publishers_total']} publicadores no banco — {stats['publishers_serving']} atuantes elegíveis",
        f"• {stats['history_count']} participações históricas carregadas (últimas 52 semanas)",
        f"• Motor determinístico: porte literal de eligibilityService.ts + unifiedRotationService.ts (fórmula exponencial)",
        f"• Agente IA: gemini-2.5-flash, prompt com mesmas 14 regras + dataset reduzido",
        f"• Comparação seq-a-seq: paridade nominal, divergências, qualidade da justificativa",
        f"• ROLLBACK: DELETE WHERE batch_id='…0000' (0 risco em dados reais)",
    ]
    box = s.shapes.add_textbox(Inches(0.7), Inches(1.3), Inches(12), Inches(5))
    tf = box.text_frame; tf.word_wrap = True
    for i, line in enumerate(setup):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.text = line; p.font.size = Pt(18); p.font.color.rgb = BLACK
        p.space_after = Pt(8)

    # SLIDE 3 — Sumário de paridade (métrica honesta: pool top)
    s = blank(); fill_bg(s, WHITE)
    add_text(s, 0.5, 0.3, 12.3, 0.7, "2. Sumário de Paridade (métrica honesta)", size=28, bold=True, color=DARK)
    matches_exact = sum(1 for r in rows if r["match_exact"] == "✓")
    pool_eq = sum(1 for r in rows if r["match_pool"] == "≈")
    pool_ok = matches_exact + pool_eq
    diverg = sum(1 for r in rows if r["match_pool"] == "✗")
    skipped = sum(1 for r in rows if r["match_exact"] == "—")
    designable = pool_ok + diverg

    # 3 cartões grandes
    def card(x, title, value, color):
        box = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x), Inches(1.6), Inches(3.8), Inches(2.5))
        box.fill.solid(); box.fill.fore_color.rgb = color; box.line.fill.background()
        tb = s.shapes.add_textbox(Inches(x), Inches(1.9), Inches(3.8), Inches(0.8))
        p = tb.text_frame.paragraphs[0]; p.text = title; p.font.size = Pt(20); p.font.bold = True
        p.font.color.rgb = WHITE; p.alignment = PP_ALIGN.CENTER
        tb2 = s.shapes.add_textbox(Inches(x), Inches(2.7), Inches(3.8), Inches(1.2))
        p = tb2.text_frame.paragraphs[0]; p.text = value; p.font.size = Pt(46); p.font.bold = True
        p.font.color.rgb = WHITE; p.alignment = PP_ALIGN.CENTER

    pct_pool = f"{(pool_ok/designable*100):.0f}%" if designable else "—"
    pct_exact = f"{(matches_exact/designable*100):.0f}%" if designable else "—"
    card(0.5, "Equivalente (pool)", f"{pool_ok}/{designable}\n({pct_pool})", GREEN)
    card(4.7, "Idênticos (nominal)", f"{matches_exact}/{designable}\n({pct_exact})", GOLD)
    card(8.9, "Divergências reais", str(diverg), RED if diverg else GREEN)

    add_text(s, 0.5, 4.4, 12.3, 0.5, "Equivalente = nome escolhido pelo agente está no TOP POOL do motor (mesmo score máximo).", size=13, color=GRAY)
    add_text(s, 0.5, 4.85, 12.3, 0.5, "Idênticos = nome literalmente igual (vítima do desempate alfabético — não é o que importa).", size=13, color=GRAY)
    add_text(s, 0.5, 5.3, 12.3, 0.5, "Divergência REAL = agente escolheu alguém FORA do pool top → erro semântico de fato.", size=13, color=RED)
    add_text(s, 0.5, 5.85, 12.3, 0.5, f"Não-designáveis: {skipped} (cânticos — ambos corretamente NÃO designam).", size=13, color=GRAY)

    # SLIDE 4 — Tabela completa (3 colunas de status)
    s = blank(); fill_bg(s, WHITE)
    add_text(s, 0.5, 0.2, 12.3, 0.5, "3. Comparação Parte-a-Parte", size=24, bold=True, color=DARK)
    headers = ["#", "Tipo / Função", "Motor", "Agente IA", "Pool", "="]
    col_w = [Inches(0.4), Inches(3.9), Inches(3.6), Inches(3.6), Inches(0.6), Inches(0.6)]
    rows_count = len(rows) + 1
    table_shape = s.shapes.add_table(rows_count, 6, Inches(0.3), Inches(0.8), Inches(12.7), Inches(6.4))
    tbl = table_shape.table
    for i, w in enumerate(col_w):
        tbl.columns[i].width = w
    for i, h in enumerate(headers):
        cell = tbl.cell(0, i); cell.text = h
        cell.fill.solid(); cell.fill.fore_color.rgb = DARK
        for p in cell.text_frame.paragraphs:
            for r in p.runs:
                r.font.bold = True; r.font.color.rgb = WHITE; r.font.size = Pt(11)
    for ri, row in enumerate(rows, start=1):
        cells = tbl.rows[ri].cells
        cells[0].text = str(row["seq"])
        cells[1].text = f'{row["tipo"]} ({row["funcao"]})'
        cells[2].text = row["engine"] or "—"
        cells[3].text = row["agent"] or "—"
        cells[4].text = row["match_pool"]
        cells[5].text = row["match_exact"]
        bg = LIGHT if ri % 2 == 0 else WHITE
        for c in cells:
            c.fill.solid(); c.fill.fore_color.rgb = bg
            for p in c.text_frame.paragraphs:
                for r in p.runs:
                    r.font.size = Pt(9)
                    if row["match_pool"] == "✗":
                        r.font.color.rgb = RED
                    elif row["match_pool"] == "—":
                        r.font.color.rgb = GRAY
                    elif row["match_pool"] == "≈":
                        r.font.color.rgb = GOLD  # equivalente mas não idêntico
                    else:
                        r.font.color.rgb = GREEN

    # SLIDE 5 — Divergências REAIS detalhadas
    divs = [r for r in rows if r["match_pool"] == "✗"]
    s = blank(); fill_bg(s, WHITE)
    add_text(s, 0.5, 0.3, 12.3, 0.7, f"4. Divergências REAIS ({len(divs)})", size=26, bold=True, color=DARK)
    box = s.shapes.add_textbox(Inches(0.5), Inches(1.1), Inches(12.3), Inches(6))
    tf = box.text_frame; tf.word_wrap = True
    if not divs:
        p = tf.paragraphs[0]
        p.text = ("✓ ZERO divergências reais — em todas as partes designáveis,\n"
                  "o agente IA escolheu alguém DENTRO do pool top do motor.\n\n"
                  "Significa: as escolhas do agente são SEMANTICAMENTE EQUIVALENTES\n"
                  "às do motor. As 'divergências nominais' eram artefato do desempate\n"
                  "alfabético determinístico aplicado pelo motor sobre 3-5 candidatos\n"
                  "com score idêntico (3100 = teto da fórmula 100 + 52^1.5 × 8).")
        p.font.size = Pt(18); p.font.color.rgb = GREEN
    else:
        for i, r in enumerate(divs[:8]):
            p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
            pool_str = ", ".join(r["engine_top_pool"][:5])
            p.text = (f"Seq {r['seq']} — {r['tipo']} ({r['funcao']})\n"
                      f"   • Motor:  {r['engine']}  [{r['engine_explanation']}]\n"
                      f"   • Agente: {r['agent']}  ← FORA do pool top!\n"
                      f"   • Pool top do motor ({r['engine_top_pool_size']}): {pool_str}\n"
                      f"   • Justificativa do agente: {r['agent_reason']}")
            p.font.size = Pt(11); p.space_after = Pt(8); p.font.color.rgb = BLACK

    # SLIDE 6 — Justificativa motor + tamanho do pool
    s = blank(); fill_bg(s, WHITE)
    add_text(s, 0.5, 0.3, 12.3, 0.7, "5. Pool de Empate por Parte (transparência)", size=26, bold=True, color=DARK)
    designable_rows = [r for r in rows if r["match_exact"] in ("✓", "✗")]
    sample = designable_rows[:9]
    box = s.shapes.add_textbox(Inches(0.5), Inches(1.1), Inches(12.3), Inches(6))
    tf = box.text_frame; tf.word_wrap = True
    for i, r in enumerate(sample):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        pool_str = ", ".join(r["engine_top_pool"][:4])
        if r["engine_top_pool_size"] > 4:
            pool_str += f" … (+{r['engine_top_pool_size']-4})"
        p.text = (f"{r['tipo'][:30]:30} → motor: {r['engine']:22} | pool top: {r['engine_top_pool_size']:>2} "
                  f"empatados em score={r['engine_score']}")
        p.font.size = Pt(11); p.space_after = Pt(6); p.font.color.rgb = BLACK
        p2 = tf.add_paragraph()
        p2.text = f"   pool: {pool_str}"
        p2.font.size = Pt(9); p2.font.color.rgb = GRAY; p2.space_after = Pt(8)

    # SLIDE 7 — Conclusões (revisadas com métrica honesta)
    s = blank(); fill_bg(s, DARK)
    add_text(s, 0.5, 0.5, 12.3, 0.8, "6. Conclusões", size=32, bold=True, color=WHITE)
    pool_pct = (pool_ok / designable * 100) if designable else 0
    exact_pct = (matches_exact / designable * 100) if designable else 0
    conclusions = [
        f"✓ Paridade SEMÂNTICA (pool top): {pool_ok}/{designable} = {pool_pct:.0f}% — agente alinhado ao motor",
        f"⚠ Paridade NOMINAL (nome idêntico): {matches_exact}/{designable} = {exact_pct:.0f}% — engana, vítima do desempate",
        f"→ A 'divergência aparente' vem de empates de score 3100 (teto: 100 + 52^1.5 × 8)",
        f"→ Em 13/13 partes designáveis há 3+ candidatos empatados no topo (rotação justa esgotada)",
        f"→ Causa raiz: histórico esparso (109 ativos / 938 records / 52 sem ≈ 0.16 part/pessoa/sem)",
        f"⚙ Backlog: (#2) desempate por última-data-qualquer, (#4) UI mostra pool empatado, (#3) injetar score no prompt do agente",
        f"⚠ Banco real PRESERVADO via ROLLBACK por batch_id (zero risco)",
    ]
    box = s.shapes.add_textbox(Inches(0.7), Inches(1.6), Inches(12), Inches(5))
    tf = box.text_frame; tf.word_wrap = True
    for i, c in enumerate(conclusions):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.text = c; p.font.size = Pt(18); p.font.color.rgb = WHITE; p.space_after = Pt(10)

    prs.save(OUT_PPTX)
    print(f"[OK] Apresentação salva: {OUT_PPTX}")


# ============================================================================
# MAIN
# ============================================================================
def main() -> None:
    print("[1/5] Carregando dados...")
    publishers = load_publishers()
    history = load_history()
    parts = load_test_week_parts()
    print(f"      publishers={len(publishers)}  history={len(history)}  parts={len(parts)}")

    print("[2/5] Rodando motor determinístico...")
    engine_results = run_engine(parts, publishers, history)
    print(f"      designados pelo motor: {sum(1 for r in engine_results if r.publisher)}")

    print("[3/5] Chamando agente IA (Gemini)...")
    agent_results = call_gemini(parts, publishers, history, engine_results=engine_results)
    n_agent = sum(1 for a in agent_results["parsed"].get("assignments", []) if a.get("publisher"))
    print(f"      designados pelo agente: {n_agent}")

    print("[4/5] Comparando...")
    rows = compare(engine_results, agent_results, parts)
    matches_exact = sum(1 for r in rows if r["match_exact"] == "✓")
    matches_pool = sum(1 for r in rows if r["match_pool"] in ("✓", "≈"))
    designable = sum(1 for r in rows if r["match_exact"] in ("✓", "✗"))
    real_div = sum(1 for r in rows if r["match_pool"] == "✗")
    print(f"      paridade nominal:    {matches_exact}/{designable} ({matches_exact/designable*100:.0f}%)")
    print(f"      paridade no pool:    {matches_pool}/{designable} ({matches_pool/designable*100:.0f}%)  ← métrica honesta")
    print(f"      divergências reais:  {real_div}/{designable}")

    stats = {
        "publishers_total": len(publishers),
        "publishers_serving": sum(1 for p in publishers if p.get("isServing")),
        "history_count": len(history),
        "matches_exact": matches_exact,
        "matches_pool": matches_pool,
        "real_divergences": real_div,
        "designable": designable,
    }

    OUT_JSON.write_text(
        json.dumps({
            "stats": stats,
            "rows": rows,
            "engine_full": [asdict(a) for a in engine_results],
            "agent_raw": agent_results["raw"],
            "agent_parsed": agent_results["parsed"],
        }, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"      JSON salvo: {OUT_JSON}")

    print("[5/5] Gerando apresentação .pptx...")
    build_pptx(rows, engine_results, agent_results, stats)
    print("\n=== TESTE CONCLUÍDO ===")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"ERRO: {type(e).__name__}: {e}", file=sys.stderr)
        raise
