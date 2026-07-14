import { ImageResponse } from "next/og";

export const runtime = "nodejs";

// Cartão pronto (1080x1350) pra pessoa compartilhar no WhatsApp/Instagram.
export async function GET(req: Request) {
  const BEGE = "#b2ab97";
  const GRAFITE = "#273740";
  const AZUL = "#0291da";
  const PAPEL = "#f6f4ee";

  const reqHost = req.headers.get("host") || "";
  // Domínio MOSTRADO no cartão (canônico, por env).
  const host =
    process.env.NEXT_PUBLIC_SITE_HOST || reqHost || "maisumteto.com.br";

  // Para BUSCAR o ícone, usa o host que está de fato servindo a requisição
  // (o domínio novo pode ainda estar propagando).
  const fetchHost = reqHost || host;

  // Logo (ícone Teto) buscado da própria /public e embutido como data URI.
  let logo = "";
  try {
    const proto = fetchHost.startsWith("localhost") ? "http" : "https";
    const svg = await (
      await fetch(`${proto}://${fetchHost}/icone.svg`, { cache: "no-store" })
    ).text();
    if (svg.includes("<svg")) {
      logo = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
    }
  } catch {
    // sem logo se falhar; o cartão ainda renderiza
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "1080px",
          height: "1350px",
          display: "flex",
          flexDirection: "column",
          backgroundColor: BEGE,
          color: GRAFITE,
          padding: "78px 76px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Logo */}
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} width={150} height={150} alt="" />
        ) : (
          <div style={{ display: "flex", height: "150px" }} />
        )}

        {/* Chamada */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: "56px" }}>
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

        <div style={{ display: "flex", flex: 1 }} />

        {/* Convite + link */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: "42px", fontWeight: 700 }}>
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
      </div>
    ),
    { width: 1080, height: 1350 }
  );
}
