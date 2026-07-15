import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// DIAGNÓSTICO TEMPORÁRIO do token do Mercado Pago (remover depois).
// Protegido pela senha do admin. NÃO revela o token — só metadados seguros.
export async function GET(req: NextRequest) {
  const senha = process.env.ADMIN_PASSWORD || "";
  const recebida = req.headers.get("x-admin-password") || "";
  if (!senha || recebida !== senha) {
    return NextResponse.json({ erro: "Senha incorreta." }, { status: 401 });
  }

  const raw = process.env.MP_ACCESS_TOKEN;
  if (!raw) {
    return NextResponse.json({ present: false });
  }

  // Testa uma chamada real ao MP (endpoint leve) pra ver a resposta de auth.
  let mpStatus: number | null = null;
  let mpMsg: string | null = null;
  try {
    const r = await fetch("https://api.mercadopago.com/users/me", {
      headers: { Authorization: `Bearer ${raw.trim()}` },
      cache: "no-store",
    });
    mpStatus = r.status;
    const d: any = await r.json().catch(() => null);
    mpMsg = d?.message || d?.error || (r.ok ? "ok" : null);
  } catch (e: any) {
    mpMsg = e?.message || "falha na chamada";
  }

  return NextResponse.json({
    present: true,
    length: raw.length,
    prefix8: raw.slice(0, 8), // "APP_USR-" (produção) ou "TEST-" (teste)
    temEspacoOuAspas: /[\s"']/.test(raw),
    trimMudou: raw.trim() !== raw,
    mpStatus,
    mpMsg,
  });
}
