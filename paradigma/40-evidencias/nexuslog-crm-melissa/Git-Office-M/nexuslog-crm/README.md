# Nexus Log CRM — Guia de Deploy 
## Supabase + GitHub + Vercel

---

## 1. SUPABASE — Criar o banco de dados

**1.1** Acesse https://supabase.com e entre na sua conta.

**1.2** Clique em **New Project** e preencha:
- Nome: `nexuslog-crm`
- Senha do banco: (guarde essa senha)
- Região: `South America (São Paulo)`

**1.3** Aguarde o projeto ser criado (~2 minutos).

**1.4** No menu lateral, clique em **SQL Editor**.

**1.5** Clique em **New query**, cole TODO o conteúdo do arquivo:
```
supabase/migrations/001_schema.sql
```
e clique em **Run**.

✅ Pronto — tabelas criadas.

**1.6** Pegue suas credenciais:
- Vá em **Settings → API**
- Copie o **Project URL** (ex: https://xxxxx.supabase.co)
- Copie o **anon public key**

**1.7** Ative o e-mail de confirmação (opcional mas recomendado):
- Vá em **Authentication → Email Templates**
- Confirme que "Confirm signup" está ativo

---

## 2. GITHUB — Subir o código

**2.1** Crie um repositório novo em https://github.com/new:
- Nome: `nexuslog-crm`
- Visibilidade: **Private** (recomendado)
- NÃO inicialize com README

**2.2** No terminal da sua máquina, dentro da pasta do projeto:

```bash
git init
git add .
git commit -m "feat: nexuslog crm inicial"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/nexuslog-crm.git
git push -u origin main
```

✅ Código no GitHub.

---

## 3. VARIÁVEIS DE AMBIENTE — Configurar .env.local

**3.1** Na sua máquina, copie o arquivo de exemplo:
```bash
cp .env.example .env.local
```

**3.2** Abra `.env.local` e preencha:
```
REACT_APP_SUPABASE_URL=https://SEU_PROJETO.supabase.co
REACT_APP_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

> ⚠️ NUNCA envie o .env.local para o GitHub. Ele já está no .gitignore.

---

## 4. VERCEL — Deploy automático

**4.1** Acesse https://vercel.com e entre na sua conta.

**4.2** Clique em **Add New → Project**.

**4.3** Importe o repositório `nexuslog-crm` do GitHub.

**4.4** Em **Environment Variables**, adicione as duas variáveis:
```
REACT_APP_SUPABASE_URL    = https://SEU_PROJETO.supabase.co
REACT_APP_SUPABASE_ANON_KEY = sua_anon_key_aqui
```

**4.5** Clique em **Deploy**.

✅ Em ~2 minutos o app estará online com um link como:
`https://nexuslog-crm.vercel.app`

---

## 5. PRIMEIRO ACESSO

**5.1** Abra o link gerado pelo Vercel.

**5.2** Clique em **"Criar conta"** e cadastre seu e-mail e senha.

**5.3** Confirme o e-mail se solicitado.

**5.4** Faça login e comece a usar!

---

## 6. DOMÍNIO PERSONALIZADO (Opcional)

Para usar um domínio próprio como `crm.nexuslogin.com.br`:

**6.1** No Vercel, vá em **Settings → Domains**.

**6.2** Adicione o domínio e siga as instruções de DNS.

---

## DEPLOY AUTOMÁTICO (CI/CD)

A partir de agora, sempre que você fizer:
```bash
git add .
git commit -m "sua mensagem"
git push
```
O Vercel detecta automaticamente e faz o deploy em ~1 minuto.

---

## ESTRUTURA DO PROJETO

```
nexuslog-crm/
├── public/
│   └── index.html
├── src/
│   ├── App.js                  ← entrada principal
│   ├── index.js
│   ├── lib/
│   │   ├── supabase.js         ← conexão Supabase
│   │   └── AuthContext.js      ← login / sessão
│   ├── hooks/
│   │   └── useData.js          ← propostas e visitas (API)
│   ├── components/
│   │   ├── Layout.js           ← sidebar + topbar
│   │   └── UI.js               ← Badge, Toast, Modal...
│   └── pages/
│       ├── PageAuth.js         ← login / cadastro
│       ├── PageDashboard.js    ← painel principal
│       ├── PageProposals.js    ← lista de propostas
│       ├── PageNewProposal.js  ← wizard nova proposta + voz
│       ├── PageVisits.js       ← agenda de visitas
│       ├── PageDetail.js       ← detalhe de proposta
│       └── PageCatalog.js      ← catálogo HELI
├── supabase/
│   └── migrations/
│       └── 001_schema.sql      ← SQL do banco (rodar 1x)
├── .env.example                ← modelo das variáveis
├── .gitignore
└── package.json
```

---

## SUPORTE

Em caso de dúvidas:
- Supabase: https://supabase.com/docs
- Vercel: https://vercel.com/docs
- React: https://react.dev
