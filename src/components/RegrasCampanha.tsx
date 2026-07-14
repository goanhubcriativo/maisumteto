// Regras da campanha em um dropdown nativo (details/summary).
export default function RegrasCampanha() {
  return (
    <details className="regras">
      <summary>
        Regras do bolão
        <svg
          className="regras-seta"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </summary>
      <ul>
        <li>
          Cada pessoa pode fazer quantas apostas quiser, e a contribuição
          adicional não interfere na aposta.
        </li>
        <li>
          Vamos considerar apenas o placar final do jogo. Se for para os
          pênaltis, os gols da disputa de pênaltis não contam na soma.
        </li>
        <li>
          O prêmio é um material de construção essencial: quase ninguém tem e
          todo mundo precisa.
        </li>
        <li>
          Em caso de mais de uma pessoa vencedora com o placar exato, será
          feito um sorteio simples para definir quem leva.
        </li>
        <li>
          Todos podem participar, independente do prêmio que irão receber. O
          objetivo é arrecadar para mais uma casa.
        </li>
      </ul>
    </details>
  );
}
