// Monta os dados da pagina publica da campanha.
//
// Fica fora do componente de proposito: a pagina so desenha, e a regra de
// "essa acao ainda esta disponivel?" mora aqui, onde da pra testar.

import { StatusAcao, StatusPedido } from "@prisma/client";
import { prisma } from "./db";
import { resumoCampanha, extratoPorAcao } from "./extrato";

export interface ApoiadorRecente {
  id: string;
  /** Ja vem tratado: quem pediu anonimato chega aqui como "Apoio anônimo". */
  nome: string;
  anonimo: boolean;
  acao: string;
  quando: Date | null;
  // NAO existe valor aqui, e isso e proposital.
  //
  // Esconder o numero so na tela nao bastaria: ele viajaria junto com o resto
  // dos dados e ficaria legivel no codigo-fonte da pagina. Privacidade que
  // depende de CSS nao e privacidade.
  //
  // Quem precisa do valor por pessoa e a equipe, no painel, e la os dados sao
  // buscados direto do pedido.
}

export interface AcaoNaVitrine {
  id: string;
  slug: string;
  tipo: string;
  titulo: string;
  descricao: string | null;
  precoCentavos: number | null;
  /** Quanto essa acao ja rendeu limpo. Pode ser negativo (custo pago, nada vendido). */
  liquidoCentavos: number;
  metaCentavos: number | null;
  /** Nulo quando a acao nao tem estoque (doacao, bolao). */
  estoqueTotal: number | null;
  /** Teto de itens por pedido. Na rifa, quantos numeros cabem de uma vez. */
  limitePorPedido: number | null;
  restante: number | null;
  disponivel: boolean;
  /** Por que nao da pra participar agora. Nulo quando da. */
  motivo: "ESGOTADO" | "ENCERRADA" | "AINDA_NAO_ABRIU" | null;
  /** Quando a acao abre. So importa pra quem ainda vai abrir. */
  abreEm?: Date | null;
  /** Id da cor na paleta (src/lib/paleta.ts). */
  cor?: string | null;
  capaUrl?: string | null;
}

/**
 * Uma acao esta disponivel se esta ATIVA, dentro da janela e com estoque.
 *
 * A ordem importa: "encerrada" ganha de "esgotado". Um jantar que ja aconteceu
 * e lotou nao e "esgotado", e passado. Chamar de esgotado sugere que dava pra
 * comprar se a pessoa tivesse sido mais rapida, o que e mentira por omissao.
 * "Esgotado" so vale pro que ainda esta aberto e acabou o estoque.
 */
function avaliar(
  acao: { status: StatusAcao; abreEm: Date | null; fechaEm: Date | null; estoqueTotal: number | null },
  vendidos: number,
  agora: Date
): { restante: number | null; disponivel: boolean; motivo: AcaoNaVitrine["motivo"] } {
  const restante = acao.estoqueTotal == null ? null : Math.max(0, acao.estoqueTotal - vendidos);

  if (acao.status !== StatusAcao.ATIVA) return { restante, disponivel: false, motivo: "ENCERRADA" };
  if (acao.fechaEm && agora > acao.fechaEm) return { restante, disponivel: false, motivo: "ENCERRADA" };
  if (acao.abreEm && agora < acao.abreEm) return { restante, disponivel: false, motivo: "AINDA_NAO_ABRIU" };
  if (restante !== null && restante <= 0) return { restante, disponivel: false, motivo: "ESGOTADO" };

  return { restante, disponivel: true, motivo: null };
}

