// Métricas anônimas do funil (primeira parte, sem terceiros).
// Cada visitante ganha um id aleatório no localStorage; cada evento é enviado
// no máximo UMA vez por sessão (sessionStorage) pra não inflar os números.

function visitanteId(): string {
  try {
    let id = localStorage.getItem("mut_vid");
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("mut_vid", id);
    }
    return id;
  } catch {
    return "anon";
  }
}

export function registrar(tipo: string) {
  if (typeof window === "undefined") return;
  try {
    const chave = `mut_ev_${tipo}`;
    if (sessionStorage.getItem(chave)) return; // já enviado nesta sessão
    sessionStorage.setItem(chave, "1");
  } catch {
    // sem storage: envia mesmo assim
  }
  try {
    const corpo = JSON.stringify({ tipo, visitante: visitanteId() });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/evento", corpo);
    } else {
      fetch("/api/evento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: corpo,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // métrica nunca pode quebrar a página
  }
}
