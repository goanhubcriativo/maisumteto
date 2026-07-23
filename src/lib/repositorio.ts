// O repositorio: tudo que a plataforma le e escreve, agora no Postgres.
//
// Substitui o deposito em arquivo, que servia enquanto era so localhost. Na
// Vercel o servidor e recriado a cada acesso e o disco some junto, entao arquivo
// nao guarda nada. Banco de verdade deixou de ser opcional no dia em que isso
// virou site publico.
//
// A interface e quase a mesma do deposito, com uma diferenca que atravessa tudo:
// aqui e ASSINCRONO. Toda leitura e escrita fala com o banco pela rede, e fingir
// que isso e instantaneo so esconderia o custo.
//
// Uma campanha por equipe no piloto. Quando existir a segunda equipe, e so
// passar o id da campanha por parametro em vez de buscar a unica.

import { Prisma, StatusAcao } from "@prisma/client";
import { prisma } from "./db";
import { novoBloco, type Bloco, type TipoBloco } from "./blocos";
import { receitaDe } from "./catalogo";
import { COR_SUGERIDA } from "./paleta";
import type { AcaoNaVitrine, ApoiadorRecente } from "./vitrine";
import { opcoesPorAcaoDaCampanha } from "./opcoes";

export interface AcaoDoPainel extends AcaoNaVitrine {
  campanhaId: string;
  config: Record<string, unknown>;
  custoUnitarioCentavos: number;
  tabelaMedidas: string | null;
  criadaEm: Date;
  rascunho: boolean;
  fechaEm: Date | null;
}

// ---------------------------------------------------------------------------
// Estado de uma acao
// ---------------------------------------------------------------------------

/**
 * Traduz o estado guardado no banco para o que a tela precisa saber.
 *
 * A ordem importa: encerrada ganha de esgotada (um jantar que ja aconteceu e
 * lotou e passado, nao "esgotado"), e as duas ganham de "ainda vai abrir".
 */
function avaliar(
  acao: {
    status: StatusAcao;
    abreEm: Date | null;
    fechaEm: Date | null;
    estoqueTotal: number | null;
  },
  vendidos: number,
  agora: Date
): Pick<AcaoNaVitrine, "restante" | "disponivel" | "motivo"> {
  const restante =
    acao.estoqueTotal == null ? null : Math.max(0, acao.estoqueTotal - vendidos);

  if (acao.status === StatusAcao.RASCUNHO) {
    return { restante, disponivel: false, motivo: "ENCERRADA" };
  }
  if (acao.status !== StatusAcao.ATIVA) {
    return { restante, disponivel: false, motivo: "ENCERRADA" };
  }
  if (acao.fechaEm && agora > acao.fechaEm) {
    return { restante, disponivel: false, motivo: "ENCERRADA" };
  }
  if (acao.abreEm && agora < acao.abreEm) {
    return { restante, disponivel: false, motivo: "AINDA_NAO_ABRIU" };
  }
  if (restante !== null && restante <= 0) {
    return { restante, disponivel: false, motivo: "ESGOTADO" };
  }
  return { restante, disponivel: true, motivo: null };
}

// ---------------------------------------------------------------------------
// Campanha
// ---------------------------------------------------------------------------

/**
 * A campanha PRINCIPAL: a primeira, a que o público vê na home.
 *
 * É de propósito que ela seja fixa (a mais antiga) e não siga a escolha do
 * painel: quando o líder abre uma campanha de teste pra experimentar, o site
 * público não pode trocar junto e mostrar o rascunho pra quem doa. Erro claro
 * se o banco ainda não foi semeado.
 */
export async function campanhaAtual() {
  const c = await prisma.campanha.findFirst({
    orderBy: { createdAt: "asc" },
    include: { equipe: { select: { nome: true, recebedorRotulo: true } } },
  });
  if (!c) {
    throw new Error(
      "Nenhuma campanha no banco. Rode a semeadura (npm run db:semear) antes de abrir o painel."
    );
  }
  return c;
}

