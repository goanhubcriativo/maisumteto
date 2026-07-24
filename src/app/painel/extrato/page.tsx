// O extrato: de onde veio cada real, linha por linha.
//
// É o que o Higor pediu desde a primeira conversa: "um extrato financeiro
// completo mostrando de qual ação veio cada dinheiro". A página pública mostra
// o total e as fatias; aqui está o detalhe, com o nome de quem pagou.
//
// Só aparece pedido PAGO. Pendente é promessa, e promessa no extrato faz a
// equipe contar dinheiro que não entrou.

import { prisma } from "@/lib/db";
import { exigirLogin, campanhaDoPainel } from "@/lib/sessao";
import { formatarBRL } from "@/lib/dinheiro";
import DetalhesDoPedido from "@/components/DetalhesDoPedido";
import FiltroDeAcao from "@/components/FiltroDeAcao";
import ExportarExtrato from "@/components/ExportarExtrato";

export const dynamic = "force-dynamic";

/** Em centavos -> "24,75", pro CSV (o Excel pt-BR usa vírgula no decimal). */
function reais(centavos: number | null | undefined): string {
  return ((centavos ?? 0) / 100).toFixed(2).replace(".", ",");
}

function mascararCpf(cpf: string | null): string {
  if (!cpf) return "não informado";
  const n = cpf.replace(/\D/g, "");
  if (n.length !== 11) return cpf;
  return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${n.slice(9)}`;
}

function mascararTelefone(t: string | null): string {
  if (!t) return "não informado";
  const n = t.replace(/\D/g, "");
  if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
  if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return t;
}

function quando(d: Date | null): string {
  if (!d) return "";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}
/** Data e hora juntas, pro detalhe. */
function quandoCompleto(d: Date | null): string {
  if (!d) return "";
  return `${quando(d)} às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

export default async function Extrato({
  searchParams,
}: {
  searchParams: Promise<{ acao?: string }>;
}) {
  await exigirLogin();
  const { acao: acaoFiltro } = await searchParams;
  // O extrato é da campanha que o painel está editando, não de todas juntas:
  // com uma campanha de teste aberta, misturar o dinheiro das duas mentiria.
  const campanha = await campanhaDoPainel();

  const pedidos = await prisma.pedido.findMany({
    where: { status: "PAGO", campanhaId: campanha.id },
    orderBy: { paidAt: "desc" },
    select: {
      id: true,
      nome: true,
      cpf: true,
      whatsapp: true,
      anonimo: true,
      paidAt: true,
      valorBrutoCentavos: true,
      doacaoExtraCentavos: true,
      taxaCentavos: true,
      liquidoCentavos: true,
      manual: true,
      formaManual: true,
      registradoPor: { select: { nome: true } },
      itens: {
        select: {
          quantidade: true,
          dados: true,
          acao: { select: { id: true, titulo: true } },
          opcao: { select: { nome: true } },
        },
      },
    },
  });

  // As ações que aparecem no extrato, pro seletor de filtro. Só as que têm
  // pagamento entram: filtrar por uma ação sem venda nenhuma daria lista vazia.
  const acoesDoExtrato = [
    ...new Map(
      pedidos.flatMap((p) => p.itens.map((i) => [i.acao.id, i.acao.titulo] as const))
    ).entries(),
  ].map(([id, nome]) => ({ id, nome }));

  // Filtro por ação: fica com os pedidos que têm ao menos um item daquela ação.
  const filtrados = acaoFiltro
    ? pedidos.filter((p) => p.itens.some((i) => i.acao.id === acaoFiltro))
    : pedidos;

  const bruto = filtrados.reduce((t, p) => t + p.valorBrutoCentavos, 0);
  // A taxa nem sempre volta do gateway na hora. Quando falta, o líquido cai
  // para o bruto: é melhor mostrar o total um pouco otimista e sinalizar a
  // lacuna do que inventar um desconto que não aconteceu.
  const taxa = filtrados.reduce((t, p) => t + (p.taxaCentavos ?? 0), 0);
  const liquido = filtrados.reduce((t, p) => t + (p.liquidoCentavos ?? p.valorBrutoCentavos), 0);
  const semTaxa = filtrados.filter((p) => p.taxaCentavos == null).length;

  // O que entrou fora do site. Serve para conferir: o que NAO e manual tem que
  // estar no extrato do banco, e o que e manual tem que estar com a equipe.
  const manuais = filtrados.filter((p) => p.manual);
  const manualCentavos = manuais.reduce((t, p) => t + p.valorBrutoCentavos, 0);

  // As linhas da planilha, com TODO o detalhe (mesmo o que a tela esconde no
  // botão Detalhes). Segue o filtro: exporta o que está sendo mostrado.
  const dado = (i: { dados: unknown }, chave: string) =>
    (i.dados as Record<string, unknown> | null)?.[chave];
  const cabecalhoCsv = [
    "Quando",
    "Quem",
    "Sigilo",
    "Forma",
    "Ação",
    "Variação",
    "Quantidade",
    "Entrega",
    "Ajuda extra",
    "Bruto",
    "Taxa",
    "Líquido",
    "CPF",
    "WhatsApp",
  ];
  const linhasCsv = filtrados.map((p) => [
    quandoCompleto(p.paidAt),
    p.nome,
    p.anonimo ? "sim" : "",
    p.manual ? p.formaManual ?? "manual" : "PIX",
    [...new Set(p.itens.map((i) => i.acao.titulo))].join(" / "),
    [
      ...new Set(
        p.itens.map((i) => i.opcao?.nome ?? (dado(i, "opcaoNome") as string | undefined)).filter(Boolean)
      ),
    ].join(" / "),
    String(p.itens.reduce((t, i) => t + i.quantidade, 0)),
    [...new Set(p.itens.map((i) => dado(i, "entrega") as string | undefined).filter(Boolean))].join(" / "),
    reais(p.doacaoExtraCentavos),
    reais(p.valorBrutoCentavos),
    p.taxaCentavos == null ? "" : reais(p.taxaCentavos),
    reais(p.liquidoCentavos ?? p.valorBrutoCentavos),
    mascararCpf(p.cpf),
    mascararTelefone(p.whatsapp),
  ]);

  return (
    <div className="painel-largura">
      <div className="painel-cabeca">
        <div>
          <span className="painel-sobre">Financeiro</span>
          <h1>Extrato</h1>
          <p className="painel-intro">
            Cada pagamento confirmado, com a ação de onde veio. Só entra o que foi pago
            de verdade.
          </p>
          {/* O outro lado da promessa feita na pagina publica. Sem isso, quem
              abre o extrato ve o nome de quem pediu sigilo e nao sabe o que
              pode fazer com ele. */}
          <p className="painel-intro">
            Quem pediu sigilo aparece aqui com o nome, e tem que aparecer: o PIX chega
            identificado pelas regras do Banco Central, e é assim que vocês conferem esta tela
            com o app do banco. O que a página promete a essa pessoa é que a equipe{" "}
            <strong>não divulga</strong> o nome dela. Fora daqui, ela é apoio anônimo.
          </p>
        </div>
      </div>

      <section className="painel-placar">
        <div>
          <span className="painel-placar-valor">{formatarBRL(bruto)}</span>
          <span className="painel-placar-rotulo">entrou no bruto</span>
        </div>
        <div>
          <span className="painel-placar-valor">{formatarBRL(taxa)}</span>
          <span className="painel-placar-rotulo">de taxa do PIX</span>
        </div>
        <div>
          <span className="painel-placar-valor">{formatarBRL(liquido)}</span>
          <span className="painel-placar-rotulo">sobrou limpo</span>
        </div>
        <div>
          <span className="painel-placar-valor">{filtrados.length}</span>
          <span className="painel-placar-rotulo">
            {filtrados.length === 1 ? "pagamento" : "pagamentos"}
          </span>
        </div>
      </section>

      {/* Filtrar por ação e exportar. O que baixa segue o filtro: filtrado por
          uma ação, só ela; sem filtro, tudo. */}
      {pedidos.length > 0 && (
        <div className="extrato-barra">
          <FiltroDeAcao acoes={acoesDoExtrato} />
          <ExportarExtrato
            cabecalho={cabecalhoCsv}
            linhas={linhasCsv}
            nomeArquivo={`extrato${acaoFiltro ? "-filtrado" : ""}.csv`}
          />
        </div>
      )}

      {manuais.length > 0 && (
        <p className="painel-intro" style={{ marginTop: 16 }}>
          Deste total, <strong>{formatarBRL(manualCentavos)}</strong> entrou fora do site, em{" "}
          {manuais.length === 1 ? "um lançamento manual" : `${manuais.length} lançamentos manuais`}
          . O resto passou pelo PIX e tem que bater com o extrato do banco.
        </p>
      )}

      {semTaxa > 0 && (
        <p className="painel-intro" style={{ marginTop: 16 }}>
          {semTaxa === 1
            ? "Um pagamento ainda não teve a taxa informada pelo Mercado Pago"
            : `${semTaxa} pagamentos ainda não tiveram a taxa informada pelo Mercado Pago`}
          , então o líquido deles está contado igual ao bruto.
        </p>
      )}

      {filtrados.length === 0 ? (
        <div className="vazio">
          {pedidos.length === 0
            ? "Nenhum pagamento confirmado ainda."
            : "Nenhum pagamento nessa ação."}
        </div>
      ) : (
        <div className="tabela-rolo">
          <table className="tabela tabela-densa">
            <thead>
              <tr>
                <th>Quando</th>
                <th>Quem</th>
                <th>Ação</th>
                <th className="num">Bruto</th>
                <th className="num">Taxa</th>
                <th className="num">Líquido</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtrados.map((p) => (
                <tr key={p.id}>
                  <td>
                    {quando(p.paidAt)}
                    {/* Manual e PIX contam igual, mas não se conferem igual: o
                        PIX está no app do banco, o manual só porque a equipe
                        digitou. Uma etiqueta marca qual é; a forma e quem lançou
                        ficam no Detalhes. */}
                    {p.manual && <span className="sigilo-tag">manual</span>}
                  </td>
                  <td>
                    {p.nome}
                    {/* Sigilo ao lado do nome, uma etiqueta pequena, pra não
                        gastar uma linha. O anonimato vale pra PÁGINA PÚBLICA;
                        aqui a equipe vê o nome pra conferir com o banco. */}
                    {p.anonimo && <span className="sigilo-tag">sigilo</span>}
                  </td>
                  <td>
                    {/* Só o nome da ação. O detalhe do que foi comprado (quantos,
                        tamanho, entrega, ajuda extra) fica no botão Detalhes. */}
                    {[...new Set(p.itens.map((i) => i.acao.titulo))].join(", ") || "doação"}
                  </td>
                  <td className="num">{formatarBRL(p.valorBrutoCentavos)}</td>
                  <td className="num">
                    {p.taxaCentavos == null ? "a confirmar" : formatarBRL(p.taxaCentavos)}
                  </td>
                  <td className="num forte">
                    {formatarBRL(p.liquidoCentavos ?? p.valorBrutoCentavos)}
                  </td>
                  <td className="num">
                    <DetalhesDoPedido
                      quando={quandoCompleto(p.paidAt)}
                      nome={p.nome}
                      anonimo={p.anonimo}
                      cpf={mascararCpf(p.cpf)}
                      whatsapp={mascararTelefone(p.whatsapp)}
                      manual={p.manual}
                      forma={p.formaManual}
                      registradoPor={p.registradoPor?.nome ?? null}
                      brutoCentavos={p.valorBrutoCentavos}
                      taxaCentavos={p.taxaCentavos}
                      liquidoCentavos={p.liquidoCentavos ?? p.valorBrutoCentavos}
                      extraCentavos={p.doacaoExtraCentavos}
                      itens={p.itens.map((i) => ({
                        acao: i.acao.titulo,
                        quantidade: i.quantidade,
                        opcao:
                          i.opcao?.nome ??
                          (i.dados as { opcaoNome?: string } | null)?.opcaoNome ??
                          null,
                        entrega: (i.dados as { entrega?: string } | null)?.entrega ?? null,
                        numeros: Array.isArray((i.dados as { numeros?: number[] } | null)?.numeros)
                          ? (i.dados as { numeros?: number[] }).numeros ?? null
                          : null,
                      }))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
