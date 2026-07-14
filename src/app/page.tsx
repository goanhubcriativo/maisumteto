import {
  config,
  valorApostaCentavos,
  doacaoPresetsCentavos,
} from "@/lib/config";
import MontarCasinha from "@/components/MontarCasinha";
import { IconCasa } from "@/components/icones";

export const dynamic = "force-dynamic";

export default function Home() {
  const valor = valorApostaCentavos();
  return (
    <main className="canvas">
      <header className="masthead">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-escuro.svg" alt="Teto" className="masthead-logo" />
        <div className="sobre">
          <IconCasa size={15} strokeWidth={2} />
          Casa Amiga de Dezembro
        </div>

        <h1 className="lema">
          Faça sua <span className="fe">fézinha</span>,
          <br />
          levante uma <span className="casa">casinha</span>.
        </h1>
        <p className="intro">
          No Brasil, dar um palpite é “fazer uma fézinha”. Aqui, cada fézinha na
          final da Copa finca um <b>piloti</b> de uma casa emergencial da Teto —
          feita de madeira, sobre pilotis, pra uma família sair do chão batido.
        </p>

        <div className="jogo">
          <span>{config.timeCasa}</span>
          <span className="data">{config.dataJogo}</span>
          <span>{config.timeVisitante}</span>
        </div>
      </header>

      <MontarCasinha
        timeCasa={config.timeCasa}
        timeVisitante={config.timeVisitante}
        valorCentavos={valor}
        doacaoPresets={doacaoPresetsCentavos}
      />

      <p className="rodape">
        Quantas fézinhas você quiser — cada uma é um piloti a mais na obra.
        <span className="cred">
          <IconCasa size={13} strokeWidth={2} /> 100% pra causa · PIX seguro
        </span>
      </p>
    </main>
  );
}
