// Cliente mínimo da API do Mercado Pago para gerar cobranças PIX.
// Docs: https://www.mercadopago.com.br/developers/pt/reference/payments/_payments/post
//
// PRONTO PARA ATIVAR, MAS AINDA NÃO LIGADO: as rotas continuam usando o Asaas
// (src/lib/asaas.ts) até a migração. Ver MIGRACAO-MERCADOPAGO.md.
//
// Diferença de fluxo pro Asaas: aqui UMA chamada a POST /v1/payments já
// devolve o pagamento COM o QR/copia-e-cola embutido (não precisa criar
// "customer" nem buscar o QR numa segunda chamada).

const BASE = "https://api.mercadopago.com";

function accessToken(): string {
  const t = process.env.MP_ACCESS_TOKEN;
  if (!t || t.startsWith("coloque_")) {
    throw new Error(
      "MP_ACCESS_TOKEN não configurada. Preencha na Vercel (Access Token de produção da conta PJ da GOAN)."
    );
  }
  return t;
}

async function mpFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken()}`,
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const msg =
      data?.message ||
      data?.cause?.map?.((c: any) => c.description).join("; ") ||
      `Erro Mercado Pago (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

// Vencimento no formato exigido pelo MP (ISO 8601 com offset -03:00).
export function expiracaoISO(horas = 72): string {
  const instante = Date.now() + horas * 3600 * 1000;
  // Desloca -3h e troca o "Z" por "-03:00" => mesmo instante em horário de Brasília.
  return new Date(instante - 3 * 3600 * 1000).toISOString().replace("Z", "-03:00");
}

export interface CriarPixInput {
  nome: string;
  cpf: string; // só dígitos
  email?: string;
  valorCentavos: number;
  descricao: string;
  externalReference: string; // id da casinha
  expiraEmISO: string;
  notificationUrl?: string;
}

export interface PixCriado {
  paymentId: string;
  status: string;
  pixPayload: string; // copia e cola
  pixQrCodeImage: string; // base64 (sem prefixo data:)
  expiraEm?: string;
}

export async function criarPagamentoPix(input: CriarPixInput): Promise<PixCriado> {
  const partes = input.nome.trim().split(/\s+/);
  const primeiro = partes[0] || input.nome;
  const resto = partes.slice(1).join(" ") || ".";

  const body = {
    transaction_amount: Number((input.valorCentavos / 100).toFixed(2)),
    description: input.descricao,
    payment_method_id: "pix",
    date_of_expiration: input.expiraEmISO,
    external_reference: input.externalReference,
    ...(input.notificationUrl ? { notification_url: input.notificationUrl } : {}),
    payer: {
      // MP exige e-mail em formato válido; se não houver, sintetiza um.
      email: input.email || `pagador-${input.cpf}@maisumteto.com.br`,
      first_name: primeiro,
      last_name: resto,
      identification: { type: "CPF", number: input.cpf },
    },
  };

  const data = await mpFetch("/v1/payments", {
    method: "POST",
    headers: { "X-Idempotency-Key": input.externalReference },
    body: JSON.stringify(body),
  });

  const td = data?.point_of_interaction?.transaction_data || {};
  return {
    paymentId: String(data.id),
    status: String(data.status),
    pixPayload: td.qr_code || "",
    pixQrCodeImage: td.qr_code_base64 || "",
    expiraEm: data.date_of_expiration,
  };
}

export async function consultarPagamento(
  paymentId: string
): Promise<{ status: string; netValueCentavos: number | null; externalReference: string | null }> {
  const data = await mpFetch(`/v1/payments/${paymentId}`);
  const net = data?.transaction_details?.net_received_amount;
  return {
    status: String(data.status),
    netValueCentavos: typeof net === "number" ? Math.round(net * 100) : null,
    externalReference: data.external_reference ?? null,
  };
}

// Status do Mercado Pago que consideramos "pago".
export function statusEhPago(status: string): boolean {
  return status === "approved";
}
