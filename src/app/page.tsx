// A pagina publica da campanha. E a raiz do site.
//
// Enquanto e uma equipe so, a raiz mostra a campanha dela. Quando existir a
// segunda, a raiz vira a lista e cada campanha ganha /c/[slug], que ja existe.

import type { Metadata } from "next";
import CampanhaView from "@/components/CampanhaView";
import {
  apoiadoresRecentes,
  campanhaAtual,
  contarApoiadores,
  listarAcoesPublicadas,
  listarBlocos,
} from "@/lib/repositorio";
import { resumoCampanha } from "@/lib/extrato";

// O progresso muda a cada PIX pago, entao a pagina nao pode ficar em cache.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const c = await campanhaAtual();
    return {
      title: c.titulo,
      description: c.resumo ?? undefined,
      openGraph: {
        title: c.titulo,
        description: c.resumo ?? undefined,
        type: "website",
      },
    };
  } catch {
    return { title: "Casa Amiga" };
  }
}

export default async function Home() {
  const campanha = await campanhaAtual();

  const [resumo, apoiadores, recentes, vitrine, blocos] = await Promise.all([
    resumoCampanha(campanha.id),
    contarApoiadores(campanha.id),
    apoiadoresRecentes(campanha.id),
    listarAcoesPublicadas(campanha.id),
    listarBlocos({ tipo: "campanha", id: campanha.id }),
  ]);

  return (
    <CampanhaView
      campanha={campanha}
      resumo={{ ...resumo, apoiadores }}
      vitrine={vitrine}
      apoiadoresRecentes={recentes}
      blocos={blocos}
    />
  );
}
