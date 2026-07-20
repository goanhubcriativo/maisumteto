# O modelo, e por que ele e assim

Documento curto de decisoes. O schema conta o "o que"; aqui fica o "por que",
que e a parte que some da memoria em tres meses.

## O problema

A Teto arrecada casa por casa (~R$ 18 mil cada) via contratos de casa amiga: um
grupo de ate 30 pessoas se junta e faz uma vaquinha. Na pratica os voluntarios
foram muito alem da doacao pura: fazem bolao, rifa, vendem camisa, fazem bingo,
jantar, corrida. Cada acao cobra um valor simbolico que paga o proprio custo, e
o resto vai pra casa.

Isso hoje acontece no escuro. A camisa e vendida no WhatsApp sem controle, o PIX
cai na conta pessoal do voluntario e depois ele deposita na vaquinha. Ninguem
sabe quanto cada acao rendeu de verdade, e quem doa nao ve nada disso.

## A abstracao central

```
Campanha (a casa, meta de R$ 18 mil)
  └── Acao (doacao, bolao, rifa, camisa, jantar)
        └── Item  ──┐
                    ├── Pedido (um PIX)
        Doacao extra┘
                         └── Lancamento (o livro-caixa)
```

Toda acao, por baixo, produz a mesma coisa: um **Pedido** pago via PIX, com
**Itens** carimbados com a acao de origem. E todo dinheiro que se move vira um
**Lancamento**. O tipo da acao muda a tela e as regras, nunca o caminho do
dinheiro. E o que permite somar bolao com camisa na mesma barra de progresso.

O que e especifico de cada tipo (o placar do bolao, o numero da rifa, o tamanho
da camisa) mora em `Item.dados` (Json). O que configura a acao (o premio da rifa,
o local do jantar) mora em `Acao.config`. Nenhum dos dois vira coluna, senao a
tabela vira um pantano de campos nulos.

## Regra de ouro: a barra mostra o liquido

`liquido = bruto - custo da acao - taxa do gateway`

Uma camisa de R$ 50 que custou R$ 28 nao sao R$ 50 de vaquinha. Toda vakinha
generica mostra o bruto porque so conhece doacao, onde bruto e quase liquido.
Aqui nao da: acao com custo e o normal, nao a excecao. Mostrar bruto seria
mentir pra quem doa e pra propria equipe.

### Custo

O custo tem dois modos, e escolher o certo muda o que a pagina diz.

**1. Custo por unidade (`Acao.custoUnitarioCentavos`), o padrao para mercadoria.**
Vira lancamento de CUSTO a cada item pago, entao ele **comeca em zero e so sobe
quando vende**. E o caso da camisa: cada camisa vendida reconhece os R$ 28 dela.

As camisas paradas no estoque **nao sao custo**, sao estoque: o dinheiro saiu,
mas elas ainda podem virar venda. Lancar as 30 de uma vez faria a acao nascer em
-R$ 840 e parecer um fracasso no dia em que ela ainda nao teve chance nenhuma.

> Correcao de rumo (19/07/2026): a primeira versao lancava o lote inteiro de
> camisas como custo adiantado, e a acao nascia no vermelho. Estava errado.
> Custo de mercadoria acompanha a venda, nao a compra.

**2. Custo fixo, que existe mesmo sem venda nenhuma.** O aluguel do salao do
jantar, o premio da rifa ja comprado. Esse nao tem campo: entra como Lancamento
manual de CUSTO amarrado na acao. Aqui a acao **pode** aparecer no vermelho, e
deve: o dinheiro saiu e nao volta se ninguem comprar.

A pergunta que separa os dois: *se eu nao vender mais nenhuma unidade, esse gasto
ainda existe?* Se sim, e fixo. Se nao, e por unidade.

## Lancamento e a unica fonte de verdade

Somar Pedido pago daria o bruto. Pedido e o que a pessoa prometeu pagar;
Lancamento e o que aconteceu com o dinheiro. O extrato so soma Lancamento.

O sinal ja vai gravado no valor (RECEITA positiva, CUSTO e TAXA negativos), entao
o liquido de qualquer recorte e uma soma simples da coluna. Ninguem cria
Lancamento na mao: so pelos helpers de `src/lib/lancamentos.ts`. Sinal trocado
nao quebra nada na hora, so faz o extrato mentir tres semanas depois.

**Taxa e rateada.** O gateway cobra uma vez por PIX, mas um pedido pode misturar
camisa e rifa. A taxa e distribuida proporcional ao peso de cada parcela
(`ratear()`), com a sobra do arredondamento indo pra ultima, entao a soma bate
exatamente com a taxa cobrada. Sem isso, "quanto a camisa rendeu" seria chute.

