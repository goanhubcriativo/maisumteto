import { ImageResponse } from "next/og";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

interface ItemRecibo {
  placar: string;
  valor: number;
}

function brl(c: number) {
  return (c / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Dados: casinha real; ou exemplo se id="exemplo" / não encontrada.
  let nome = "Você";
  let itens: ItemRecibo[] = [];
  let doacao = 0;
  let total = 0;
  let protocolo = "A1B2C3D4";
  let quando = "";

  if (id !== "exemplo") {
    try {
      const c = await prisma.casinha.findUnique({
        where: { id },
        include: { palpites: { orderBy: { createdAt: "asc" } } },
      });
      if (c) {
        nome = c.nome;
        doacao = c.doacaoCentavos;
        total = c.valorTotalCentavos;
        protocolo = c.id.slice(-8).toUpperCase();
        const unit =
          c.palpites.length > 0
            ? Math.round((c.valorTotalCentavos - c.doacaoCentavos) / c.palpites.length)
            : 0;
        itens = c.palpites.map((p) => ({
          placar: `${p.placarCasa} x ${p.placarVisitante}`,
          valor: unit,
        }));
        if (c.paidAt) {
          quando = new Date(c.paidAt).toLocaleString("pt-BR");
        }
      }
    } catch {
      // cai no exemplo abaixo
    }
  }

  if (itens.length === 0) {
    nome = "Você";
    itens = [
      { placar: "2 x 1", valor: 1000 },
      { placar: "1 x 0", valor: 1000 },
      { placar: "3 x 2", valor: 1000 },
    ];
    doacao = 1000;
    total = 4000;
    protocolo = "A1B2C3D4";
  }

  const TINTA = "#222";
  const CINZA = "#666";
  const H = 560 + itens.length * 58 + (doacao > 0 ? 50 : 0);
  const linhaPontilhada = {
    display: "flex",
    borderTop: "2px dashed #bbb",
    height: "1px",
    margin: "16px 0",
  } as const;

  return new ImageResponse(
    (
      <div
        style={{
          width: "760px",
          height: `${H}px`,
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#fff",
          color: TINTA,
          padding: "48px 54px",
          fontFamily: "monospace",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: "34px", fontWeight: 800, letterSpacing: "3px" }}>
            COMPROVANTE
          </div>
          <div style={{ display: "flex", fontSize: "22px", color: CINZA, marginTop: "6px" }}>
            BOLÃO DA CASA AMIGA · TETO
          </div>
        </div>

        <div style={linhaPontilhada} />

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "22px", color: CINZA }}>
          <span>APOSTADOR</span>
          <span style={{ color: TINTA }}>{nome.toUpperCase().slice(0, 22)}</span>
        </div>
        {quando ? (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "22px", color: CINZA, marginTop: "8px" }}>
            <span>DATA</span>
            <span style={{ color: TINTA }}>{quando}</span>
          </div>
        ) : (
          <div style={{ display: "flex" }} />
        )}

        <div style={linhaPontilhada} />

        <div style={{ display: "flex", flexDirection: "column" }}>
          {itens.map((it, i) => (
            <div
              key={i}
              style={{ display: "flex", justifyContent: "space-between", fontSize: "26px", padding: "7px 0" }}
            >
              <span>
                {String(i + 1).padStart(2, "0")}  APOSTA {it.placar}
              </span>
              <span>{brl(it.valor)}</span>
            </div>
          ))}
          {doacao > 0 ? (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "26px", padding: "7px 0", color: CINZA }}>
              <span>AJUDINHA EXTRA</span>
              <span>{brl(doacao)}</span>
            </div>
          ) : (
            <div style={{ display: "flex" }} />
          )}
        </div>

        <div style={linhaPontilhada} />

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "34px", fontWeight: 800 }}>
          <span>TOTAL PAGO</span>
          <span>{brl(total)}</span>
        </div>

        <div style={{ display: "flex", flex: 1 }} />

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "20px", color: CINZA }}>
          <span>PROTOCOLO {protocolo}</span>
          <span style={{ color: "#1a9e5f", fontWeight: 800 }}>PAGO VIA PIX</span>
        </div>
        <div style={{ display: "flex", justifyContent: "center", fontSize: "18px", color: CINZA, marginTop: "16px", letterSpacing: "2px" }}>
          * * * OBRIGADO POR AJUDAR A TETO PARANÁ * * *
        </div>
      </div>
    ),
    { width: 760, height: H }
  );
}
