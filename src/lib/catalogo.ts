// A CAIXA DE FERRAMENTAS.
//
// Cada tipo de acao e uma RECEITA: nao um formulario vazio, mas um conjunto
// pronto que ja sabe como aquela acao funciona, quanto ela costuma custar, o que
// precisa ser preenchido e com que cara a pagina dela nasce.
//
// A ideia central: a pessoa nao "configura uma acao", ela ESCOLHE UMA RECEITA e
// personaliza. Quem organiza uma rifa pela primeira vez nao sabe que precisa
// definir data de sorteio, quem confere o resultado e o que acontece se sobrar
// numero. A receita sabe, e pergunta.
//
// Isso e o que separa esta plataforma de um formulario generico de vaquinha: o
// sistema conhece o oficio de arrecadar, nao so o de cobrar.

import type { TipoBloco } from "./blocos";

/** Como a acao cobra de quem participa. */
export type Precificacao =
  | "LIVRE" // quem da escolhe o valor (doacao)
  | "FIXO" // preco unico por unidade (rifa, camisa, ingresso)
  | "FAIXAS" // varias opcoes de valor (lotes, tamanhos, cotas)
  | "LANCE"; // quem oferece mais leva (leilao)

/**
 * De onde vem o custo da acao. Decide como o dinheiro e lancado no livro-caixa,
 * e a pergunta que separa os dois e: "se eu nao vender mais nenhuma unidade,
 * esse gasto ainda existe?".
 */
export type ModeloDeCusto =
  | "NENHUM" // nao custa nada pra acontecer (doacao)
  | "POR_UNIDADE" // nasce com a venda (a camisa que sera impressa)
  | "FIXO" // ja saiu do bolso e nao volta (aluguel do salao, premio comprado)
  | "MISTO"; // os dois (jantar: salao fixo + prato por pessoa)

export type TipoDeCampo =
  | "texto"
  | "textoLongo"
  | "numero"
  | "dinheiro"
  | "data"
  | "dataHora"
  | "opcoes" // lista escrita pela pessoa (tamanhos, lotes)
  | "escolha" // uma entre opcoes fixas
  | "booleano";

export interface CampoDaReceita {
  chave: string;
  rotulo: string;
  tipo: TipoDeCampo;
  /** Aparece embaixo do campo. Serve pra ensinar, nao so pra descrever. */
  ajuda?: string;
  exemplo?: string;
  obrigatorio?: boolean;
  escolhas?: { valor: string; rotulo: string }[];
  padrao?: string | number | boolean;
}

export interface Receita {
  tipo: string;
  nome: string;
  /** Frase curta que aparece no cartao da caixa de ferramentas. */
  chamada: string;
  /** O que e, em duas linhas, pra quem nunca fez. */
  descricao: string;
  /** Como funciona na pratica, passo a passo. Vira ajuda na tela de criacao. */
  comoFunciona: string[];
  precificacao: Precificacao;
  modeloDeCusto: ModeloDeCusto;
  /** Se a acao tem quantidade limitada (numeros, ingressos, unidades). */
  temEstoque: boolean;
  /** Se faz sentido pedir dados de entrega/retirada de quem compra. */
  pedeEntrega: boolean;
  /** Quanto costuma render, pra ajudar a equipe a escolher. Em centavos. */
  rendeTipico?: { de: number; ate: number };
  /** Esforco de organizacao, de 1 (manda o link) a 5 (evento presencial). */
  esforco: 1 | 2 | 3 | 4 | 5;
  campos: CampoDaReceita[];
  /** Com que blocos a pagina dessa acao nasce. A pessoa edita depois. */
  blocosIniciais: TipoBloco[];
  /** O que a equipe precisa lembrar de fazer fora do sistema. */
  checklist: string[];
  /** Uma coisa que quase todo mundo erra na primeira vez. */
  armadilha?: string;
}

const reais = (v: number) => v * 100;

