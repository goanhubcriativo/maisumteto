// O que o cadastro e a gerência do evento compartilham.
//
// Mesma ideia do produto (ver src/lib/produto.ts): mora aqui, num módulo
// neutro, pra os dois lados (criar e gerenciar) falarem a mesma língua, e pra o
// servidor poder chamar as funções sem esbarrar no "use client".

import type { TextoRico } from "./textoRico";

/** Uma linha de ingresso ou de extra: nome, preço e quantas vagas. */
export interface EntradaDeEvento {
  nome: string;
  precoReais: string;
  vagas: string;
}

export interface ValoresDoEvento {
  // Sobre a ação (a causa, igual ao produto).
  historia: TextoRico | null;
  metaReais: string;
  abreEm: string;
  fechaEm: string;
  cor: string;
  coresProprias: boolean;
  corPrincipal: string;
  corTopo: string;
  palavraChave: string;
  cardTitulo: string;
  cardDescricao: string;

  // O evento.
  titulo: string;
  descricao: TextoRico | null;
  quando: string; // valor do <input datetime-local>
  onde: string;
  incluso: TextoRico | null;

  // Ingressos: a pessoa escolhe UM (Jantar, Jantar + bebida, ou lotes com
  // preços diferentes). Sempre tem ao menos um.
  ingressos: EntradaDeEvento[];

  // Extras/adicionais: a pessoa soma VÁRIOS por cima do ingresso (garrafa de
  // vinho, cartela de bingo).
  temExtras: boolean;
  extras: EntradaDeEvento[];

  // Custo. Fixo é o do salão, som (adiado pro fechamento, como no produto).
  // Por pessoa é comida e bebida, que anda com cada ingresso vendido.
  custoFixoReais: string;
  custoPorPessoaReais: string;
}

export function eventoEmBranco(): ValoresDoEvento {
  return {
    historia: null,
    metaReais: "",
    abreEm: "",
    fechaEm: "",
    cor: "terra",
    coresProprias: false,
    corPrincipal: "#0d5fa6",
    corTopo: "#074973",
    palavraChave: "",
    cardTitulo: "",
    cardDescricao: "",
    titulo: "",
    descricao: null,
    quando: "",
    onde: "",
    incluso: null,
    ingressos: [{ nome: "", precoReais: "", vagas: "" }],
    temExtras: false,
    extras: [{ nome: "", precoReais: "", vagas: "" }],
    custoFixoReais: "",
    custoPorPessoaReais: "",
  };
}

/** Lê ingressos/extras guardados na config, já com a forma certa. */
export function lerEntradas(
  bruto: unknown
): { nome: string; precoCentavos: number; vagas: number | null }[] {
  if (!Array.isArray(bruto)) return [];
  const fora: { nome: string; precoCentavos: number; vagas: number | null }[] = [];
  for (const l of bruto) {
    if (!l || typeof l !== "object") continue;
    const nome = (l as { nome?: unknown }).nome;
    const preco = (l as { precoCentavos?: unknown }).precoCentavos;
    const vagas = (l as { vagas?: unknown }).vagas;
    if (typeof nome !== "string" || typeof preco !== "number") continue;
    fora.push({ nome, precoCentavos: preco, vagas: typeof vagas === "number" ? vagas : null });
  }
  return fora;
}
