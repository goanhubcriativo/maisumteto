// Service worker mínimo.
//
// Ele existe por um motivo só: deixar o app instalável (o navegador exige um SW
// com handler de fetch pra oferecer "instalar"). De propósito NÃO faz cache de
// página nem de API: é um app de dinheiro e de estoque, e servir uma tela velha
// aqui seria pior do que não instalar. O handler de fetch é vazio: o navegador
// segue buscando tudo da rede, como sempre.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
