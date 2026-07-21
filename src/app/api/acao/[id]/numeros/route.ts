// Quais números da rifa já foram levados.
//
// A tela consulta isto ao abrir e antes de enviar, para não deixar a pessoa
// escolher um número que acabou de sair.

import { NextRequest, NextResponse } from "next/server";
import { numerosOcupados } from "@/lib/rifa";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return NextResponse.json({ ocupados: await numerosOcupados(id) });
}
