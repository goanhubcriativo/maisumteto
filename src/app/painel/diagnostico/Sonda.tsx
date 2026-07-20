"use client";

// Botão que dispara a sonda e mostra a resposta crua do Mercado Pago.
//
// É de clique, e não automático ao abrir a página: é uma chamada de verdade à
// conta real, e chamada a gateway não deve acontecer só porque alguém abriu uma
// tela.

import { useState } from "react";
import { sondarPixAutomatico, gerarLinkDeAdesao, cancelarAssinatura } from "./acoes-da-sonda";

export default function Sonda() {
  const [rodando, setRodando] = useState(false);
  const [saida, setSaida] = useState<unknown>(null);
  const [link, setLink] = useState<{ url: string; id: string } | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  async function rodar() {
    setRodando(true);
    try {
      setSaida(await sondarPixAutomatico());
    } catch (e) {
      setSaida({ erro: e instanceof Error ? e.message : String(e) });
    }
    setRodando(false);
  }

  async function gerarLink() {
    setRodando(true);
    setAviso(null);
    const r = await gerarLinkDeAdesao();
    const corpo = r.resposta as { init_point?: string; id?: string } | null;
    if (corpo?.init_point && corpo.id) {
      setLink({ url: corpo.init_point, id: corpo.id });
    } else {
      setSaida(r);
    }
    setRodando(false);
  }

  async function cancelar() {
    if (!link) return;
    setRodando(true);
    const r = await cancelarAssinatura(link.id);
    setAviso(r.cancelada ? "Assinatura de teste cancelada." : "Não consegui cancelar.");
    if (r.cancelada) setLink(null);
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

      <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid var(--linha)" }}>
        <p className="painel-intro" style={{ marginBottom: 12 }}>
          <strong>Segundo teste, o decisivo.</strong> O meio de pagamento não é escolhido
          por mim: o Mercado Pago devolve um link onde <em>quem doa</em> escolhe. Gere o
          link, abra, e me diga <strong>se PIX aparece como opção</strong>. Só olhe, não
          conclua.
        </p>

        <button className="botao botao-contorno" onClick={gerarLink} disabled={rodando}>
          {rodando ? "Gerando..." : "Gerar link de adesão"}
        </button>

        {link && (
          <div style={{ marginTop: 14 }}>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="botao botao-primario"
              style={{ marginRight: 10 }}
            >
              Abrir o link e ver as opções
            </a>
            <button className="botao botao-contorno" onClick={cancelar} disabled={rodando}>
              Cancelar esta assinatura de teste
            </button>
            <p className="campo-ajuda" style={{ marginTop: 10 }}>
              Depois de olhar, clique em cancelar. Enquanto ninguém autorizar, ela não
              cobra nada.
            </p>
          </div>
        )}

        {aviso && (
          <p className="painel-intro" style={{ marginTop: 12 }}>
            {aviso}
          </p>
        )}
      </div>

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
