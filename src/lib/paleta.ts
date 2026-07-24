// A paleta das acoes.
//
// A regra do construtor continua valendo: quem monta a pagina nao escolhe cor
// livre. Mas cor nenhuma deixa tudo igual, e um bolao precisa ter cara de bolao,
// nao de formulario. O meio-termo e este: uma lista fechada de cores, todas
// testadas contra o branco e todas com contraste suficiente pra texto por cima.
//
// A cor pinta a ACAO (o cartao, a barra, o icone, a pagina dela), nunca a
// plataforma nem o cabecalho da campanha. Assim a identidade da Teto continua
// mandando na moldura, e a personalidade fica no conteudo.
//
// Toda cor daqui foi conferida com contraste >= 4.5:1 contra branco, que e o
// minimo pra texto normal ser legivel (WCAG AA). Ver testes/paleta.js.

export interface CorDaPaleta {
  id: string;
  nome: string;
  /**
   * O tom que aguenta TEXTO: cor de letra sobre branco e fundo de bloco com
   * letra branca por cima. Por isso passa em 4.5:1 contra o branco, sem exceção.
   */
  forte: string;
  /**
   * O tom da identidade, usado só onde a cor é mancha e nunca carrega texto:
   * a bolinha do seletor, a fatia do gráfico, o preenchimento da barra.
   *
   * Existe por causa do azul do logo. Ele é claro demais para segurar texto
   * (3,4:1 contra o branco), mas é ele que a pessoa reconhece como a cor da
   * Teto. Separar os dois papéis deixa a marca aparecer onde ela é só cor, e
   * mantém a leitura garantida onde há palavra escrita.
   *
   * Nas outras cores é igual ao forte, e aí não muda nada.
   */
  marca?: string;
  /** Fundo levissimo, pra chapar atras de icone e etiqueta. */
  fundo: string;
  /** Borda do fundo leve. */
  borda: string;
}

export const PALETA: CorDaPaleta[] = [
  {
    id: "logo",
    nome: "Azul Teto",
    forte: "#007eb5",
    marca: "#00a6ee",
    fundo: "rgba(0, 166, 238, 0.1)",
    borda: "rgba(0, 166, 238, 0.22)",
  },
  {
    id: "teto",
    nome: "Azul",
    forte: "#1b78ce",
    marca: "#1f8bf0",
    fundo: "rgba(31, 139, 240, 0.1)",
    borda: "rgba(31, 139, 240, 0.22)",
  },
  {
    id: "mar",
    nome: "Azul profundo",
    forte: "#1857d6",
    fundo: "rgba(24, 87, 214, 0.1)",
    borda: "rgba(24, 87, 214, 0.22)",
  },
  {
    id: "campo",
    nome: "Verde",
    forte: "#0f8655",
    marca: "#16c079",
    fundo: "rgba(22, 192, 121, 0.1)",
    borda: "rgba(22, 192, 121, 0.22)",
  },
  {
    id: "terra",
    nome: "Coral",
    forte: "#c2512e",
    marca: "#ff6a3d",
    fundo: "rgba(255, 106, 61, 0.1)",
    borda: "rgba(255, 106, 61, 0.22)",
  },
  {
    id: "ocre",
    nome: "Âmbar",
    forte: "#9d6a16",
    marca: "#f5a623",
    fundo: "rgba(245, 166, 35, 0.1)",
    borda: "rgba(245, 166, 35, 0.22)",
  },
  {
    id: "vinho",
    nome: "Framboesa",
    forte: "#d53564",
    marca: "#e83a6d",
    fundo: "rgba(232, 58, 109, 0.1)",
    borda: "rgba(232, 58, 109, 0.22)",
  },
  {
    id: "roxo",
    nome: "Roxo",
    forte: "#8b52f5",
    fundo: "rgba(139, 82, 245, 0.1)",
    borda: "rgba(139, 82, 245, 0.22)",
  },
  {
    id: "verde",
    nome: "Verde limão",
    forte: "#3d8625",
    marca: "#5fd13a",
    fundo: "rgba(95, 209, 58, 0.1)",
    borda: "rgba(95, 209, 58, 0.22)",
  },
  {
    id: "dourado",
    nome: "Amarelo",
    forte: "#8f6f0a",
    marca: "#f7bf12",
    fundo: "rgba(247, 191, 18, 0.1)",
    borda: "rgba(247, 191, 18, 0.22)",
  },
  {
    id: "magenta",
    nome: "Magenta",
    forte: "#d0378d",
    marca: "#ec3ea0",
    fundo: "rgba(236, 62, 160, 0.1)",
    borda: "rgba(236, 62, 160, 0.22)",
  },
  {
    id: "anil",
    nome: "Anil",
    forte: "#3a4fd0",
    fundo: "rgba(58, 79, 208, 0.1)",
    borda: "rgba(58, 79, 208, 0.22)",
  },
  {
    id: "violeta",
    nome: "Violeta",
    forte: "#9333ff",
    fundo: "rgba(147, 51, 255, 0.1)",
    borda: "rgba(147, 51, 255, 0.22)",
  },
  {
    id: "vermelho",
    nome: "Vermelho",
    forte: "#dc3632",
    marca: "#ef3b36",
    fundo: "rgba(239, 59, 54, 0.1)",
    borda: "rgba(239, 59, 54, 0.22)",
  },
  {
    id: "laranja",
    nome: "Laranja",
    forte: "#bd5a12",
    marca: "#ff7a18",
    fundo: "rgba(255, 122, 24, 0.1)",
    borda: "rgba(255, 122, 24, 0.22)",
  },
  {
    id: "ceu",
    nome: "Azul céu",
    forte: "#177da5",
    marca: "#22b8f2",
    fundo: "rgba(34, 184, 242, 0.1)",
    borda: "rgba(34, 184, 242, 0.22)",
  },
  {
    id: "turquesa",
    nome: "Turquesa",
    forte: "#0c837f",
    marca: "#12c6c0",
    fundo: "rgba(18, 198, 192, 0.1)",
    borda: "rgba(18, 198, 192, 0.22)",
  },
  {
    id: "grafite",
    nome: "Grafite",
    forte: "#4a5a6a",
    fundo: "rgba(74, 90, 106, 0.1)",
    borda: "rgba(74, 90, 106, 0.22)",
  },
];