export async function vitrineDaCampanha(slug: string) {
  const registro = await prisma.campanha.findUnique({
    where: { slug },
    include: {
      equipe: {
        select: {
          nome: true,
          recebedorRotulo: true,
          // Quem toca a arrecadacao, pra linha do alto da pagina.
          membros: {
            where: { papel: "LIDER" },
            select: { usuario: { select: { nome: true } } },
          },
        },
      },
    },
  });
  if (!registro) return null;

  // TODO: periodo e sede viram campos de verdade no schema. Enquanto o piloto
  // tem uma equipe so, derivar do que ja existe evita migracao a cada ajuste.
  // Os textos institucionais nao entram aqui: sao do sistema (src/lib/textos.ts).
  const campanha = {
    ...registro,
    periodo: registro.prazo
      ? registro.prazo.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
      : null,
    equipeArrecadacao: registro.equipe.membros.map((m) => m.usuario.nome).join(" - ") || null,
    sede: "TETO Paraná",
  };

  const [resumo, porAcao, acoes, vendas, apoiadores, recentes] = await Promise.all([
    resumoCampanha(campanha.id),
    extratoPorAcao(campanha.id),
    prisma.acao.findMany({
      where: { campanhaId: campanha.id, status: { not: StatusAcao.RASCUNHO } },
      orderBy: { createdAt: "asc" },
    }),
    // Quanto ja saiu de cada acao. So conta pedido PAGO: reservar estoque com
    // pedido pendente deixaria a rifa "esgotada" por causa de quem gerou o PIX
    // e nunca pagou.
    prisma.item.groupBy({
      by: ["acaoId"],
      where: { pedido: { status: StatusPedido.PAGO } },
      _sum: { quantidade: true },
    }),
    // Prova social: quanta gente ja entrou. Conta pedido, nao item, senao quem
    // comprou 4 numeros da rifa viraria 4 apoiadores.
    prisma.pedido.count({
      where: { campanhaId: campanha.id, status: StatusPedido.PAGO },
    }),
    // Os ultimos que entraram. So pedido PAGO: quem gerou o PIX e nao pagou nao
    // vira prova social.
    prisma.pedido.findMany({
      where: { campanhaId: campanha.id, status: StatusPedido.PAGO },
      orderBy: { paidAt: "desc" },
      take: 6,
      select: {
        id: true,
        nome: true,
        anonimo: true,
        valorBrutoCentavos: true,
        paidAt: true,
        itens: { select: { acao: { select: { titulo: true } } }, take: 1 },
      },
    }),
  ]);

  const agora = new Date();
  const vendidosPorAcao = new Map(vendas.map((v) => [v.acaoId, v._sum.quantidade ?? 0]));
  const liquidoPorAcao = new Map(porAcao.map((l) => [l.acaoId, l.liquidoCentavos]));

  const vitrine: AcaoNaVitrine[] = acoes.map((acao) => ({
    id: acao.id,
    slug: acao.slug,
    tipo: acao.tipo,
    titulo: acao.titulo,
    descricao: acao.descricao,
    precoCentavos: acao.precoCentavos,
    liquidoCentavos: liquidoPorAcao.get(acao.id) ?? 0,
    metaCentavos: acao.metaCentavos,
    estoqueTotal: acao.estoqueTotal,
    limitePorPedido: acao.limitePorPedido,
    ...avaliar(acao, vendidosPorAcao.get(acao.id) ?? 0, agora),
  }));

  // Disponivel primeiro: o que da pra fazer agora fica no topo, o que ja passou
  // desce sem sumir (serve de prova de que a equipe se mexeu).
  vitrine.sort((a, b) => Number(b.disponivel) - Number(a.disponivel));

  // Quem pediu anonimato some da lista publica, mas continua contando no total:
  // esconder o nome e o combinado, sumir com a contribuicao seria outra coisa.
  const apoiadoresRecentes: ApoiadorRecente[] = recentes.map((p) => ({
    id: p.id,
    nome: p.anonimo ? "Apoio anônimo" : p.nome,
    anonimo: p.anonimo,
    valorCentavos: p.valorBrutoCentavos,
    acao: p.itens[0]?.acao.titulo ?? "Doação",
    quando: p.paidAt,
  }));

  return { campanha, resumo: { ...resumo, apoiadores }, vitrine, apoiadoresRecentes };
}
