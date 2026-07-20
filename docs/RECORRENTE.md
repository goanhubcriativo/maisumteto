# Doação recorrente: por que não é débito automático

## O que testamos

O Mercado Pago habilitou Pix Automático na conta, a 0,99%. Mas **não existe API
pública para ele**. Isso foi verificado, não suposto:

1. A API de assinaturas (`POST /preapproval`) **funciona** na conta: criou nas
   quatro tentativas (201).
2. Mas o `payment_method_id` que enviamos volta sempre `null`. O meio de
   pagamento não é escolhido na criação: o MP devolve um `init_point`, um link
   de checkout onde **quem paga** escolhe.
3. Abrindo esse checkout **deslogado**, as opções são: entrar com conta Mercado
   Pago, ou **cartão de crédito**. PIX não aparece.
4. A referência de API do Mercado Pago não tem seção de Pix Automático.

Ou seja: `/preapproval` é assinatura **por cartão**. Não serve.

## Por que não usamos assim mesmo

Exigir cartão de crédito, ou conta no Mercado Pago com login, numa página onde
hoje a pessoa abre o app do próprio banco e paga em PIX, custaria mais doação do
que o esquecimento custa. O público de vaquinha de voluntário paga por PIX porque
é o que ele tem e o que ele sabe usar.

## O que construímos no lugar

O problema real nunca foi "falta débito automático": era **compromisso vira
esquecimento**. Dá para atacar isso sem cobrança automática.

O sistema faz todo o trabalho chato:

- guarda quem se comprometeu, com quanto e por quantas parcelas;
- todo dia de manhã (agendador da Vercel, `/api/rotina`), procura as cobranças
  que vencem, **gera o PIX** de cada uma e deixa pronta;
- monta a mensagem de lembrete com o link de pagamento;
- quando a pessoa paga, conta a parcela, marca a próxima e encerra no fim.

Sobra para a equipe **um toque**: abrir o WhatsApp já com o texto pronto, em
`/painel/recorrentes`.

### Por que link `wa.me` e não a API do WhatsApp

A API oficial custa, exige aprovação prévia de cada modelo de mensagem e leva
semanas para liberar. Um link que abre a conversa com o texto pronto resolve hoje,
sai do telefone da própria pessoa (o que é mais pessoal, e converte melhor) e não
depende de aprovação de ninguém.

Se um dia o volume justificar, trocar o link pela API é mudar uma função.

## Detalhes que custaram teste

**Somar um mês em JavaScript transborda.** `31 de janeiro + 1 mês` vira 3 de
março, porque fevereiro não tem dia 31. Numa recorrência, isso pularia um mês
inteiro de doação. A função corrige para o último dia do mês de destino
(`testes/recorrencia.js`).

**Confirmação dupla não pode contar parcela duas vezes.** O webhook e a consulta
da tela podem confirmar o mesmo pagamento. Os dois só avançam a assinatura quando
`registrarPedidoPago` diz que o registro foi novo.

**A rotina é protegida por segredo** (`CRON_SECRET`). Sem isso, qualquer um
poderia dispará-la de fora e forçar criação de cobranças em massa na conta do
Mercado Pago.

## Se o Mercado Pago publicar a API

O modelo já está pronto para receber: `Assinatura` guarda o compromisso e cada
cobrança vira um `Pedido` normal. Trocar "gerar PIX e lembrar" por "debitar
automaticamente" mexe em `src/lib/assinaturas.ts` e em nada mais.