export const COR_PADRAO = PALETA[0];

export function corDe(id: string | null | undefined): CorDaPaleta {
  return PALETA.find((c) => c.id === id) ?? COR_PADRAO;
}

/** O tom de mancha da cor: identidade quando existe, senão o mesmo forte. */
export function marcaDe(id: string | null | undefined): string {
  const c = corDe(id);
  return c.marca ?? c.forte;
}

/**
 * Sugestao de cor por tipo de acao.
 *
 * Nao e regra, e ponto de partida: a acao ja nasce com uma cor que combina com
 * o que ela e, e a pessoa troca se quiser. Escolher cor numa lista de oito e
 * facil; escolher do zero, sem referencia, e que trava.
 */
export const COR_SUGERIDA: Record<string, string> = {
  DOACAO: "logo",
  RIFA: "ocre",
  BINGO: "vinho",
  PRODUTO: "roxo",
  EVENTO: "terra",
  COLETA: "campo",
  LEILAO: "grafite",
  BOLAO: "campo",
  OUTRO: "logo",
};

/**
 * As variaveis CSS que a cor injeta. Ficam num objeto de estilo em linha, no
 * elemento da acao, entao o CSS continua sem saber quais cores existem: ele so
 * usa var(--acao-forte) e a cor certa chega de fora.
 */
/** "#0d5fa6" -> "rgba(13, 95, 166, 0.08)". Serve pra derivar os tons leves de
 *  uma cor propria sem a pessoa ter que escolher quatro cores na mao. */
function comAlfa(hex: string, alfa: number): string {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex.trim());
  if (!m) return hex;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alfa})`;
}

const HEX = /^#[\da-fA-F]{6}$/;

/**
 * As cores proprias de uma acao, quando ela nao usa a paleta.
 *
 * `principal` pinta tudo que a cor da acao pintava (botao, preco, barra). `topo`
 * e so o fim do degrade do heroi, pra dupla de cima combinar. Vazias, cada uma
 * volta pro padrao: a acao segue identica a antes.
 */
export interface CoresProprias {
  principal?: string | null;
  topo?: string | null;
}

export function estiloDaCor(
  id: string | null | undefined,
  cores?: CoresProprias | null
): React.CSSProperties {
  const c = corDe(id);
  const principal = cores?.principal && HEX.test(cores.principal) ? cores.principal : null;
  const topo = cores?.topo && HEX.test(cores.topo) ? cores.topo : null;

  const estilo: Record<string, string> = {
    "--acao-forte": principal ?? c.forte,
    "--acao-marca": principal ?? (c.marca ?? c.forte),
    "--acao-fundo": principal ? comAlfa(principal, 0.08) : c.fundo,
    "--acao-borda": principal ? comAlfa(principal, 0.18) : c.borda,
  };
  // Só define o topo quando é próprio: assim o CSS cai no azul padrão do heroi
  // (var(--acao-topo, var(--azul-fundo))) pra todo mundo que não escolheu.
  if (topo) estilo["--acao-topo"] = topo;
  return estilo as React.CSSProperties;
}

/** Lê as cores próprias guardadas na config, já filtrando o que não é hex. */
export function lerCoresProprias(bruto: unknown): CoresProprias {
  const o = (bruto ?? {}) as Record<string, unknown>;
  const pega = (k: string) =>
    typeof o[k] === "string" && HEX.test(o[k] as string) ? (o[k] as string) : null;
  return { principal: pega("principal"), topo: pega("topo") };
}
