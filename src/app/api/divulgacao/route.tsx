import { ImageResponse } from "next/og";

export const runtime = "nodejs";

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

  const [logoB, bgB, casaB, f600, f800, f900] = await Promise.all([
    buscar("/logo-card.png"),
    buscar("/card-bg.jpg"),
    buscar("/casa.svg"),
    buscar("/fonts/raleway-600.ttf"),
    buscar("/fonts/raleway-800.ttf"),
    buscar("/fonts/raleway-900.ttf"),
  ]);
  const logo = uri(logoB, "image/png");
  const bg = uri(bgB, "image/jpeg");
  const casa = uri(casaB, "image/svg+xml");

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

  // Bandeiras como SVG embutido (o Satori engole divs de faixa sem largura).
  const svgURI = (s: string) =>
    `data:image/svg+xml;base64,${Buffer.from(s).toString("base64")}`;
  const flagES = svgURI(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 132 88"><rect width="132" height="88" fill="#AA151B"/><rect y="22" width="132" height="44" fill="#F1BF00"/></svg>`
  );
  const flagAR = svgURI(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 132 88"><rect width="132" height="88" fill="#74ACDF"/><rect y="29" width="132" height="30" fill="#ffffff"/><circle cx="66" cy="44" r="11" fill="#F6B40E"/></svg>`
  );

  const Bandeira = ({ tipo }: { tipo: "es" | "ar" }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={tipo === "es" ? flagES : flagAR}
      width={132}
      height={88}
      alt=""
      style={{ borderRadius: "8px", border: `3px solid ${GRAFITE}`, flexShrink: 0 }}
    />
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

  let conteudo: React.ReactElement;

  if (v === "2") {
    // O PLACAR
    conteudo = (
      <div style={{ ...raiz, backgroundColor: BEGE }}>
        <Fundo opacidade={1} veu="rgba(178,171,151,0.58)" />
        <div style={{ ...corpo, alignItems: "center", color: GRAFITE }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} width={330} height={193} alt="" style={{ flexShrink: 0 }} />
          <div style={{ display: "flex", height: "56px" }} />
          <div style={{ display: "flex", fontSize: "32px", fontWeight: 800, letterSpacing: "4px" }}>
            FINAL DA COPA DO MUNDO
          </div>
          <div style={{ display: "flex", height: "34px" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "26px" }}>
            <Bandeira tipo="es" />
            <div style={{ display: "flex", fontSize: "128px", fontWeight: 900, color: AZUL, letterSpacing: "-4px" }}>
              ? x ?
            </div>
            <Bandeira tipo="ar" />
          </div>
          <div style={{ display: "flex", height: "40px" }} />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              fontSize: "76px",
              fontWeight: 900,
              lineHeight: 1.08,
              letterSpacing: "-2px",
              textAlign: "center",
            }}
          >
            <div style={{ display: "flex" }}>CRAVE O PLACAR.</div>
            <div style={{ display: "flex" }}>TORÇA POR ALGUÉM.</div>
          </div>
          <div style={{ display: "flex", height: "30px" }} />
          <div style={{ display: "flex", fontSize: "35px", fontWeight: 600, lineHeight: 1.4, textAlign: "center" }}>
            Fézinha de R$ 10 na Final da Copa. Acertou o placar, leva um prêmio. Errou, ajudou a TETO a construir mais uma casa pra quem precisa. Nesse bolão, todo mundo ganha.
          </div>
          <div style={{ display: "flex", flex: 1 }} />
          <div
            style={{
              display: "flex",
              backgroundColor: GRAFITE,
              color: PAPEL,
              borderRadius: "12px",
              padding: "16px 30px",
              fontSize: "30px",
              fontWeight: 800,
              letterSpacing: "2px",
            }}
          >
            ATÉ DOMINGO, 15H59
          </div>
          <div style={{ display: "flex", height: "26px" }} />
          <div
            style={{
              display: "flex",
              backgroundColor: AZUL,
              color: PAPEL,
              borderRadius: "16px",
              padding: "22px 38px",
              fontSize: "44px",
              fontWeight: 900,
            }}
          >
            {host}
          </div>
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
          <img src={logo} width={320} height={187} alt="" style={{ flexShrink: 0 }} />
          <div style={{ display: "flex", flex: 1 }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={casa} width={720} height={517} alt="" style={{ flexShrink: 0 }} />
          <div style={{ display: "flex", height: "22px" }} />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              fontSize: "66px",
              fontWeight: 900,
              lineHeight: 1.08,
              letterSpacing: "-2px",
            }}
          >
            <div style={{ display: "flex" }}>TEM UMA FAMÍLIA</div>
            <div style={{ display: "flex" }}>ESPERANDO ESSA CASA.</div>
          </div>
          <div style={{ display: "flex", height: "18px" }} />
          <div style={{ display: "flex", fontSize: "31px", fontWeight: 600, textAlign: "center", lineHeight: 1.38 }}>
            Sua fézinha de R$ 10 na Final da Copa ajuda a TETO a entregar mais casas emergenciais em 2026. Palpite, torça e construa junto.
          </div>
          <div style={{ display: "flex", height: "26px" }} />
          <div
            style={{
              display: "flex",
              backgroundColor: AZUL,
              color: PAPEL,
              borderRadius: "16px",
              padding: "20px 36px",
              fontSize: "42px",
              fontWeight: 900,
            }}
          >
            {host}
          </div>
        </div>
      </div>
    );
  } else if (v === "4") {
    // A CONTA
    conteudo = (
      <div style={{ ...raiz, backgroundColor: AZUL }}>
        <Fundo opacidade={0.14} />
        <div style={{ ...corpo, color: PAPEL }}>
          {/* logo num selo claro: no azul chapado ele sumiria */}
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              backgroundColor: GRAFITE,
              borderRadius: "18px",
              padding: "22px 28px",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} width={300} height={176} alt="" style={{ flexShrink: 0 }} />
          </div>
          <div style={{ display: "flex", flex: 1 }} />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: "96px",
              fontWeight: 900,
              letterSpacing: "-3px",
              lineHeight: 1.06,
            }}
          >
            <div style={{ display: "flex" }}>A FÉZINHA</div>
            <div style={{ display: "flex" }}>MAIS IMPORTANTE</div>
            <div style={{ display: "flex", color: GRAFITE }}>DO ANO.</div>
          </div>
          <div style={{ display: "flex", height: "14px" }} />
          <div style={{ display: "flex", width: "160px", height: "8px", backgroundColor: GRAFITE }} />
          <div style={{ display: "flex", height: "30px" }} />
          <div style={{ display: "flex", fontSize: "36px", fontWeight: 800, lineHeight: 1.4 }}>
            R$ 10, um palpite na Final da Copa, e você entra no time que constrói casas com a TETO.
          </div>
          <div style={{ display: "flex", flex: 1 }} />
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              backgroundColor: GRAFITE,
              color: PAPEL,
              borderRadius: "16px",
              padding: "22px 38px",
              fontSize: "44px",
              fontWeight: 900,
            }}
          >
            {host}
          </div>
          <div style={{ display: "flex", height: "20px" }} />
          <div style={{ display: "flex", fontSize: "27px", fontWeight: 600, color: "rgba(246,244,238,0.9)" }}>
            Palpites até domingo, 15h59 (1 min antes do jogo).
          </div>
        </div>
      </div>
    );
  } else {
    // 1. A PERGUNTA
    conteudo = (
      <div style={{ ...raiz, backgroundColor: GRAFITE }}>
        <Fundo opacidade={0.18} />
        <div style={{ ...corpo, color: PAPEL }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} width={350} height={205} alt="" style={{ flexShrink: 0 }} />
          <div style={{ display: "flex", flex: 1 }} />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: "88px",
              fontWeight: 900,
              lineHeight: 1.08,
              letterSpacing: "-2px",
            }}
          >
            <div style={{ display: "flex" }}>ESTE ANO,</div>
            <div style={{ display: "flex" }}>A COPA VALE</div>
            <div style={{ display: "flex" }}>MAIS QUE</div>
            <div style={{ display: "flex" }}>UMA TAÇA.</div>
          </div>
          <div style={{ display: "flex", height: "30px" }} />
          <div style={{ display: "flex", fontSize: "122px", fontWeight: 900, color: AZUL, letterSpacing: "-4px", lineHeight: 1 }}>
            VALE UM LAR.
          </div>
          <div style={{ display: "flex", height: "18px" }} />
          <div style={{ display: "flex", width: "190px", height: "7px", backgroundColor: AZUL }} />
          <div style={{ display: "flex", flex: 1 }} />
          <div style={{ display: "flex", fontSize: "34px", fontWeight: 600, lineHeight: 1.4, color: "rgba(246,244,238,0.88)" }}>
            Faça sua fézinha de R$ 10 no bolão da Final e ajude a TETO a construir mais uma casa emergencial pra quem precisa.
          </div>
          <div style={{ display: "flex", height: "28px" }} />
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              backgroundColor: AZUL,
              color: PAPEL,
              borderRadius: "16px",
              padding: "22px 38px",
              fontSize: "44px",
              fontWeight: 900,
            }}
          >
            {host}
          </div>
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
