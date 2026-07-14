"use client";

// Página de PRÉVIA da tela de conclusão — pra ver/testar cartão, botões e
// recibo sem precisar pagar. Não afeta o bolão real.
import LogoTeto from "@/components/LogoTeto";
import TelaSucesso from "@/components/TelaSucesso";

export default function ExemploPage() {
  const origem =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://maisumteto.com.br";

  return (
    <main className="canvas">
      <header className="masthead">
        <LogoTeto className="masthead-logo" />
      </header>

      <div className="participe-meta" style={{ margin: "16px 0 4px" }}>
        Prévia da tela de conclusão (dados de exemplo).
      </div>

      <TelaSucesso
        nome="Você"
        palpites={[
          { placarCasa: 2, placarVisitante: 1 },
          { placarCasa: 1, placarVisitante: 0 },
          { placarCasa: 3, placarVisitante: 2 },
        ]}
        doacaoCentavos={1000}
        valorTotalCentavos={4000}
        reciboId="exemploA1B2C3D4"
        origem={origem}
      />
    </main>
  );
}
