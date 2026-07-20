// Entrega a foto guardada no banco.
//
// Publica de proposito: e a capa de uma pagina publica. O id e um cuid, entao
// nao da pra varrer os ids dos outros por tentativa.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const imagem = await prisma.imagem.findUnique({
    where: { id },
    select: { mime: true, bytes: true },
  });

  if (!imagem) {
    return NextResponse.json({ erro: "Imagem não encontrada." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(imagem.bytes), {
    headers: {
      "Content-Type": imagem.mime,
      // A imagem nunca muda: um id novo e gerado a cada envio. Entao pode
      // ficar em cache pra sempre, o que tira ela do caminho a cada visita.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
