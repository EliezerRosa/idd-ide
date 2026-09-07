# AXIOMA — Memória persistente sempre, sem pedir (2026-04-28)

- Início de toda conversa: listar `/memories/`, `/memories/session/`, `/memories/repo/` e ler o que for relevante.
- Manter nota viva em `/memories/session/<assunto>.md` (objetivo, decisões, arquivos, próximos passos).
- Promover ao fim de blocos: `/memories/repo/<tema>-YYYY-MM-DD.md` (workspace) ou `/memories/<tema>.md` (transversal).
- NUNCA esperar o usuário pedir "salve/memorize". Default = gravar.
- **A cada bloco lógico fechado, salvar ANTES de prosseguir** (reduz janela de perda por shutdown/crash).
- **Substituir memória = CREATE-then-DELETE, nunca DELETE-then-CREATE** (zero janela de perda).
- Antes de criar arquivo novo: listar pasta para evitar duplicata; preferir `str_replace`/`insert`.
- Em `/memories/` (user): bullets curtos, 1 linha por fato. Brevidade crítica (auto-load).
- Reforço duplicado em: `prompts/axiom-always-save-memory.instructions.md` (global VS Code) e `.github/copilot-instructions.md` (por repo).
- **ESTADO VIVO**: cada workspace tem `/memories/repo/_ESTADO-ATUAL.md` (nome FIXO, perene, nunca descartado). LER PRIMEIRO em toda conversa p/ posicionar no estado/objetivos mais recentes; ATUALIZAR in-place ao fim de cada bloco. Criar se não existir.


## Salvar
- Decisões arquiteturais, restrições descobertas, alternativas escolhidas.
- Comandos/paths/configs não-óbvios.
- Erro + solução que funcionou.
- Convenções de build/deploy/encoding/naming.
- Gaps e backlog acordados.

## Não salvar
- Conversa social, perguntas triviais, exploração sem desfecho.
- Conteúdo já no código (apontar caminho basta).
- Detalhes voláteis (código intermediário).