export const RECEITAS: Receita[] = [
  // -------------------------------------------------------------------------
  {
    tipo: "DOACAO",
    nome: "Doação livre",
    chamada: "Quem quiser dar, dá quanto quiser",
    descricao:
      "A forma mais simples: sem contrapartida, sem sorteio, sem produto. A pessoa escolhe o valor e pronto. Toda campanha nasce com esta ação já criada.",
    comoFunciona: [
      "A pessoa abre a campanha e escolhe quanto quer doar.",
      "Paga por PIX na hora, sem cadastro.",
      "O valor entra limpo na vaquinha, sem custo nenhum pelo caminho.",
    ],
    precificacao: "LIVRE",
    modeloDeCusto: "NENHUM",
    temEstoque: false,
    pedeEntrega: false,
    esforco: 1,
    campos: [
      {
        chave: "valoresSugeridos",
        rotulo: "Valores sugeridos",
        tipo: "opcoes",
        ajuda:
          "Botões de atalho que aparecem na hora de doar. Sugestão pronta ajuda muito: quem não sabe quanto dar costuma dar o do meio.",
        exemplo: "20, 50, 100, 200",
        padrao: "20, 50, 100, 200",
      },
      {
        chave: "permiteAnonimo",
        rotulo: "Permitir doação anônima",
        tipo: "booleano",
        ajuda: "O nome some da lista pública, mas o valor continua contando no total.",
        padrao: true,
      },
    ],
    blocosIniciais: ["TEXTO", "NUMEROS"],
    checklist: [],
    armadilha:
      "Deixar sem valores sugeridos. A pessoa trava na hora de escolher e desiste no meio do caminho.",
  },

  // -------------------------------------------------------------------------
  {
    tipo: "DOACAO_RECORRENTE",
    nome: "Doação recorrente",
    chamada: "Um valor por semana ou por mês, até a campanha fechar",
    descricao:
      "A pessoa se compromete com um valor toda semana ou todo mês até o fim da campanha. Não é débito automático: a cada período ela recebe o PIX no WhatsApp e paga quando quiser.",
    comoFunciona: [
      "A pessoa escolhe o valor e se é semanal ou mensal.",
      "O sistema calcula quantas parcelas cabem até o fim da campanha e mostra o total do compromisso.",
      "A cada período, ela recebe um PIX novo no WhatsApp com um toque pra pagar.",
      "Se ela parar de pagar, o compromisso é encerrado sem cobrança nenhuma.",
    ],
    precificacao: "LIVRE",
    modeloDeCusto: "NENHUM",
    temEstoque: false,
    pedeEntrega: false,
    esforco: 1,
    campos: [
      {
        chave: "periodicidades",
        rotulo: "Periodicidades oferecidas",
        tipo: "escolha",
        escolhas: [
          { valor: "SEMANAL", rotulo: "Só semanal" },
          { valor: "MENSAL", rotulo: "Só mensal" },
          { valor: "AMBAS", rotulo: "Semanal e mensal" },
        ],
        padrao: "AMBAS",
      },
      {
        chave: "valoresSugeridos",
        rotulo: "Valores sugeridos por parcela",
        tipo: "opcoes",
        ajuda:
          "Valores pequenos funcionam melhor aqui: R$ 20 por mês soa mais fácil do que R$ 240 de uma vez, e rende igual.",
        exemplo: "10, 20, 50",
        padrao: "10, 20, 50",
      },
      {
        chave: "diaDoLembrete",
        rotulo: "Dia do lembrete",
        tipo: "escolha",
        ajuda: "Quando o PIX da parcela é enviado. Perto do dia de pagamento funciona melhor.",
        escolhas: [
          { valor: "1", rotulo: "Todo dia 1" },
          { valor: "5", rotulo: "Todo dia 5" },
          { valor: "10", rotulo: "Todo dia 10" },
          { valor: "15", rotulo: "Todo dia 15" },
          { valor: "ADESAO", rotulo: "No mesmo dia da adesão" },
        ],
        padrao: "ADESAO",
      },
    ],
    blocosIniciais: ["TEXTO", "PASSOS", "PERGUNTAS"],
    checklist: [
      "Combinar quem da equipe acompanha as parcelas que não forem pagas",
      "Definir o texto do lembrete que vai junto do PIX",
    ],
    armadilha:
      "Prometer débito automático. PIX não faz cobrança recorrente sozinho: o que existe é lembrete com PIX novo, e é isso que a página promete.",
  },

  // -------------------------------------------------------------------------
  {
    tipo: "RIFA",
    nome: "Rifa",
    chamada: "Números numerados, um prêmio, uma data de sorteio",
    descricao:
      "Clássico que funciona: a pessoa escolhe um ou mais números por um valor fixo e concorre a um prêmio numa data marcada.",
    comoFunciona: [
      "Você define o prêmio, a quantidade de números e o preço de cada um.",
      "Quem compra escolhe os números livres, e eles ficam reservados na hora do pagamento.",
      "Na data do sorteio, o resultado sai pela Loteria Federal (ou pelo método que você escolher).",
      "O sistema mostra quem ficou com cada número, então ninguém precisa confiar na sua palavra.",
    ],
    precificacao: "FIXO",
    modeloDeCusto: "FIXO",
    temEstoque: true,
    pedeEntrega: false,
    rendeTipico: { de: reais(500), ate: reais(3000) },
    esforco: 2,
    campos: [
      {
        chave: "premio",
        rotulo: "Prêmio",
        tipo: "texto",
        obrigatorio: true,
        exemplo: "Churrasco completo para 10 pessoas",
      },
      {
        chave: "quantidadeNumeros",
        rotulo: "Quantidade de números",
        tipo: "numero",
        obrigatorio: true,
        ajuda:
          "Preço do número × quantidade = o máximo que a rifa pode render. Confira se esse teto paga o prêmio e ainda sobra.",
        padrao: 100,
      },
      {
        chave: "sorteioEm",
        rotulo: "Data do sorteio",
        tipo: "data",
        obrigatorio: true,
      },
      {
        chave: "metodoSorteio",
        rotulo: "Como será sorteado",
        tipo: "escolha",
        ajuda:
          "Loteria Federal é o mais aceito: ninguém precisa confiar em você, é só conferir o resultado oficial.",
        escolhas: [
          { valor: "FEDERAL", rotulo: "Loteria Federal" },
          { valor: "LIVE", rotulo: "Sorteio ao vivo (transmissão)" },
          { valor: "SISTEMA", rotulo: "Sorteio pelo sistema, com testemunhas" },
        ],
        padrao: "FEDERAL",
      },
      {
        chave: "custoDoPremio",
        rotulo: "Custo do prêmio",
        tipo: "dinheiro",
        ajuda:
          "Se o prêmio foi doado, deixe zero. Se você comprou, o valor entra como custo fixo e aparece no extrato da rifa.",
      },
    ],
    blocosIniciais: ["IMAGEM", "TEXTO", "NUMEROS", "PERGUNTAS"],
    checklist: [
      "Comprar ou confirmar a doação do prêmio",
      "Tirar uma foto boa do prêmio",
      "Combinar quem confere o resultado e avisa o ganhador",
    ],
    armadilha:
      "Vender número demais barato demais. Some tudo antes: se 100 números a R$ 10 dão R$ 1.000 e o prêmio custou R$ 600, a rifa inteira rende R$ 400 e dá muito trabalho.",
  },

  // -------------------------------------------------------------------------
  {
    tipo: "BINGO",
    nome: "Bingo",
    chamada: "Cartelas vendidas, prêmios por rodada, uma noite",
    descricao:
      "Junta gente num lugar (ou numa live) e vende cartelas. Rende bem porque a mesma pessoa costuma comprar várias.",
    comoFunciona: [
      "Você define quando, onde, o preço da cartela e os prêmios de cada rodada.",
      "Quem compra recebe a cartela numerada.",
      "No dia, você canta o bingo pelo aplicativo, pelo salão ou pela live.",
    ],
    precificacao: "FIXO",
    modeloDeCusto: "MISTO",
    temEstoque: true,
    pedeEntrega: false,
    rendeTipico: { de: reais(400), ate: reais(2500) },
    esforco: 4,
    campos: [
      { chave: "quando", rotulo: "Data e hora", tipo: "dataHora", obrigatorio: true },
      {
        chave: "onde",
        rotulo: "Local (ou link da transmissão)",
        tipo: "texto",
        obrigatorio: true,
        exemplo: "Salão da paróquia São José",
      },
      {
        chave: "rodadas",
        rotulo: "Prêmios por rodada",
        tipo: "opcoes",
        ajuda: "Um por linha. Prêmio bom na última rodada segura a plateia até o fim.",
        exemplo: "Cesta de café, Vale-pizza, Churrasqueira",
      },
      {
        chave: "cartelasPorPessoa",
        rotulo: "Limite de cartelas por pessoa",
        tipo: "numero",
        ajuda: "Deixe em branco pra não limitar. A maioria compra de 2 a 4.",
      },
      {
        chave: "custoFixo",
        rotulo: "Custo fixo (salão, som, prêmios)",
        tipo: "dinheiro",
        ajuda: "O que sai do bolso mesmo que ninguém compre cartela.",
      },
    ],
    blocosIniciais: ["BANNER", "TEXTO", "AGENDA", "PASSOS", "PERGUNTAS"],
    checklist: [
      "Reservar o local e confirmar a data",
      "Conseguir os prêmios de cada rodada",
      "Imprimir ou gerar as cartelas",
      "Definir quem canta e quem confere",
    ],
    armadilha:
      "Esquecer do custo do lugar. Salão, som e lanche comem o lucro da noite se não entrarem na conta desde o começo.",
  },

  // -------------------------------------------------------------------------
  {
    tipo: "PRODUTO",
    nome: "Venda de produtos",
    chamada: "Camisa, caneca, bolo, o que a equipe produzir",
    descricao:
      "Vende um produto com valor simbólico. O custo de cada unidade é descontado automaticamente, então você vê o lucro real e não o faturamento.",
    comoFunciona: [
      "Você cadastra o produto, o preço e quanto custa cada unidade.",
      "Quem compra escolhe a variação (tamanho, sabor, cor) e paga por PIX.",
      "O sistema desconta o custo só das unidades vendidas: o que está parado no estoque não vira prejuízo.",
      "Você acompanha a lista de quem comprou o quê, pra entregar sem se perder.",
    ],
    precificacao: "FIXO",
    modeloDeCusto: "POR_UNIDADE",
    temEstoque: true,
    pedeEntrega: true,
    rendeTipico: { de: reais(300), ate: reais(2500) },
    esforco: 3,
    campos: [
      {
        chave: "variacoes",
        rotulo: "Variações",
        tipo: "opcoes",
        ajuda: "Tamanhos, sabores, cores. Quem compra escolhe uma.",
        exemplo: "P, M, G, GG",
      },
      {
        chave: "custoUnitario",
        rotulo: "Custo de cada unidade",
        tipo: "dinheiro",
        obrigatorio: true,
        ajuda:
          "Quanto custa produzir UMA unidade. Só vira custo quando vende, então estoque parado não conta como prejuízo.",
      },
      {
        chave: "comoEntrega",
        rotulo: "Como será a entrega",
        tipo: "escolha",
        escolhas: [
          { valor: "RETIRADA", rotulo: "Retirada combinada" },
          { valor: "EVENTO", rotulo: "Entrega no dia do mutirão ou evento" },
          { valor: "CORREIO", rotulo: "Envio pelos Correios" },
        ],
        padrao: "RETIRADA",
      },
      {
        chave: "prazoProducao",
        rotulo: "Prazo de produção",
        tipo: "texto",
        exemplo: "Até 15 dias após o fechamento das vendas",
      },
    ],
    blocosIniciais: ["GALERIA", "TEXTO", "TABELA", "PERGUNTAS"],
    checklist: [
      "Fechar o preço com o fornecedor",
      "Definir se produz sob encomenda ou compra lote antes",
      "Tirar fotos do produto",
      "Combinar quem organiza a entrega",
    ],
    armadilha:
      "Comprar lote grande antes de vender. Encomenda por demanda rende menos por peça mas não deixa a equipe com 20 camisas encalhadas.",
  },

  // -------------------------------------------------------------------------
  {
    tipo: "EVENTO",
    nome: "Evento com ingresso",
    chamada: "Jantar, festa, corrida, noite de jogos",
    descricao:
      "Vende ingressos ou convites para algo que vai acontecer. Serve de jantar beneficente a corrida, e o ingresso pode ter lotes com preços diferentes.",
    comoFunciona: [
      "Você define quando, onde, quantas vagas e o preço (com lotes, se quiser).",
      "Quem compra recebe um ingresso com código pra apresentar na entrada.",
      "No dia, você confere a entrada pela lista ou pelo código.",
    ],
    precificacao: "FAIXAS",
    modeloDeCusto: "MISTO",
    temEstoque: true,
    pedeEntrega: false,
    rendeTipico: { de: reais(800), ate: reais(6000) },
    esforco: 5,
    campos: [
      { chave: "quando", rotulo: "Data e hora", tipo: "dataHora", obrigatorio: true },
      { chave: "onde", rotulo: "Local", tipo: "texto", obrigatorio: true },
      {
        chave: "vagas",
        rotulo: "Quantidade de vagas",
        tipo: "numero",
        obrigatorio: true,
        ajuda: "O limite real do lugar. O sistema fecha a venda sozinho quando encher.",
      },
      {
        chave: "lotes",
        rotulo: "Lotes e preços",
        tipo: "opcoes",
        ajuda:
          "Um por linha, no formato nome = preço. Lote promocional no começo cria urgência e ajuda a antecipar caixa.",
        exemplo: "1º lote = 40, 2º lote = 50, Na hora = 60",
      },
      {
        chave: "incluso",
        rotulo: "O que está incluso",
        tipo: "textoLongo",
        exemplo: "Prato principal, sobremesa e uma bebida",
      },
      {
        chave: "custoFixo",
        rotulo: "Custo fixo do evento",
        tipo: "dinheiro",
        ajuda: "Aluguel, som, decoração: o que você paga mesmo se vender pouco.",
      },
      {
        chave: "custoPorPessoa",
        rotulo: "Custo por pessoa",
        tipo: "dinheiro",
        ajuda: "Comida e bebida de cada convidado. Só conta pra quem realmente comprou.",
      },
    ],
    blocosIniciais: ["BANNER", "TEXTO", "AGENDA", "MAPA", "PERGUNTAS"],
    checklist: [
      "Reservar o local e assinar o que precisar",
      "Fechar cardápio ou programação",
      "Definir quem recebe na porta",
      "Combinar o ponto de equilíbrio: a partir de quantos ingressos o evento se paga",
    ],
    armadilha:
      "Não calcular o ponto de equilíbrio antes de abrir a venda. Evento é a única ação que pode dar prejuízo de verdade se pouca gente for.",
  },

  // -------------------------------------------------------------------------
  {
    tipo: "COLETA",
    nome: "Ação de coleta",
    chamada: "Semáforo, praça, porta de evento: arrecadar na rua",
    descricao:
      "Para quem vai pra rua com cofrinho e QR Code. Cada voluntário tem um link próprio, então dá pra saber quanto cada ponto rendeu e quanto veio em dinheiro vivo.",
    comoFunciona: [
      "Você marca dia, hora e os pontos de coleta.",
      "Cada voluntário recebe um QR Code próprio pra mostrar na rua.",
      "Quem quiser ajudar aponta a câmera e paga por PIX na hora, sem instalar nada.",
      "No fim do dia, cada um registra também quanto arrecadou em dinheiro vivo, e o sistema soma tudo.",
    ],
    precificacao: "LIVRE",
    modeloDeCusto: "NENHUM",
    temEstoque: false,
    pedeEntrega: false,
    rendeTipico: { de: reais(200), ate: reais(2000) },
    esforco: 3,
    campos: [
      { chave: "quando", rotulo: "Data e hora", tipo: "dataHora", obrigatorio: true },
      {
        chave: "pontos",
        rotulo: "Pontos de coleta",
        tipo: "opcoes",
        ajuda:
          "Um por linha. Cada ponto ganha um QR Code próprio, e no fim você vê qual rendeu mais (serve pra escolher melhor da próxima vez).",
        exemplo: "Semáforo da Av. Sete, Praça Central, Portaria do shopping",
      },
      {
        chave: "metaPorVoluntario",
        rotulo: "Meta por voluntário",
        tipo: "dinheiro",
        ajuda: "Opcional, mas vira uma disputa saudável entre a galera.",
      },
      {
        chave: "aceitaDinheiro",
        rotulo: "Registrar dinheiro em espécie",
        tipo: "booleano",
        ajuda:
          "Liga o campo pro voluntário declarar quanto veio em cédula. Sem isso, a coleta na rua fica invisível no extrato.",
        padrao: true,
      },
    ],
    blocosIniciais: ["TEXTO", "PASSOS", "APOIADORES"],
    checklist: [
      "Confirmar autorização do local, quando precisar",
      "Imprimir os QR Codes de cada ponto",
      "Levar colete ou camiseta de identificação",
      "Combinar como o dinheiro em espécie será depositado no mesmo dia",
    ],
    armadilha:
      "Dinheiro vivo sem registro no mesmo dia. Some da memória, some do extrato, e vira a parte da arrecadação que ninguém consegue explicar depois.",
  },

  // -------------------------------------------------------------------------
  {
    tipo: "LEILAO",
    nome: "Leilão",
    chamada: "Item doado, quem oferecer mais leva",
    descricao:
      "Alguém doa algo com valor (uma camisa autografada, um serviço, uma obra) e as pessoas dão lances até a data de fechamento. Rende muito com poucos itens.",
    comoFunciona: [
      "Você cadastra o item, o lance mínimo e quando fecha.",
      "As pessoas dão lances pela página, e quem for ultrapassado recebe aviso no WhatsApp.",
      "Na hora do fechamento, o maior lance leva e recebe o PIX pra pagar.",
      "Se não pagar no prazo, o sistema oferece pro segundo colocado automaticamente.",
    ],
    precificacao: "LANCE",
    modeloDeCusto: "NENHUM",
    temEstoque: true,
    pedeEntrega: true,
    rendeTipico: { de: reais(300), ate: reais(5000) },
    esforco: 2,
    campos: [
      { chave: "item", rotulo: "Item leiloado", tipo: "texto", obrigatorio: true },
      { chave: "doadoPor", rotulo: "Doado por", tipo: "texto" },
      {
        chave: "lanceMinimo",
        rotulo: "Lance mínimo",
        tipo: "dinheiro",
        obrigatorio: true,
        ajuda: "Comece baixo. Leilão que começa alto trava, e lance baixo atrai a primeira disputa.",
      },
      {
        chave: "incrementoMinimo",
        rotulo: "Incremento mínimo",
        tipo: "dinheiro",
        ajuda: "Quanto cada novo lance precisa superar o anterior.",
        padrao: reais(10),
      },
      { chave: "fechaEm", rotulo: "Fecha em", tipo: "dataHora", obrigatorio: true },
      {
        chave: "prorrogaNoFim",
        rotulo: "Prorrogar se houver lance no fim",
        tipo: "booleano",
        ajuda:
          "Lance nos últimos minutos estende o prazo em mais 5. Evita que alguém ganhe no susto e costuma elevar bastante o valor final.",
        padrao: true,
      },
    ],
    blocosIniciais: ["GALERIA", "TEXTO", "CONTAGEM", "PERGUNTAS"],
    checklist: [
      "Ter o item em mãos ou a garantia por escrito de quem doou",
      "Tirar fotos boas, de vários ângulos",
      "Combinar a entrega com quem vencer",
    ],
    armadilha:
      "Fechar num horário morto. Leilão que termina de madrugada perde os últimos lances, que são justamente os maiores.",
  },

  // -------------------------------------------------------------------------
  {
    tipo: "BOLAO",
    nome: "Bolão",
    chamada: "Palpite de placar, quem acertar divide o prêmio",
    descricao:
      "Aproveita um jogo grande. Cada palpite custa um valor fixo, e quem cravar o placar divide parte do bolo. O resto fica na campanha.",
    comoFunciona: [
      "Você define o jogo, o preço do palpite e quanto do bolo vai pros acertadores.",
      "Cada pessoa dá quantos palpites quiser até o apito inicial.",
      "Depois do jogo, o sistema aponta os acertadores e divide o prêmio.",
      "Se ninguém acertar, o valor inteiro fica na campanha.",
    ],
    precificacao: "FIXO",
    modeloDeCusto: "NENHUM",
    temEstoque: false,
    pedeEntrega: false,
    rendeTipico: { de: reais(300), ate: reais(4000) },
    esforco: 2,
    campos: [
      { chave: "timeCasa", rotulo: "Time da casa", tipo: "texto", obrigatorio: true },
      { chave: "timeVisitante", rotulo: "Time visitante", tipo: "texto", obrigatorio: true },
      { chave: "quando", rotulo: "Data e hora do jogo", tipo: "dataHora", obrigatorio: true },
      {
        chave: "percentualPremio",
        rotulo: "Percentual do bolo para os acertadores",
        tipo: "numero",
        ajuda:
          "Metade é o mais comum: premia de verdade e ainda deixa metade na causa. Zero transforma o bolão em doação com palpite.",
        padrao: 50,
      },
      {
        chave: "permiteRepetido",
        rotulo: "Permitir palpites repetidos",
        tipo: "booleano",
        ajuda: "Se ligado, mais de uma pessoa pode cravar o mesmo placar e dividir entre si.",
        padrao: true,
      },
    ],
    blocosIniciais: ["BANNER", "TEXTO", "CONTAGEM", "PERGUNTAS"],
    checklist: [
      "Confirmar data e hora do jogo",
      "Combinar o critério em caso de jogo adiado ou cancelado",
    ],
    armadilha:
      "Não combinar antes o que acontece se o jogo for adiado. Defina na descrição: devolve, transfere pra nova data ou vira doação.",
  },

  // -------------------------------------------------------------------------
  {
    tipo: "OUTRO",
    nome: "Ação livre",
    chamada: "Quando nada acima serve",
    descricao:
      "Uma ação em branco, pra inventar o que a caixa de ferramentas ainda não tem. Você define preço, estoque e custo na mão.",
    comoFunciona: [
      "Você escreve o que é e como funciona.",
      "Define se tem preço fixo ou valor livre, e se tem quantidade limitada.",
      "O resto funciona igual às outras: PIX, extrato e página própria.",
    ],
    precificacao: "FIXO",
    modeloDeCusto: "NENHUM",
    temEstoque: false,
    pedeEntrega: false,
    esforco: 2,
    campos: [
      {
        chave: "comoFunciona",
        rotulo: "Como funciona",
        tipo: "textoLongo",
        obrigatorio: true,
        ajuda: "Explique como se estivesse contando pra alguém que nunca ouviu falar.",
      },
    ],
    blocosIniciais: ["TEXTO"],
    checklist: [],
  },
];

export function receitaDe(tipo: string): Receita | undefined {
  return RECEITAS.find((r) => r.tipo === tipo);
}

/**
 * A caixa de ferramentas mostrada no painel: tudo menos a doacao livre, que ja
 * vem criada com a campanha, e a acao livre, que fica por ultimo como escape.
 */
export function ferramentas(): Receita[] {
  return RECEITAS.filter((r) => r.tipo !== "DOACAO");
}

/** Rotulo curto do esforco, pra equipe escolher sabendo no que esta se metendo. */
export function rotuloEsforco(n: number): string {
  return (
    {
      1: "Manda o link e pronto",
      2: "Pouca organização",
      3: "Dá algum trabalho",
      4: "Precisa de equipe",
      5: "Evento de verdade",
    }[n] ?? "Dá algum trabalho"
  );
}
