"use client";

// Campo de foto: escolhe do celular, envia, e encaixa dentro do quadro.
//
// Colar endereço não funciona na prática. O Higor colou "ibb.co/TBj2MS4r", que
// é a PÁGINA do ImgBB e não a imagem, e a capa ficou vazia sem nenhum aviso.
// Ninguém deveria precisar saber o que é "link direto de imagem".
//
// A redução acontece aqui, no navegador, antes de subir. Foto de celular vem
// com 4000px e 5 MB; mandar isso pro banco seria lento pra quem envia, caro pra
// guardar e pesado pra quem abre a página no 4G. Reduzida, a mesma foto fica na
// casa das centenas de KB sem perda visível numa capa.
//
// O enquadramento é por ARRASTE, e não por clique num ponto focal. Clicar
// "onde estão as pessoas" pede que a pessoa entenda o que o navegador vai fazer
// com aquela coordenada depois; arrastar a foto dentro do quadro mostra o
// resultado enquanto a mão se move, e é a mesma coisa que todo aplicativo de
// foto faz. Cada quadro é arrastado por conta própria: o encaixe que salva a
// foto no deitado do computador costuma cortar cabeça no quase-quadrado do
// celular.

import { useEffect, useRef, useState } from "react";
import type { Quadro } from "@/lib/quadros";

// As constantes QUADROS_DA_CAPA e QUADRO_DA_ACAO moram em src/lib/quadros.ts,
// e nao aqui: valor comum exportado de um modulo "use client" nao chega inteiro
// no server component que importa. So o TIPO vem de la, que e apagado na
// compilacao e nao cruza fronteira nenhuma.

interface Props {
  /** Nome do campo enviado no formulário. O valor é a URL da imagem. */
  name: string;
  valorInicial?: string | null;
  quadros: Quadro[];
  rotulo: string;
  ajuda?: string;
}

const LADO_MAXIMO = 1600;
const QUALIDADE = 0.82;
const CENTRO = "50% 50%";

/** Reduz a imagem no navegador e devolve um JPEG pronto para enviar. */
async function reduzir(arquivo: File): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo);

  const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
  const largura = Math.round(bitmap.width * escala);
  const altura = Math.round(bitmap.height * escala);

  const tela = document.createElement("canvas");
  tela.width = largura;
  tela.height = altura;

  const ctx = tela.getContext("2d");
  if (!ctx) throw new Error("Não consegui processar a imagem.");
  ctx.drawImage(bitmap, 0, 0, largura, altura);
  bitmap.close();

  return new Promise((ok, falha) => {
    tela.toBlob(
      (b) => (b ? ok(b) : falha(new Error("Não consegui processar a imagem."))),
      "image/jpeg",
      QUALIDADE
    );
  });
}

/** "40% 70%" -> [40, 70]. Qualquer coisa estranha volta ao centro. */
function lerFoco(texto: string | null | undefined): [number, number] {
  const partes = String(texto ?? "").match(/(-?[\d.]+)%\s+(-?[\d.]+)%/);
  if (!partes) return [50, 50];
  return [Number(partes[1]), Number(partes[2])];
}

function limitar(n: number): number {
  return Math.max(0, Math.min(100, n));
}

/**
 * Um quadro com a foto encaixada dentro, arrastável.
 *
 * A conta do arraste precisa do tamanho real da imagem. Com `cover`, a foto é
 * ampliada até cobrir o quadro, e o que sobra para fora é justamente o que dá
 * para deslizar. Sem esse número, arrastar 10px moveria a foto uma distância
 * inventada, diferente em cada foto.
 */
