// Separação por domínio.
//
// A organização proibiu o site NO domínio maisumteto.com.br. A campanha, porém,
// continua: o site de verdade passou a viver em outro domínio (campanhahigor...).
// Como os dois domínios apontam pro mesmo app, é aqui que se decide o que cada um
// mostra:
//
//   - maisumteto.com.br (e www)  -> a tela de aviso (/desativado), e nada mais:
//     toda rota, inclusive a API de pagamento, cai no aviso. Ninguém arrecada por
//     este domínio, nem por um link antigo.
//   - qualquer outro domínio     -> o site normal, funcionando.
//
// Desligar isto é só tirar o host da lista.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const DOMINIOS_DESATIVADOS = new Set(["maisumteto.com.br", "www.maisumteto.com.br"]);

export function middleware(req: NextRequest) {
  const host = (req.headers.get("host") || "").toLowerCase().split(":")[0];

  if (DOMINIOS_DESATIVADOS.has(host) && req.nextUrl.pathname !== "/desativado") {
    const url = req.nextUrl.clone();
    url.pathname = "/desativado";
    // rewrite (não redirect): a URL continua sendo a que a pessoa digitou, só o
    // conteúdo é o aviso.
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  // Roda em tudo, menos os assets internos do Next e alguns arquivos estáticos,
  // pra a própria tela de aviso carregar (fonte, ícone) sem ser reescrita.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|icone-app.svg|logo-teto.png|sw.js|manifest.webmanifest).*)",
  ],
};
