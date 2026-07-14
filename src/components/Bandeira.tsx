// Bandeirinhas dos times (SVG inline). Casa pelo nome normalizado;
// se não reconhecer o país, não mostra nada (degrada suave).

function normal(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

const FRANCA = (
  <>
    <rect width="8" height="16" x="0" fill="#0055A4" />
    <rect width="8" height="16" x="8" fill="#fff" />
    <rect width="8" height="16" x="16" fill="#EF4135" />
  </>
);

const ARGENTINA = (
  <>
    <rect width="24" height="16" fill="#fff" />
    <rect width="24" height="5.33" y="0" fill="#74ACDF" />
    <rect width="24" height="5.33" y="10.67" fill="#74ACDF" />
    <circle cx="12" cy="8" r="1.9" fill="#F6B40E" stroke="#85340A" strokeWidth="0.3" />
  </>
);

const ESPANHA = (
  <>
    <rect width="24" height="16" fill="#c60b1e" />
    <rect width="24" height="8" y="4" fill="#ffc400" />
  </>
);

const MAPA: Record<string, React.ReactNode> = {
  franca: FRANCA,
  frança: FRANCA,
  argentina: ARGENTINA,
  espanha: ESPANHA,
};

export default function Bandeira({
  nome,
  size = 22,
}: {
  nome: string;
  size?: number;
}) {
  const conteudo = MAPA[normal(nome)];
  if (!conteudo) return null;
  return (
    <svg
      className="bandeira"
      width={size}
      height={(size * 16) / 24}
      viewBox="0 0 24 16"
      aria-hidden
    >
      {conteudo}
    </svg>
  );
}
