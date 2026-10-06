// A tela que o domínio maisumteto.com.br passa a mostrar (via middleware).
//
// Azul escuro, só a casinha (nada da TETO: nem logo, nem nome), o aviso e o link
// do WhatsApp da equipe. É autossuficiente: o estilo vai em linha, pra não
// depender de nada e nunca aparecer sem formatação.

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Plataforma desativada",
  description:
    "Esta plataforma foi desativada, mas a campanha continua. Fale com o responsável pela arrecadação no WhatsApp.",
  // Favicon próprio (a casinha), pra não puxar o ícone da TETO neste domínio.
  icons: { icon: "/icone-app.svg", apple: "/icone-app.svg" },
};

// (41) 99774-9827 -> formato do link do WhatsApp (com o 55 do Brasil).
const WHATSAPP = "https://wa.me/5541997749827";

export default function PlataformaDesativada() {
  return (
    <main
      style={{
        minHeight: "100vh",
        width: "100%",
        background: "#0a2540",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 24px",
        boxSizing: "border-box",
        textAlign: "center",
        fontFamily: "var(--fonte-base), system-ui, -apple-system, Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: 580 }}>
        <svg
          viewBox="0 0 24 24"
          fill="#ffffff"
          aria-hidden="true"
          style={{ width: 76, height: 76, marginBottom: 30 }}
        >
          <path d="M12 4.3 21 12.6h-3.5v4.2h-11v-4.2H3z" />
          <rect x="6.5" y="18.1" width="11" height="1.9" rx="0.5" />
        </svg>

        <p
          style={{
            fontSize: 21,
            lineHeight: 1.65,
            fontWeight: 500,
            margin: 0,
            color: "rgba(255,255,255,0.92)",
          }}
        >
          Essa plataforma foi desativada, mas a campanha continua. Para continuar colaborando,
          entre em contato com o responsável pela arrecadação{" "}
          <a
            href={WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#7ec8ff", fontWeight: 700, textDecoration: "underline" }}
          >
            clicando aqui
          </a>
          .
        </p>

        <a
          href={WHATSAPP}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            marginTop: 30,
            padding: "14px 26px",
            background: "#25d366",
            color: "#0a2540",
            fontSize: 16,
            fontWeight: 700,
            borderRadius: 999,
            textDecoration: "none",
          }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ width: 22, height: 22 }}>
            <path d="M19.05 4.91A9.82 9.82 0 0 0 12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.02ZM12.05 20.1a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.69 8.23-8.23 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.35-.76-1.85-.2-.48-.41-.42-.56-.43l-.48-.01c-.17 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29Z" />
          </svg>
          Falar no WhatsApp
        </a>
      </div>
    </main>
  );
}
