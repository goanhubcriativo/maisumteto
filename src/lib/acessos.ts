// Os acessos da equipe: quem entra no painel e com que papel.
//
// O que o Higor pediu: gerar acesso para outras pessoas VEREM o sistema. Esse
// acesso é o papel VISITANTE, que lê tudo (inclusive o extrato) e não muda
// nada. A barreira de leitura mora em exigirEdicao() (src/lib/sessao.ts); aqui
// é só a porta de entrada: criar, listar e revogar.

import crypto from "crypto";
import { Papel } from "@prisma/client";
import { prisma } from "./db";
import { criarHashDeSenha, emailValido, normalizarEmail } from "./auth";

export interface AcessoDaEquipe {
  membroId: string;
  usuarioId: string;
  nome: string;
  email: string;
  papel: Papel;
}

export async function listarAcessos(equipeId: string): Promise<AcessoDaEquipe[]> {
  const membros = await prisma.membro.findMany({
    where: { equipeId },
    orderBy: { createdAt: "asc" },
    include: { usuario: { select: { id: true, nome: true, email: true } } },
  });
  return membros.map((m) => ({
    membroId: m.id,
    usuarioId: m.usuario.id,
    nome: m.usuario.nome,
    email: m.usuario.email,
    papel: m.papel,
  }));
}

/**
 * Uma senha fácil de ditar: só minúsculas e números, sem o que se confunde
 * (0/o, 1/l). Não precisa ser decorável, precisa ser passável uma vez.
 */
export function gerarSenha(tamanho = 10): string {
  const abc = "abcdefghjkmnpqrstuvwxyz23456789";
  return [...crypto.randomBytes(tamanho)].map((b) => abc[b % abc.length]).join("");
}

type Resultado =
  | { ok: true; nome: string; email: string; senha: string }
  | { ok: false; erro: string };

/**
 * Cria um acesso só de leitura. Devolve a senha UMA vez: ela não fica guardada
 * em texto em lugar nenhum (o banco só tem o hash), então quem cria precisa
 * copiar e mandar para a pessoa na hora.
 */
export async function criarAcessoVisitante(
  equipeId: string,
  dados: { nome: string; email: string }
): Promise<Resultado> {
  const nome = dados.nome.trim();
  const email = normalizarEmail(dados.email);

  if (nome.length < 2) return { ok: false, erro: "Escreva o nome de quem vai receber o acesso." };
  if (!emailValido(email)) return { ok: false, erro: "E-mail inválido." };

  const jaExiste = await prisma.usuario.findUnique({ where: { email } });
  if (jaExiste) return { ok: false, erro: "Já existe um acesso com esse e-mail." };

  const senha = gerarSenha();
  const usuario = await prisma.usuario.create({
    data: { nome, email, senhaHash: criarHashDeSenha(senha) },
  });
  await prisma.membro.create({
    data: { equipeId, usuarioId: usuario.id, papel: Papel.VISITANTE },
  });

  return { ok: true, nome, email, senha };
}

/**
 * Revoga um acesso de leitura. Só mexe em VISITANTE: os donos da equipe (LIDER,
 * MEMBRO) não são apagáveis por aqui, senão um convidado sumiria com o líder.
 * Apagar o usuário derruba as sessões dele junto (onDelete Cascade).
 */
export async function revogarAcesso(equipeId: string, usuarioId: string) {
  const membro = await prisma.membro.findFirst({
    where: { equipeId, usuarioId, papel: Papel.VISITANTE },
  });
  if (!membro) return { ok: false as const, erro: "Esse acesso não pode ser revogado aqui." };

  await prisma.membro.delete({ where: { id: membro.id } });
  await prisma.usuario.delete({ where: { id: usuarioId } }).catch(() => {});
  return { ok: true as const };
}
