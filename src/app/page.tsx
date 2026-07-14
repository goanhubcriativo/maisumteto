import {
  config,
  valorApostaCentavos,
  doacaoPresetsCentavos,
} from "@/lib/config";
import MontarCasinha from "@/components/MontarCasinha";
import ProgressoPiloti from "@/components/ProgressoPiloti";
import RegrasCampanha from "@/components/RegrasCampanha";
import LogoTeto from "@/components/LogoTeto";

export const dynamic = "force-dynamic";

export default function Home() {
  const valor = valorApostaCentavos();
  return (
    <main className="canvas">
      {/* Selo da campanha */}
      <div className="selo-campanha">
        Campanha de arrecadação para Casa Amiga
      </div>

      {/* Logo grande sobre o bege */}
      <header className="masthead">
        <LogoTeto className="masthead-logo" />
      </header>

      {/* Piloti = barra de carregamento da meta */}
      <ProgressoPiloti />

      {/* Aposta + ajudinha + dados */}
      <MontarCasinha
        timeCasa={config.timeCasa}
        timeVisitante={config.timeVisitante}
        valorCentavos={valor}
        doacaoPresets={doacaoPresetsCentavos}
      />

      {/* Rodapé da campanha */}
      <footer className="rodape">
        <p className="responsa">
          <span className="responsa-bloco">
            <span>Jogue com</span>
            <span>responsabilidade</span>
          </span>
          <span className="responsa-social">Social</span>
        </p>

        <p className="transparencia">
          As doações são feitas para a conta de <b>GOAN | hub criativo</b> no
          Asaas, responsáveis pelo contrato da Casa Amiga. Cada doação tem uma
          taxa de R$&nbsp;0,99 do sistema e todo o restante é depositado
          diretamente para a <b>TETO Paraná</b>.
        </p>

        <RegrasCampanha />
      </footer>
    </main>
  );
}
