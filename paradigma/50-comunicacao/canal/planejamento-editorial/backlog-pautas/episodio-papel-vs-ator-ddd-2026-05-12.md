# Episódio YT — "O dia em que o Presidente sumiu (e o domínio sobreviveu)"

Material para futuro vídeo no canal de Eliezer abordando IDD + DDD + IA na prática.
Caso real: refactor da identidade do Publicador no RVM Designações em 2026-05-12.

---

## 1. Logline (1 frase)

> Mostro ao vivo um refactor de domínio onde apaguei o Presidente da agenda — e o sistema, em vez de quebrar, lembrou que aquele papel ainda existia. Esse é o momento em que DDD deixa de ser teoria.

---

## 2. Hook (primeiros 15 segundos)

Mostrar tela com:
- Linha vermelha: `resolved_publisher_id = 'AUTO_CHAIRMAN'` (sentinel mágico)
- Cursor passa por cima, fala: "Isso aqui é uma string. Não é um id. Não é um papel. É uma mentira que o banco de dados aceitou por anos."
- Corte para terminal: `ERROR: 23503 Key is not present in table "publishers"`
- "Hoje eu vou contar como transformei essa mentira em duas verdades — e por que isso importa pra qualquer pessoa que escreve software."

---

## 3. Estrutura do vídeo (~12-15 min)

### Ato 1 — A mentira confortável (2 min)
- O sistema RVM gera designações da reunião do meio de semana.
- Algumas partes vão automaticamente para o Presidente da reunião (quem ele for).
- Solução antiga: gravar a string literal `"AUTO_CHAIRMAN"` no campo do publicador.
- **Problema invisível**: o campo `resolved_publisher_id` mente. Diz "esse é o id de um publicador" mas guarda uma palavra mágica.
- DBA olha e pensa: "tem foreign key?" Não. Por quê? Porque a string nunca seria um id válido.

### Ato 2 — Por que isso quebra (2 min)
- Quando o Presidente real é designado, o código tem que **rastrear** todas as partes com a mentira e propagar o id correto.
- Toda query que filtra publicador precisa de um `if (id !== 'AUTO_CHAIRMAN')`.
- Toda lógica de impressão de cartão S-89 precisa lembrar de pular essas partes.
- Cada lugar que esqueceu de colocar o `if` virou um bug em potencial.
- **Esse é o sintoma clássico de um conceito faltando no domínio.**

### Ato 3 — A pergunta DDD (3 min)
> "O que essa string está tentando me dizer?"

Resposta: ela está colapsando **dois conceitos diferentes** em um único lugar:
1. **Papel**: "esta parte é, por definição, do Presidente da semana."
2. **Identidade**: "este publicador concreto (Emerson França, id=20) é quem vai executar."

Antes do refactor, perder o publicador = perder o papel. Os dois nasciam e morriam juntos na mesma string.

DDD diz: separe. Dê nome a cada um. Deixe o banco impor a verdade.

Solução:
- Coluna nova `is_chairman_derived BOOLEAN` → carrega o **papel**.
- FK em `resolved_publisher_id → publishers(id) ON DELETE SET NULL` → carrega a **identidade**.
- Banco agora rejeita id inválido (PostgreSQL erro `23503`).
- Banco agora **preserva o papel** mesmo quando o ator desaparece.

### Ato 4 — A prova ao vivo (3-4 min) ⭐ ponto alto
Tela dividida: SQL no Supabase + log do agente.
1. Mostrar a tabela com 7 partes da semana 2026-05-18, todas marcadas `is_chairman_derived=true` e apontando para `Emerson França (id=20)`.
2. `BEGIN; DELETE FROM publishers WHERE id='20'; ROLLBACK;` (transação descartável).
3. Mostrar o `SELECT` no meio: `resolved_publisher_id = NULL`, `is_chairman_derived = true`.
4. Frase de impacto:

> "O Emerson sumiu. Mas o domínio não esqueceu que aquela parte é do Presidente. Esse é o tipo de comportamento que você só consegue quando o modelo é honesto com a realidade que descreve."

