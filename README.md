# Bolão da Final da Copa — Casa Amiga de Dezembro (Teto)

Sistema de bolão simples: a pessoa dá um palpite no placar da final, paga **R$ 10 via PIX** (cai direto na sua conta **Asaas**) e a confirmação é automática. Você acompanha tudo por um painel.

- **Página pública** (`/`) — formulário de palpite + geração do PIX.
- **Página de pagamento** (`/pagar/[id]`) — QR Code + Pix Copia e Cola, confirma sozinho.
- **Painel admin** (`/admin`) — apostas, quem pagou, total arrecadado e palpites agrupados por placar (pra achar o vencedor depois do jogo).
- **Webhook** (`/api/webhook/asaas`) — o Asaas avisa o sistema quando o PIX é pago.

---

## 1. Rodar no seu computador (teste)

```bash
npm install
npm run db:push      # cria o banco local (SQLite)
npm run dev          # abre em http://localhost:3000
```

Para o PIX funcionar de verdade você precisa da **chave de API do Asaas** (passo 3).
Sem a chave, o site abre normalmente, mas ao apostar aparece um aviso pedindo a chave.

---

## 2. Configurar o bolão

Edite o arquivo **`.env.local`** (já existe na pasta). Os campos principais:

| Variável | Para que serve |
|---|---|
| `NEXT_PUBLIC_TIME_CASA` | Nome do 1º time (ex.: `Brasil`) |
| `NEXT_PUBLIC_TIME_VISITANTE` | Nome do 2º time (ex.: `Argentina`) |
| `NEXT_PUBLIC_DATA_JOGO` | Data da final (ex.: `19/07/2026`) |
| `NEXT_PUBLIC_NOME_EVENTO` | Título do evento |
| `VALOR_APOSTA_CENTAVOS` | Valor da aposta em centavos (`1000` = R$ 10,00) |
| `ADMIN_PASSWORD` | Senha do painel `/admin` |

Depois de editar, pare (`Ctrl+C`) e rode `npm run dev` de novo.

---

## 3. Pegar a chave do Asaas (PIX)

1. Entre na sua conta em **asaas.com**.
2. Vá em **Configurações → Integrações → API** (menu "Chave de API").
3. **Comece pelo Sandbox** (ambiente de testes, dinheiro fake): crie uma conta em **sandbox.asaas.com**, pegue a chave lá e teste tudo sem risco.
4. No `.env.local`, preencha:
   ```
   ASAAS_ENV="sandbox"
   ASAAS_API_KEY="a_chave_que_voce_copiou"
   ```
5. Quando tudo estiver funcionando, troque para produção:
   ```
   ASAAS_ENV="production"
   ASAAS_API_KEY="sua_chave_de_producao"
   ```
   > ⚠️ A chave de **sandbox** só funciona com `ASAAS_ENV="sandbox"`, e a de **produção** só com `ASAAS_ENV="production"`. Não misture.

> **Observação:** o Asaas exige o **CPF** de quem paga para gerar o PIX — por isso o formulário pede CPF.

---

## 4. Publicar na internet (Vercel + banco Postgres)

O SQLite local não funciona na Vercel (servidor sem disco fixo). Para produção use um **Postgres gratuito** (Neon ou Vercel Postgres).

### 4.1 Trocar o banco para Postgres
No arquivo `prisma/schema.prisma`, troque:
```prisma
provider = "sqlite"
```
por:
```prisma
provider = "postgresql"
```

### 4.2 Criar o banco
- Crie um Postgres grátis em **neon.tech** (ou use **Vercel Postgres** no painel da Vercel).
- Copie a *connection string* (algo como `postgresql://...`).

### 4.3 Publicar
1. Suba o código para o GitHub.
2. Na **Vercel**, importe o repositório.
3. Em **Settings → Environment Variables**, cadastre TODAS as variáveis do `.env.local`
   (menos as de teste), com `DATABASE_URL` apontando para o Postgres e `ASAAS_ENV=production`.
4. Faça o deploy.
5. Crie a tabela no banco de produção rodando uma vez, no seu PC, apontando para o Postgres:
   ```bash
   # coloque a DATABASE_URL do Postgres no .env e rode:
   npx prisma db push
   ```

### 4.4 Configurar o webhook do Asaas
Para a confirmação automática funcionar em produção:
1. No painel do Asaas: **Configurações → Integrações → Webhooks**.
2. **URL:** `https://SEU-SITE.vercel.app/api/webhook/asaas`
3. **Token de autenticação:** exatamente o mesmo valor de `ASAAS_WEBHOOK_TOKEN`.
4. Ative os eventos de **cobrança/pagamento** (payment received/confirmed).

> Mesmo sem webhook, a página de pagamento confirma sozinha (ela consulta o Asaas a cada poucos segundos). O webhook só deixa a confirmação mais imediata e confiável.

---

## 5. Como usar no dia

- Divulgue o **link da página inicial** (`/`) pra galera apostar.
- Cada pessoa pode apostar **quantas vezes quiser** (cada palpite = uma cobrança de R$ 10).
- Você acompanha tudo em **`/admin`** (senha do `ADMIN_PASSWORD`): total arrecadado, quem pagou, WhatsApp pra contato e os palpites agrupados por placar.
- **Depois da final**, veja no painel quem acertou o placar e entre em contato pelo WhatsApp.

---

## Estrutura do projeto

```
src/
  app/
    page.tsx                 # página pública (form)
    pagar/[id]/page.tsx      # tela de pagamento (QR + polling)
    admin/page.tsx           # painel
    api/
      apostas/route.ts       # cria aposta + cobrança PIX
      apostas/[id]/route.ts  # consulta status (confirma pagamento)
      webhook/asaas/route.ts # recebe confirmação do Asaas
      admin/apostas/route.ts # lista apostas (protegido por senha)
  components/FormAposta.tsx  # formulário
  lib/
    asaas.ts                 # cliente da API do Asaas
    config.ts                # configuração do bolão
    db.ts                    # conexão Prisma
    validacao.ts             # CPF, WhatsApp, etc.
prisma/schema.prisma         # modelo do banco
```

## Aviso legal

Um "bolão" entre conhecidos com fins beneficentes é comum, mas apostas no Brasil têm regras.
Como isso é uma arrecadação da **Casa Amiga de Dezembro (Teto)**, confirme com a organização
a melhor forma de enquadrar juridicamente (rifa/vaquinha autorizada, etc.) antes de divulgar amplamente.
