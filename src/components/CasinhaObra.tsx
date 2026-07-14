// Ilustração da obra: uma casa emergencial da Teto erguida sobre pilotis.
// O número de pilotis acompanha o número de fézinhas (cada fézinha finca um piloti).

interface Props {
  pilotis: number;
}

const MAX_VISUAL = 14;

export default function CasinhaObra({ pilotis }: Props) {
  const n = Math.max(0, Math.min(pilotis, MAX_VISUAL));
  const extra = pilotis - n;

  // Faixa horizontal onde os pilotis se distribuem
  const x0 = 66;
  const x1 = 294;
  const topo = 150; // base da plataforma
  const chao = 208;

  const posX: number[] = [];
  if (n === 1) {
    posX.push((x0 + x1) / 2);
  } else if (n > 1) {
    const passo = (x1 - x0) / (n - 1);
    for (let i = 0; i < n; i++) posX.push(x0 + passo * i);
  }

  const temCasa = pilotis >= 1;

  return (
    <svg
      viewBox="0 0 360 240"
      className="obra-svg"
      role="img"
      aria-label={`Casa sobre ${pilotis} piloti(s)`}
    >
      {/* chão */}
      <line x1="24" y1={chao} x2="336" y2={chao} className="obra-chao" />
      {/* marcações de planta (blueprint) */}
      <line x1="24" y1={chao + 8} x2="336" y2={chao + 8} className="obra-cota" />

      {/* plataforma (piso da casa) */}
      <line
        x1={x0 - 10}
        y1={topo}
        x2={x1 + 10}
        y2={topo}
        className={temCasa ? "obra-plataforma" : "obra-plataforma-vazia"}
      />

      {/* pilotis */}
      {posX.map((x, i) => (
        <g key={i} className="obra-piloti">
          <line x1={x} y1={topo} x2={x} y2={chao} />
          <line x1={x} y1={topo + 10} x2={x + 9} y2={topo + 2} className="obra-brace" />
        </g>
      ))}

      {/* casa (aparece com a 1ª fézinha) */}
      {temCasa && (
        <g className="obra-casa">
          {/* corpo */}
          <rect x="120" y="96" width="120" height="54" rx="2" className="obra-parede" />
          {/* telhado */}
          <path d="M110 98 L180 60 L250 98 Z" className="obra-telhado" />
          {/* porta */}
          <rect x="168" y="118" width="24" height="32" rx="1.5" className="obra-porta" />
          {/* janela */}
          <rect x="200" y="112" width="22" height="18" rx="1.5" className="obra-janela" />
          {/* escada */}
          <line x1="180" y1="150" x2="180" y2="208" className="obra-escada" />
          <line x1="172" y1="150" x2="172" y2="208" className="obra-escada" />
          <line x1="172" y1="164" x2="180" y2="164" className="obra-escada" />
          <line x1="172" y1="178" x2="180" y2="178" className="obra-escada" />
          <line x1="172" y1="192" x2="180" y2="192" className="obra-escada" />
        </g>
      )}

      {extra > 0 && (
        <text x="336" y={topo - 6} className="obra-extra" textAnchor="end">
          +{extra}
        </text>
      )}
    </svg>
  );
}
