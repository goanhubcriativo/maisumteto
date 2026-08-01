import type { MetadataRoute } from "next";

// O manifesto que torna o Casa Amiga instalável como app (celular e computador).
//
// Abre direto no painel da equipe: quem instala é a equipe, e o atalho na tela
// inicial serve pra ela ir reto no controle de pedidos e no extrato, sem digitar
// endereço. O escopo é a raiz, então navegar pro site público continua dentro
// do app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Casa Amiga",
    short_name: "Casa Amiga",
    description:
      "Painel da equipe: pedidos, entregas e extrato da campanha, na palma da mão.",
    start_url: "/painel",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0092dd",
    lang: "pt-BR",
    icons: [
      { src: "/icone-app.svg", type: "image/svg+xml", sizes: "any", purpose: "any" },
      { src: "/icone-app.svg", type: "image/svg+xml", sizes: "any", purpose: "maskable" },
    ],
  };
}
