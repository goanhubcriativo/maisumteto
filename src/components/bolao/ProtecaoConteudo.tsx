"use client";

import { useEffect } from "react";

// Deterrente leve contra "copiar o código": desabilita o menu de botão direito
// e os atalhos comuns de inspecionar/ver-fonte (F12, Ctrl+U, Ctrl+Shift+I/J/C).
// IMPORTANTE: isto é só um obstáculo cosmético — NÃO é proteção de verdade.
// Quem entende consegue burlar (a real proteção é o código do servidor, que
// nunca vai pro navegador). Para desligar, basta remover <ProtecaoConteudo/>
// do layout.
export default function ProtecaoConteudo() {
  useEffect(() => {
    const bloquearMenu = (e: MouseEvent) => e.preventDefault();

    const bloquearTeclas = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      // F12
      if (e.key === "F12") {
        e.preventDefault();
        return;
      }
      // Ctrl+U (ver fonte) e Ctrl+S (salvar página)
      if ((e.ctrlKey || e.metaKey) && (k === "u" || k === "s")) {
        e.preventDefault();
        return;
      }
      // Ctrl+Shift+I / J / C (DevTools / console / inspetor)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (k === "i" || k === "j" || k === "c")) {
        e.preventDefault();
        return;
      }
    };

    document.addEventListener("contextmenu", bloquearMenu);
    document.addEventListener("keydown", bloquearTeclas);
    return () => {
      document.removeEventListener("contextmenu", bloquearMenu);
      document.removeEventListener("keydown", bloquearTeclas);
    };
  }, []);

  return null;
}
