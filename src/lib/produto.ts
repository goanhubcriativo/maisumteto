// O que o cadastro e a gerência do produto compartilham.
//
// Mora aqui, e não dentro de um dos dois, porque as duas telas precisam falar a
// mesma língua: se a lista de formas de entrega existisse em duplicata, uma
// mudaria e a outra ficaria pra trás sem ninguém notar.

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