/** Todas as campanhas da equipe, a principal primeiro. Pro seletor do painel. */
export async function listarCampanhas() {
  const principal = await campanhaAtual();
  return prisma.campanha.findMany({
    where: { equipeId: principal.equipeId },
    orderBy: { createdAt: "asc" },
    select: { id: true, titulo: true, slug: true, status: true, createdAt: true },
  });
}

/**
 * Cria uma campanha de teste EM BRANCO, com trava contra repetição.
 *
 * Em branco de propósito: sem ação nenhuma, campos vazios, tudo a preencher. É
 * um lugar limpo pra experimentar do zero, não uma cópia da real. Antes ela
 * nascia como cópia, e como ficava idêntica à principal dava a impressão de que
 * "nada aconteceu".
 *
 * A trava: se uma campanha de teste acabou de nascer para esta equipe (últimos
 * segundos), reusa em vez de criar outra. O envio de formulário pode disparar
 * duas vezes (React em dev, clique rápido, reenvio); aqui dois disparos quase
 * juntos viram uma campanha só.
 */
export async function criarCampanhaDeTeste(equipeId: string) {
  const recente = await prisma.campanha.findFirst({
    where: {
      equipeId,
      status: "RASCUNHO",
      titulo: { startsWith: "Campanha de teste" },
      createdAt: { gt: new Date(Date.now() - 10_000) },
    },
    orderBy: { createdAt: "desc" },
  });
  if (recente) return recente;

  const slug = await slugDeCampanhaLivre("campanha-de-teste");
  // Nasce vazia: sem ações, meta zero, nome de rascunho. O que existe é só a
  // casca; o resto a pessoa preenche em Campanha e vai criando as ações.
  return prisma.campanha.create({
    data: {
      equipeId,
      slug,
      titulo: "Campanha de teste",
      metaCentavos: 0,
      status: "RASCUNHO",
    },
  });
}

/**
 * Apaga uma campanha de teste. NUNCA a principal (a mais antiga, a do público):
 * a barreira mora aqui, não só na tela. Apagar leva junto ações, opções, blocos
 * e pedidos por cascata. Devolve ok/erro pra tela decidir o que dizer.
 */
export async function apagarCampanha(id: string) {
  const principal = await campanhaAtual();
  if (id === principal.id) {
    return { ok: false as const, erro: "A campanha principal não pode ser apagada." };
  }
  const c = await prisma.campanha.findFirst({ where: { id, equipeId: principal.equipeId } });
  if (!c) return { ok: false as const, erro: "Campanha não encontrada." };

  await prisma.campanha.delete({ where: { id } });
  return { ok: true as const };
}

