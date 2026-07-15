import { ImageResponse } from "next/og";

export const runtime = "nodejs";

// Cartão pronto (1080x1350) pra pessoa compartilhar no WhatsApp/Instagram.
export async function GET(req: Request) {
  const BEGE = "#b2ab97";
  const GRAFITE = "#273740";
  const AZUL = "#0291da";
  const PAPEL = "#f6f4ee";

  const params = new URL(req.url).searchParams;
  const stories = params.get("f") === "stories";
  // Modo "convite": imagem de DIVULGAÇÃO (chama pra participar), no lugar do
  // depoimento "eu contribuí".
  const convite = params.get("tipo") === "convite";
  const ALTURA = stories ? 1920 : 1350;

  const intro = convite
    ? "Participe do Bolão da Final da Copa do Mundo e"
    : "Eu fiz uma fézinha para a Final da Copa e";
  const palavraGrande = convite ? "NOS AJUDE" : "CONTRIBUÍ";
  const fecho = convite
    ? "a arrecadar para construir uma casa a mais com a Teto para ajudar quem precisa!"
    : "para ajudar a construir mais uma casa da TETO em 2026!";
  const convide = convite ? "Participe você também:" : "Contribua você também:";

  // No cartão de convite o texto é ~10% menor.
  const esc = convite ? 0.9 : 1;
  const px = (n: number) => `${Math.round(n * esc)}px`;
  const fsIntro = px(stories ? 52 : 40);
  const fsGrande = px(convite ? 128 : 148); // "NOS AJUDE" é maior, começa menor
  const fsFecho = px(stories ? 64 : 50);
  const fsConvide = px(stories ? 54 : 42);

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
            backgroundColor: "rgba(178, 171, 151, 0.1)",
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

        {/* Logo da campanha (maior no stories, pra preencher a tela) */}
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo}
            width={stories ? 640 : 495}
            height={stories ? 375 : 290}
            alt=""
            style={{ flexShrink: 0 }}
          />
        ) : (
          <div style={{ display: "flex", height: "140px", flexShrink: 0 }} />
        )}

        {/* Espaço entre logo e texto */}
        <div style={{ display: "flex", height: stories ? "104px" : "56px", flexShrink: 0 }} />

        {/* Chamada */}
        <div style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ display: "flex", fontSize: fsIntro, fontWeight: 600, lineHeight: 1.2 }}>
            {intro}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: fsGrande,
              fontWeight: 900,
              lineHeight: 1,
              color: AZUL,
              letterSpacing: "-5px",
              margin: stories ? "28px 0 30px" : "10px 0 12px",
            }}
          >
            {palavraGrande}
          </div>
          <div style={{ display: "flex", fontSize: fsFecho, fontWeight: 800, lineHeight: 1.18 }}>
            {fecho}
          </div>
        </div>

        {/* No stories: gap generoso (bloco respira). No feed: empurra o convite pro rodapé. */}
        {stories ? (
          <div style={{ display: "flex", height: "200px", flexShrink: 0 }} />
        ) : (
          <div style={{ display: "flex", flex: 1 }} />
        )}

        {/* Convite + link */}
        <div style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ display: "flex", fontSize: fsConvide, fontWeight: 800 }}>
            {convide}
          </div>
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              marginTop: stories ? "24px" : "18px",
              backgroundColor: AZUL,
              color: PAPEL,
              borderRadius: "16px",
              padding: stories ? "28px 44px" : "22px 36px",
              fontSize: stories ? "60px" : "48px",
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
