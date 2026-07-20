"use client";

// Botão que dispara a sonda e mostra a resposta crua do Mercado Pago.
//
// É de clique, e não automático ao abrir a página: é uma chamada de verdade à
// conta real, e chamada a gateway não deve acontecer só porque alguém abriu uma
// tela.

import { useState } from "react";
import { sondarPixAutomatico } from "./acoes-da-sonda";

export default function Sonda() {
  const [rodando, setRodando] = useState(false);
  const [saida, setSaida] = useState<unknown>(null);

  async function rodar() {
    setRodando(true);
    try {
      setSaida(await sondarPixAutomatico());
    } catch (e) {
      setSaida({ erro: e instanceof Error ? e.message : String(e) });
    }
    setRodando(false);
  }

  return (
    <>
      <p className="painel-intro" style={{ marginBottom: 14 }}>
        Pergunta à API se dá para criar assinatura cobrada por PIX. Usa R$ 1 com início
        daqui a uma semana e <strong>cancela na mesma hora</strong> se algo for criado.
        Ninguém é cobrado.
      </p>

      <button className="botao botao-contorno" onClick={rodar} disabled={rodando}>
        {rodando ? "Perguntando ao Mercado Pago..." : "Testar Pix Automático"}
      </button>

      {saida != null && (
        <pre
          style={{
            marginTop: 16,
            fontSize: 11,
            lineHeight: 1.5,
            background: "var(--cinza)",
            padding: 14,
            borderRadius: 8,
            overflowX: "auto",
            maxHeight: 420,
          }}
        >
          {JSON.stringify(saida, null, 2)}
        </pre>
      )}
    </>
  );
}
