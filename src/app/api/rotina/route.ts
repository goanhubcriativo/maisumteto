// A rotina diária: prepara as cobranças recorrentes que vencem hoje.
//
// Chamada pelo agendador da Vercel (ver vercel.json). Não envia nada para
// ninguém: só gera o PIX de cada cobrança que venceu e deixa pronta no painel,
// para a equipe mandar. Quem aperta enviar continua sendo uma pessoa.
//
// Protegida por segredo. Sem isso, qualquer um poderia disparar a rotina de
// fora e forçar a criação de cobranças em massa na conta do Mercado Pago.

import { NextRequest, NextResponse } from "next/server";
import { encerrarVencidas, prepararCobrancasDoDia } from "@/lib/assinaturas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Preparar várias cobranças significa várias chamadas ao Mercado Pago.
export const maxDuration = 60;

function autorizado(req: NextRequest): boolean {
  const segredo = process.env.CRON_SECRET;

  // A Vercel assina as chamadas do agendador com este cabeçalho.
  const daVercel = req.headers.get("authorization") === `Bearer ${segredo}`;
  // E permite disparo manual pelo painel, com o mesmo segredo na URL.
  const naMao = new URL(req.url).searchParams.get("segredo") === segredo;

  return Boolean(segredo) && (daVercel || naMao);
}

export async function GET(req: NextRequest) {
  if (!autorizado(req)) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  try {
    // Encerra antes de preparar: assinatura de campanha vencida não deve
    // ganhar mais uma cobrança no mesmo dia em que a campanha fechou.
    const encerradas = await encerrarVencidas();
    const preparadas = await prepararCobrancasDoDia();

    return NextResponse.json({
      encerradas,
      preparadas: preparadas.length,
      novas: preparadas.filter((p) => p.nova).length,
      quando: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json(
      { erro: e instanceof Error ? e.message : "falhou" },
      { status: 500 }
    );
  }
}
