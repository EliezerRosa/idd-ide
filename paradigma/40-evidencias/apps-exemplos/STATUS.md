# Apps de exemplo (Barbearia, Cafeteria, Racha de Conta) — status 🧪 DEMONSTRAÇÃO

Cada pasta tem um protótipo: interface HTML, `domain_rules.ts` (regras de domínio checadas em
tempo de execução, com `throw`) e `schema.sql` (CHECK, trigger de colisão).

| Item | Status |
| --- | --- |
| Invariantes declaradas e checadas em runtime / constraints de banco | ✅ no protótipo |
| Suítes "240 testes" / "200 testes", deploy "4 s", "384 comandas, zero erros" | 🧪 encenação |
| Apps em produção para clientes | ❌ não |
| Prova formal das invariantes | 🔭 |
