# Migração Asaas → Mercado Pago (checklist)

Tudo já está escrito e pronto. Falta só **ligar** (feito com o token em mãos e
testado com R$0,01). O fluxo do Asaas continua no ar até este passo.

## Você faz (na conta PJ da GOAN)
1. Terminar a **Conta Negócio (CNPJ da GOAN)** no Mercado Pago.
2. **Teste de R$ 0,01**: gerar um PIX e pagar de outra conta → confirmar que o
   recebedor aparece como **GOAN** (e não seu nome pessoal). Se aparecer seu
   nome, a conta ainda está no CPF — resolver antes de seguir.
3. Em **Suas integrações → Criar aplicação** (logado como GOAN) → **Checkout
   Transparente** → copiar o **Access Token de produção**.
4. Na **Vercel** (Settings → Environment Variables, Production):
   - `MP_ACCESS_TOKEN` = (o Access Token de produção)
   - (opcional) manter `ASAAS_*` por enquanto, como plano B.
5. No painel do Mercado Pago → **Webhooks**: URL
   `https://maisumteto.com.br/api/webhook/mercadopago`, evento **Pagamentos**.

## Eu faço (mudança pequena no código, com teste real)
- `src/app/api/casinhas/route.ts`: trocar as 3 chamadas do Asaas
  (`criarCustomer` + `criarCobrancaPix` + `obterQrCodePix`) por **uma** chamada
  `criarPagamentoPix(...)` de `@/lib/mercadopago` (que já devolve o QR). Guardar
  `paymentId` em `asaasPaymentId` (reaproveitando a coluna) e o QR nos mesmos
  campos (`pixPayload`, `pixQrCodeImage`, `pixExpiraEm`).
  - `notificationUrl` = `https://maisumteto.com.br/api/webhook/mercadopago`
  - `expiraEmISO` = `expiracaoISO(72)`
- `src/app/api/casinhas/[id]/route.ts`: trocar o import do `consultarPagamento`/
  `statusEhPago` de `@/lib/asaas` para `@/lib/mercadopago` e usar
  `netValueCentavos` (já vem em centavos).
- Já existe `src/app/api/webhook/mercadopago/route.ts` (novo endpoint, pronto).

## Textos que mudam JUNTO com a migração (não antes, pra não mentir a taxa)
- `src/app/page.tsx` (`.transparencia`): trocar
  - "conta de GOAN no **Asaas**" → "conta de GOAN no **Mercado Pago**"
  - "taxa de **R$ 0,99** do sistema" → "taxa de **0,99% por PIX**"
- `src/app/pagar/[id]/page.tsx`: "Ambiente seguro · **Asaas**" → "· **Mercado Pago**"
- `src/app/admin/page.tsx`: "Taxas do **Asaas**" / "Quando o **Asaas**..." →
  Mercado Pago; e a taxa estimada por PIX passa a ser percentual (0,99% do
  bruto) em vez de fixa `TAXA_PIX_ESTIMADA_CENTAVOS`.
  - Ajustar `taxaPixEstimadaCentavos()`/cálculo pra 0,99% do valor (ou usar só o
    `netValue` real que já vem do MP).

## Verificação final
- R$0,01 real: cria casinha → paga PIX → tela vira "PAGO" (polling) e webhook
  marca `liquidoCentavos`.
- Conferir no `/admin` que bruto/líquido/taxa batem (taxa ≈ 0,99%).
