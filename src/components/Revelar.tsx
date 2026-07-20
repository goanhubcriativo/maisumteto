"use client";

// Revela um pedaço da página quando ele entra na tela.
//
// Existe como componente e não como CSS solto porque a armadilha aqui é séria:
// se o gatilho falhar, o conteúdo fica invisível PARA SEMPRE. Numa página de
// doação isso não é um efeito quebrado, é a campanha inteira sumindo. Por isso
// tudo aqui erra para o lado de mostrar: sem JavaScript o conteúdo já nasce
// visível (a opacidade só é reduzida depois que o componente monta), quem pediu
// menos movimento pula a animação, e uma rede de segurança na rolagem cobre
// qualquer falha do observador.

import { useEffect, useRef, useState, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Atraso em milissegundos. Serve para escalonar itens de uma grade. */
  atraso?: number;
  /** Elemento gerado. Usa div por padrão. */
  como?: "div" | "section" | "li";
  className?: string;
  id?: string;
}

export default function Revelar({
  children,
  atraso = 0,
  como = "div",
  className = "",
  id,
}: Props) {
  const alvo = useRef<HTMLElement>(null);
  // "armado" só vira true no cliente. Enquanto for false o conteúdo está
  // visível, então quem não roda JavaScript lê a página inteira normalmente.
  const [armado, setArmado] = useState(false);
  const [dentro, setDentro] = useState(false);

  useEffect(() => {
    const el = alvo.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const jaNaTela = () => {
      const r = el.getBoundingClientRect();
      return r.top < window.innerHeight * 0.88 && r.bottom > 0;
    };

    // Já visível no primeiro quadro: não esconde, senão piscaria à toa.
    if (jaNaTela() || typeof IntersectionObserver !== "function") {
      return;
    }

    setArmado(true);

    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setDentro(true);
          obs.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    obs.observe(el);

    const naRolagem = () => {
      if (jaNaTela()) {
        setDentro(true);
        window.removeEventListener("scroll", naRolagem);
      }
    };
    window.addEventListener("scroll", naRolagem, { passive: true });

    // Último recurso: passou tempo demais e nada disparou, mostra assim mesmo.
    const desistir = window.setTimeout(() => setDentro(true), 4000);

    return () => {
      obs.disconnect();
      window.removeEventListener("scroll", naRolagem);
      window.clearTimeout(desistir);
    };
  }, []);

  const Tag = como;
  const estado = !armado || dentro ? " revelado" : "";

  return (
    <Tag
      // O ref é o mesmo nó em qualquer uma das tags permitidas.
      ref={alvo as never}
      id={id}
      className={`revelar${estado} ${className}`.trim()}
      style={atraso ? { transitionDelay: `${atraso}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
