import { ImageResponse } from "next/og";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// TEMPORÁRIO: gera as opções de material de divulgação (1080x1350).
// Usa a mesma tipografia/assets do cartão. ?v=1..4
export async function GET(req: Request) {
  const AZUL = "#0291da";
  const GRAFITE = "#273740";
  const BEGE = "#b2ab97";
  const PAPEL = "#f6f4ee";

  const v = new URL(req.url).searchParams.get("v") || "1";
  const W = 1080;
  const H = 1350;

  const reqHost = req.headers.get("host") || "";
  const host = process.env.NEXT_PUBLIC_SITE_HOST || reqHost || "maisumteto.com.br";
  const fetchHost = reqHost || host;
  const proto = fetchHost.startsWith("localhost") ? "http" : "https";

  async function buscar(caminho: string): Promise<ArrayBuffer | null> {
    try {
      const buf = await (
        await fetch(`${proto}://${fetchHost}${caminho}`, { cache: "no-store" })
      ).arrayBuffer();
      return buf.byteLength > 1000 ? buf : null;
    } catch {
      return null;
    }
  }
  const uri = (b: ArrayBuffer | null, mime: string) =>
    b ? `data:${mime};base64,${Buffer.from(b).toString("base64")}` : "";

  const [logoB, logoInvB, bgB, casaB, botaoB, mestreB, f600, f800, f900] =
    await Promise.all([
      buscar("/logo-card.png"),
      buscar("/logo-invertido.png"),
      buscar("/card-bg.jpg"),
      buscar("/casa.svg"),
      buscar("/botao-piloti.svg"),
      buscar("/piloti-mestre.svg"),
      buscar("/fonts/raleway-600.ttf"),
      buscar("/fonts/raleway-800.ttf"),
      buscar("/fonts/raleway-900.ttf"),
    ]);
  const logo = uri(logoB, "image/png");
  const logoInv = uri(logoInvB, "image/png");
  const bg = uri(bgB, "image/jpeg");
  const casa = uri(casaB, "image/svg+xml");
  const botaoPiloti = uri(botaoB, "image/svg+xml");
  const pilotiMestre = uri(mestreB, "image/svg+xml");

  // Percentual REAL da campanha, direto do banco (sem chamada HTTP interna,
  // que já falhou e fez a arte sair com 0%). Se o banco falhar, joga o erro:
  // é melhor não gerar do que gerar um número mentiroso pra divulgação.
  const metaCentavos =
    parseInt(process.env.META_CENTAVOS || "150000", 10) || 150000;
  const somaPagas = await prisma.casinha.aggregate({
    where: { status: "PAGO" },
    _sum: { valorTotalCentavos: true },
  });
  const arrecadado = somaPagas._sum.valorTotalCentavos || 0;
  const pct = Math.min(100, Math.floor((arrecadado / metaCentavos) * 100));

  const fonts = [
    f600 && { name: "Raleway", data: f600, weight: 600 as const, style: "normal" as const },
    f800 && { name: "Raleway", data: f800, weight: 800 as const, style: "normal" as const },
    f900 && { name: "Raleway", data: f900, weight: 900 as const, style: "normal" as const },
  ].filter(Boolean) as {
    name: string;
    data: ArrayBuffer;
    weight: 600 | 800 | 900;
    style: "normal";
  }[];

  // Bandeiras como SVG embutido
  const svgURI = (s: string) =>
    `data:image/svg+xml;base64,${Buffer.from(s).toString("base64")}`;
  const flagES = svgURI(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 132 88"><rect width="132" height="88" fill="#AA151B"/><rect y="22" width="132" height="44" fill="#F1BF00"/></svg>`
  );
  const flagAR = svgURI(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 132 88"><rect width="132" height="88" fill="#74ACDF"/><rect y="29" width="132" height="30" fill="#ffffff"/><circle cx="66" cy="44" r="11" fill="#F6B40E"/></svg>`
  );

  const Fundo = ({ opacidade, veu }: { opacidade: number; veu?: string }) => (
    <>
      {bg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={bg}
          width={W}
          height={H}
          alt=""
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: `${W}px`,
            height: `${H}px`,
            objectFit: "cover",
            opacity: opacidade,
          }}
        />
      ) : (
        <div style={{ display: "flex" }} />
      )}
      {veu ? (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: `${W}px`,
            height: `${H}px`,
            backgroundColor: veu,
          }}
        />
      ) : (
        <div style={{ display: "flex" }} />
      )}
    </>
  );

  const raiz = {
    width: `${W}px`,
    height: `${H}px`,
    display: "flex",
    position: "relative" as const,
    fontFamily: "Raleway",
  };
  const corpo = {
    display: "flex",
    flexDirection: "column" as const,
    width: "100%",
    height: "100%",
    position: "relative" as const,
    padding: "76px",
  };
  const olho = (cor: string) => ({
    display: "flex",
    fontSize: "27px",
    fontWeight: 800,
    letterSpacing: "5px",
    color: cor,
  });
  const cta = (corBg: string) => ({
    display: "flex",
    alignSelf: "flex-start" as const,
    backgroundColor: corBg,
    color: PAPEL,
    borderRadius: "16px",
    padding: "22px 38px",
    fontSize: "44px",
    fontWeight: 900,
  });

  let conteudo: React.ReactElement;

  if (v === "2") {
    // O SISTEMA: mock da telinha de aposta
    conteudo = (
      <div style={{ ...raiz, backgroundColor: BEGE }}>
        <Fundo opacidade={1} veu="rgba(178,171,151,0.6)" />
        <div style={{ ...corpo, alignItems: "center", color: GRAFITE, padding: "64px 76px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} width={290} height={170} alt="" style={{ flexShrink: 0 }} />
          <div style={{ display: "flex", height: "40px" }} />
          <div style={{ display: "flex", fontSize: "88px", fontWeight: 900, letterSpacing: "-2px" }}>
            PALPITOU, AJUDOU.
          </div>
          <div style={{ display: "flex", height: "36px" }} />

          {/* telinha do bolão */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: "100%",
              backgroundColor: PAPEL,
              borderRadius: "26px",
              border: `3px solid ${GRAFITE}`,
              padding: "38px 44px",
              boxShadow: "10px 10px 0 rgba(39,55,64,0.25)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", fontSize: "27px", fontWeight: 800, letterSpacing: "3px", color: "rgba(39,55,64,0.7)" }}>
                SUA FÉZINHA
              </div>
              <div
                style={{
                  display: "flex",
                  backgroundColor: AZUL,
                  color: PAPEL,
                  borderRadius: "10px",
                  padding: "8px 18px",
                  fontSize: "27px",
                  fontWeight: 900,
                }}
              >
                R$ 10
              </div>
            </div>
            <div style={{ display: "flex", height: "34px" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "26px" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={flagES} width={118} height={79} alt="" style={{ borderRadius: "8px", border: `3px solid ${GRAFITE}`, flexShrink: 0 }} />
              <div
                style={{
                  display: "flex",
                  width: "108px",
                  height: "118px",
                  backgroundColor: "#ffffff",
                  border: `3px solid ${GRAFITE}`,
                  borderRadius: "14px",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "66px",
                  fontWeight: 900,
                }}
              >
                2
              </div>
              <div style={{ display: "flex", fontSize: "46px", fontWeight: 900, color: AZUL }}>x</div>
              <div
                style={{
                  display: "flex",
                  width: "108px",
                  height: "118px",
                  backgroundColor: "#ffffff",
                  border: `3px solid ${GRAFITE}`,
                  borderRadius: "14px",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "66px",
                  fontWeight: 900,
                }}
              >
                1
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={flagAR} width={118} height={79} alt="" style={{ borderRadius: "8px", border: `3px solid ${GRAFITE}`, flexShrink: 0 }} />
            </div>
            <div style={{ display: "flex", height: "34px" }} />
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div style={{ display: "flex", position: "relative", width: "252px", height: "132px" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={botaoPiloti} width={252} height={132} alt="" />
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "252px",
                    height: "132px",
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "center",
                    paddingBottom: "30px",
                    fontSize: "30px",
                    fontWeight: 900,
                    letterSpacing: "2px",
                    color: PAPEL,
                  }}
                >
                  FINCAR
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", height: "34px" }} />
          <div style={{ display: "flex", fontSize: "33px", fontWeight: 600, textAlign: "center", lineHeight: 1.4 }}>
            Crave o placar da Final da Copa. Cada fézinha ajuda a TETO a construir mais uma casa pra quem precisa.
          </div>
          <div style={{ display: "flex", flex: 1 }} />
          <div style={{ ...cta(AZUL), alignSelf: "center" }}>{host}</div>
        </div>
      </div>
    );
  } else if (v === "3") {
    // A CASA
    conteudo = (
      <div style={{ ...raiz, backgroundColor: PAPEL }}>
        <Fundo opacidade={0.55} veu="rgba(246,244,238,0.42)" />
        <div style={{ ...corpo, alignItems: "center", color: GRAFITE }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} width={300} height={176} alt="" style={{ flexShrink: 0 }} />
          <div style={{ display: "flex", flex: 1 }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={casa} width={740} height={531} alt="" style={{ flexShrink: 0 }} />
          <div style={{ display: "flex", height: "30px" }} />
          <div style={olho(AZUL)}>BOLÃO DA FINAL DA COPA</div>
          <div style={{ display: "flex", height: "16px" }} />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              fontSize: "72px",
              fontWeight: 900,
              lineHeight: 1.08,
              letterSpacing: "-2px",
            }}
          >
            <div style={{ display: "flex" }}>TEM UMA FAMÍLIA</div>
            <div style={{ display: "flex" }}>ESPERANDO ESSA CASA.</div>
          </div>
          <div style={{ display: "flex", height: "18px" }} />
          <div style={{ display: "flex", fontSize: "32px", fontWeight: 600, textAlign: "center", lineHeight: 1.4 }}>
            Sua fézinha de R$ 10 ajuda a TETO a entregar mais casas emergenciais em 2026.
          </div>
          <div style={{ display: "flex", height: "28px" }} />
          <div style={{ ...cta(AZUL), alignSelf: "center", padding: "20px 36px", fontSize: "42px" }}>{host}</div>
        </div>
      </div>
    );
  } else if (v === "4") {
    // A FÉZINHA (azul, logo invertido sem quadro)
    conteudo = (
      <div style={{ ...raiz, backgroundColor: AZUL }}>
        <Fundo opacidade={0.14} />
        <div style={{ ...corpo, color: PAPEL }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoInv || logo} width={330} height={193} alt="" style={{ flexShrink: 0 }} />
          <div style={{ display: "flex", flex: 1 }} />
          <div style={olho(GRAFITE)}>BOLÃO DA FINAL DA COPA</div>
          <div style={{ display: "flex", height: "22px" }} />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: "82px",
              fontWeight: 900,
              letterSpacing: "-2px",
              lineHeight: 1.08,
            }}
          >
            <div style={{ display: "flex" }}>A FÉZINHA MAIS</div>
            <div style={{ display: "flex" }}>IMPORTANTE DO ANO.</div>
          </div>
          <div style={{ display: "flex", height: "24px" }} />
          <div style={{ display: "flex", width: "160px", height: "8px", backgroundColor: GRAFITE }} />
          <div style={{ display: "flex", height: "30px" }} />
          <div style={{ display: "flex", fontSize: "36px", fontWeight: 800, lineHeight: 1.4 }}>
            R$ 10, um palpite na Final da Copa, e você entra no time que constrói casas com a TETO.
          </div>
          <div style={{ display: "flex", flex: 1 }} />
          <div style={cta(GRAFITE)}>{host}</div>
          <div style={{ display: "flex", height: "20px" }} />
          <div style={{ display: "flex", fontSize: "27px", fontWeight: 600, color: "rgba(246,244,238,0.9)" }}>
            Palpites até domingo, 15h59 (1 min antes do jogo).
          </div>
        </div>
      </div>
    );
  } else if (v === "5") {
    // MOMENTUM: X% da meta em menos de 24h + chamada pra quem não fez ontem
    conteudo = (
      <div style={{ ...raiz, backgroundColor: GRAFITE }}>
        <Fundo opacidade={0.42} />
        <div style={{ ...corpo, color: PAPEL }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} width={290} height={170} alt="" style={{ flexShrink: 0 }} />
          <div style={{ display: "flex", flex: 1 }} />

          <div style={olho(AZUL)}>EM MENOS DE 24 HORAS</div>
          <div style={{ display: "flex", height: "10px" }} />
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <div
              style={{
                display: "flex",
                fontSize: "232px",
                fontWeight: 900,
                color: AZUL,
                letterSpacing: "-10px",
                lineHeight: 0.9,
              }}
            >
              {pct}%
            </div>
            <div
              style={{
                display: "flex",
                fontSize: "58px",
                fontWeight: 900,
                letterSpacing: "-1px",
                paddingBottom: "18px",
                paddingLeft: "18px",
              }}
            >
              DA META
            </div>
          </div>

          <div style={{ display: "flex", height: "30px" }} />
          {/* selo do piloti mestre */}
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              alignItems: "center",
              gap: "16px",
              backgroundColor: "rgba(246,244,238,0.1)",
              border: `2px solid ${AZUL}`,
              borderRadius: "14px",
              padding: "14px 22px 14px 18px",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pilotiMestre} width={62} height={81} alt="" style={{ flexShrink: 0 }} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: "30px", fontWeight: 900, letterSpacing: "1.5px", whiteSpace: "nowrap" }}>
                PILOTI MESTRE FIXADO E TRAVADO
              </div>
              <div style={{ display: "flex", fontSize: "25px", fontWeight: 600, color: "rgba(246,244,238,0.75)", whiteSpace: "nowrap" }}>
                Agora nos ajude a fixar o segundo piloti.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flex: 1 }} />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: "72px",
              fontWeight: 900,
              letterSpacing: "-2px",
              lineHeight: 1.08,
            }}
          >
            <div style={{ display: "flex" }}>QUEM NÃO FEZ ONTEM,</div>
            <div style={{ display: "flex", color: AZUL }}>FAZ HOJE.</div>
          </div>
          <div style={{ display: "flex", height: "22px" }} />
          <div style={{ display: "flex", fontSize: "33px", fontWeight: 600, lineHeight: 1.4, color: "rgba(246,244,238,0.88)" }}>
            Sua fézinha de R$ 10 ajuda a fixar o 2º piloti e a TETO a construir mais uma casa.
          </div>
          <div style={{ display: "flex", height: "28px" }} />
          <div style={cta(AZUL)}>{host}</div>
        </div>
      </div>
    );
  } else {
    // 1. VALE UM LAR (manifesto grafite)
    conteudo = (
      <div style={{ ...raiz, backgroundColor: GRAFITE }}>
        <Fundo opacidade={0.18} />
        <div style={{ ...corpo, color: PAPEL }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} width={330} height={193} alt="" style={{ flexShrink: 0 }} />
          <div style={{ display: "flex", flex: 1 }} />
          <div style={olho(AZUL)}>BOLÃO DA FINAL DA COPA</div>
          <div style={{ display: "flex", height: "24px" }} />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: "70px",
              fontWeight: 900,
              lineHeight: 1.12,
              letterSpacing: "-1px",
            }}
          >
            <div style={{ display: "flex" }}>A COPA DESTE ANO</div>
            <div style={{ display: "flex" }}>VALE MAIS QUE UMA TAÇA.</div>
          </div>
          <div style={{ display: "flex", height: "26px" }} />
          <div style={{ display: "flex", fontSize: "138px", fontWeight: 900, color: AZUL, letterSpacing: "-4px", lineHeight: 1 }}>
            VALE UM LAR.
          </div>
          <div style={{ display: "flex", flex: 1 }} />
          <div style={{ display: "flex", fontSize: "34px", fontWeight: 600, lineHeight: 1.4, color: "rgba(246,244,238,0.88)" }}>
            Faça sua fézinha de R$ 10 e ajude a TETO a construir mais uma casa emergencial pra quem precisa.
          </div>
          <div style={{ display: "flex", height: "28px" }} />
          <div style={cta(AZUL)}>{host}</div>
        </div>
      </div>
    );
  }

  return new ImageResponse(conteudo, {
    width: W,
    height: H,
    ...(fonts.length ? { fonts } : {}),
  });
}
