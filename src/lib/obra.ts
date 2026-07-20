// As etapas da obra: a meta da campanha dividida em construção.
//
// Por que isso existe: "9% da meta" não é um pedido. "R$ 462,59 para fincar o
// segundo piloti" é. Toda a linguagem visual da campanha sai daqui, e o desenho
// da casa e a linha do tempo leem a MESMA lista, senão os dois contariam
// histórias diferentes sobre a mesma obra.
//
// Uma ressalva honesta sobre os números: esta divisão é a forma que a campanha
// escolheu para repartir a própria meta, e não uma tabela de preços da Teto.
// Nenhum valor aqui afirma quanto custa um piloti de verdade. O que é verdade é
// o total, que vem do contrato, e a ordem das fases, que é a ordem em que uma
// casa emergencial sobe.

export interface Etapa {
  /** Porcentagem da meta em que esta etapa fica paga. */
  em: number;
  /** Identificador usado pelo desenho para acender a peça certa. */
  chave: string;
  /** Como a etapa aparece no pedido: "faltam X para <nome>". */
  nome: string;
  /** Título curto, para a linha do tempo. */
  curto: string;
}

export const ETAPAS: Etapa[] = [
  { em: 6, chave: "piloti1", nome: "fincar o primeiro piloti", curto: "1º piloti" },
  { em: 12, chave: "piloti2", nome: "fincar o segundo piloti", curto: "2º piloti" },
  { em: 18, chave: "piloti3", nome: "fincar o terceiro piloti", curto: "3º piloti" },
  { em: 24, chave: "piloti4", nome: "fincar o quarto piloti", curto: "4º piloti" },
  { em: 30, chave: "piloti5", nome: "fincar o quinto piloti", curto: "5º piloti" },
  { em: 36, chave: "piloti6", nome: "fincar o último piloti", curto: "6º piloti" },
  { em: 46, chave: "plataforma", nome: "montar a plataforma", curto: "Plataforma" },
  { em: 60, chave: "paredes", nome: "levantar as paredes", curto: "Paredes" },
  { em: 74, chave: "telhado", nome: "fechar o telhado", curto: "Telhado" },
  { em: 84, chave: "porta", nome: "instalar a porta", curto: "Porta" },
  { em: 90, chave: "janela", nome: "abrir a janela", curto: "Janela" },
  { em: 96, chave: "escada", nome: "montar a escada", curto: "Escada" },
  { em: 100, chave: "entregue", nome: "entregar a casa", curto: "Entrega" },
];

/** Quanto, em centavos, a campanha precisa ter arrecadado para fechar a etapa. */
export function custoDaEtapa(etapa: Etapa, metaCentavos: number): number {
  return Math.ceil((etapa.em / 100) * metaCentavos);
}

/** A etapa que este dinheiro ainda não comprou. Nula quando a casa está paga. */
export function proximaEtapa(pct: number): Etapa | null {
  return ETAPAS.find((e) => pct < e.em) ?? null;
}

/** Quanto falta, em centavos, para fechar a próxima etapa. */
export function faltaParaEtapa(
  etapa: Etapa,
  arrecadadoCentavos: number,
  metaCentavos: number
): number {
  return Math.max(0, custoDaEtapa(etapa, metaCentavos) - arrecadadoCentavos);
}

/** A porcentagem da meta já arrecadada. Protege contra meta zerada. */
export function percentual(arrecadadoCentavos: number, metaCentavos: number): number {
  return metaCentavos > 0 ? (arrecadadoCentavos / metaCentavos) * 100 : 0;
}
