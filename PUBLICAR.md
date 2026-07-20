# Publicar

O bolão e a plataforma agora são **um projeto só**, no mesmo repositório e no
mesmo domínio:

| Endereço | O que é |
|---|---|
| `maisumteto.com.br` | a plataforma (a campanha nova) |
| `maisumteto.com.br/bolaodacopa` | o bolão, como sempre foi |
| `maisumteto.com.br/painel` | o painel da equipe |

Publicar é dar push nesta branch. A Vercel faz o resto sozinha: instala, cria as
tabelas que faltarem no banco, prepara a campanha e sobe.

## Antes do primeiro deploy: 3 variáveis

Na Vercel, no projeto `maisumteto`, em **Settings → Environment Variables**:

| Nome | Valor | Para quê |
|---|---|---|
| `APP_SECRET_KEY` | 64 caracteres aleatórios | embaralha as credenciais guardadas |
| `SEMEAR_EMAIL` | seu e-mail | vira o login do painel |
| `SEMEAR_SENHA` | uma senha sua (8+ caracteres) | vira a senha do painel |

`DATABASE_URL` e `MP_ACCESS_TOKEN` já existem no projeto, do bolão. O banco é o
mesmo: as tabelas da plataforma foram criadas ao lado das do bolão, sem encostar
nelas.

Para gerar a `APP_SECRET_KEY`, use qualquer gerador de senha com 64 caracteres,
por exemplo <https://1password.com/password-generator>.

**Se as três não estiverem lá, o deploy falha** com uma mensagem dizendo
exatamente qual falta. Isso é de propósito: melhor falhar do que subir um site
com senha em branco.

## Depois que subir

1. Entre em `maisumteto.com.br/entrar` com o e-mail e a senha que você definiu
2. Cadastre as ações pela **Caixa de ferramentas**
3. Cada ação nasce como rascunho: só aparece no site quando você publicar

## Nos deploys seguintes

Não precisa de nada. A semeadura percebe que a campanha já existe e não mexe em
nada. Pode até apagar `SEMEAR_SENHA` depois do primeiro deploy.

## O que ainda NÃO funciona

**Pagamento.** As ações aparecem, têm página e podem ser organizadas, mas ainda
não recebem PIX. O site sobe como vitrine, não como arrecadação.
