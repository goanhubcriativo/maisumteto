# O painel: caixa de ferramentas, blocos e login

Documento das decisões desta etapa. O "o que" está no código; aqui fica o "por
que", que é a parte que some da memória.

## A ideia que sustenta tudo: ação é receita, não formulário

Uma vaquinha comum te dá um formulário vazio e boa sorte. Quem organiza uma rifa
pela primeira vez não sabe que precisa definir data de sorteio, quem confere o
resultado, e o que acontece se sobrar número.

Aqui cada tipo de ação é uma **receita** (`src/lib/catalogo.ts`) que já sabe:

- **como funciona**, em passos, escrito para quem nunca fez;
- **o que perguntar** (os campos, cada um com ajuda que ensina, não que descreve);
- **de onde vem o custo** (por unidade ou fixo), o que muda o livro-caixa;
- **com que blocos a página nasce montada**;
- **o checklist do que fazer fora do sistema** (reservar o salão, comprar o prêmio);
- **a armadilha**, ou seja, o erro que quase todo mundo comete na primeira vez.

O sistema conhece o ofício de arrecadar, não só o de cobrar. É isso que o Doare
e as vaquinhas genéricas não fazem, e é caro de copiar porque exige conhecer o
ofício, não só programar um formulário.

### As dez receitas

| Receita | Preço | Custo | Estoque | Esforço |
|---|---|---|---|---|
| Doação livre | livre | nenhum | não | 1 |
| Doação recorrente | livre | nenhum | não | 1 |
| Rifa | fixo | fixo | sim | 2 |
| Bingo | fixo | misto | sim | 4 |
| Venda de produtos | fixo | por unidade | sim | 3 |
| Evento com ingresso | faixas | misto | sim | 5 |
| Ação de coleta | livre | nenhum | não | 3 |
| Leilão | lance | nenhum | sim | 2 |
| Bolão | fixo | nenhum | não | 2 |
| Ação livre | fixo | nenhum | não | 2 |

O **esforço** aparece na caixa de ferramentas de propósito: a equipe precisa
escolher sabendo no que está se metendo. Um evento presencial não é uma rifa.

## Doação recorrente: compromisso, não débito automático

PIX não tem cobrança recorrente. A saída óbvia seria cartão, mas cartão pede mais
dados, falha por vencimento, cobra mais caro e afasta quem não tem.

Então "recorrente" aqui é **compromisso**: a pessoa promete um valor por semana
ou por mês, e a cada período recebe um PIX novo no WhatsApp para pagar com um
toque. Parar é só não pagar a próxima.

Isso é mais honesto (a página promete o que o PIX faz) e mais barato. Cada
parcela paga vira um Pedido normal, então entra no livro-caixa pelo mesmo caminho
de todo o resto; a Assinatura só guarda a promessa.

A armadilha registrada na receita é justamente essa: **nunca prometer débito
automático na página.**

## O construtor de blocos

Cada campanha e cada ação têm uma pilha de blocos. São 18 tipos, em quatro
famílias: Escrita, Imagem, Estrutura e Automático.

### Bloco guarda conteúdo, nunca aparência

Não existe cor, fonte, tamanho ou margem no conteúdo do bloco. O visual vem do
tema.

O motivo é direto: quem monta a página é voluntário, não designer. Se der para
escolher cor e fonte, metade das campanhas fica feia, e campanha feia arrecada
menos. Deixando só o conteúdo na mão da pessoa, qualquer combinação de blocos sai
bonita e no padrão da Teto. **Menos liberdade, melhor resultado.**

### Blocos automáticos

`NUMEROS`, `CONTAGEM`, `APOIADORES` e `ACOES` se alimentam do sistema: a pessoa
não escreve nada, e eles se atualizam sozinhos. O bloco serve para dizer **onde**
eles entram na ordem da página.

### Setinha, não arrastar

O editor move blocos com setas de subir e descer, não com arrastar-e-soltar.
Não é preguiça: arrastar quebra no celular, some para quem usa teclado ou leitor
de tela, e a pessoa que monta a campanha faz isso do telefone tanto quanto do
computador. A seta resolve o mesmo problema e funciona em tudo.

### Página nasce montada

Ao criar uma ação, os `blocosIniciais` da receita já viram a página dela. Página
em branco trava qualquer um; mexer no que já existe é muito mais fácil do que
começar do zero.

