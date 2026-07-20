// O bolão usa o mesmo cliente do Mercado Pago da plataforma.
//
// Era um arquivo próprio quando o bolão vivia sozinho. Agora é uma conta MP só
// para tudo, e duas cópias do mesmo cliente acabariam divergindo na primeira
// correção que alguém fizesse só de um lado.
export * from "../mercadopago";
