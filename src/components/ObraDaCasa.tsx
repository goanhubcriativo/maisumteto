"use client";

// A arrecadação desenhada como o que ela é: uma casa sendo levantada.
//
// Barra de progresso é a linguagem de plataforma de vaquinha, e não diz nada
// sobre o que o dinheiro vira. Aqui o valor arrecadado ergue a obra de verdade:
// finca os pilotis, monta a plataforma, sobe as paredes, fecha o telhado. Quem
// abre a página vê em que pé está a casa, e não um numerozinho de porcentagem.
//
// O ganho real não é enfeite: é o PRÓXIMO MARCO. "Faltam R$ 820 para levantar
// as paredes" é um pedido concreto. "Faltam 51% da meta" não é pedido nenhum.

import { useEffect, useRef, useState } from "react";
import { formatarBRL } from "@/lib/dinheiro";
import { ETAPAS, faltaParaEtapa, percentual, proximaEtapa } from "@/lib/obra";

interface Props {
  arrecadadoCentavos: number;
  metaCentavos: number;
}

export default function ObraDaCasa({ arrecadadoCentavos, metaCentavos }: Props) {
  const pct = percentual(arrecadadoCentavos, metaCentavos);

  const alvo = useRef<HTMLDivElement>(null);
  // Só anima depois que a seção entra na tela: animar fora do campo de visão
  // gasta o efeito com quem nem estava olhando.
  const [visivel, setVisivel] = useState(false);
  // Comeca no valor VERDADEIRO, e nao em zero. Quem chega sem JavaScript, ou
  // com a aba em segundo plano (onde o navegador nao roda quadro nenhum), le a
  // porcentagem certa. A contagem so volta pro zero quando ela vai de fato
  // acontecer, logo antes de animar.
  const [contado, setContado] = useState(pct);

  useEffect(() => {
    const el = alvo.current;
    if (!el) return;

    const reduz = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduz) {
      setVisivel(true);
      setContado(pct);
      return;
    }

    // Se a obra ja nasce na tela (celular, ou quem chega por link direto na
    // secao), nao da pra esperar um evento de rolagem que nunca vem.
    const jaNaTela = () => {
      const r = el.getBoundingClientRect();
      return r.top < window.innerHeight * 0.85 && r.bottom > 0;
    };
    if (jaNaTela()) {
      setVisivel(true);
      return;
    }

    if (typeof IntersectionObserver !== "function") {
      setVisivel(true);
      return;
    }

    const obs = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setVisivel(true);
          obs.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    obs.observe(el);

    // Rede de seguranca: se por qualquer motivo o observador nao entregar, a
    // rolagem resolve. Sem isso, uma falha do observador deixaria a casa
    // apagada para sempre, que e pior do que animar cedo demais.
    const naRolagem = () => {
      if (jaNaTela()) {
        setVisivel(true);
        window.removeEventListener("scroll", naRolagem);
      }
    };
    window.addEventListener("scroll", naRolagem, { passive: true });

    return () => {
      obs.disconnect();
      window.removeEventListener("scroll", naRolagem);
    };
  }, [pct]);

  // O número sobe até o valor real. Contar de 1 em 1 fica lento quando a meta
  // é alta, então o passo se ajusta para durar sempre mais ou menos o mesmo.
  useEffect(() => {
    if (!visivel) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setContado(pct);
      return;
    }

    // Aba em segundo plano nao roda quadro: animar ali deixaria o numero preso
    // no zero ate alguem voltar. Melhor ja mostrar o valor certo.
    if (document.hidden) {
      setContado(pct);
      return;
    }

    const duracao = 1400;
    const inicio = performance.now();
    let quadro = 0;
    setContado(0);

    const passo = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / duracao);
      // Desacelera no fim: dá a sensação de assentar, e não de cortar seco.
      const suave = 1 - Math.pow(1 - t, 3);
      setContado(pct * suave);
      if (t < 1) quadro = requestAnimationFrame(passo);
    };

    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [visivel, pct]);

  const feito = (chave: string) => {
    const etapa = ETAPAS.find((e) => e.chave === chave);
    return etapa ? pct >= etapa.em : false;
  };

  // O próximo marco: o que este dinheiro ainda não comprou.
  const proxima = proximaEtapa(pct);
  const faltaParaProxima = proxima
    ? faltaParaEtapa(proxima, arrecadadoCentavos, metaCentavos)
    : 0;

  const construidas = ETAPAS.filter((e) => pct >= e.em).length;

  return (
    <div className={`obra${visivel ? " obra-pronta" : ""}`} ref={alvo}>
      <div className="obra-cena">
        <svg
          viewBox="0 0 800 420"
          className="obra-desenho"
          role="img"
          aria-label={`A casa está ${Math.floor(pct)}% construída: ${construidas} de ${ETAPAS.length} etapas concluídas.`}
        >
          <defs>
            {/* A malha de planta baixa. Dá o chão visual da cena inteira. */}
            <pattern id="malha" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M40 0H0V40" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="1" />
            </pattern>
            <linearGradient id="ceu" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(0,146,221,.22)" />
              <stop offset="100%" stopColor="rgba(0,146,221,0)" />
            </linearGradient>
          </defs>

          <rect width="800" height="420" fill="url(#malha)" />
          <rect width="800" height="420" fill="url(#ceu)" />

          {/* O terreno existe desde o primeiro real. */}
          <g className="obra-terreno">
            <line x1="40" y1="340" x2="760" y2="340" />
            {Array.from({ length: 18 }, (_, i) => (
              <line key={i} x1={48 + i * 40} y1="340" x2={34 + i * 40} y2="356" />
            ))}
          </g>

          {/* Cotas de planta: a medida da casa, marcada antes de existir casa. */}
          <g className="obra-cota">
            <line x1="150" y1="378" x2="650" y2="378" />
            <line x1="150" y1="370" x2="150" y2="386" />
            <line x1="650" y1="370" x2="650" y2="386" />
            <text x="400" y="398" textAnchor="middle">
              18 m² de casa
            </text>
          </g>

          {/* Os seis pilotis. Cada um aparece quando o dinheiro alcança o dele. */}
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const x = 180 + i * 88;
            const chave = `piloti${i + 1}`;
            return (
              <g
                key={chave}
                className={`obra-peca obra-piloti${feito(chave) ? " fincado" : ""}`}
                style={{ transitionDelay: `${i * 110}ms` }}
              >
                <line x1={x} y1="250" x2={x} y2="340" />
                <line x1={x} y1="262" x2={x + 14} y2="250" className="obra-mao-francesa" />
                <line x1={x} y1="262" x2={x - 14} y2="250" className="obra-mao-francesa" />
              </g>
            );
          })}

          <g className={`obra-peca obra-plataforma${feito("plataforma") ? " fincado" : ""}`}>
            <line x1="150" y1="250" x2="650" y2="250" />
            <line x1="150" y1="258" x2="650" y2="258" />
          </g>

          <g className={`obra-peca obra-paredes${feito("paredes") ? " fincado" : ""}`}>
            <rect x="220" y="140" width="360" height="110" />
            <line x1="340" y1="140" x2="340" y2="250" className="obra-montante" />
            <line x1="460" y1="140" x2="460" y2="250" className="obra-montante" />
          </g>

          <g className={`obra-peca obra-telhado${feito("telhado") ? " fincado" : ""}`}>
            <path d="M196 142 L400 62 L604 142 Z" />
            <line x1="400" y1="62" x2="400" y2="142" className="obra-montante" />
          </g>

          <g className={`obra-peca obra-porta${feito("porta") ? " fincado" : ""}`}>
            <rect x="366" y="176" width="68" height="74" />
            <circle cx="422" cy="214" r="4" />
          </g>

          <g className={`obra-peca obra-janela${feito("janela") ? " fincado" : ""}`}>
            <rect x="480" y="172" width="66" height="52" />
            <line x1="513" y1="172" x2="513" y2="224" />
            <line x1="480" y1="198" x2="546" y2="198" />
          </g>

          <g className={`obra-peca obra-escada${feito("escada") ? " fincado" : ""}`}>
            <line x1="374" y1="250" x2="374" y2="340" />
            <line x1="426" y1="250" x2="426" y2="340" />
            <line x1="374" y1="272" x2="426" y2="272" />
            <line x1="374" y1="296" x2="426" y2="296" />
            <line x1="374" y1="320" x2="426" y2="320" />
          </g>

          {/* Casa entregue: a luz acende. É o único momento com preenchimento. */}
          <g className={`obra-peca obra-luz${feito("entregue") ? " fincado" : ""}`}>
            <rect x="480" y="172" width="66" height="52" />
          </g>
        </svg>
      </div>

      <div className="obra-leitura">
        <div className="obra-marcador">
          <span className="obra-pct">{Math.floor(contado)}%</span>
          <span className="obra-pct-rotulo">da casa levantada</span>
        </div>

        {proxima ? (
          <p className="obra-proxima">
            <span className="obra-proxima-rotulo">Próximo passo da obra</span>
            <strong>{formatarBRL(faltaParaProxima)}</strong> para {proxima.nome}
          </p>
        ) : (
          <p className="obra-proxima obra-proxima-fim">
            <span className="obra-proxima-rotulo">Obra completa</span>
            <strong>A casa está paga.</strong> Cada etapa saiu do bolso de quem acreditou.
          </p>
        )}
      </div>
    </div>
  );
}
