"use client";

// Baixa o que está na tela como planilha (CSV que o Excel e o Google Sheets
// abrem direto). Exporta exatamente as linhas que vieram, então segue o filtro:
// se a página está filtrada por uma ação, só aquelas linhas descem; sem filtro,
// desce tudo.
//
// O arquivo é montado aqui no navegador, a partir dos dados que a página já
// tinha. Não há chamada nova ao servidor, e nada de dados vaza pra fora.

interface Props {
  cabecalho: string[];
  linhas: string[][];
  nomeArquivo: string;
}

/** Escapa um campo pro CSV: aspas dobradas, e envolve em aspas se precisar. */
function campo(v: string): string {
  const s = String(v ?? "");
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function ExportarExtrato({ cabecalho, linhas, nomeArquivo }: Props) {
  function baixar() {
    // Ponto-e-vírgula: é o separador que o Excel em português espera. Vírgula
    // brigaria com o decimal (R$ 1,50).
    const corpo = [cabecalho, ...linhas].map((l) => l.map(campo).join(";")).join("\r\n");
    // O BOM (﻿) faz o Excel abrir os acentos certos em vez de "Ã§".
    const blob = new Blob(["﻿" + corpo], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      className="botao botao-contorno botao-pequeno"
      onClick={baixar}
      disabled={linhas.length === 0}
    >
      Exportar planilha
    </button>
  );
}