## Login e senha

Feito à mão, sem biblioteca de auth: a necessidade é pequena e bem definida
(e-mail e senha, uma sessão por cookie), e biblioteca aqui traria mais
configuração do que resolveria.

Três decisões que valem por todo o resto:

1. **Senha com scrypt e sal por usuário.** Scrypt é caro de propósito: mesmo com
   o banco vazado, quebrar por força bruta fica inviável. A senha nunca é
   guardada, nem cifrada (cifra tem volta).
2. **Do token de sessão guardamos o hash, nunca ele mesmo.** Se o banco vazar, os
   cookies que estão no navegador das pessoas continuam inúteis.
3. **Cookie httpOnly + sameSite lax.** O JavaScript da página não enxerga o
   cookie (um XSS não rouba a sessão) e ele não viaja em requisição vinda de
   outro site (defesa contra CSRF).

A proteção fica em `exigirLogin()`, chamado no layout do painel, ou seja, **no
servidor**, antes de renderizar qualquer coisa. Não é verificação no navegador.

Mensagem de erro única para e-mail errado e senha errada: dizer "esse e-mail não
existe" entregaria quem tem conta.

## O depósito em memória

Ainda não há Postgres, e sem ele não daria para clicar em nada. Então
`src/lib/deposito.ts` guarda tudo no processo do servidor.

As telas só falam com as funções do depósito, nunca com a estrutura por dentro.
É isso que faz a troca por banco de verdade ser um arquivo, e não um mutirão.

> Atualizado em 20/07: os dados passaram a ser gravados em disco, então
> reiniciar **não** apaga mais nada. Ver a seção do dia 20 no fim deste arquivo.

Continua não servindo para produção nem para dois servidores ao mesmo tempo.

O estado vive no `globalThis` porque o Next recarrega os módulos a cada alteração
em dev: sem isso, cada arquivo salvo apagaria o que você acabou de cadastrar.

### Rascunho não é o mesmo que encerrada

`disponivel` responde "dá para participar agora?", e é falso tanto para o
rascunho quanto para o bingo que já aconteceu. Por isso existe `rascunho`
separado: sem ele, esconder o rascunho da página pública esconderia junto o
bingo, que **deve** continuar aparecendo, porque ação encerrada é prova de que a
equipe se mexeu.

## Armadilha do Next que custou tempo

Server action não pode capturar função comum declarada dentro do componente. O
Next serializa o escopo que cada `"use server"` enxerga, e uma função no meio
quebra tudo com "Functions cannot be passed directly to Client Components".

A correção: o auxiliar `recarregar()` mora no escopo do módulo, e as actions
capturam só valores simples (o id, o título), nunca o objeto inteiro.

## O que está verificado

- `prisma validate` passa com o schema novo (Sessao, Bloco, Assinatura, Lance).
- Primitivas de auth: 22 casos, incluindo hash sem a senha dentro, sal diferente
  por usuário, hash corrompido sem estourar, e senha com acento.
