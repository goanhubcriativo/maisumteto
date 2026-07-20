// Recebe a foto enviada pelo painel.
//
// A foto fica no proprio banco. Guardar num servico de arquivos seria mais
// escalavel, mas obrigaria cada equipe a criar conta em algum lugar e colar
// token, que e exatamente o tipo de passo que faz um voluntario desistir.
//
// O navegador ja reduz a imagem antes de enviar (ver CampoDeImagem). O limite
// aqui e a rede de seguranca: sem ele, alguem contornando a tela poderia
// empurrar um arquivo de 50 MB pra dentro do Postgres.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exigirLogin } from "@/lib/sessao";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIMITE_BYTES = 4 * 1024 * 1024;
const TIPOS = ["image/jpeg", "image/png", "image/webp"];

export async function POST(req: NextRequest) {
  // Sem login ninguem envia nada: senao a rota vira hospedagem de imagem
  // gratuita pra qualquer um que descobrir o endereco.
  await exigirLogin();

  const form = await req.formData().catch(() => null);
  const arquivo = form?.get("arquivo");

  if (!(arquivo instanceof File)) {
    return NextResponse.json({ erro: "Nenhum arquivo recebido." }, { status: 400 });
  }
  if (!TIPOS.includes(arquivo.type)) {
    return NextResponse.json(
      { erro: "Formato não aceito. Use JPG, PNG ou WEBP." },
      { status: 400 }
    );
  }
  if (arquivo.size > LIMITE_BYTES) {
    return NextResponse.json(
      { erro: "Imagem grande demais, mesmo depois de reduzida." },
      { status: 413 }
    );
  }

  const bytes = Buffer.from(await arquivo.arrayBuffer());

  const imagem = await prisma.imagem.create({
    data: {
      mime: arquivo.type,
      bytes,
      tamanho: bytes.length,
      nome: arquivo.name.slice(0, 120) || null,
    },
    select: { id: true },
  });

  return NextResponse.json({ url: `/api/imagem/${imagem.id}` });
}
