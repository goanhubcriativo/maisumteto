"use client";

import { useState, type CSSProperties } from "react";
import Bandeira from "@/components/Bandeira";

interface Props {
  timeCasa: string;
  timeVisitante: string;
  placarCasa: number;
  placarVisitante: number;
  arrecadadoCentavos: number;
  metaCentavos: number;
  totalApoiadores: number;
  acertadores: string[]; // todos que cravaram o placar
  concorrentes: string[]; // quem entrou no sorteio do prêmio
  vencedor: string;
}

const ALTURA = 72; // altura de cada nome na roleta
const VOLTAS = 7; // quantas voltas completas antes de parar

function brl(c: number) {
  return (c / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
function primeiroNome(n: string) {
  return n.trim().split(/\s+/)[0];
}

export default function ResultadoFinal({
  timeCasa,
  timeVisitante,
  placarCasa,
  placarVisitante,
  arrecadadoCentavos,
  metaCentavos,
  totalApoiadores,
  acertadores,
  concorrentes,
  vencedor,
}: Props) {
  const [rodando, setRodando] = useState(false);
  const [revelado, setRevelado] = useState(false);
  const [deslocamento, setDeslocamento] = useState(0);

  const pct = Math.round((arrecadadoCentavos / metaCentavos) * 100);
  const idxVencedor = Math.max(0, concorrentes.indexOf(vencedor));
  // A fita repete a lista várias vezes; paramos no vencedor da última volta.
  const fita = Array.from({ length: VOLTAS + 2 }, () => concorrentes).flat();
  const parada = (VOLTAS * concorrentes.length + idxVencedor) * ALTURA;

  function sortear() {
    if (rodando || revelado) return;
    const semMovimento =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (semMovimento) {
      setDeslocamento(parada);
      setRevelado(true);
      return;
    }
    setRodando(true);
    // pequeno atraso pro navegador aplicar a transição a partir do zero
    setTimeout(() => setDeslocamento(parada), 30);
    setTimeout(() => {
      setRevelado(true);
      setRodando(false);
    }, 4500);
  }

  // Transform inline: o estado final fica gravado (não depende de fill-mode).
  const estiloFita: CSSProperties = {
    transform: `translateY(-${deslocamento}px)`,
    transition: rodando
      ? "transform 4.4s cubic-bezier(0.11, 0.7, 0.12, 1)"
      : "none",
  };

  return (
    <section className="resultado">
      {/* Placar final */}
      <div className="res-placar">
        <div className="res-olho">RESULTADO FINAL</div>
        <div className="res-jogo">
          <span className="res-time">
            <Bandeira nome={timeCasa} size={30} />
            {timeCasa}
          </span>
          <span className="res-numeros">
            {placarCasa} <em>×</em> {placarVisitante}
          </span>
          <span className="res-time">
            <Bandeira nome={timeVisitante} size={30} />
            {timeVisitante}
          </span>
        </div>
      </div>

      {/* Meta batida */}
      <div className="res-meta">
        <div className="res-meta-pct">{pct}%</div>
        <div className="res-meta-txt">
          <strong>Meta batida!</strong>
          <span>
            {brl(arrecadadoCentavos)} arrecadados com {totalApoiadores} apoiadores
            para a Casa Amiga da TETO.
          </span>
        </div>
      </div>

      {/* Quem cravou o placar */}
      <div className="res-bloco">
        <h2 className="res-titulo">
          {acertadores.length} pessoas cravaram o placar
        </h2>
        <ul className="res-lista">
          {acertadores.map((n) => {
            const foraDoSorteio = !concorrentes.includes(n);
            return (
              <li key={n} className={n === vencedor ? "venceu" : ""}>
                {n}
                {foraDoSorteio && (
                  <span className="res-tag">organização, fora do sorteio</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Sorteio */}
      <div className="res-bloco">
        <h2 className="res-titulo">O sorteio do prêmio</h2>
        <p className="res-sub">
          Como mais de uma pessoa acertou, o prêmio foi definido por sorteio
          entre quem cravou o placar. Veja abaixo a animação com o resultado.
        </p>

        <div className={`sorteio-janela ${revelado ? "parou" : ""}`}>
          <div className="sorteio-fita" style={estiloFita}>
            {fita.map((n, i) => (
              <div className="sorteio-nome" key={i}>
                {primeiroNome(n)}
              </div>
            ))}
          </div>
          <div className="sorteio-marca" />
        </div>

        {!revelado && (
          <button className="sorteio-btn" onClick={sortear} disabled={rodando}>
            {rodando ? "Sorteando..." : "Ver o resultado do sorteio"}
          </button>
        )}

        {revelado && (
          <div className="res-vencedor">
            <div className="res-vencedor-tit">
              PARABÉNS {primeiroNome(vencedor).toUpperCase()} E OBRIGADO!
            </div>
            <div className="res-vencedor-sub">
              Em breve entraremos em contato para entregar seu prêmio.
            </div>
          </div>
        )}
      </div>

      <p className="res-agradece">
        Obrigado a todo mundo que fez sua fézinha. Vocês ajudaram a TETO a
        construir mais uma casa para quem precisa.
      </p>
    </section>
  );
}
