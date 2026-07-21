// O extrato: de onde veio cada real, linha por linha.
//
// É o que o Higor pediu desde a primeira conversa: "um extrato financeiro
// completo mostrando de qual ação veio cada dinheiro". A página pública mostra
// o total e as fatias; aqui está o detalhe, com o nome de quem pagou.
//
// Só aparece pedido PAGO. Pendente é promessa, e promessa no extrato faz a
// equipe contar dinheiro que não entrou.

import { prisma } from "@/lib/db";
import { exigirLogin } from "@/lib/sessao";
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

  const pedidos = await prisma.pedido.findMany({
    where: { status: "PAGO" },
    orderBy: { paidAt: "desc" },
    select: {
      id: true,
      nome: true,
      cpf: true,
      whatsapp: true,
      anonimo: true,
      paidAt: true,
      valorBrutoCentavos: true,
      taxaCentavos: true,
      liquidoCentavos: true,
      itens: { select: { quantidade: true, acao: { select: { titulo: true } } } },
    },
  });

  const bruto = pedidos.reduce((t, p) => t + p.valorBrutoCentavos, 0);
  // A taxa nem sempre volta do gateway na hora. Quando falta, o líquido cai
  // para o bruto: é melhor mostrar o total um pouco otimista e sinalizar a
  // lacuna do que inventar um desconto que não aconteceu.
  const taxa = pedidos.reduce((t, p) => t + (p.taxaCentavos ?? 0), 0);
  const liquido = pedidos.reduce((t, p) => t + (p.liquidoCentavos ?? p.valorBrutoCentavos), 0);
  const semTaxa = pedidos.filter((p) => p.taxaCentavos == null).length;

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
                  <td>{quando(p.paidAt)}</td>
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
                    {p.itens.map((i) => i.acao.titulo).join(", ") || "doação"}
                    {p.itens[0] && p.itens[0].quantidade > 1 && (
                      <span className="tabela-nota">{p.itens[0].quantidade} unidades</span>
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
