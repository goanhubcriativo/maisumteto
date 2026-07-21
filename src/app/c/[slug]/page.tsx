import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { vitrineDaCampanha } from "@/lib/vitrine";
import CampanhaView from "@/components/CampanhaView";
import { CHAMADA } from "@/lib/textos";

export const dynamic = "force-dynamic"; // o progresso muda a cada PIX pago

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const dados = await vitrineDaCampanha(slug);
  if (!dados) return { title: "Campanha não encontrada" };
  return {
    title: `${dados.campanha.titulo} · Casa Amiga`,
    description: CHAMADA,
  };
}

export default async function PaginaCampanha({ params }: Props) {
  const { slug } = await params;
  const dados = await vitrineDaCampanha(slug);
  if (!dados) notFound();

  return (
    <CampanhaView
      campanha={dados.campanha}
      resumo={dados.resumo}
      vitrine={dados.vitrine}
      apoiadoresRecentes={dados.apoiadoresRecentes}
    />
  );
}
