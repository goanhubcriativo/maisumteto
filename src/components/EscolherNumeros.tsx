"use client";

// A grade de números da rifa, como escolher poltrona no cinema.
//
// Rifa não é venda por quantidade: as pessoas têm número preferido, jogam a
// data do aniversário, o número da camisa. Deixar o sistema sortear tira
// justamente a graça de participar.
//
// Os números já levados aparecem apagados e não clicáveis. A lista é buscada ao
// abrir e conferida de novo antes de gerar o PIX, porque entre abrir a página e
// decidir pode passar meia hora.

import { useEffect, useState } from "react";

interface Props {
  acaoId: string;
  total: number;
  /** Máximo por pedido, quando a equipe definiu um. */
  limite?: number | null;
  corForte: string;
  /** Avisa o formulário de quais números estão escolhidos. */
  aoMudar: (numeros: number[]) => void;
}

export default function EscolherNumeros({
  acaoId,
  total,
  limite,
  corForte,
  aoMudar,
}: Props) {
  const [ocupados, setOcupados] = useState<number[]>([]);
  const [escolhidos, setEscolhidos] = useState<number[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let vivo = true;
    fetch(`/api/acao/${acaoId}/numeros`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { ocupados: [] }))
      .then((d) => {
        if (vivo) {
          setOcupados(d.ocupados ?? []);
          setCarregando(false);
        }
      })
      .catch(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [acaoId]);

  function alternar(n: number) {
    setEscolhidos((atuais) => {
      const tem = atuais.includes(n);
      if (tem) {
        const novo = atuais.filter((x) => x !== n);
        aoMudar(novo);
        return novo;
      }
      if (limite && atuais.length >= limite) return atuais;
      const novo = [...atuais, n].sort((a, b) => a - b);
      aoMudar(novo);
      return novo;
    });
  }

  const numeros = Array.from({ length: total }, (_, i) => i + 1);
  const livres = total - ocupados.length;

  return (
    <div className="rifa">
      <div className="rifa-cabeca">
        <span className="ap-pergunta">Escolha os seus números</span>
        <span className="rifa-conta">
          {carregando ? "carregando..." : `${livres} de ${total} livres`}
        </span>
      </div>

      <div className="rifa-grade" role="group" aria-label="Números da rifa">
        {numeros.map((n) => {
          const levado = ocupados.includes(n);
          const meu = escolhidos.includes(n);
          return (
            <button
              key={n}
              type="button"
              className={`rifa-numero${levado ? " levado" : ""}${meu ? " meu" : ""}`}
              style={meu ? { background: corForte, borderColor: corForte } : undefined}
              disabled={levado}
              onClick={() => alternar(n)}
              aria-pressed={meu}
              aria-label={
                levado ? `Número ${n}, já foi levado` : `Número ${n}, disponível`
              }
            >
              {n}
            </button>
          );
        })}
      </div>

      <p className="rifa-resumo">
        {escolhidos.length === 0 ? (
          "Nenhum número escolhido ainda."
        ) : (
          <>
            <strong>
              {escolhidos.length}{" "}
              {escolhidos.length === 1 ? "número escolhido" : "números escolhidos"}:
            </strong>{" "}
            {escolhidos.join(", ")}
          </>
        )}
        {limite ? ` Máximo de ${limite} por pedido.` : ""}
      </p>
    </div>
  );
}
