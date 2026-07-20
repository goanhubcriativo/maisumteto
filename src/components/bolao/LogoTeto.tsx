import { LOGO_SVG } from "@/components/bolao/logoMarkup";

// Logo inline (não <img>): assim o <text> "Um" usa a fonte Agilera
// carregada na página (@font-face), renderizando igual em qualquer aparelho.
export default function LogoTeto({ className }: { className?: string }) {
  return (
    <span
      className={className}
      role="img"
      aria-label="Um Teto, um recomeço"
      dangerouslySetInnerHTML={{ __html: LOGO_SVG }}
    />
  );
}
