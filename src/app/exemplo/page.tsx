"use client";

// Página de PRÉVIA da tela de sucesso — pra visualizar/testar o cartão e os
// botões de compartilhar sem precisar pagar. Não afeta o bolão real.
import Link from "next/link";
import LogoTeto from "@/components/LogoTeto";
import { IconCheck, IconSeta, IconWhats } from "@/components/icones";

export default function ExemploPage() {
  const origem =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://maisumteto.vercel.app";
  const waMsg = `Acabei de contribuir pra construir mais uma casa com a Teto. Faça sua fézinha também e ajude: ${origem}`;
  const waLink = `https://wa.me/?text=${encodeURIComponent(waMsg)}`;

  return (
    <main className="canvas">
      <header className="masthead">
        <LogoTeto className="masthead-logo" />
      </header>

      <div
        className="participe-meta"
        style={{ marginTop: 18, marginBottom: 8 }}
      >
        Prévia da tela de sucesso. É só um exemplo pra você ver como fica o
        compartilhamento.
      </div>

      <div className="folha">
        <section className="passo sucesso">
          <div className="selo">
            <IconCheck size={34} strokeWidth={2.4} />
          </div>
          <h2 className="passo-titulo" style={{ marginBottom: 6 }}>
            Casinha erguida!
          </h2>
          <p className="passo-sub" style={{ margin: "0 auto" }}>
            Valeu! Suas fézinhas viraram piloti na obra da Teto.
          </p>
        </section>

        <section className="passo compartilhe">
          <div className="passo-head">
            <span className="passo-num">↗</span>
            <h2 className="passo-titulo">Espalhe a corrente do bem</h2>
          </div>
          <p className="passo-sub" style={{ marginLeft: 37 }}>
            Compartilhe que ajudou e incentive mais amigos a ajudar.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="card-preview"
            src="/api/card"
            alt="Cartão: Eu contribuí para mais uma casa"
          />
          <div className="share-botoes">
            <a
              className="cta zap"
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              <IconWhats size={18} /> Compartilhar no WhatsApp
            </a>
            <a
              className="cta secacao"
              href="/api/card"
              download="eu-contribui-para-mais-uma-casa.png"
            >
              Baixar imagem
            </a>
          </div>
        </section>

        <section className="passo" style={{ textAlign: "center" }}>
          <Link href="/" className="cta">
            Ir para o bolão <IconSeta size={18} />
          </Link>
        </section>
      </div>
    </main>
  );
}
