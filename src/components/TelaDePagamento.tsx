"use client";

// A tela do PIX: QR Code, copia e cola, e a confirmação quando o dinheiro cai.
//
// É componente de cliente porque precisa de duas coisas que só existem no
// navegador: copiar para a área de transferência e perguntar de tempos em tempos
// se já pagou.
//
// A pergunta periódica não é desperdício: o webhook do Mercado Pago pode demorar
// ou falhar, e quem acabou de pagar fica olhando a tela esperando a confirmação.
// Sem isso, a pessoa não sabe se deu certo e paga de novo.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface Pedido {
  id: string;
  status: string;
  valorBrutoCentavos: number;
  pixPayload: string | null;
  pixQrCodeImage: string | null;
  nome: string;
  itens: { quantidade: number; acao: { titulo: string; slug: string } }[];
}

function formatar(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function TelaDePagamento({ inicial }: { inicial: Pedido }) {
  const [pedido, setPedido] = useState(inicial);
  const [copiado, setCopiado] = useState(false);
  const pago = pedido.status === "PAGO";

  // Guarda o intervalo para poder parar assim que confirmar.
  const parar = useRef(false);

  useEffect(() => {
    if (pago) return;
    parar.current = false;

    // A cada 4 segundos. Espaçado o bastante para não martelar o servidor, curto
    // o bastante para a confirmação parecer imediata para quem está esperando.
    const timer = setInterval(async () => {
      if (parar.current) return;
      try {
        const r = await fetch(`/api/pedido/${pedido.id}`, { cache: "no-store" });
        if (!r.ok) return;
        const atual = await r.json();
        if (atual.status && atual.status !== pedido.status) {
          setPedido((p) => ({ ...p, ...atual }));
          if (atual.status === "PAGO") parar.current = true;
        }
      } catch {
        // Rede oscilando não precisa virar erro na tela: tenta de novo depois.
      }
    }, 4000);

    return () => clearInterval(timer);
  }, [pedido.id, pedido.status, pago]);

  async function copiar() {
    if (!pedido.pixPayload) return;
    try {
      await navigator.clipboard.writeText(pedido.pixPayload);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Alguns navegadores bloqueiam a área de transferência: o código continua
      // visível na tela para copiar na mão.
    }
  }

  if (pago) {
    return (
      <div className="pagamento-caixa confirmado">
        <span className="pagamento-selo">Pagamento confirmado</span>
        <h1>Obrigado, {pedido.nome.split(" ")[0]}!</h1>
        <p className="pagamento-apoio">
          Seus {formatar(pedido.valorBrutoCentavos)} já entraram na conta da campanha e
          aparecem no total da página.
        </p>
        <Link href="/" className="botao botao-primario botao-largo">
          Ver a campanha
        </Link>
      </div>
    );
  }

  return (
    <div className="pagamento-caixa">
      <span className="pagamento-selo">Falta pagar</span>
      <h1>{formatar(pedido.valorBrutoCentavos)}</h1>
      <p className="pagamento-apoio">
        {pedido.itens[0]?.acao.titulo}
        {pedido.itens[0] && pedido.itens[0].quantidade > 1
          ? ` · ${pedido.itens[0].quantidade} unidades`
          : ""}
      </p>

      {pedido.pixQrCodeImage && (
        <div className="pagamento-qr">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/png;base64,${pedido.pixQrCodeImage}`}
            alt="QR Code do PIX"
          />
        </div>
      )}

      <p className="pagamento-instrucao">
        Abra o app do seu banco, escolha <strong>PIX</strong> e aponte a câmera para o
        código. Ou copie o código abaixo e cole no seu banco.
      </p>

      {pedido.pixPayload && (
        <>
          <button className="botao botao-primario botao-largo" onClick={copiar}>
            {copiado ? "Código copiado" : "Copiar código PIX"}
          </button>
          <code className="pagamento-codigo">{pedido.pixPayload}</code>
        </>
      )}

      <p className="pagamento-espera">
        Esta tela confirma sozinha assim que o pagamento cair. Pode deixar aberta.
      </p>
    </div>
  );
}
