// Le e escreve a sessao do lado do servidor.
//
// Separado de auth.ts de proposito: auth.ts e matematica pura (hash, token) e
// da pra testar sozinho, sem Next. Aqui e onde isso encosta no cookie.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Papel } from "@prisma/client";
import { prisma } from "./db";
import { COOKIE_SESSAO, hashDoToken, opcoesDoCookie } from "./auth";
import {
  abrirSessao,
  campanhaAtual,
  fecharSessao,
  lerSessao,
  papelDoUsuario,
  usuarioPorId,
} from "./repositorio";

/** O cookie que guarda qual campanha o painel está editando agora. */
const COOKIE_CAMPANHA = "painel_campanha";

/**
 * A campanha que o PAINEL está editando. Segue a escolha do líder (cookie), e
 * cai na principal quando não há escolha ou a escolhida sumiu. Só o painel usa
 * isto: o público continua no campanhaAtual(), pra uma campanha de teste nunca
 * vazar pra home.
 */
export async function campanhaDoPainel() {
  const id = (await cookies()).get(COOKIE_CAMPANHA)?.value;
  if (id) {
    const c = await prisma.campanha.findUnique({
      where: { id },
      include: { equipe: { select: { nome: true, recebedorRotulo: true } } },
    });
    if (c) return c;
  }
  return campanhaAtual();
}

export async function definirCampanhaDoPainel(id: string) {
  (await cookies()).set(COOKIE_CAMPANHA, id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 3600,
  });
}

export interface UsuarioLogado {
  id: string;
  nome: string;
  email: string;
  /** O papel na equipe. VISITANTE só lê; os outros editam. */
  papel: Papel;
  /** Atalho: pode mudar as coisas? Falso para o acesso só de leitura. */
  podeEditar: boolean;
}

/** Quem esta logado agora, ou null. Nao redireciona. */
export async function usuarioAtual(): Promise<UsuarioLogado | null> {
  const token = (await cookies()).get(COOKIE_SESSAO)?.value;
  if (!token) return null;

  const sessao = await lerSessao(hashDoToken(token));
  if (!sessao) return null;

  const u = await usuarioPorId(sessao.usuarioId);
  if (!u) return null;

  const papel = (await papelDoUsuario(u.id)) ?? Papel.MEMBRO;
  return { id: u.id, nome: u.nome, email: u.email, papel, podeEditar: papel !== Papel.VISITANTE };
}

/**
 * Exige um usuário que pode EDITAR. Chamar no topo de toda server action que
 * muda algo: é a barreira de verdade do acesso só de leitura, porque proteger
 * só na tela deixaria a rota aberta pra quem monta a requisição na mão.
 *
 * Para o visitante, redireciona com um aviso em vez de estourar um erro: o
 * combinado é que os botões "não têm efeito", e uma tela de erro 500 seria pior
 * do que simplesmente não fazer nada. Em rota de API, o redirect é apanhado
 * pelo try/catch de lá e vira um 403.
 */
export async function exigirEdicao(): Promise<UsuarioLogado> {
  const u = await usuarioAtual();
  if (!u) redirect("/entrar");
  if (!u.podeEditar) {
    redirect("/painel?somenteLeitura=1");
  }
  return u;
}

/**
 * Exige login. Use no topo de toda pagina do painel.
 *
 * Vale reforcar: a protecao esta AQUI, no servidor, e nao em middleware ou em
 * verificacao no navegador. Cada pagina do painel chama isso e nao renderiza
 * nada antes de saber quem e a pessoa.
 */
export async function exigirLogin(): Promise<UsuarioLogado> {
  const u = await usuarioAtual();
  if (!u) redirect("/entrar");
  return u;
}

export async function criarSessao(usuarioId: string, token: string, expiraEm: Date) {
  await abrirSessao(hashDoToken(token), usuarioId, expiraEm);
  (await cookies()).set(COOKIE_SESSAO, token, { ...opcoesDoCookie(), expires: expiraEm });
}

export async function encerrarSessao() {
  const jar = await cookies();
  const token = jar.get(COOKIE_SESSAO)?.value;
  if (token) await fecharSessao(hashDoToken(token));
  jar.delete(COOKIE_SESSAO);
}
