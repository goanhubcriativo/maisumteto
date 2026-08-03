// Os pedidos a entregar: quem comprou o quê, e o controle do que já saiu.
//
// Difere do extrato de propósito: o extrato é dinheiro (todo pagamento, com
// taxa e líquido); aqui é LOGÍSTICA. Só entra pedido pago que tem algo pra
// entregar (produto e evento). Doação e número de rifa não aparecem: não há o
// que entregar por pedido.

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { exigirLogin, exigirEdicao, campanhaDoPainel } from "@/lib/sessao";
import BuscaPedidos from "@/components/BuscaPedidos";

export const dynamic = "force-dynamic";

/** Tipos de ação que geram entrega. Doação e rifa ficam de fora. */
const ENTREGAVEIS = ["PRODUTO", "EVENTO"] as const;
type TipoEntregavel = (typeof ENTREGAVEIS)[number];
const ehEntregavel = (t: string): boolean =>
  (ENTREGAVEIS as readonly string[]).includes(t);

function mascararTelefone(t: string | null): string {
  if (!t) return "";
  const n = t.replace(/\D/g, "");
  if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
  if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return t;
}

function quando(d: Date | null): string {
  if (!d) return "";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

/** minúsculas e sem acento, pro texto que a busca compara (igual ao cliente). */
function normalizar(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export default async function Pedidos({
  searchParams,
}: {
  searchParams: Promise<{ ver?: string }>;
}) {
  await exigirLogin();
  const { ver } = await searchParams;
  const campanha = await campanhaDoPainel();

  // Marca (ou desmarca) um pedido como entregue, guardando como e quando.
  async function marcarEntrega(dados: FormData) {
    "use server";
    await exigirEdicao();
    const id = String(dados.get("pedidoId") ?? "");
    const entregar = dados.get("acao") === "entregar";
    const como = String(dados.get("como") ?? "").trim();
    if (!id) return;
    await prisma.pedido.update({
      where: { id },
      data: entregar
        ? { entregue: true, entregaComo: como || null, entregueEm: new Date() }
        : { entregue: false, entregaComo: null, entregueEm: null },
    });
    revalidatePath("/painel/pedidos");
  }

  const pedidos = await prisma.pedido.findMany({
    where: {
      status: "PAGO",
      campanhaId: campanha.id,
      itens: { some: { acao: { tipo: { in: [...ENTREGAVEIS] as TipoEntregavel[] } } } },
    },
    orderBy: [{ entregue: "asc" }, { paidAt: "desc" }],
    select: {
      id: true,
      nome: true,
      whatsapp: true,
      anonimo: true,
      paidAt: true,
      entregue: true,
      entregaComo: true,
      entregueEm: true,
      itens: {
        select: {
          quantidade: true,
          dados: true,
          acao: { select: { titulo: true, tipo: true } },
          opcao: { select: { nome: true } },
        },
      },
    },
  });

  const total = pedidos.length;
  const entregues = pedidos.filter((p) => p.entregue).length;
  const pendentes = total - entregues;

  // Filtro simples: pendentes (o padrão de trabalho), entregues, ou todos.
  const filtro = ver === "entregues" ? "entregues" : ver === "todos" ? "todos" : "pendentes";
  const lista =
    filtro === "entregues"
      ? pedidos.filter((p) => p.entregue)
      : filtro === "todos"
        ? pedidos
        : pedidos.filter((p) => !p.entregue);

  const dado = (i: { dados: unknown }, chave: string) =>
    (i.dados as Record<string, unknown> | null)?.[chave];

  /** Só os itens entregáveis do pedido, já em texto ("2× Camisa M"). */
  function itensEntregaveis(p: (typeof pedidos)[number]) {
    return p.itens
      .filter((i) => ehEntregavel(i.acao.tipo))
      .map((i) => {
        const nome = i.opcao?.nome ?? (dado(i, "opcaoNome") as string | undefined) ?? i.acao.titulo;
        return i.quantidade > 1 ? `${i.quantidade}× ${nome}` : nome;
      });
  }

  return (
    <div className="painel-largura">
      <div className="painel-cabeca">
        <div>
          <span className="painel-sobre">Logística</span>
          <h1>Pedidos</h1>
          <p className="painel-intro">
            O que foi comprado e precisa chegar na mão de quem comprou. Marque o que já
            entregou e como, pra ninguém ficar sem e ninguém receber duas vezes.
          </p>
        </div>
      </div>

      <section className="painel-placar">
        <div>
          <span className="painel-placar-valor">{pendentes}</span>
          <span className="painel-placar-rotulo">
            {pendentes === 1 ? "a entregar" : "a entregar"}
          </span>
        </div>
        <div>
          <span className="painel-placar-valor">{entregues}</span>
          <span className="painel-placar-rotulo">
            {entregues === 1 ? "entregue" : "entregues"}
          </span>
        </div>
        <div>
          <span className="painel-placar-valor">{total}</span>
          <span className="painel-placar-rotulo">no total</span>
        </div>
      </section>

      {total > 0 && (
        <div className="pedidos-controles">
          <BuscaPedidos />
          <div className="pedidos-filtro" role="tablist" aria-label="Filtrar pedidos">
            {[
              { id: "pendentes", rotulo: `A entregar (${pendentes})` },
              { id: "entregues", rotulo: `Entregues (${entregues})` },
              { id: "todos", rotulo: `Todos (${total})` },
            ].map((f) => (
              <a
                key={f.id}
                href={f.id === "pendentes" ? "/painel/pedidos" : `/painel/pedidos?ver=${f.id}`}
                className={`pedidos-filtro-item${filtro === f.id ? " ativo" : ""}`}
                aria-current={filtro === f.id ? "true" : undefined}
              >
                {f.rotulo}
              </a>
            ))}
          </div>
        </div>
      )}

      {lista.length === 0 ? (
        <div className="vazio">
          {total === 0
            ? "Nenhum pedido pra entregar ainda. Assim que vender uma camisa ou um ingresso, ele aparece aqui."
            : filtro === "pendentes"
              ? "Tudo entregue por aqui. Nada pendente."
              : "Nada nesse filtro."}
        </div>
      ) : (
        <div className="pedidos-lista">
          {lista.map((p) => {
            const itens = itensEntregaveis(p);
            const entrega = [
              ...new Set(
                p.itens.map((i) => dado(i, "entrega") as string | undefined).filter(Boolean)
              ),
            ].join(", ");
            const buscaTexto = normalizar(
              [p.nome, p.whatsapp, itens.join(" "), entrega, p.entregaComo ?? ""].join(" ")
            );
            return (
              <div
                key={p.id}
                data-busca={buscaTexto}
                className={`pedido-cartao${p.entregue ? " entregue" : ""}`}
              >
                <div className="pedido-topo">
                  <div className="pedido-quem">
                    <strong>{p.nome}</strong>
                    {p.anonimo && <span className="sigilo-tag">sigilo</span>}
                    <span className="pedido-contato">
                      {mascararTelefone(p.whatsapp)} · comprou {quando(p.paidAt)}
                    </span>
                  </div>
                  {p.entregue ? (
                    <span className="pedido-selo ok">Entregue</span>
                  ) : (
                    <span className="pedido-selo pendente">A entregar</span>
                  )}
                </div>

                {entrega && (
                  <div className="pedido-entrega">
                    <svg
                      className="pedido-entrega-icone"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M3 7h11v8H3z" />
                      <path d="M14 10h4l3 3v2h-7z" />
                      <circle cx="7" cy="17" r="1.7" />
                      <circle cx="17.5" cy="17" r="1.7" />
                    </svg>
                    <span className="pedido-entrega-rotulo">Como quer receber</span>
                    <span className="pedido-entrega-valor">{entrega}</span>
                  </div>
                )}

                <ul className="pedido-itens">
                  {itens.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>

                {p.entregue ? (
                  <div className="pedido-feito">
                    <span>
                      Entregue em <strong>{quando(p.entregueEm)}</strong>
                      {p.entregaComo ? (
                        <>
                          {" "}
                          · {p.entregaComo}
                        </>
                      ) : null}
                    </span>
                    <form action={marcarEntrega}>
                      <input type="hidden" name="pedidoId" value={p.id} />
                      <input type="hidden" name="acao" value="desfazer" />
                      <button type="submit" className="pedido-desfazer">
                        desfazer
                      </button>
                    </form>
                  </div>
                ) : (
                  <form action={marcarEntrega} className="pedido-entregar">
                    <input type="hidden" name="pedidoId" value={p.id} />
                    <input
                      className="campo-entrada"
                      name="como"
                      placeholder="Como foi entregue? (retirou na sede, correios...)"
                    />
                    <button
                      type="submit"
                      name="acao"
                      value="entregar"
                      className="botao botao-primario botao-pequeno"
                    >
                      Marcar entregue
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Só aparece quando a busca não encontra nada (o cliente liga/desliga). */}
      <div id="busca-vazia" hidden className="vazio">
        Nenhum pedido encontrado para essa busca.
      </div>
    </div>
  );
}