- ``npm run teste`: todo tipo do catálogo tem ícone e rótulo próprios,
  toda receita tem blocos iniciais, e nenhum campo de escolha está sem opções.
- Fluxo real no navegador: login com senha errada barrado, login certo, criar
  rifa / produto / coleta / leilão pela caixa de ferramentas, blocos nascendo
  conforme a receita, editar bloco, mover bloco, publicar, e a ação aparecendo na
  página pública com a etiqueta certa.
- Cookie de sessão confirmado como invisível ao JavaScript.

## O que ainda não existe

- Pagamento: nada de PIX ainda. Nenhuma ação recebe dinheiro de verdade.
- A página pública de cada ação (`/c/[campanha]/[acao]`) e o carrinho.
- Lances de leilão, números de rifa e cartelas de bingo na prática.
- Cadastro de usuário e convite de equipe (existe um usuário, do piloto).
- Upload de imagem: os blocos pedem endereço de imagem, não arquivo.
- Persistência de verdade: trocar o depósito por Prisma.

---

# Rodada de 20/07: cor, agendamento e persistência

## Os dados agora ficam em disco

`.dados/deposito.json`, gravado a cada escrita. Reiniciar o servidor não apaga
mais o que foi cadastrado. Sem isso, mexer no código (que reinicia o servidor)
apagava a campanha montada, e testar virava castigo.

A sessão **não** vai para o arquivo: é um Map (que não sobrevive ao JSON) e
guardar sessão em arquivo texto seria guardar chave de acesso em texto puro. O
preço é ter que entrar de novo depois de reiniciar, o que é barato.

## Cor por ação, dentro de uma paleta fechada

A regra "bloco guarda conteúdo, nunca aparência" continua valendo para o
construtor. Mas cor nenhuma deixa tudo igual, e um bolão precisa ter cara de
bolão.

O meio-termo: **oito cores fechadas**, escolhidas numa grade. A cor pinta a ação
(cartão, barra, ícone, etiqueta), nunca a plataforma nem o cabeçalho da campanha.
A identidade da Teto manda na moldura; a personalidade fica no conteúdo.

Toda cor foi conferida em contraste contra branco (`testes/paleta.js`): a mais
apertada é o ocre, com 5,91:1, contra o mínimo de 4,5:1 do WCAG AA. Isso não é
firula: cor de marca escolhida no olho costuma reprovar, e texto ilegível em
página de doação custa dinheiro.

Cada tipo de ação já **nasce** com uma cor sugerida (rifa ocre, bingo vinho,
evento terracota). Escolher numa lista de oito é fácil; escolher do zero, sem
referência, é o que trava.

## Lançamento programado: o "Em breve" borrado

Dá para deixar a campanha inteira pré-montada e ir soltando aos poucos (uma venda
por mês, por exemplo). A ação ganha `abreEm` e `fechaEm`.

Até a data, ela aparece na página **borrada, com o selo Em breve e a data de
abertura**, e sem link. Aparecer borrada é melhor do que não aparecer: mostra que
a equipe tem plano, cria expectativa, e faz quem chegou hoje voltar no dia.

Ela abre **sozinha**: `lerAcoesPublicadas()` recalcula o estado a cada leitura,
então não há tarefa agendada nem ninguém precisando voltar no painel na data.

### Publicado não é o mesmo que no ar

Foi preciso separar de vez: uma ação publicada com abertura marcada para o mês
que vem **está publicada**, só não abriu. Por isso os botões e as listas do painel
olham `rascunho`, e não `disponivel`. Antes, uma ação agendada voltava para a
lista de rascunhos e o botão dizia "Publicar" numa ação já publicada.

### Bug de fuso que custou um dia

Salvei 09/08 e o campo voltou 08/08. Causa: `new Date("2026-08-09")` é meia-noite
em **UTC**, e no Brasil (UTC-3) isso é 21h do dia 08. Cada vez que a pessoa
salvasse, a data andaria um dia para trás.

Correção: ler a data como `AAAA-MM-DDT00:00:00` (meia-noite local) e formatar com
os getters locais, nunca `toISOString()`. Travado em `testes/datas.js`.

## Pix Automático: o que a pesquisa mostrou

O Pix Automático existe desde 16/06/2025 e resolve de verdade o problema do
"compromisso vira esquecimento". Números que importam: taxa de 0,4% a 1,2%
(contra 3% a 4,5% do cartão recorrente), **sem chargeback**, e taxa de sucesso de
cobrança 15 a 25 pontos acima do cartão, justamente porque cartão vencido é
regra em público C/D.

O Asaas já oferece, integrado às cobranças recorrentes, via API, nas jornadas 3 e
4 (as iniciadas pela empresa recebedora).

**A pegadinha:** o Pix Automático é desenhado para recebedor **pessoa jurídica**.
A documentação fala em escolas, academias, condomínios, SaaS. Uma equipe cujo
líder recebe no CPF provavelmente não consegue habilitar.

Consequência para o produto: os dois modos precisam existir.

- **Recebedor CNPJ** (a Teto, a GOAN): Pix Automático de verdade, débito
  autorizado uma vez e cobrado sozinho.
- **Recebedor CPF** (o líder voluntário): o compromisso com lembrete, que é o que
  já está modelado.

O modelo `Assinatura` no schema serve aos dois; o que muda é quem cobra. Isso não
bloqueia nada agora, mas muda a conversa sobre onde o dinheiro cai: se a
recorrência importar muito, ela empurra a arrecadação para uma conta CNPJ.

## O que continua não existindo

Nenhum PIX de verdade, a página pública de cada ação, upload de arquivo de imagem
(os blocos pedem endereço), e a troca do depósito por Prisma.
