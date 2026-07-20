// O CONSTRUTOR DE PAGINA.
//
// Cada campanha e cada acao tem uma pilha de blocos. A pessoa monta a pagina
// empilhando blocos e preenchendo o conteudo de cada um, como num construtor de
// site: a campanha vira um microblog dela, nao um formulario preenchido.
//
// Decisao que sustenta o resto: o bloco guarda CONTEUDO, nunca aparencia. Nao
// existe cor, fonte, tamanho ou margem no conteudo do bloco. O visual vem do
// tema da plataforma.
//
// O motivo e direto: quem monta a pagina e voluntario, nao designer. Se der pra
// escolher cor e fonte, metade das campanhas fica feia, e uma campanha feia
// arrecada menos. Deixando so o conteudo na mao da pessoa, qualquer combinacao
// de blocos sai bonita e no padrao da Teto. Menos liberdade, melhor resultado.

export type TipoBloco =
  | "TEXTO" // paragrafos livres
  | "TITULO" // um respiro entre secoes
  | "IMAGEM" // uma imagem com legenda
  | "GALERIA" // varias imagens lado a lado
  | "VIDEO" // YouTube ou Instagram
  | "BANNER" // imagem larga com frase por cima
  | "CITACAO" // fala de alguem, com autor
  | "NUMEROS" // 2 a 4 numeros que impressionam
  | "PASSOS" // como funciona, em etapas numeradas
  | "PERGUNTAS" // perguntas e respostas
  | "TABELA" // lista de coisas com valor (tamanhos, lotes)
  | "AGENDA" // data, hora e local
  | "MAPA" // endereco com link pro mapa
  | "CONTAGEM" // relogio ate uma data
  | "APOIADORES" // quem ja entrou
  | "ACOES" // a vitrine de formas de ajudar
  | "BOTAO" // chamada pra acao
  | "SEPARADOR"; // linha de respiro

export interface Bloco {
  id: string;
  tipo: TipoBloco;
  ordem: number;
  visivel: boolean;
  conteudo: Record<string, unknown>;
}

export interface CampoDoBloco {
  chave: string;
  rotulo: string;
  tipo: "texto" | "textoLongo" | "url" | "data" | "lista" | "pares" | "imagem";
  ajuda?: string;
  exemplo?: string;
  /**
   * So para o tipo "pares": como as duas metades se chamam dentro do objeto.
   * PERGUNTAS guarda { pergunta, resposta }; TABELA guarda { nome, valor }. O
   * editor escreve e le usando estes nomes, entao o renderizador encontra o que
   * espera sem precisar de um caso especial por bloco.
   */
  chavesDoPar?: [string, string];
}

export interface DefinicaoDeBloco {
  tipo: TipoBloco;
  nome: string;
  /** Pra que serve, na pratica. Aparece na hora de escolher o bloco. */
  paraQue: string;
  /** Grupo na gaveta de blocos. */
  familia: "Escrita" | "Imagem" | "Estrutura" | "Automático";
  campos: CampoDoBloco[];
  /** Conteudo com que o bloco nasce, pra pagina nunca ficar vazia. */
  padrao: Record<string, unknown>;
  /**
   * Bloco automatico se alimenta de dado do sistema (apoiadores, acoes,
   * contagem) e nao precisa que a pessoa escreva nada.
   */
  automatico?: boolean;
}

