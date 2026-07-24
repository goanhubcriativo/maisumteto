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

export const dynamic = "force-dynamic";

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

export default async function Extrato() {
  await exigirLogin();
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
          acao: { select: { titulo: true } },
          opcao: { select: { nome: true } },
        },
      },
    },
  });

  const bruto = pedidos.reduce((t, p) => t + p.valorBrutoCentavos, 0);
  // A taxa nem sempre volta do gateway na hora. Quando falta, o líquido cai
  // para o bruto: é melhor mostrar o total um pouco otimista e sinalizar a
  // lacuna do que inventar um desconto que não aconteceu.
  const taxa = pedidos.reduce((t, p) => t + (p.taxaCentavos ?? 0), 0);
  const liquido = pedidos.reduce((t, p) => t + (p.liquidoCentavos ?? p.valorBrutoCentavos), 0);
  const semTaxa = pedidos.filter((p) => p.taxaCentavos == null).length;

  // O que entrou fora do site. Serve para conferir: o que NAO e manual tem que
  // estar no extrato do banco, e o que e manual tem que estar com a equipe.
  const manuais = pedidos.filter((p) => p.manual);
  const manualCentavos = manuais.reduce((t, p) => t + p.valorBrutoCentavos, 0);

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
          <span className="painel-placar-valor">{pedidos.length}</span>
          <span className="painel-placar-rotulo">
            {pedidos.length === 1 ? "pagamento" : "pagamentos"}
          </span>
        </div>
      </section>

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

      {pedidos.length === 0 ? (
        <div className="vazio">Nenhum pagamento confirmado ainda.</div>
      ) : (
        <div className="tabela-rolo">
          <table className="tabela">
            <thead>
              <tr>
                <th>Quando</th>
                <th>Quem</th>
                <th>CPF</th>
                <th>Telefone</th>
                <th>Ação</th>
                <th className="num">Bruto</th>
                <th className="num">Taxa</th>
                <th className="num">Líquido</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p) => (
                <tr key={p.id}>
                  <td>
                    {quando(p.paidAt)}
                    {/* Manual e PIX contam igual no dinheiro, mas nao se conferem
                        igual: o PIX aparece no app do banco, o manual so existe
                        porque alguem da equipe digitou. Quem confere precisa
                        saber de qual dos dois se trata, e com quem falar. */}
                    {p.manual && (
                      <span className="tabela-nota">
                        {p.formaManual ?? "Lançamento manual"}
                        {p.registradoPor && `, por ${p.registradoPor.nome}`}
                      </span>
                    )}
                  </td>
                  <td>
                    {p.nome}
                    {/* O anonimato vale para a PÁGINA PÚBLICA. Aqui a equipe
                        precisa saber quem pagou para conferir o extrato com o
                        banco, e é isso que a página pública promete. */}
                    {p.anonimo && <span className="tabela-nota">pediu sigilo</span>}
                  </td>
                  <td>{mascararCpf(p.cpf)}</td>
                  <td>{mascararTelefone(p.whatsapp)}</td>
                  <td>
                    {/* O nome da ação uma vez só. Um pedido pode ter cinco itens
                        da mesma ação (cinco palpites do bolão), mas para conferir
                        o dinheiro basta saber que os R$ 50 entraram pelo bolão,
                        não que foram cinco linhas iguais. */}
                    {[...new Set(p.itens.map((i) => i.acao.titulo))].join(", ") || "doação"}
                    {/* Quantos e qual opção (o lote, o tamanho): pra equipe saber
                        se a pessoa levou um ou dois, e de qual variação. A opção
                        vem da relação, ou do que ficou congelado no item se ela
                        já foi apagada. */}
                    {(() => {
                      const qtd = p.itens.reduce((t, i) => t + i.quantidade, 0);
                      const ops = [
                        ...new Set(
                          p.itens
                            .map(
                              (i) =>
                                i.opcao?.nome ??
                                (i.dados as { opcaoNome?: string } | null)?.opcaoNome
                            )
                            .filter(Boolean)
                        ),
                      ];
                      const partes: string[] = [];
                      if (qtd > 1) partes.push(`${qtd} unidades`);
                      if (ops.length) partes.push(ops.join(", "));
                      return partes.length ? (
                        <span className="tabela-nota">{partes.join(" · ")}</span>
                      ) : null;
                    })()}
                    {/* A ajuda extra que a pessoa somou por cima. O valor da
                        direita já inclui ela; aqui a equipe vê quanto foi extra. */}
                    {p.doacaoExtraCentavos > 0 && (
                      <span className="tabela-nota">
                        + {formatarBRL(p.doacaoExtraCentavos)} de ajuda extra
                      </span>
                    )}
                  </td>
                  <td className="num">{formatarBRL(p.valorBrutoCentavos)}</td>
                  <td className="num">
                    {p.taxaCentavos == null ? "a confirmar" : formatarBRL(p.taxaCentavos)}
                  </td>
                  <td className="num forte">
                    {formatarBRL(p.liquidoCentavos ?? p.valorBrutoCentavos)}
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
