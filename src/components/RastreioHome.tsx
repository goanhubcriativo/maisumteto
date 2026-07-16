"use client";

import { useEffect } from "react";
import { registrar } from "@/lib/metricas";

// Registra a visita e até onde a pessoa rolou a home (50% e 100%).
// Ajuda a ver onde o pessoal para quando não aposta.
export default function RastreioHome() {
  useEffect(() => {
    registrar("visita");

    const onScroll = () => {
      const alcance =
        (window.scrollY + window.innerHeight) /
        document.documentElement.scrollHeight;
      if (alcance >= 0.5) registrar("rolou_50");
      if (alcance >= 0.98) registrar("rolou_100");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return null;
}