function QuadroDeFoto({
  url,
  quadro,
  natural,
  valor,
  aoMover,
}: {
  url: string;
  quadro: Quadro;
  natural: { largura: number; altura: number } | null;
  valor: string;
  aoMover: (novo: string) => void;
}) {
  const janela = useRef<HTMLDivElement>(null);
  const arrasto = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const [pegando, setPegando] = useState(false);

  function sobra() {
    const caixa = janela.current?.getBoundingClientRect();
    if (!caixa || !natural || natural.largura === 0 || natural.altura === 0) return null;

    const escala = Math.max(caixa.width / natural.largura, caixa.height / natural.altura);
    return {
      x: natural.largura * escala - caixa.width,
      y: natural.altura * escala - caixa.height,
    };
  }

  function comecar(e: React.PointerEvent<HTMLDivElement>) {
    const [px, py] = lerFoco(valor);
    arrasto.current = { x: e.clientX, y: e.clientY, px, py };
    setPegando(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function mover(e: React.PointerEvent<HTMLDivElement>) {
    const inicio = arrasto.current;
    const folga = sobra();
    if (!inicio || !folga) return;

    // Arrastar a foto para a esquerda revela o que está à direita, ou seja, a
    // porcentagem sobe. Daí o sinal invertido.
    const dx = folga.x > 0 ? ((inicio.x - e.clientX) / folga.x) * 100 : 0;
    const dy = folga.y > 0 ? ((inicio.y - e.clientY) / folga.y) * 100 : 0;

    aoMover(`${limitar(inicio.px + dx)}% ${limitar(inicio.py + dy)}%`);
  }

  function soltar(e: React.PointerEvent<HTMLDivElement>) {
    arrasto.current = null;
    setPegando(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  /** Teclado: as setas andam de 2% por vez, para quem não usa mouse. */
  function pelaSeta(e: React.KeyboardEvent<HTMLDivElement>) {
    const passos: Record<string, [number, number]> = {
      ArrowLeft: [-2, 0],
      ArrowRight: [2, 0],
      ArrowUp: [0, -2],
      ArrowDown: [0, 2],
    };
    const passo = passos[e.key];
    if (!passo) return;
    e.preventDefault();
    const [px, py] = lerFoco(valor);
    aoMover(`${limitar(px + passo[0])}% ${limitar(py + passo[1])}%`);
  }

  return (
    <div className="quadro">
      <span className="quadro-nome">{quadro.nome}</span>
      <div
        ref={janela}
        className={`quadro-janela${pegando ? " pegando" : ""}`}
        style={{
          aspectRatio: quadro.proporcao,
          backgroundImage: `url(${JSON.stringify(url)})`,
          backgroundPosition: valor,
        }}
        onPointerDown={comecar}
        onPointerMove={mover}
        onPointerUp={soltar}
        onPointerCancel={soltar}
        onKeyDown={pelaSeta}
        role="application"
        tabIndex={0}
        aria-label={`Enquadramento para ${quadro.nome}. Arraste a foto, ou use as setas do teclado.`}
      />
    </div>
  );
}

export default function CampoDeImagem({ name, valorInicial, quadros, rotulo, ajuda }: Props) {
  const [url, setUrl] = useState(valorInicial ?? "");
  const [focos, setFocos] = useState<Record<string, string>>(() =>
    Object.fromEntries(quadros.map((q) => [q.chave, q.valorInicial?.trim() || CENTRO]))
  );
  const [natural, setNatural] = useState<{ largura: number; altura: number } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const entrada = useRef<HTMLInputElement>(null);

  // O tamanho real da foto é o que dá escala ao arraste (ver QuadroDeFoto).
  useEffect(() => {
    if (!url) {
      setNatural(null);
      return;
    }
    const img = new Image();
    img.onload = () => setNatural({ largura: img.naturalWidth, altura: img.naturalHeight });
    img.src = url;
    return () => {
      img.onload = null;
    };
  }, [url]);

  async function escolher(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;

    setErro(null);
    setEnviando(true);

    try {
      const reduzida = await reduzir(arquivo);

      const corpo = new FormData();
      corpo.append("arquivo", new File([reduzida], "capa.jpg", { type: "image/jpeg" }));

      const r = await fetch("/api/imagem", { method: "POST", body: corpo });
      const resposta = await r.json();

      if (!r.ok) {
        setErro(resposta.erro ?? "Não consegui enviar a foto.");
      } else {
        setUrl(resposta.url);
        // Foto nova começa centralizada: manter o encaixe da anterior deixaria
        // a imagem torta logo de cara, sem ninguém ter mexido.
        setFocos(Object.fromEntries(quadros.map((q) => [q.chave, CENTRO])));
      }
    } catch {
      setErro("Não consegui ler esse arquivo. Tente outra foto.");
    } finally {
      setEnviando(false);
      // Limpa para que escolher a MESMA foto de novo dispare o evento outra vez.
      if (entrada.current) entrada.current.value = "";
    }
  }

  return (
    <div className="campo">
      <span className="campo-rotulo">{rotulo}</span>

      {/* O valor que o formulário envia continua sendo texto: assim o resto do
          sistema não muda, e um endereço colado à mão ainda funciona. */}
      <input type="hidden" name={name} value={url} />
      {quadros.map((q) => (
        <input
          key={q.chave}
          type="hidden"
          name={`${name}Foco${q.chave}`}
          value={focos[q.chave] ?? CENTRO}
        />
      ))}

      <div className="imagem-area">
        {url ? (
          <>
            <div className="quadros">
              {quadros.map((q) => (
                <QuadroDeFoto
                  key={q.chave}
                  url={url}
                  quadro={q}
                  natural={natural}
                  valor={focos[q.chave] ?? CENTRO}
                  aoMover={(novo) => setFocos((f) => ({ ...f, [q.chave]: novo }))}
                />
              ))}
            </div>
            <p className="quadro-dica">
              {quadros.length > 1
                ? "Arraste a foto dentro de cada quadro até enquadrar do jeito que você quer. Os dois são independentes, e é exatamente assim que vai aparecer no ar."
                : "Arraste a foto dentro do quadro até enquadrar do jeito que você quer. É exatamente assim que vai aparecer no ar."}
            </p>
          </>
        ) : (
          <div className="imagem-vazia">Nenhuma foto ainda</div>
        )}

        <div className="imagem-acoes">
          <button
            type="button"
            className="botao botao-primario botao-pequeno"
            onClick={() => entrada.current?.click()}
            disabled={enviando}
          >
            {enviando ? "Enviando..." : url ? "Trocar foto" : "Escolher foto"}
          </button>

          {url && !enviando && (
            <button
              type="button"
              className="botao botao-contorno botao-pequeno"
              onClick={() => setUrl("")}
            >
              Remover
            </button>
          )}
        </div>

        <input
          ref={entrada}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="apenas-leitor"
          onChange={escolher}
        />
      </div>

      {erro && <span className="campo-erro">{erro}</span>}
      {ajuda && <span className="campo-ajuda">{ajuda}</span>}
    </div>
  );
}
