import {
  config,
  valorApostaCentavos,
  doacaoPresetsCentavos,
} from "@/lib/config";
import MontarCasinha from "@/components/MontarCasinha";

export const dynamic = "force-dynamic";

export default function Home() {
  const valor = valorApostaCentavos();
  return (
    <main className="container">
      <div className="hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-claro.svg" alt="Teto" className="hero-logo" />
        <span className="tag">Casa Amiga de Dezembro · Teto</span>
        <h1>Bolão da Final da Copa do Mundo</h1>
        <p>
          Cada palpite ajuda a erguer uma <b>casa emergencial</b> com a Teto.
          Monte sua casinha, chute o placar da final e, se puder, deixe um
          chorinho a mais. 🧱🏠
        </p>
        <div className="placar-jogo">
          <span>{config.timeCasa}</span>
          <span className="vs">{config.dataJogo}</span>
          <span>{config.timeVisitante}</span>
        </div>
      </div>

      <MontarCasinha
        timeCasa={config.timeCasa}
        timeVisitante={config.timeVisitante}
        valorCentavos={valor}
        doacaoPresets={doacaoPresetsCentavos}
      />

      <p className="rodape">
        Você pode dar quantos palpites quiser — cada um é um tijolo a mais.
        <br />
        Pagamento único e seguro via PIX (Asaas). 100% pra causa.
      </p>
    </main>
  );
}
