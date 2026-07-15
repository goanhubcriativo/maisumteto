import { ImageResponse } from "next/og";

export const runtime = "nodejs";

// Cartão pronto (1080x1350) pra pessoa compartilhar no WhatsApp/Instagram.
export async function GET(req: Request) {
  const BEGE = "#b2ab97";
  const GRAFITE = "#273740";
  const AZUL = "#0291da";
  const PAPEL = "#f6f4ee";

  const stories = new URL(req.url).searchParams.get("f") === "stories";
  const ALTURA = stories ? 1920 : 1350;

  const reqHost = req.headers.get("host") || "";
  // Domínio MOSTRADO no cartão (canônico, por env).
  const host =
    process.env.NEXT_PUBLIC_SITE_HOST || reqHost || "maisumteto.com.br";

  // Para BUSCAR o ícone, usa o host que está de fato servindo a requisição
  // (o domínio novo pode ainda estar propagando).
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

  // Logo da campanha (PNG rasterizado com a fonte Agilera) buscado da /public.
  let logo = "";
  const logoBuf = await buscar("/logo-card.png");
  if (logoBuf) logo = `data:image/png;base64,${Buffer.from(logoBuf).toString("base64")}`;

  // Fonte Raleway (a mesma do site) — para o cartão ter a MESMA tipografia
  // que a gente aprovou, e não a fonte genérica do gerador de imagem.
  const [f600, f800, f900] = await Promise.all([
    buscar("/fonts/raleway-600.ttf"),
    buscar("/fonts/raleway-800.ttf"),
    buscar("/fonts/raleway-900.ttf"),
  ]);
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
  const fontFamily = fonts.length ? "Raleway" : "sans-serif";

  // Fundo do cartão: foto da comunidade (tom bege), pra não ficar bege liso.
  const bgBuf = await buscar("/card-bg.jpg");
  const bg = bgBuf
    ? `data:image/jpeg;base64,${Buffer.from(bgBuf).toString("base64")}`
    : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1080px",
          height: `${ALTURA}px`,
          display: "flex",
          position: "relative",
          backgroundColor: BEGE,
          fontFamily,
        }}
      >
        {/* Fundo (foto da comunidade) + véu bege pra manter o texto legível */}
        {bg && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bg}
            width={1080}
            height={ALTURA}
            alt=""
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "1080px",
              height: `${ALTURA}px`,
              objectFit: "cover",
            }}
          />
        )}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "1080px",
            height: `${ALTURA}px`,
            backgroundColor: "rgba(178, 171, 151, 0.64)",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            position: "relative",
            color: GRAFITE,
            padding: stories ? "48px 76px" : "78px 76px",
          }}
        >
        {/* No stories, centraliza o bloco de conteúdo (empurra do topo). */}
        {stories && <div style={{ display: "flex", flex: 1 }} />}

        {/* Logo da campanha */}
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} width={495} height={290} alt="" style={{ flexShrink: 0 }} />
        ) : (
          <div style={{ display: "flex", height: "140px", flexShrink: 0 }} />
        )}

        {/* Espaço entre logo e texto */}
        <div style={{ display: "flex", height: "56px", flexShrink: 0 }} />

        {/* Chamada */}
        <div style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ display: "flex", fontSize: "40px", fontWeight: 600, lineHeight: 1.2 }}>
            Eu fiz uma fézinha para a Final da Copa e
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "148px",
              fontWeight: 900,
              lineHeight: 1,
              color: AZUL,
              letterSpacing: "-5px",
              margin: "10px 0 12px",
            }}
          >
            CONTRIBUÍ
          </div>
          <div style={{ display: "flex", fontSize: "50px", fontWeight: 800, lineHeight: 1.18 }}>
            para ajudar a construir mais uma casa da TETO em 2026!
          </div>
        </div>

        {/* No stories: gap fixo (bloco coeso). No feed: empurra o convite pro rodapé. */}
        {stories ? (
          <div style={{ display: "flex", height: "60px", flexShrink: 0 }} />
        ) : (
          <div style={{ display: "flex", flex: 1 }} />
        )}

        {/* Convite + link */}
        <div style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ display: "flex", fontSize: "42px", fontWeight: 800 }}>
            Contribua você também:
          </div>
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              marginTop: "18px",
              backgroundColor: AZUL,
              color: PAPEL,
              borderRadius: "16px",
              padding: "22px 36px",
              fontSize: "48px",
              fontWeight: 900,
            }}
          >
            {host}
          </div>
        </div>

        {/* No stories, espaçador de baixo — centraliza o bloco e o mantém
            longe da barra de resposta do Instagram. */}
        {stories && <div style={{ display: "flex", flex: 1 }} />}
        </div>
      </div>
    ),
    {
      width: 1080,
      height: ALTURA,
      ...(fonts.length ? { fonts } : {}),
      headers: {
        "Cache-Control":
          "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    }
  );
}
