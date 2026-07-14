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

  // Logo da campanha (PNG rasterizado com a fonte Agilera) buscado da /public.
  let logo = "";
  try {
    const proto = fetchHost.startsWith("localhost") ? "http" : "https";
    const buf = await (
      await fetch(`${proto}://${fetchHost}/logo-card.png`, { cache: "no-store" })
    ).arrayBuffer();
    if (buf.byteLength > 1000) {
      logo = `data:image/png;base64,${Buffer.from(buf).toString("base64")}`;
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
        {/* Logo da campanha, no topo */}
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} width={495} height={290} alt="" />
        ) : (
          <div style={{ display: "flex", height: "140px" }} />
        )}

        {/* Espaço entre logo e texto */}
        <div style={{ display: "flex", height: "56px" }} />

        {/* Chamada */}
        <div style={{ display: "flex", flexDirection: "column" }}>
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
