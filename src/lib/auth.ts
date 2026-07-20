// Login, senha e sessao.
//
// Feito na mao, sem biblioteca de auth, porque a necessidade e pequena e bem
// definida: e-mail e senha, uma sessao por cookie, sem login social, sem
// multi-fator. Biblioteca aqui traria mais configuracao do que resolveria.
//
// Duas decisoes que valem por todo o resto:
//
// 1. A senha e guardada com scrypt e sal proprio por usuario. Scrypt e caro de
//    propósito: mesmo que o banco vaze, quebrar uma senha por forca bruta fica
//    inviavel. Nunca guardamos a senha, nem cifrada (cifra tem volta).
//
// 2. Do token de sessao guardamos o HASH, nunca ele mesmo. Se o banco vazar, os
//    cookies que estao no navegador das pessoas continuam inuteis, porque do
//    hash nao da pra voltar pro token.

import crypto from "crypto";

const SCRYPT_N = 16384; // custo de CPU/memoria; ~100ms por verificacao
const TAMANHO_HASH = 64;
const TAMANHO_SAL = 16;

/** Gera "sal:hash" em hex. O sal e sorteado por usuario. */
export function criarHashDeSenha(senha: string): string {
  const sal = crypto.randomBytes(TAMANHO_SAL);
  const hash = crypto.scryptSync(senha.normalize("NFKC"), sal, TAMANHO_HASH, { N: SCRYPT_N });
  return `${sal.toString("hex")}:${hash.toString("hex")}`;
}

/**
 * Confere a senha contra o hash guardado.
 *
 * Usa timingSafeEqual: comparar com === vaza informacao pelo tempo que a
 * comparacao leva, e da pra descobrir o hash byte a byte com isso.
 */
export function conferirSenha(senha: string, guardado: string | null | undefined): boolean {
  if (!guardado) return false;

  const [salHex, hashHex] = guardado.split(":");
  if (!salHex || !hashHex) return false;

  try {
    const esperado = Buffer.from(hashHex, "hex");
    const calculado = crypto.scryptSync(senha.normalize("NFKC"), Buffer.from(salHex, "hex"), esperado.length, {
      N: SCRYPT_N,
    });
    return crypto.timingSafeEqual(esperado, calculado);
  } catch {
    return false;
  }
}

/** Token de sessao: 32 bytes de aleatoriedade forte, em base64url. */
export function criarTokenDeSessao(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/** O que vai pro banco no lugar do token. */
export function hashDoToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export const COOKIE_SESSAO = "casa_sessao";
export const DURACAO_SESSAO_DIAS = 30;

export function expiracaoDaSessao(a_partir_de = new Date()): Date {
  return new Date(a_partir_de.getTime() + DURACAO_SESSAO_DIAS * 864e5);
}

/**
 * Opcoes do cookie.
 *  - httpOnly: JavaScript da pagina nao enxerga o cookie, entao um XSS nao
 *    consegue roubar a sessao.
 *  - sameSite lax: o cookie nao viaja em requisicao vinda de outro site, que e
 *    a defesa contra CSRF.
 *  - secure so em producao, senao o cookie nao gruda em http://localhost.
 */
export function opcoesDoCookie() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACAO_SESSAO_DIAS * 24 * 3600,
  };
}

export interface ProblemaDeSenha {
  ok: boolean;
  motivo?: string;
}

/**
 * Regra de senha curta e honesta: tamanho e o que mais importa, e exigir
 * simbolo e maiuscula so faz a pessoa escolher "Senha@123" e anotar num papel.
 */
export function validarSenha(senha: string): ProblemaDeSenha {
  if (senha.length < 8) return { ok: false, motivo: "A senha precisa de pelo menos 8 caracteres." };
  if (senha.length > 200) return { ok: false, motivo: "Senha longa demais." };

  const obvias = ["12345678", "senha123", "password", "teto1234", "casaamiga"];
  if (obvias.includes(senha.toLowerCase())) {
    return { ok: false, motivo: "Essa senha é fácil demais de adivinhar." };
  }
  return { ok: true };
}

export function emailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}