### Ato 5 — A meta-narrativa (2 min) — fechamento IDD
- Eu, humano, declarei a **intenção** ("quero separar papel de identidade, e ON DELETE deve preservar o papel").
- O agente IA escreveu as migrations, refatorou 8 arquivos, rodou 9 testes (6 SQL + 3 E2E em browser real), tudo em uma tarde.
- Mas **a decisão epistêmica** — qual conceito existe, qual invariante precisa sobreviver, o que significa "Presidente sumir" — essa **continuou minha**.
- "Isso é IDD: eu penso o domínio, a IA executa o operacional. E o teste T5 é a prova de que pensamos juntos a coisa certa."

### CTA final
- "Se você está com uma string mágica num campo do seu banco agora, a pergunta não é 'como migro isso'. A pergunta é: 'que conceito eu não nomeei ainda?'"

---

## 4. Frases de impacto (cards on-screen)

- "Foreign key não é detalhe de implementação. É um juramento de honestidade."
- "Toda string mágica num campo de id é um conceito do seu domínio chorando para nascer."
- "Augmenting ≠ Automating. Eu não automatizei o pensamento — eu deleguei o teclado."
- "O papel sobrevive ao ator. Esse foi o momento em que o software começou a entender o negócio."
- "Sentinel é dívida técnica disfarçada de simplicidade."

---

## 5. B-roll / visuais sugeridos

- Diff git lado a lado: `'AUTO_CHAIRMAN'` riscado vs `is_chairman_derived: true`
- Diagrama: 1 caixa "publicador" → 2 caixas "Papel" e "Identidade" (separação)
- Animação: deletar o publicador → linha cintila amarelo, FK vai a NULL, **flag continua verde**
- Terminal real rodando os 9 testes com ✅ aparecendo um a um
- Tarja Chromium "--no-sandbox" mostrando que isso é teste real, headed, navegador de verdade

---

## 6. Métricas de credibilidade (mostrar em tela)

| Antes | Depois |
|---|---|
| 21 strings mágicas no banco | 0 |
| 0 foreign keys neste campo | 1 (com ON DELETE SET NULL) |
| ~5 lugares com `if === 'AUTO_CHAIRMAN'` | 0 |
| `tsc --noEmit` clean | clean |
| Testes DDD | 9 passando |
| Linhas de código | +39 / -20 |
| Commit de checkpoint para rollback | sim, com tag git |
| Backup de 40 tabelas antes de tocar | sim |

---

## 7. Tags / SEO sugeridos

DDD, Domain-Driven Design, refactor, Supabase, PostgreSQL, foreign key, IDD,
Intent-Driven Development, IA na prática, Engelbart, Augmenting Intellect,
software arquitetura, modelagem de domínio, sentinel value antipattern.

---

## 8. Título — 5 opções para A/B

1. "O dia em que apaguei o Presidente — e o sistema sobreviveu"
2. "DDD na vida real: como uma string mágica virou dois conceitos"
3. "Refactor de domínio com IA: pensei o quê, ela fez o como"
4. "ON DELETE SET NULL: a feature mais subestimada do PostgreSQL"
5. "Eu deletei a entidade. O papel continuou. Bem-vindo ao DDD."

---

## 9. Notas para edição

- Manter ritmo: cortar respirações, deixar pausas só nos momentos de "frase chave".
- Quando aparecer SQL, dar zoom na linha que importa e desfocar o resto.
- O T5 (delete + rollback) é o **clímax**. Não atropelar. Pode ter trilha sonora subindo.
- Encerrar com tela preta + frase: "Pense o domínio. Delegue o teclado."

---

## 10. Conexão com episódios anteriores/futuros

- Continuação natural de: "IDD — paradigma revolucionário" (apresentação YouTube de abril/2026).
- Conecta com episódio futuro sobre: "Comando Epistêmico vs. Operacional" (memória `idd-comando-epistemico-vs-operacional.md`).
- Pode virar série: "Casos reais de DDD em sistemas pequenos" — usar outros refactors do RVM como exemplos.
