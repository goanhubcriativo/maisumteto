// Diagnóstico da conta do Mercado Pago.
//
// Existe para responder, com a fonte certa, o que a SUA conta suporta. Ler blog
// e documentação genérica já me fez errar uma vez (afirmei uma taxa que não era
// a sua); aqui quem responde é a API do Mercado Pago com o seu token.
//
// É só leitura: nenhuma chamada aqui cria cobrança, assinatura ou qualquer
// coisa que mexa em dinheiro.
//
// Protegida por login, como todo o painel: a resposta traz detalhes da conta que
// não devem ficar abertos.

import { exigirLogin } from "@/lib/sessao";

export const dynamic = "force-dynamic";

const BASE = "https://api.mercadopago.com";

async function perguntar(caminho: string) {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) return { erro: "MP_ACCESS_TOKEN não configurado." };

  try {
    const r = await fetch(`${BASE}${caminho}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const texto = await r.text();
    let corpo: unknown;
    try {
      corpo = texto ? JSON.parse(texto) : null;
    } catch {
      corpo = texto.slice(0, 400);
    }
    return { status: r.status, corpo };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "falhou" };
  }
}

export default async function Diagnostico() {
  await exigirLogin();

  const [metodos, assinaturas] = await Promise.all([
    // Lista os meios de pagamento habilitados NESTA conta.
    perguntar("/v1/payment_methods"),
    // Confere se a API de assinaturas responde para esta conta.
    perguntar("/preapproval/search?limit=1"),
  ]);

  // Filtra só o que interessa: qualquer meio ligado a PIX.
  const lista = Array.isArray(metodos.corpo) ? metodos.corpo : [];
  const pix = lista
    .filter((m: Record<string, unknown>) => {
      const alvo = `${m.id ?? ""} ${m.name ?? ""} ${m.payment_type_id ?? ""}`.toLowerCase();
      return alvo.includes("pix") || alvo.includes("bank_transfer");
    })
    .map((m: Record<string, unknown>) => ({
      id: m.id,
      nome: m.name,
      tipo: m.payment_type_id,
      situacao: m.status,
    }));

  return (
    <div className="painel-estreito">
      <div className="painel-cabeca">
        <div>
          <span className="painel-sobre">Diagnóstico</span>
          <h1>O que sua conta do Mercado Pago suporta</h1>
          <p className="painel-intro">
            Página técnica, só de leitura. Serve para eu confirmar o que dá para construir sem
            depender de documentação genérica. Pode fechar depois.
          </p>
        </div>
      </div>

      <section className="painel-cartao">
        <h2 className="formulario-secao">Meios de pagamento com PIX</h2>
        {pix.length === 0 ? (
          <p className="painel-intro">
            Nenhum meio de PIX retornado. Resposta bruta:{" "}
            <code>{JSON.stringify(metodos).slice(0, 300)}</code>
          </p>
        ) : (
          <dl className="config-lista">
            {pix.map((m) => (
              <div key={String(m.id)}>
                <dt>{String(m.id)}</dt>
                <dd>
                  {String(m.nome)} · tipo {String(m.tipo)} · {String(m.situacao)}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section className="painel-cartao">
        <h2 className="formulario-secao">API de assinaturas</h2>
        <dl className="config-lista">
          <div>
            <dt>Resposta</dt>
            <dd>
              {assinaturas.status === 200
                ? "200 · a conta responde à API de assinaturas"
                : `${assinaturas.status ?? "erro"} · ${JSON.stringify(assinaturas.corpo).slice(0, 200)}`}
            </dd>
          </div>
        </dl>
      </section>

      <section className="painel-cartao">
        <h2 className="formulario-secao">Resposta completa</h2>
        <p className="painel-intro" style={{ marginBottom: 12 }}>
          Copie e mande para mim se algo acima não estiver claro.
        </p>
        <pre
          style={{
            fontSize: 11,
            lineHeight: 1.5,
            background: "var(--cinza)",
            padding: 14,
            borderRadius: 8,
            overflowX: "auto",
            maxHeight: 320,
          }}
        >
          {JSON.stringify({ meiosComPix: pix, assinaturas }, null, 2)}
        </pre>
      </section>
    </div>
  );
}
