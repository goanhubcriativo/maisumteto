import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/bolao/db";

export const runtime = "nodejs";

// Tipos de evento aceitos (funil da home + pagamento).
const TIPOS = new Set([
  "visita",
  "rolou_50",
  "rolou_100",
  "placar_digitado",
  "fezinha_fincada",
  "ajudinha_escolhida",
  "so_ajudar",
  "dados_completos",
  "finalizar_clicou",
  "erro_validacao",
  "pix_gerado",
  "pix_visualizado",
  "pix_copiado",
]);

// Recebe eventos anônimos de navegação (sendBeacon/fetch).
export async function POST(req: NextRequest) {
  let body: any = null;
  try {
    body = JSON.parse(await req.text());
  } catch {
    return NextResponse.json({ ok: true });
  }

  const tipo = String(body?.tipo || "");
  const visitante = String(body?.visitante || "").slice(0, 64);

  if (!TIPOS.has(tipo) || !visitante) {
    return NextResponse.json({ ok: true });
  }

  try {
    await prisma.evento.create({ data: { tipo, visitante } });
  } catch {
    // métrica nunca derruba nada
  }
  return NextResponse.json({ ok: true });
}
