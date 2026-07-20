// Le e escreve a sessao do lado do servidor.
//
// Separado de auth.ts de proposito: auth.ts e matematica pura (hash, token) e
// da pra testar sozinho, sem Next. Aqui e onde isso encosta no cookie.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_SESSAO, hashDoToken, opcoesDoCookie } from "./auth";
import { abrirSessao, fecharSessao, lerSessao, usuarioPorId } from "./repositorio";

export interface UsuarioLogado {
  id: string;
  nome: string;
  email: string;
}

/** Quem esta logado agora, ou null. Nao redireciona. */
export async function usuarioAtual(): Promise<UsuarioLogado | null> {
  const token = (await cookies()).get(COOKIE_SESSAO)?.value;
  if (!token) return null;

  const sessao = await lerSessao(hashDoToken(token));
  if (!sessao) return null;

  const u = await usuarioPorId(sessao.usuarioId);
  if (!u) return null;

  return { id: u.id, nome: u.nome, email: u.email };
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
