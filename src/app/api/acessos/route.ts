// Cria um acesso de leitura e devolve a senha uma vez.
//
// É uma rota de API, e não uma server action, por um motivo só: a senha gerada
// precisa voltar para a tela para ser mostrada, e mandar segredo pela URL de um
// redirect deixaria ele no histórico do navegador. Aqui a senha volta no corpo
// da resposta, o cliente mostra e ninguém guarda.

import { NextRequest, NextResponse } from "next/server";
import { exigirEdicao } from "@/lib/sessao";
import { campanhaAtual } from "@/lib/repositorio";
import { criarAcesso } from "@/lib/acessos";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Só quem edita cria acesso. Visitante não gera visitante.
  try {
    await exigirEdicao();
  } catch {
    return NextResponse.json({ erro: "Sem permissão." }, { status: 403 });
  }

  let corpo: Record<string, unknown>;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });
  }

  const campanha = await campanhaAtual();
  // Só os dois níveis conhecidos. Qualquer outra coisa cai em leitura, o mais
  // restrito: na dúvida, dar menos acesso é o erro mais barato.
  const nivel = corpo.nivel === "ADMIN" ? "ADMIN" : "LEITURA";
  const r = await criarAcesso(campanha.equipeId, {
    nome: String(corpo.nome ?? ""),
    email: String(corpo.email ?? ""),
    nivel,
  });

  if (!r.ok) return NextResponse.json({ erro: r.erro }, { status: 400 });
  return NextResponse.json({ nome: r.nome, email: r.email, senha: r.senha });
}
