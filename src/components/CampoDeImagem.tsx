"use client";

// Campo de foto: escolhe do celular e envia, sem colar link.
//
// Colar endereço não funciona na prática. O Higor colou "ibb.co/TBj2MS4r", que
// é a PÁGINA do ImgBB e não a imagem, e a capa ficou vazia sem nenhum aviso.
// Ninguém deveria precisar saber o que é "link direto de imagem".
//
// A redução acontece aqui, no navegador, antes de subir. Foto de celular vem
// com 4000px e 5 MB; mandar isso pro banco seria lento pra quem envia, caro pra
// guardar e pesado pra quem abre a página no 4G. Reduzida, a mesma foto fica na
// casa das centenas de KB sem perda visível numa capa.

import { useRef, useState } from "react";

interface Props {
  /** Nome do campo enviado no formulário. O valor é a URL da imagem. */
  name: string;
  valorInicial?: string | null;
  rotulo: string;
  ajuda?: string;
}

const LADO_MAXIMO = 1600;
const QUALIDADE = 0.82;

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

export default function CampoDeImagem({ name, valorInicial, rotulo, ajuda }: Props) {
  const [url, setUrl] = useState(valorInicial ?? "");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const entrada = useRef<HTMLInputElement>(null);

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

      <div className="imagem-area">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="imagem-previa" src={url} alt="Prévia da foto escolhida" />
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
