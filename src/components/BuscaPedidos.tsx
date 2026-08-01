"use client";

// A busca dos pedidos. Filtra os cartões que já estão na tela, na hora, sem ida
// ao servidor: some quem não bate, mostra quem bate. Casa por nome, WhatsApp e
// item, ignorando acento e maiúscula (buscar "joao" acha "João").
//
// Os cartões continuam sendo renderizados no servidor (com os formulários de
// entrega intactos); aqui a gente só liga/desliga cada um pelo atributo
// data-busca que o servidor já deixou pronto.

import { useState } from "react";

/** minúsculas e sem acento, pros dois lados da comparação baterem. */
function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export default function BuscaPedidos() {
  const [valor, setValor] = useState("");

  function filtrar(texto: string) {
    setValor(texto);
    const termo = normalizar(texto.trim());
    const cartoes = document.querySelectorAll<HTMLElement>("[data-busca]");
    let visiveis = 0;
    cartoes.forEach((c) => {
      const bate = !termo || (c.dataset.busca ?? "").includes(termo);
      c.hidden = !bate;
      if (bate) visiveis++;
    });
    const vazio = document.getElementById("busca-vazia");
    if (vazio) vazio.hidden = !(termo && visiveis === 0);
  }

  return (
    <div className="pedidos-busca">
      <svg
        className="pedidos-busca-lupa"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.2-3.2" />
      </svg>
      <input
        type="search"
        className="campo-entrada"
        placeholder="Buscar por nome, WhatsApp ou item..."
        value={valor}
        onChange={(e) => filtrar(e.target.value)}
        aria-label="Buscar pedidos"
      />
    </div>
  );
}
