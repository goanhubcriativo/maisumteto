import { ImageResponse } from "next/og";

export const runtime = "nodejs";

// Cartão pronto (1080x1350) pra pessoa compartilhar no WhatsApp/Instagram.
export async function GET() {
  const BEGE = "#b2ab97";
  const GRAFITE = "#273740";
  const AZUL = "#0291da";
  const PAPEL = "#f6f4ee";

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
          padding: "84px 76px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Selo topo */}
        <div
          style={{
            display: "flex",
            alignSelf: "flex-start",
            border: `3px solid ${GRAFITE}`,
            borderRadius: "999px",
            padding: "12px 28px",
            fontSize: "26px",
            fontWeight: 800,
            letterSpacing: "3px",
          }}
        >
          CAMPANHA CASA AMIGA · TETO
        </div>

        {/* Chamada principal */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: "90px" }}>
          <div style={{ display: "flex", fontSize: "44px", fontWeight: 700, letterSpacing: "2px" }}>
            EU
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "150px",
              fontWeight: 900,
              lineHeight: 1,
              color: AZUL,
              letterSpacing: "-4px",
            }}
          >
            CONTRIBUÍ
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "96px",
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: "-2px",
              marginTop: "8px",
            }}
          >
            PARA MAIS
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "96px",
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: "-2px",
            }}
          >
            UMA CASA
          </div>
        </div>

        {/* Casinha sobre pilotis (formas simples) */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "170px",
            marginTop: "72px",
          }}
        >
          <div
            style={{
              display: "flex",
              width: "150px",
              height: "44px",
              backgroundColor: AZUL,
              borderRadius: "8px 8px 0 0",
            }}
          />
          <div
            style={{
              display: "flex",
              width: "170px",
              height: "92px",
              backgroundColor: GRAFITE,
            }}
          />
          <div style={{ display: "flex", gap: "44px", marginTop: "6px" }}>
            <div style={{ display: "flex", width: "12px", height: "52px", backgroundColor: GRAFITE }} />
            <div style={{ display: "flex", width: "12px", height: "52px", backgroundColor: GRAFITE }} />
          </div>
        </div>

        <div style={{ display: "flex", flex: 1 }} />

        {/* Convite + link */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: "40px", fontWeight: 700 }}>
            Contribua você também:
          </div>
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              marginTop: "18px",
              backgroundColor: AZUL,
              color: PAPEL,
              borderRadius: "14px",
              padding: "20px 34px",
              fontSize: "44px",
              fontWeight: 900,
            }}
          >
            maisumteto.vercel.app
          </div>
          <div style={{ display: "flex", marginTop: "34px", fontSize: "28px", fontWeight: 700, letterSpacing: "1px" }}>
            100% PRA CAUSA · TETO PARANÁ
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 1350 }
  );
}
