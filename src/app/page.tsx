import {
  config,
  valorApostaCentavos,
  doacaoPresetsCentavos,
  bolaoEncerrado,
  PRAZO_LABEL,
} from "@/lib/config";
import MontarCasinha from "@/components/MontarCasinha";
import ProgressoPiloti from "@/components/ProgressoPiloti";
import RegrasCampanha from "@/components/RegrasCampanha";
import CompartilharCampanha from "@/components/CompartilharCampanha";
import LogoTeto from "@/components/LogoTeto";
import { IconRelogio } from "@/components/icones";

export const dynamic = "force-dynamic";

export default function Home() {
  const valor = valorApostaCentavos();
  const encerrado = bolaoEncerrado();
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

      {/* Prazo pra apostar */}
      <div className={`prazo-banner ${encerrado ? "encerrado" : ""}`}>
        <IconRelogio size={16} />
        {encerrado ? (
          <span>Os palpites do bolão se encerraram.</span>
        ) : (
          <span>
            Palpites até <strong>{PRAZO_LABEL}</strong> — um minutinho antes do
            jogo começar.
          </span>
        )}
      </div>

      {/* Aposta + ajudinha + dados */}
      <MontarCasinha
        timeCasa={config.timeCasa}
        timeVisitante={config.timeVisitante}
        valorCentavos={valor}
        doacaoPresets={doacaoPresetsCentavos}
        encerrado={encerrado}
      />

      {/* Divulgação — todo mundo pode compartilhar, mesmo sem apostar */}
      <section className="divulga">
        <p className="divulga-txt">
          Não vai fazer sua fézinha agora? <strong>Ajuda divulgando</strong> —
          quanto mais gente souber, mais rápido a casa sobe.
        </p>
        <CompartilharCampanha />
      </section>

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
          As doações são feitas para a conta de GOAN no Mercado Pago,
          responsáveis pelo contrato da Casa Amiga. Cada doação tem uma taxa de
          0,99% por PIX e todo o restante será depositado para a TETO.
        </p>

        <RegrasCampanha />

        <div className="rodape-links">
          <a href="/privacidade">Aviso de Privacidade</a>
        </div>
      </footer>
    </main>
  );
}
