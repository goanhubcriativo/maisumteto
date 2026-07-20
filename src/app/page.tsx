import {
  config,
  valorApostaCentavos,
  doacaoPresetsCentavos,
  bolaoEncerrado,
  metaCampanhaCentavos,
  PRAZO_LABEL,
} from "@/lib/config";
import { prisma } from "@/lib/db";
import MontarCasinha from "@/components/MontarCasinha";
import ResultadoFinal from "@/components/ResultadoFinal";
import ProgressoPiloti from "@/components/ProgressoPiloti";
import RegrasCampanha from "@/components/RegrasCampanha";
import CompartilharCampanha from "@/components/CompartilharCampanha";
import RastreioHome from "@/components/RastreioHome";
import LogoTeto from "@/components/LogoTeto";
import { IconRelogio } from "@/components/icones";

export const dynamic = "force-dynamic";

// Resultado da final (preenchido depois do jogo).
const PLACAR_FINAL = { casa: 1, visitante: 0 };
// Quem ganhou o prêmio no sorteio entre os que cravaram o placar.
const VENCEDOR_SORTEIO = "Thiago Gonsalves Segunda";

export default async function Home() {
  const valor = valorApostaCentavos();
  const encerrado = bolaoEncerrado();

  // Dados do resultado (só quando o bolão já fechou)
  let acertadores: string[] = [];
  let arrecadadoCentavos = 0;
  let totalApoiadores = 0;
  if (encerrado) {
    const [certeiros, soma, apoiadores] = await Promise.all([
      prisma.casinha.findMany({
        where: {
          status: "PAGO",
          palpites: {
            some: {
              placarCasa: PLACAR_FINAL.casa,
              placarVisitante: PLACAR_FINAL.visitante,
            },
          },
        },
        select: { nome: true },
        orderBy: { paidAt: "asc" },
      }),
      prisma.casinha.aggregate({
        where: { status: "PAGO" },
        _sum: { valorTotalCentavos: true },
      }),
      prisma.casinha.count({ where: { status: "PAGO" } }),
    ]);
    acertadores = certeiros.map((c) => c.nome);
    arrecadadoCentavos = soma._sum.valorTotalCentavos || 0;
    totalApoiadores = apoiadores;
  }

  return (
    <main className="canvas">
      <RastreioHome />
      {/* Selo da campanha */}
      <div className="selo-campanha">
        Campanha de arrecadação para Casa Amiga
      </div>

      {/* Logo grande sobre o bege */}
      <header className="masthead">
        <LogoTeto className="masthead-logo" />
      </header>

      {encerrado ? (
        /* Bolão fechado: o topo vira só o título da ação */
        <h1 className="titulo-bolao">Bolão Final da Copa do Mundo</h1>
      ) : (
        <>
          {/* Piloti = barra de carregamento da meta */}
          <ProgressoPiloti />

          {/* Prazo pra apostar */}
          <div className="prazo-banner">
            <IconRelogio size={12} />
            <span>
              Palpites até <strong>{PRAZO_LABEL}</strong> (1 min antes do jogo).
            </span>
          </div>
        </>
      )}

      {/* Encerrado: mostra o resultado. Aberto: o formulário de aposta. */}
      {encerrado ? (
        <ResultadoFinal
          timeCasa={config.timeCasa}
          timeVisitante={config.timeVisitante}
          placarCasa={PLACAR_FINAL.casa}
          placarVisitante={PLACAR_FINAL.visitante}
          arrecadadoCentavos={arrecadadoCentavos}
          metaCentavos={metaCampanhaCentavos()}
          totalApoiadores={totalApoiadores}
          acertadores={acertadores}
          vencedor={VENCEDOR_SORTEIO}
        />
      ) : (
        <MontarCasinha
          timeCasa={config.timeCasa}
          timeVisitante={config.timeVisitante}
          valorCentavos={valor}
          doacaoPresets={doacaoPresetsCentavos}
          encerrado={encerrado}
        />
      )}

      {/* Divulgação: só enquanto o bolão está aberto */}
      {!encerrado && (
        <section className="divulga">
          <p className="divulga-txt">
            Não vai fazer sua fézinha agora? <strong>Ajuda divulgando</strong>:
            quanto mais gente souber, mais rápido a casa sobe.
          </p>
          <CompartilharCampanha />
        </section>
      )}

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
