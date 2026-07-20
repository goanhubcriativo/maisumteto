"use client";

import { useState } from "react";
import { LINK_CAMPANHA } from "@/lib/bolao/config";
import { IconWhats } from "@/components/bolao/icones";

// Botão de DIVULGAÇÃO da campanha — aparece pra todo mundo (mesmo quem não
// aposta). Compartilha a imagem de convite (/api/card?tipo=convite) + texto
// pelo menu nativo (WhatsApp/Instagram), com fallback pro wa.me.
export default function CompartilharCampanha() {
  const [enviando, setEnviando] = useState(false);

  async function compartilhar() {
    if (enviando) return;
    setEnviando(true);
    const texto = `Tô ajudando a TETO a erguer mais uma casa emergencial com um bolão da Final da Copa. Faça sua fézinha também e ajude: ${LINK_CAMPANHA}`;
    const url = `/api/card?tipo=convite&v=${Date.now()}`;
    try {
      const blob = await (await fetch(url, { cache: "no-store" })).blob();
      const file = new File([blob], "bolao-teto.png", { type: "image/png" });
      const nav = navigator as Navigator & {
        canShare?: (d: { files: File[] }) => boolean;
      };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], text: texto });
        return;
      }
    } catch {
      /* cai no fallback */
    } finally {
      setEnviando(false);
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
  }

  return (
    <button
      type="button"
      className="compartilhar-campanha"
      onClick={compartilhar}
      disabled={enviando}
    >
      <IconWhats size={20} />
      Compartilhe a campanha com os amigos
    </button>
  );
}
