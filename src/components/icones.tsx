// Iconografia da marca — ícones de linha (stroke), herdam a cor via currentColor.
// Estilo consistente: viewBox 24, traço 1.7, cantos arredondados.

type P = { size?: number; className?: string; strokeWidth?: number };

function Base({
  size = 24,
  className,
  strokeWidth = 1.7,
  children,
}: P & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

// Piloti: poste de sustentação com base e travessa (metáfora da fézinha)
export const IconPiloti = (p: P) => (
  <Base {...p}>
    <path d="M8 4h8" />
    <path d="M9 4v16" />
    <path d="M15 4v16" />
    <path d="M6 20h12" />
    <path d="M9 11l6-3" />
  </Base>
);

// Casa emergencial sobre pilotis
export const IconCasa = (p: P) => (
  <Base {...p}>
    <path d="M3 10.5L12 4l9 6.5" />
    <path d="M5 10v6" />
    <path d="M19 10v6" />
    <path d="M5 16h14" />
    <path d="M8 16v4" />
    <path d="M16 16v4" />
    <path d="M11 20v-4h2v4" />
  </Base>
);

// PIX (losango estilizado)
export const IconPix = (p: P) => (
  <Base {...p}>
    <path d="M12 3.5l4 4a2 2 0 010 2.8l-4 4-4-4a2 2 0 010-2.8z" />
    <path d="M7 12l-2.2 2.2a1.5 1.5 0 000 2.1L7 18.6" />
    <path d="M17 12l2.2 2.2a1.5 1.5 0 010 2.1L17 18.6" />
    <path d="M12 15v3.5" />
  </Base>
);

// Coração de linha (chorinho / doação)
export const IconCoracao = (p: P) => (
  <Base {...p}>
    <path d="M12 20s-7-4.4-9.2-8.6C1.3 8.6 2.6 5.5 5.7 5.1 7.8 4.8 9.3 6 12 8.6c2.7-2.6 4.2-3.8 6.3-3.5 3.1.4 4.4 3.5 2.9 6.3C19 15.6 12 20 12 20z" />
  </Base>
);

// Cadeado (segurança)
export const IconCadeado = (p: P) => (
  <Base {...p}>
    <rect x="5" y="10" width="14" height="10" rx="2" />
    <path d="M8 10V7a4 4 0 018 0v3" />
    <path d="M12 14v2" />
  </Base>
);

export const IconMais = (p: P) => (
  <Base {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
);

export const IconX = (p: P) => (
  <Base {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Base>
);

export const IconCheck = (p: P) => (
  <Base {...p}>
    <path d="M4 12.5l5 5L20 6.5" />
  </Base>
);

export const IconWhats = (p: P) => (
  <Base {...p}>
    <path d="M4 20l1.4-4A8 8 0 1112 20a8 8 0 01-4-1.1L4 20z" />
  </Base>
);

export const IconSeta = (p: P) => (
  <Base {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Base>
);

// Carinha feliz (Sim)
export const IconFeliz = (p: P) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="9" cy="10" r="0.9" fill="currentColor" stroke="none" />
    <circle cx="15" cy="10" r="0.9" fill="currentColor" stroke="none" />
    <path d="M8.3 14c1.2 1.8 6.2 1.8 7.4 0" />
  </Base>
);

// Carinha triste (Não)
export const IconTriste = (p: P) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="9" cy="10" r="0.9" fill="currentColor" stroke="none" />
    <circle cx="15" cy="10" r="0.9" fill="currentColor" stroke="none" />
    <path d="M8.3 16c1.2-1.8 6.2-1.8 7.4 0" />
  </Base>
);

// Instagram (stories)
export const IconInstagram = (p: P) => (
  <Base {...p}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="16.6" cy="7.4" r="0.7" fill="currentColor" stroke="none" />
  </Base>
);

// Baixar (download)
export const IconDownload = (p: P) => (
  <Base {...p}>
    <path d="M12 4v11" />
    <path d="M7.5 11L12 15.5 16.5 11" />
    <path d="M5 20h14" />
  </Base>
);

// Mangueira de nível — vetor ilustrativo (colorido) para o popup de erro.
// Mangueira enrolada (azul, estilo mangueira de obra) com bico e água escapando.
export const MangueiraNivel = ({ size = 150 }: { size?: number }) => (
  <svg
    width={size}
    height={(size * 185) / 210}
    viewBox="0 0 210 185"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    {/* sombra no chão */}
    <ellipse cx="95" cy="152" rx="82" ry="12" fill="#273740" opacity="0.1" />

    {/* caracol (concêntrico, técnica de tubo) — contornos grafite */}
    <ellipse cx="95" cy="82" rx="84" ry="46" fill="none" stroke="#273740" strokeWidth="15" />
    <ellipse cx="95" cy="77" rx="57" ry="30" fill="none" stroke="#273740" strokeWidth="15" />
    <ellipse cx="95" cy="72" rx="31" ry="15" fill="none" stroke="#273740" strokeWidth="15" />
    {/* corpo azul */}
    <ellipse cx="95" cy="82" rx="84" ry="46" fill="none" stroke="#2c95cf" strokeWidth="8" />
    <ellipse cx="95" cy="77" rx="57" ry="30" fill="none" stroke="#2c95cf" strokeWidth="8" />
    <ellipse cx="95" cy="72" rx="31" ry="15" fill="none" stroke="#2c95cf" strokeWidth="8" />
    <ellipse cx="95" cy="82" rx="84" ry="46" fill="none" stroke="#8fd3f0" strokeWidth="2.5" />

    {/* rabicho: sai da borda do caracol e desce pro bico (por cima, conecta) */}
    <path d="M171 100 C 196 122, 192 150, 156 158" fill="none" stroke="#273740" strokeWidth="15" strokeLinecap="round" />
    <path d="M171 100 C 196 122, 192 150, 156 158" fill="none" stroke="#41aee4" strokeWidth="8" strokeLinecap="round" />

    {/* bico / gatilho na ponta */}
    <g transform="rotate(30 156 158)">
      <rect x="128" y="151" width="44" height="15" rx="7" fill="#273740" />
      <rect x="131" y="153.5" width="38" height="10" rx="5" fill="#5a6b74" />
      <rect x="166" y="148" width="10" height="21" rx="4" fill="#273740" />
      <path d="M140 166 q-2 11 8 13" fill="none" stroke="#273740" strokeWidth="5" strokeLinecap="round" />
    </g>
    {/* pinguinho d'água saindo do bico */}
    <circle cx="132" cy="172" r="3.6" fill="#2c95cf" />
    <circle cx="140" cy="179" r="2.6" fill="#8fd3f0" />
  </svg>
);
