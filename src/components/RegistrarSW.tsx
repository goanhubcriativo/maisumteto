"use client";

// Registra o service worker (/sw.js). Só isso: é o que falta, além do manifesto,
// pro navegador oferecer "instalar app". Falha em silêncio (navegador sem
// suporte, ou aba sem https) porque instalar é um extra, nunca um bloqueio.

import { useEffect } from "react";

export default function RegistrarSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
