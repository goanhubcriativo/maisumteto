// O que o cadastro e a gerência do produto compartilham.
//
// Mora aqui, e não dentro de um dos dois, porque as duas telas precisam falar a
// mesma língua: se a lista de formas de entrega existisse em duplicata, uma
// mudaria e a outra ficaria pra trás sem ninguém notar.

import type { TextoRico } from "./textoRico";

export interface FormaDeEntrega {
  tipo: string;
  rotulo: string;
  ajuda: string;
}

export const ENTREGAS: FormaDeEntrega[] = [
  {
    tipo: "LOCAL",
    rotulo: "Retirada em local",
    ajuda: "Coloque aqui o endereço, os dias e os horários de retirada.",
  },
  {
    tipo: "ENVIO",
    rotulo: "Retirada no envio",
    ajuda: "Envio de qual CC? Se já souber o local e a data, inclua também.",
  },
  {
    tipo: "ALOJAMENTO",
    rotulo: "Retirar no alojamento",
    ajuda: "Qual CC? Como as pessoas te encontram lá?",
  },
  {
    tipo: "PESSOA",
    rotulo: "Posso enviar para a pessoa",
    ajuda:
      "Dê os detalhes. Informe, por exemplo, que você vai entrar em contato, e que o frete não está incluso.",
  },
  {
    tipo: "COMBINADA",
    rotulo: "Retirada combinada",
    ajuda: "Explique aqui como vai funcionar.",
  },
];

/** O que veio guardado na config, já com a forma certa. */
export interface EntregaEscolhida {
  tipo: string;
  rotulo: string;
  texto: string;
}

// ---------------------------------------------------------------------------
// Os valores do formulário do produto.
//
// Moram AQUI, e não dentro do FormularioDoProduto, porque aquele arquivo é
// "use client": de um módulo client o servidor só consegue renderizar
// componentes, nunca chamar uma função exportada. Com produtoEmBranco() lá
// dentro, a tela de criar quebrava no servidor ("Attempted to call
// produtoEmBranco() from the server"). Num módulo neutro os dois lados usam.
// ---------------------------------------------------------------------------

export type ModoProducao = "ENCOMENDA" | "PRONTO";
export type CustoQuando = "AGORA" | "FINAL";
export type CustoComo = "PRODUTO" | "TOTAL";
export type DimensaoDeVariacao = "tamanho" | "modelagem" | "cor" | "modelo";

export interface ValoresDoProduto {
  historia: TextoRico | null;
  descricao: TextoRico | null;
  /** Nome da campanha. É o que aparece no alto da página (o header). */
  titulo: string;
  /** Nome do produto. É o que aparece ao lado da foto, na vitrine. */
  nomeDoProduto: string;
  fotos: string[];
  precoReais: string;
  metaReais: string;
  abreEm: string;
  fechaEm: string;
  cor: string;
  palavraChave: string;
  modoProducao: ModoProducao;
  custoQuando: CustoQuando;
  custoComo: CustoComo;
  custoValorReais: string;
  dimAtiva: Record<DimensaoDeVariacao, boolean>;
  tamanhos: string[];
  modelagens: string[];
  cores: string[];
  modelos: string[];
  grade: Record<string, string>;
  estoqueSimples: string;
  entregas: { tipo: string; texto: string }[];
  prazo: string;
}

/** O produto em branco, pra tela de criar. */
export function produtoEmBranco(): ValoresDoProduto {
  return {
    historia: null,
    descricao: null,
    titulo: "",
    nomeDoProduto: "",
    fotos: [],
    precoReais: "",
    metaReais: "",
    abreEm: "",
    fechaEm: "",
    cor: "roxo",
    palavraChave: "",
    modoProducao: "ENCOMENDA",
    custoQuando: "AGORA",
    custoComo: "PRODUTO",
    custoValorReais: "",
    dimAtiva: { tamanho: false, modelagem: false, cor: false, modelo: false },
    tamanhos: [],
    modelagens: [],
    cores: [],
    modelos: [],
    grade: {},
    estoqueSimples: "",
    entregas: [],
    prazo: "",
  };
}

export function lerEntregas(bruto: unknown): EntregaEscolhida[] {
  if (!Array.isArray(bruto)) return [];
  const saida: EntregaEscolhida[] = [];
  for (const e of bruto) {
    if (!e || typeof e !== "object") continue;
    const tipo = (e as { tipo?: unknown }).tipo;
    if (typeof tipo !== "string") continue;
    const conhecida = ENTREGAS.find((x) => x.tipo === tipo);
    if (!conhecida) continue;
    const texto = (e as { texto?: unknown }).texto;
    saida.push({
      tipo,
      rotulo: conhecida.rotulo,
      texto: typeof texto === "string" ? texto : "",
    });
  }
  return saida;
}