/** Slug único na tabela de campanhas (o slug de campanha é único no banco todo). */
async function slugDeCampanhaLivre(base: string): Promise<string> {
  const usados = new Set(
    (await prisma.campanha.findMany({ select: { slug: true } })).map((c) => c.slug)
  );
  if (!usados.has(base)) return base;
  let n = 2;
  while (usados.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

export async function salvarCampanha(
  id: string,
  campos: Prisma.CampanhaUpdateInput
) {
  return prisma.campanha.update({ where: { id }, data: campos });
}

// ---------------------------------------------------------------------------
// Acoes
// ---------------------------------------------------------------------------

/**
 * Quanto ja saiu de cada acao.
 *
 * So conta pedido PAGO: reservar estoque com pedido pendente deixaria a rifa
 * "esgotada" por causa de quem gerou o PIX e nunca pagou.
 */
async function vendidosPorAcao(): Promise<Map<string, number>> {
  const linhas = await prisma.item.groupBy({
    by: ["acaoId"],
    where: { pedido: { status: "PAGO" } },
    _sum: { quantidade: true },
  });
  return new Map(linhas.map((l) => [l.acaoId, l._sum.quantidade ?? 0]));
}

/** Quanto cada acao rendeu limpo (receita menos custo menos taxa). */
async function liquidoPorAcao(campanhaId: string): Promise<Map<string, number>> {
  const linhas = await prisma.lancamento.groupBy({
    by: ["acaoId"],
    where: { campanhaId },
    _sum: { valorCentavos: true },
  });
  const mapa = new Map<string, number>();
  for (const l of linhas) {
    if (l.acaoId) mapa.set(l.acaoId, l._sum.valorCentavos ?? 0);
  }
  return mapa;
}

export async function listarAcoes(campanhaId: string): Promise<AcaoDoPainel[]> {
  const [acoes, vendidos, liquidos, opcoesPorAcao] = await Promise.all([
    prisma.acao.findMany({ where: { campanhaId }, orderBy: { createdAt: "asc" } }),
    vendidosPorAcao(),
    liquidoPorAcao(campanhaId),
    opcoesPorAcaoDaCampanha(campanhaId),
  ]);

  const agora = new Date();

  return acoes.map((a) => {
    const opcoes = opcoesPorAcao.get(a.id) ?? [];
    const base = {
      id: a.id,
      campanhaId: a.campanhaId,
      slug: a.slug,
      tipo: a.tipo,
      titulo: a.titulo,
      descricao: a.descricao,
      precoCentavos: a.precoCentavos,
      liquidoCentavos: liquidos.get(a.id) ?? 0,
      metaCentavos: a.metaCentavos,
      estoqueTotal: a.estoqueTotal,
      limitePorPedido: a.limitePorPedido,
      abreEm: a.abreEm,
      fechaEm: a.fechaEm,
      cor: a.cor,
      capaUrl: a.capaUrl,
      capaFoco: a.capaFoco,
      opcoes,
      config: (a.config as Record<string, unknown>) ?? {},
      custoUnitarioCentavos: a.custoUnitarioCentavos,
      tabelaMedidas: a.tabelaMedidas,
      criadaEm: a.createdAt,
      rascunho: a.status === StatusAcao.RASCUNHO,
      ...avaliar(a, vendidos.get(a.id) ?? 0, agora),
    };
    // Com opções, o estoque e a disponibilidade da AÇÃO passam a ser a soma das
    // opções: a ação está esgotada só quando toda opção estiver. Sem isso, um
    // evento com dois lotes fecharia por causa do estoque nulo da ação.
    if (opcoes.length > 0) {
      const temVaga = opcoes.some((o) => !o.esgotada);
      if (!temVaga && base.disponivel) {
        return { ...base, disponivel: false, motivo: "ESGOTADO" as const };
      }
    }
    return base;
  });
}

/** O que a pagina publica mostra: tudo que nao e rascunho, disponivel primeiro. */
export async function listarAcoesPublicadas(campanhaId: string) {
  const todas = await listarAcoes(campanhaId);
  return todas
    .filter((a) => !a.rascunho)
    .sort((a, b) => Number(b.disponivel) - Number(a.disponivel));
}

export async function buscarAcao(idOuSlug: string): Promise<AcaoDoPainel | null> {
  const registro = await prisma.acao.findFirst({
    where: { OR: [{ id: idOuSlug }, { slug: idOuSlug }] },
  });
  if (!registro) return null;

  const todas = await listarAcoes(registro.campanhaId);
  return todas.find((a) => a.id === registro.id) ?? null;
}

/** "Rifa do Churrasco!" -> "rifa-do-churrasco" */
export function paraSlug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // tira os acentos separados pelo NFD
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Slug unico dentro da campanha, somando -2, -3 quando repete. */
async function slugLivre(campanhaId: string, base: string): Promise<string> {
  const usados = new Set(
    (await prisma.acao.findMany({ where: { campanhaId }, select: { slug: true } })).map(
      (a) => a.slug
    )
  );
  if (!usados.has(base)) return base;
  let n = 2;
  while (usados.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

export interface NovaAcao {
  campanhaId: string;
  tipo: string;
  titulo: string;
  descricao: string;
  precoCentavos: number | null;
  custoUnitarioCentavos: number;
  metaCentavos: number | null;
  estoqueTotal: number | null;
  config: Record<string, unknown>;
}

export async function criarAcao(nova: NovaAcao) {
  const receita = receitaDe(nova.tipo);
  const slug = await slugLivre(nova.campanhaId, paraSlug(nova.titulo) || "acao");

  return prisma.acao.create({
    data: {
      campanhaId: nova.campanhaId,
      tipo: nova.tipo as never,
      slug,
      titulo: nova.titulo,
      descricao: nova.descricao || null,
      precoCentavos: nova.precoCentavos,
      custoUnitarioCentavos: nova.custoUnitarioCentavos,
      metaCentavos: nova.metaCentavos,
      estoqueTotal: nova.estoqueTotal,
      config: nova.config as Prisma.InputJsonValue,
      // Nasce com a cor pensada pro tipo dela: escolher entre oito e facil,
      // escolher do zero, sem referencia, e o que trava.
      cor: COR_SUGERIDA[nova.tipo] ?? "teto",
      status: StatusAcao.RASCUNHO, // so aparece na pagina depois de publicar
      // A pagina ja nasce montada com os blocos da receita: pagina em branco
      // trava qualquer um, e mexer no que existe e mais facil que comecar do zero.
      blocos: {
        create: (receita?.blocosIniciais ?? ["TEXTO"]).map((tipo, i) => ({
          tipo,
          ordem: i,
          visivel: true,
          conteudo: (novoBloco(tipo as TipoBloco, i, "x").conteudo ??
            {}) as Prisma.InputJsonValue,
        })),
      },
    },
  });
}

export async function salvarAcao(id: string, campos: Prisma.AcaoUpdateInput) {
  return prisma.acao.update({ where: { id }, data: campos });
}

export async function publicarAcao(id: string, publicar: boolean) {
  return prisma.acao.update({
    where: { id },
    data: { status: publicar ? StatusAcao.ATIVA : StatusAcao.RASCUNHO },
  });
}

export async function apagarAcao(id: string) {
  return prisma.acao.delete({ where: { id } });
}

// ---------------------------------------------------------------------------
// Blocos
// ---------------------------------------------------------------------------

export type AlvoDeBloco = { tipo: "campanha"; id: string } | { tipo: "acao"; id: string };

function ondeFica(alvo: AlvoDeBloco) {
  return alvo.tipo === "campanha" ? { campanhaId: alvo.id } : { acaoId: alvo.id };
}

export async function listarBlocos(alvo: AlvoDeBloco): Promise<Bloco[]> {
  const linhas = await prisma.bloco.findMany({
    where: ondeFica(alvo),
    orderBy: { ordem: "asc" },
  });
  return linhas.map((b) => ({
    id: b.id,
    tipo: b.tipo as TipoBloco,
    ordem: b.ordem,
    visivel: b.visivel,
    conteudo: (b.conteudo as Record<string, unknown>) ?? {},
  }));
}

export async function adicionarBloco(alvo: AlvoDeBloco, tipo: TipoBloco) {
  const quantos = await prisma.bloco.count({ where: ondeFica(alvo) });
  return prisma.bloco.create({
    data: {
      ...ondeFica(alvo),
      tipo,
      ordem: quantos,
      visivel: true,
      conteudo: (novoBloco(tipo, quantos, "x").conteudo ?? {}) as Prisma.InputJsonValue,
    },
  });
}

export async function salvarBloco(id: string, conteudo: Record<string, unknown>) {
  return prisma.bloco.update({
    where: { id },
    data: { conteudo: conteudo as Prisma.InputJsonValue },
  });
}

export async function alternarBloco(id: string) {
  const b = await prisma.bloco.findUnique({ where: { id }, select: { visivel: true } });
  if (!b) return;
  return prisma.bloco.update({ where: { id }, data: { visivel: !b.visivel } });
}

export async function removerBloco(alvo: AlvoDeBloco, id: string) {
  await prisma.bloco.delete({ where: { id } });
  // Reordena pra nao deixar buraco na sequencia.
  const resto = await prisma.bloco.findMany({
    where: ondeFica(alvo),
    orderBy: { ordem: "asc" },
    select: { id: true },
  });
  await prisma.$transaction(
    resto.map((b, i) => prisma.bloco.update({ where: { id: b.id }, data: { ordem: i } }))
  );
}

/**
 * Move um bloco uma posicao pra cima ou pra baixo.
 *
 * Troca as duas ordens dentro de uma transacao: sem isso, uma falha no meio
 * deixaria dois blocos com a mesma ordem e a pagina embaralhada.
 */
export async function moverBloco(alvo: AlvoDeBloco, id: string, direcao: "cima" | "baixo") {
  const pilha = await prisma.bloco.findMany({
    where: ondeFica(alvo),
    orderBy: { ordem: "asc" },
    select: { id: true, ordem: true },
  });

  const i = pilha.findIndex((b) => b.id === id);
  if (i < 0) return;
  const j = direcao === "cima" ? i - 1 : i + 1;
  if (j < 0 || j >= pilha.length) return; // ja esta na ponta

  await prisma.$transaction([
    prisma.bloco.update({ where: { id: pilha[i].id }, data: { ordem: pilha[j].ordem } }),
    prisma.bloco.update({ where: { id: pilha[j].id }, data: { ordem: pilha[i].ordem } }),
  ]);
}

// ---------------------------------------------------------------------------
// Apoiadores
// ---------------------------------------------------------------------------

/**
 * Quem contribuiu, do mais recente pro mais antigo.
 *
 * O padrao e ALTO de proposito: a pagina mostra todo mundo, porque a lista e
 * agradecimento, e cortar agradecimento em oito primeiros seria escolher quem
 * merece aparecer. O teto de 500 existe so pra uma campanha gigante nao gerar
 * uma pagina impossivel de carregar no celular.
 */
export async function apoiadoresRecentes(
  campanhaId: string,
  quantos = 500
): Promise<ApoiadorRecente[]> {
  const pedidos = await prisma.pedido.findMany({
    where: { campanhaId, status: "PAGO" },
    orderBy: { paidAt: "desc" },
    take: quantos,
    // valorBrutoCentavos NAO entra: a lista publica nao mostra quanto cada
    // pessoa deu, e o jeito de garantir isso e nao carregar o dado.
    select: {
      id: true,
      nome: true,
      anonimo: true,
      paidAt: true,
      itens: { select: { acao: { select: { titulo: true } } }, take: 1 },
    },
  });

  // Quem pediu anonimato some da lista, mas continua contando no total: esconder
  // o nome e o combinado, sumir com a contribuicao seria outra coisa.
  return pedidos.map((p) => ({
    id: p.id,
    nome: p.anonimo ? "Apoio anônimo" : p.nome,
    anonimo: p.anonimo,
    acao: p.itens[0]?.acao.titulo ?? "Doação",
    quando: p.paidAt,
  }));
}

export async function contarApoiadores(campanhaId: string): Promise<number> {
  // Conta PEDIDO, nao item: quem comprou 4 numeros da rifa e uma pessoa so.
  return prisma.pedido.count({ where: { campanhaId, status: "PAGO" } });
}

// ---------------------------------------------------------------------------
// Usuario e sessao
// ---------------------------------------------------------------------------

export async function usuarioPorEmail(email: string) {
  return prisma.usuario.findUnique({ where: { email } });
}

export async function usuarioPorId(id: string) {
  return prisma.usuario.findUnique({
    where: { id },
    select: { id: true, nome: true, email: true },
  });
}

/** O papel do usuário na equipe (o piloto tem uma só). Nulo se não é membro. */
export async function papelDoUsuario(usuarioId: string) {
  const m = await prisma.membro.findFirst({
    where: { usuarioId },
    select: { papel: true },
  });
  return m?.papel ?? null;
}

export async function abrirSessao(tokenHash: string, usuarioId: string, expiraEm: Date) {
  return prisma.sessao.create({ data: { tokenHash, usuarioId, expiraEm } });
}

/**
 * Devolve a sessao valida, ou null.
 *
 * Sessao vencida e apagada na hora em vez de so ignorada: assim a tabela nao
 * vira um deposito de sessao morta que ninguem limpa.
 */
export async function lerSessao(tokenHash: string) {
  const s = await prisma.sessao.findUnique({
    where: { tokenHash },
    select: { usuarioId: true, expiraEm: true },
  });
  if (!s) return null;

  if (s.expiraEm.getTime() < Date.now()) {
    await prisma.sessao.delete({ where: { tokenHash } }).catch(() => {});
    return null;
  }
  return s;
}

export async function fecharSessao(tokenHash: string) {
  await prisma.sessao.delete({ where: { tokenHash } }).catch(() => {});
}

// ---------------------------------------------------------------------------
// Resultado de uma acao
// ---------------------------------------------------------------------------

export interface ResultadoDaAcao {
  /** Quanto rendeu limpo. */
  liquidoCentavos: number;
  /** Quanto entrou, antes de custo e taxa. */
  brutoCentavos: number;
  /** Quanto foi embora em taxa de gateway (positivo). */
  taxaCentavos: number;
  /** Quanto custou pra acontecer (positivo). */
  custoCentavos: number;
  /** Quantas PESSOAS entraram. Conta pedido, nao item. */
  apoiadores: number;
  /**
   * Quantas participacoes. Um palpite, um numero da rifa, uma camisa.
   * Diferente de apoiadores: quem comprou 4 numeros e 1 apoiador e 4 participacoes.
   */
  participacoes: number;
  primeiroEm: Date | null;
  ultimoEm: Date | null;
}

/**
 * Os numeros de fechamento de uma acao.
 *
 * Serve pra pagina de resultado, que continua no ar depois que a acao acaba:
 * muita gente procura "quanto deu?" semanas depois, e quem vai organizar a
 * proxima aprende olhando o que a anterior rendeu.
 */
export async function resultadoDaAcao(acaoId: string): Promise<ResultadoDaAcao> {
  const [porTipo, itens, pedidos, datas] = await Promise.all([
    prisma.lancamento.groupBy({
      by: ["tipo"],
      where: { acaoId },
      _sum: { valorCentavos: true },
    }),
    prisma.item.aggregate({
      where: { acaoId, pedido: { status: "PAGO" } },
      _sum: { quantidade: true },
    }),
    // Pedidos distintos que tocaram esta acao: e a contagem de PESSOAS.
    prisma.pedido.count({
      where: { status: "PAGO", itens: { some: { acaoId } } },
    }),
    prisma.pedido.aggregate({
      where: { status: "PAGO", itens: { some: { acaoId } } },
      _min: { paidAt: true },
      _max: { paidAt: true },
    }),
  ]);

  const soma = (tipo: string) =>
    porTipo.find((t) => t.tipo === tipo)?._sum.valorCentavos ?? 0;

  return {
    // Custo e taxa estao guardados negativos; aqui viram positivos pra leitura.
    brutoCentavos: soma("RECEITA"),
    taxaCentavos: -soma("TAXA"),
    custoCentavos: -soma("CUSTO"),
    liquidoCentavos: porTipo.reduce((t, x) => t + (x._sum.valorCentavos ?? 0), 0),
    apoiadores: pedidos,
    participacoes: itens._sum.quantidade ?? 0,
    primeiroEm: datas._min.paidAt,
    ultimoEm: datas._max.paidAt,
  };
}

/** Quem entrou nesta acao. Sem valor: a regra de privacidade vale aqui tambem. */
export async function apoiadoresDaAcao(
  acaoId: string,
  quantos = 60
): Promise<ApoiadorRecente[]> {
  const pedidos = await prisma.pedido.findMany({
    where: { status: "PAGO", itens: { some: { acaoId } } },
    orderBy: { paidAt: "desc" },
    take: quantos,
    select: { id: true, nome: true, anonimo: true, paidAt: true },
  });

  return pedidos.map((p) => ({
    id: p.id,
    nome: p.anonimo ? "Apoio anônimo" : p.nome,
    anonimo: p.anonimo,
    acao: "",
    quando: p.paidAt,
  }));
}
