"use client";

// Um número que sobe até o valor real quando entra na tela.
//
// Número que aparece pronto é informação; número que sobe é acontecimento. Numa
// campanha, o valor arrecadado é a notícia da página, e vale gastar um segundo
// e meio contando ele.
//
// Mesma disciplina do resto: o valor VERDADEIRO é o estado inicial. A contagem
// só zera quando ela vai mesmo acontecer. Assim quem chega sem JavaScript, com
// a aba em segundo plano ou pedindo menos movimento lê o número certo, e nunca
// um zero congelado.

import { useEffect, useRef, useState } from "react";
import { formatarBRL } from "@/lib/dinheiro";

interface Props {
  valor: number;
  /** "brl" formata em reais a partir de centavos. "inteiro" mostra o número cru. */
  formato?: "brl" | "inteiro";
  className?: string;
  duracao?: number;
}

export default function Numero({
  valor,
  formato = "inteiro",
  className,
  duracao = 1500,
}: Props) {
  const alvo = useRef<HTMLSpanElement>(null);
  const [atual, setAtual] = useState(valor);

  useEffect(() => {
    const el = alvo.current;
    if (!el) return;

    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.hidden ||
      valor === 0
    ) {
      return;
    }

    let quadro = 0;
    let comecou = false;

    const animar = () => {
      if (comecou) return;
      comecou = true;
      setAtual(0);

      const inicio = performance.now();
      const passo = (agora: number) => {
        const t = Math.min(1, (agora - inicio) / duracao);
        const suave = 1 - Math.pow(1 - t, 3);
        setAtual(Math.round(valor * suave));
        if (t < 1) quadro = requestAnimationFrame(passo);
      };
      quadro = requestAnimationFrame(passo);
    };

    const jaNaTela = () => {
      const r = el.getBoundingClientRect();
      return r.top < window.innerHeight * 0.9 && r.bottom > 0;
    };

    if (jaNaTela()) {
      animar();
      return () => cancelAnimationFrame(quadro);
    }

    const obs =
      typeof IntersectionObserver === "function"
        ? new IntersectionObserver(
            ([e]) => {
              if (e.isIntersecting) {
                animar();
                obs?.disconnect();
              }
            },
            { threshold: 0.4 }
          )
        : null;
    obs?.observe(el);

    const naRolagem = () => {
      if (jaNaTela()) {
        animar();
        window.removeEventListener("scroll", naRolagem);
      }
    };
    window.addEventListener("scroll", naRolagem, { passive: true });

    return () => {
      cancelAnimationFrame(quadro);
      obs?.disconnect();
      window.removeEventListener("scroll", naRolagem);
    };
  }, [valor, duracao]);

  return (
    <span ref={alvo} className={className}>
      {formato === "brl" ? formatarBRL(atual) : atual.toLocaleString("pt-BR")}
    </span>
  );
}
