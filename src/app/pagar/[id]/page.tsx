// Onde a pessoa paga. Chega aqui depois de escolher a ação e preencher os dados.
//
// A página é servida pelo servidor com o pedido já carregado, para o QR aparecer
// de primeira, sem tela de carregando. A confirmação em tempo real fica no
// componente de cliente.

import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import TelaDePagamento from "@/components/TelaDePagamento";
import { IconeCasa } from "@/components/icones";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pagamento · Casa Amiga",
  // Página com dado de quem está pagando: fora do alcance de buscador.
  robots: { index: false, follow: false },
};

export default async function Pagar({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const pedido = await prisma.pedido.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      valorBrutoCentavos: true,
      pixPayload: true,
      pixQrCodeImage: true,
      nome: true,
      itens: {
        select: { quantidade: true, acao: { select: { titulo: true, slug: true } } },
      },
    },
  });

  if (!pedido) notFound();

  return (
    <div className="pagamento">
      <header className="topo">
        <div className="container topo-linha">
          <Link href="/" className="marca">
            <span className="marca-sinal">
              <IconeCasa />
            </span>
            <span className="marca-texto">
              Casa Amiga
              <em>Teto Paraná</em>
            </span>
          </Link>
        </div>
      </header>

      <main className="container pagamento-corpo">
        <TelaDePagamento inicial={pedido} />
      </main>
    </div>
  );
}
