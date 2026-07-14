// Cliente mínimo da API do Asaas para gerar cobranças PIX.
// Docs: https://docs.asaas.com/

function baseUrl(): string {
  const env = (process.env.ASAAS_ENV || "sandbox").toLowerCase();
  return env === "production"
    ? "https://api.asaas.com/v3"
    : "https://api-sandbox.asaas.com/v3";
}

function apiKey(): string {
  const key = process.env.ASAAS_API_KEY;
  if (!key || key.startsWith("coloque_")) {
    throw new Error(
      "ASAAS_API_KEY não configurada. Preencha em .env.local (chave do ambiente correto)."
    );
  }
  return key;
}

async function asaasFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      access_token: apiKey(),
      // Boa prática exigida pelo Asaas em alguns casos:
      "User-Agent": "BolaoTeto/1.0",
      ...(init?.headers || {}),
    },
    // Nunca cachear chamadas ao Asaas.
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
      data?.errors?.map((e: any) => e.description).join("; ") ||
      data?.message ||
      `Erro Asaas (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

export interface CriarCustomerInput {
  nome: string;
  cpf: string;
  whatsapp?: string;
  email?: string;
}

export async function criarCustomer(input: CriarCustomerInput): Promise<string> {
  const grupo = process.env.ASAAS_GRUPO || "DOAÇÕES TETO PARANÁ";
  const data = await asaasFetch("/customers", {
    method: "POST",
    body: JSON.stringify({
      name: input.nome,
      cpfCnpj: input.cpf,
      mobilePhone: input.whatsapp || undefined,
      email: input.email || undefined,
      groupName: grupo, // direciona ao grupo "DOAÇÕES TETO PARANÁ"
    }),
  });
  return data.id as string;
}

export interface CriarPixInput {
  customerId: string;
  valorCentavos: number;
  descricao: string;
  externalReference: string;
  vencimento: string; // "YYYY-MM-DD"
}

export interface PixCharge {
  paymentId: string;
  status: string;
}

export async function criarCobrancaPix(input: CriarPixInput): Promise<PixCharge> {
  const data = await asaasFetch("/payments", {
    method: "POST",
    body: JSON.stringify({
      customer: input.customerId,
      billingType: "PIX",
      value: input.valorCentavos / 100,
      dueDate: input.vencimento,
      description: input.descricao,
      externalReference: input.externalReference,
    }),
  });
  return { paymentId: data.id as string, status: data.status as string };
}

export interface PixQrCode {
  payload: string; // copia e cola
  encodedImage: string; // base64 (sem prefixo data:)
  expirationDate?: string;
}

export async function obterQrCodePix(paymentId: string): Promise<PixQrCode> {
  const data = await asaasFetch(`/payments/${paymentId}/pixQrCode`, {
    method: "GET",
  });
  return {
    payload: data.payload,
    encodedImage: data.encodedImage,
    expirationDate: data.expirationDate,
  };
}

export async function consultarPagamento(
  paymentId: string
): Promise<{ status: string; netValue: number | null }> {
  const data = await asaasFetch(`/payments/${paymentId}`, { method: "GET" });
  return {
    status: data.status as string,
    netValue: typeof data.netValue === "number" ? data.netValue : null,
  };
}

// Converte o netValue (reais) do Asaas em centavos, se disponível.
export function netValueParaCentavos(netValue: unknown): number | null {
  return typeof netValue === "number" ? Math.round(netValue * 100) : null;
}

// Status do Asaas que consideramos "pago".
export function statusEhPago(status: string): boolean {
  return ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(status);
}