export const BLOCOS: DefinicaoDeBloco[] = [
  {
    tipo: "TEXTO",
    nome: "Texto",
    paraQue: "Contar a história, explicar, agradecer. O bloco que você mais vai usar.",
    familia: "Escrita",
    campos: [
      {
        chave: "texto",
        rotulo: "Texto",
        tipo: "textoLongo",
        ajuda: "Deixe uma linha em branco entre os parágrafos.",
      },
    ],
    padrao: { texto: "" },
  },
  {
    tipo: "TITULO",
    nome: "Título de seção",
    paraQue: "Separar assuntos e deixar a página respirar.",
    familia: "Escrita",
    campos: [
      { chave: "titulo", rotulo: "Título", tipo: "texto", exemplo: "Por que esta casa" },
      { chave: "subtitulo", rotulo: "Subtítulo", tipo: "texto" },
    ],
    padrao: { titulo: "Novo título", subtitulo: "" },
  },
  {
    tipo: "CITACAO",
    nome: "Citação",
    paraQue: "Destacar a fala de um morador, um voluntário ou de quem doou.",
    familia: "Escrita",
    campos: [
      { chave: "texto", rotulo: "A fala", tipo: "textoLongo" },
      { chave: "autor", rotulo: "Quem disse", tipo: "texto", exemplo: "Dona Marli, moradora" },
    ],
    padrao: { texto: "", autor: "" },
  },
  {
    tipo: "PASSOS",
    nome: "Como funciona",
    paraQue: "Explicar em etapas numeradas. Tira dúvida antes de a pessoa desistir.",
    familia: "Escrita",
    campos: [
      {
        chave: "passos",
        rotulo: "Etapas",
        tipo: "lista",
        ajuda: "Uma por linha, na ordem que acontecem.",
      },
    ],
    padrao: { passos: [] },
  },
  {
    tipo: "PERGUNTAS",
    nome: "Perguntas e respostas",
    paraQue: "Responder de uma vez o que sempre perguntam no WhatsApp.",
    familia: "Escrita",
    campos: [
      {
        chave: "itens",
        rotulo: "Perguntas",
        tipo: "pares",
        chavesDoPar: ["pergunta", "resposta"],
        ajuda: "Uma por linha, no formato: pergunta | resposta",
        exemplo: "Posso retirar depois? | Sim, combinamos pelo WhatsApp",
      },
    ],
    padrao: { itens: [] },
  },
  {
    tipo: "TABELA",
    nome: "Lista com valores",
    paraQue: "Tamanhos, lotes, opções: qualquer coisa com nome e valor.",
    familia: "Escrita",
    campos: [
      { chave: "titulo", rotulo: "Título", tipo: "texto" },
      {
        chave: "itens",
        rotulo: "Itens",
        tipo: "pares",
        chavesDoPar: ["nome", "valor"],
        ajuda: "Uma por linha, no formato: nome | valor",
        exemplo: "1º lote | R$ 40",
      },
    ],
    padrao: { titulo: "", itens: [] },
  },

  {
    tipo: "IMAGEM",
    nome: "Imagem",
    paraQue: "Uma foto com legenda. Foto de verdade da equipe vale mais que banco de imagem.",
    familia: "Imagem",
    campos: [
      { chave: "url", rotulo: "Endereço da imagem", tipo: "imagem" },
      { chave: "legenda", rotulo: "Legenda", tipo: "texto" },
    ],
    padrao: { url: "", legenda: "" },
  },
  {
    tipo: "GALERIA",
    nome: "Galeria",
    paraQue: "Várias fotos lado a lado: o produto, o evento, o mutirão.",
    familia: "Imagem",
    campos: [
      { chave: "imagens", rotulo: "Imagens", tipo: "lista", ajuda: "Um endereço por linha." },
      { chave: "legenda", rotulo: "Legenda", tipo: "texto" },
    ],
    padrao: { imagens: [], legenda: "" },
  },
  {
    tipo: "VIDEO",
    nome: "Vídeo",
    paraQue: "Um vídeo do YouTube. Vale mais que três parágrafos.",
    familia: "Imagem",
    campos: [
      { chave: "url", rotulo: "Link do vídeo", tipo: "url", exemplo: "https://youtu.be/..." },
      { chave: "legenda", rotulo: "Legenda", tipo: "texto" },
    ],
    padrao: { url: "", legenda: "" },
  },
  {
    tipo: "BANNER",
    nome: "Faixa com frase",
    paraQue: "Imagem larga com uma frase forte por cima. Bom pra abrir a página.",
    familia: "Imagem",
    campos: [
      { chave: "url", rotulo: "Imagem de fundo", tipo: "imagem" },
      { chave: "frase", rotulo: "Frase", tipo: "texto" },
      { chave: "apoio", rotulo: "Linha de apoio", tipo: "texto" },
    ],
    padrao: { url: "", frase: "", apoio: "" },
  },

  {
    tipo: "AGENDA",
    nome: "Data e local",
    paraQue: "Quando e onde acontece. Obrigatório em evento, bingo e coleta.",
    familia: "Estrutura",
    campos: [
      { chave: "quando", rotulo: "Quando", tipo: "texto", exemplo: "29 de novembro, às 20h" },
      { chave: "onde", rotulo: "Onde", tipo: "texto" },
      { chave: "observacao", rotulo: "Observação", tipo: "texto" },
    ],
    padrao: { quando: "", onde: "", observacao: "" },
  },
  {
    tipo: "MAPA",
    nome: "Endereço",
    paraQue: "O endereço com um toque pra abrir no mapa do celular.",
    familia: "Estrutura",
    campos: [
      { chave: "endereco", rotulo: "Endereço", tipo: "texto" },
      { chave: "referencia", rotulo: "Ponto de referência", tipo: "texto" },
    ],
    padrao: { endereco: "", referencia: "" },
  },
  {
    tipo: "BOTAO",
    nome: "Botão",
    paraQue: "Levar pra uma ação específica ou pra um link de fora.",
    familia: "Estrutura",
    campos: [
      { chave: "texto", rotulo: "Texto do botão", tipo: "texto", exemplo: "Quero minha camisa" },
      { chave: "destino", rotulo: "Link", tipo: "url" },
    ],
    padrao: { texto: "Quero ajudar", destino: "" },
  },
  {
    tipo: "SEPARADOR",
    nome: "Espaço",
    paraQue: "Uma linha de respiro entre dois assuntos.",
    familia: "Estrutura",
    campos: [],
    padrao: {},
  },

  {
    tipo: "NUMEROS",
    nome: "Números da campanha",
    paraQue: "Arrecadado, apoiadores e dias restantes, sempre atualizados sozinhos.",
    familia: "Automático",
    automatico: true,
    campos: [{ chave: "titulo", rotulo: "Título", tipo: "texto" }],
    padrao: { titulo: "" },
  },
  {
    tipo: "CONTAGEM",
    nome: "Contagem regressiva",
    paraQue: "O relógio até o sorteio, o jogo ou o fim do prazo. Cria urgência de verdade.",
    familia: "Automático",
    automatico: true,
    campos: [
      { chave: "titulo", rotulo: "Título", tipo: "texto", exemplo: "Faltam" },
      { chave: "ate", rotulo: "Até quando", tipo: "data" },
    ],
    padrao: { titulo: "Faltam", ate: "" },
  },
  {
    tipo: "APOIADORES",
    nome: "Quem já entrou",
    paraQue: "A lista de quem contribuiu. Prova social que se atualiza sozinha.",
    familia: "Automático",
    automatico: true,
    campos: [{ chave: "titulo", rotulo: "Título", tipo: "texto" }],
    padrao: { titulo: "Quem já entrou" },
  },
  {
    tipo: "ACOES",
    nome: "Formas de ajudar",
    paraQue: "A vitrine com todas as ações abertas da campanha.",
    familia: "Automático",
    automatico: true,
    campos: [{ chave: "titulo", rotulo: "Título", tipo: "texto" }],
    padrao: { titulo: "Formas de ajudar" },
  },
];

export function definicaoDe(tipo: TipoBloco): DefinicaoDeBloco | undefined {
  return BLOCOS.find((b) => b.tipo === tipo);
}

export function familias(): DefinicaoDeBloco["familia"][] {
  return ["Escrita", "Imagem", "Estrutura", "Automático"];
}

/** Cria um bloco novo ja com o conteudo padrao da definicao. */
export function novoBloco(tipo: TipoBloco, ordem: number, id: string): Bloco {
  const def = definicaoDe(tipo);
  return {
    id,
    tipo,
    ordem,
    visivel: true,
    conteudo: { ...(def?.padrao ?? {}) },
  };
}

/**
 * Extrai o id do video do YouTube de qualquer formato de link.
 * Feito aqui e nao no componente porque link colado errado e a falha mais comum
 * do bloco de video, e assim da pra avisar a pessoa na hora de salvar.
 */
export function idDoYoutube(url: string): string | null {
  const padroes = [
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/watch\?v=([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
  ];
  for (const p of padroes) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}
