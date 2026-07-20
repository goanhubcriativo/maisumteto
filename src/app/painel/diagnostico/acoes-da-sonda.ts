"use server";

// Sonda: pergunta à API do Mercado Pago, na conta real, se dá para criar uma
// assinatura cobrada por PIX (o "Pix Automático").
//
// Existe porque a documentação pública não responde isso, e escrever integração
// de pagamento contra uma API suposta é o tipo de erro que só aparece quando o
// dinheiro de alguém não entra.
//
// SEGURANÇA DO TESTE, em três camadas:
//  1. Valor de R$ 1 e data de início no futuro: nada é cobrado de ninguém.
//  2. Se o Mercado Pago criar a assinatura, ela é CANCELADA na mesma execução.
//  3. Se a criação falhar, nada foi criado, e o erro é justamente a resposta que
//     eu quero: o MP diz qual campo não aceita.

import { exigirLogin } from "@/lib/sessao";

const BASE = "https://api.mercadopago.com";

interface Resultado {
  tentativa: string;
  status: number | string;
  resposta: unknown;
  cancelada?: boolean;
}

async function tentar(nome: string, corpo: Record<string, unknown>): Promise<Resultado> {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) return { tentativa: nome, status: "sem token", resposta: null };

  try {
    const r = await fetch(`${BASE}/preapproval`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(corpo),
      cache: "no-store",
    });

    const texto = await r.text();
    let resposta: unknown;
    try {
      resposta = texto ? JSON.parse(texto) : null;
    } catch {
      resposta = texto.slice(0, 600);
    }

    // Criou de verdade? Cancela na hora. Assinatura de teste esquecida na conta
    // é lixo que um dia alguém cobra.
    let cancelada = false;
    const id = (resposta as { id?: string })?.id;
    if (r.ok && id) {
      const c = await fetch(`${BASE}/preapproval/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: "cancelled" }),
        cache: "no-store",
      });
      cancelada = c.ok;
    }

    return { tentativa: nome, status: r.status, resposta, cancelada };
  } catch (e) {
    return {
      tentativa: nome,
      status: "erro de rede",
      resposta: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function sondarPixAutomatico(): Promise<Resultado[]> {
  // O e-mail do pagador precisa ser de uma pessoa REAL.
  //
  // A primeira versao usava "test_user_...@testuser.com" e o Mercado Pago
  // rejeitou tudo com "Both payer and collector must be real or test users":
  // conta de producao nao aceita pagador de teste, e a validacao acontece ANTES
  // de ele olhar o meio de pagamento. Ou seja, aquele teste nao respondia nada.
  const usuario = await exigirLogin();

  // Começa daqui a uma semana: mesmo que algo escape, não cobra hoje.
  const inicio = new Date(Date.now() + 7 * 864e5).toISOString();
  const fim = new Date(Date.now() + 60 * 864e5).toISOString();

  const base = {
    reason: "Teste técnico (cancelado automaticamente)",
    external_reference: "sonda-pix-automatico",
    payer_email: usuario.email,
    back_url: "https://www.maisumteto.com.br/painel/diagnostico",
    auto_recurring: {
      frequency: 1,
      frequency_type: "months",
      start_date: inicio,
      end_date: fim,
      transaction_amount: 1,
      currency_id: "BRL",
    },
  };

  // Três formatos plausíveis. O que o MP aceitar (ou o erro que ele der) diz
  // qual é o contrato de verdade.
  return [
    await tentar("payment_method_id: pix", { ...base, payment_method_id: "pix" }),
    await tentar("status: pending + pix", {
      ...base,
      payment_method_id: "pix",
      status: "pending",
    }),
    await tentar("payment_methods_allowed: bank_transfer", {
      ...base,
      payment_methods_allowed: {
        payment_types: [{ id: "bank_transfer" }],
        payment_methods: [{ id: "pix" }],
      },
    }),
    await tentar("sem meio de pagamento (padrão da conta)", base),
  ];
}

/**
 * Cria UMA assinatura de teste e devolve o link de adesão, sem cancelar.
 *
 * É o único jeito de responder a pergunta que sobrou: o `payment_method_id` que
 * eu mando na criação volta sempre null, então o meio de pagamento é escolhido
 * pela pessoa no checkout do Mercado Pago. Só abrindo esse checkout dá pra ver
 * se PIX está entre as opções, ou se é só cartão.
 *
 * R$ 1, começando daqui a uma semana. Nada é cobrado por abrir o link: a
 * cobrança só existiria se alguém concluísse a autorização.
 */
export async function gerarLinkDeAdesao(): Promise<Resultado> {
  const usuario = await exigirLogin();

  const inicio = new Date(Date.now() + 7 * 864e5).toISOString();
  const fim = new Date(Date.now() + 60 * 864e5).toISOString();

  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) return { tentativa: "link", status: "sem token", resposta: null };

  const r = await fetch(`${BASE}/preapproval`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      reason: "Teste de adesão (pode cancelar depois)",
      external_reference: "sonda-link-adesao",
      payer_email: usuario.email,
      back_url: "https://www.maisumteto.com.br/painel/diagnostico",
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        start_date: inicio,
        end_date: fim,
        transaction_amount: 1,
        currency_id: "BRL",
      },
    }),
    cache: "no-store",
  });

  const resposta = await r.json().catch(() => null);
  return { tentativa: "link de adesão", status: r.status, resposta };
}

/** Cancela uma assinatura de teste pelo id. */
export async function cancelarAssinatura(id: string): Promise<Resultado> {
  await exigirLogin();
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) return { tentativa: "cancelar", status: "sem token", resposta: null };

  const r = await fetch(`${BASE}/preapproval/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status: "cancelled" }),
    cache: "no-store",
  });
  const resposta = await r.json().catch(() => null);
  return { tentativa: "cancelar", status: r.status, resposta, cancelada: r.ok };
}