**Idempotencia.** O webhook do Mercado Pago repete quando nao recebe 200 a tempo.
`registrarPedidoPago()` checa se o pedido ja tem lancamento antes de criar. Sem
essa guarda, um pagamento faria a vaquinha subir duas vezes.

## Dinheiro: BYO-key, e o repasse visivel

O PIX cai **direto na conta da equipe**, via credencial da propria equipe. A
plataforma nunca custodia dinheiro de terceiro, o que te tira do papel de
intermediador de pagamento (que exigiria KYC e conversa juridica).

**A ligacao e por OAuth, nao por token colado.** O publico e voluntario com conta
pessoa fisica. Pedir pra ele criar aplicacao no painel de desenvolvedor do
Mercado Pago e colar o Access Token de producao e a barreira que mata a adocao, e
seria a pior credencial possivel pra guardar: poder total, vida eterna. O OAuth
aceita PF, devolve token com escopo e expiracao (180 dias) mais refresh token, o
proprio voluntario revoga quando quiser, e e o mesmo trilho do modelo marketplace
(`application_fee`) se um dia a plataforma cobrar taxa.

Nada de credencial em texto puro: tudo passa por `src/lib/cripto.ts`
(AES-256-GCM, que alem de cifrar autentica, entao ciphertext adulterado quebra
em vez de devolver lixo).

### O ponto mais importante do produto

Com conta pessoa fisica, **o dinheiro fica na conta pessoal do lider ate ele
repassar pra Teto**. Ou seja: a plataforma nao elimina o problema original, ela o
documenta. A saida nao e lutar contra isso, e tornar a divida visivel:

> R$ 4.200 arrecadados · R$ 3.000 repassados a Teto · R$ 1.200 na conta do lider
> · ultimo repasse em 3 de julho

Isso transforma conta pessoal de buraco de confianca em transito auditado, e e
mais honesto do que qualquer vakinha entrega hoje.

Por isso **Repasse nao e Lancamento**, e isso e proposital. Sao perguntas
diferentes:

- Lancamento responde *quanto a campanha arrecadou*.
- Repasse responde *onde esse dinheiro esta agora*.

Se repasse fosse um lancamento negativo, a barra de progresso andaria pra tras
justo quando o dinheiro chega na Teto, exatamente ao contrario do que aconteceu.

`saldoARepassar = liquido dos lancamentos - soma dos repasses`

E `Repasse.comprovanteUrl` importa: sem comprovante, o repasse e so uma afirmacao
do lider sobre si mesmo.

Na mesma linha, `Equipe.recebedorRotulo` aparece na pagina publica. Se o dinheiro
passa por uma conta pessoal, quem doa tem que saber de quem e a conta **antes**
de pagar, nao depois.

## Multi-tenant desde o inicio

Equipe e o tenant. Nasce multi-tenant no schema mesmo o piloto sendo de uma
equipe so, porque enfiar tenant depois em cima de dados reais e cirurgia. Mas as
regras e a identidade sao da Teto por cima: nao generalizar pra "qualquer ONG"
enquanto nao existir a segunda ONG.

## O piloto vem antes do SaaS

Decisao de 16/07/2026: o alvo agora e **validar o sistema com uma equipe so, a
nossa**. Abrir pra outras equipes vem depois, em pelo menos 30 dias.

Na pratica isso significa: uma equipe, um usuario, e a conta do Mercado Pago ja
conectada por `MP_ACCESS_TOKEN` no `.env`, igual o bolao faz hoje. Os campos
`gatewayTokenCifrado`/`gatewayRefreshCifrado` ficam vazios ate o OAuth entrar.

O schema continua multi-tenant mesmo assim, porque enfiar tenant depois em cima
de dados reais e cirurgia. Ligar o OAuth por cima nao exige mexer no modelo.

## Estado atual

Feito e verificado:

- Schema (`prisma validate` passa), cripto, livro-caixa (escrita e leitura),
  helpers de dinheiro.
- `ratear()` testado: a soma fecha exata em todas as combinacoes testadas.
- Pagina publica da campanha, conferida em 375px e no desktop, sem vazamento.
- Seed com a campanha, as acoes e vendas ficticias.

A tela e alimentada por props (`CampanhaView`), nao pelo banco direto. Por isso
existe `/previa`, que roda sem Postgres com dados de exemplo calculados pela
mesma regra do sistema. `/previa` nao existe em producao: numero de mentira em
pagina publica e pedir doacao sob falso pretexto.

Nao existe ainda: a pagina de cada acao, o fluxo de pagamento (PIX + webhook),
o admin (extrato, CRUD de acoes, registro de repasse) e auth.

O bolao (`../TetoPR`) continua no ar, intocado. Ele vira uma Acao do tipo BOLAO
aqui dentro quando o fluxo de pagamento estiver de pe.
