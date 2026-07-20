// Desenha os blocos montados pela equipe.
//
// Cada bloco recebe so o conteudo; a aparencia vem daqui e do tema. Bloco de
// tipo desconhecido ou sem conteudo simplesmente nao aparece: pagina publica
// com caixa vazia parece defeito, e defeito derruba confianca de quem ia doar.

import { idDoYoutube, type Bloco } from "@/lib/blocos";
import { formatarBRLCurto } from "@/lib/dinheiro";

interface Contexto {
  arrecadadoCentavos?: number;
  metaCentavos?: number;
  apoiadores?: number;
  prazo?: Date | null;
}

function vazio(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

function Paragrafos({ texto }: { texto: string }) {
  return (
    <>
      {texto
        .split(/\n\s*\n/)
        .filter((p) => p.trim())
        .map((p, i) => (
          <p key={i}>{p.trim()}</p>
        ))}
    </>
  );
}

function diasAte(data: string | Date): number {
  const d = typeof data === "string" ? new Date(data) : data;
  if (Number.isNaN(d.getTime())) return 0;
  return Math.max(0, Math.ceil((d.getTime() - Date.now()) / 864e5));
}

function UmBloco({ bloco, ctx }: { bloco: Bloco; ctx: Contexto }) {
  const c = bloco.conteudo as Record<string, any>;

  switch (bloco.tipo) {
    case "TEXTO":
      if (vazio(c.texto)) return null;
      return (
        <div className="bl bl-texto">
          <Paragrafos texto={String(c.texto)} />
        </div>
      );

    case "TITULO":
      if (vazio(c.titulo)) return null;
      return (
        <div className="bl bl-titulo">
          <h2>{c.titulo}</h2>
          {!vazio(c.subtitulo) && <p>{c.subtitulo}</p>}
        </div>
      );

    case "CITACAO":
      if (vazio(c.texto)) return null;
      return (
        <figure className="bl bl-citacao">
          <blockquote>{c.texto}</blockquote>
          {!vazio(c.autor) && <figcaption>{c.autor}</figcaption>}
        </figure>
      );

    case "PASSOS": {
      const passos: string[] = Array.isArray(c.passos) ? c.passos.filter(Boolean) : [];
      if (passos.length === 0) return null;
      return (
        <ol className="bl bl-passos">
          {passos.map((p, i) => (
            <li key={i}>
              <span className="bl-passo-n">{i + 1}</span>
              <span>{p}</span>
            </li>
          ))}
        </ol>
      );
    }

    case "PERGUNTAS": {
      const itens: { pergunta: string; resposta: string }[] = Array.isArray(c.itens) ? c.itens : [];
      const validos = itens.filter((i) => !vazio(i?.pergunta));
      if (validos.length === 0) return null;
      return (
        <div className="bl bl-perguntas">
          {validos.map((i, k) => (
            // details nativo: abre e fecha sem JavaScript nenhum.
            <details key={k}>
              <summary>{i.pergunta}</summary>
              <p>{i.resposta}</p>
            </details>
          ))}
        </div>
      );
    }

    case "TABELA": {
      const itens: { nome: string; valor: string }[] = Array.isArray(c.itens) ? c.itens : [];
      const validos = itens.filter((i) => !vazio(i?.nome));
      if (validos.length === 0) return null;
      return (
        <div className="bl bl-tabela">
          {!vazio(c.titulo) && <h3>{c.titulo}</h3>}
          <dl>
            {validos.map((i, k) => (
              <div key={k}>
                <dt>{i.nome}</dt>
                <dd>{i.valor}</dd>
              </div>
            ))}
          </dl>
        </div>
      );
    }

    case "IMAGEM":
      if (vazio(c.url)) return null;
      return (
        <figure className="bl bl-imagem">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={String(c.url)} alt={String(c.legenda ?? "")} />
          {!vazio(c.legenda) && <figcaption>{c.legenda}</figcaption>}
        </figure>
      );

    case "GALERIA": {
      const imagens: string[] = Array.isArray(c.imagens) ? c.imagens.filter(Boolean) : [];
      if (imagens.length === 0) return null;
      return (
        <figure className="bl bl-galeria">
          <div className="bl-galeria-grade">
            {imagens.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt="" />
            ))}
          </div>
          {!vazio(c.legenda) && <figcaption>{c.legenda}</figcaption>}
        </figure>
      );
    }

    case "VIDEO": {
      const id = vazio(c.url) ? null : idDoYoutube(String(c.url));
      if (!id) return null;
      return (
        <figure className="bl bl-video">
          <div className="bl-video-moldura">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${id}`}
              title={String(c.legenda ?? "Vídeo da campanha")}
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          </div>
          {!vazio(c.legenda) && <figcaption>{c.legenda}</figcaption>}
        </figure>
      );
    }

    case "BANNER":
      if (vazio(c.frase) && vazio(c.url)) return null;
      return (
        <div
          className="bl bl-banner"
          style={c.url ? { backgroundImage: `url(${c.url})` } : undefined}
        >
          <div className="bl-banner-conteudo">
            {!vazio(c.frase) && <strong>{c.frase}</strong>}
            {!vazio(c.apoio) && <span>{c.apoio}</span>}
          </div>
        </div>
      );

    case "AGENDA":
      if (vazio(c.quando) && vazio(c.onde)) return null;
      return (
        <div className="bl bl-agenda">
          {!vazio(c.quando) && (
            <div>
              <span className="bl-rotulo">Quando</span>
              <strong>{c.quando}</strong>
            </div>
          )}
          {!vazio(c.onde) && (
            <div>
              <span className="bl-rotulo">Onde</span>
              <strong>{c.onde}</strong>
            </div>
          )}
          {!vazio(c.observacao) && <p className="bl-obs">{c.observacao}</p>}
        </div>
      );

    case "MAPA":
      if (vazio(c.endereco)) return null;
      return (
        <div className="bl bl-mapa">
          <span className="bl-rotulo">Endereço</span>
          <strong>{c.endereco}</strong>
          {!vazio(c.referencia) && <p className="bl-obs">{c.referencia}</p>}
          <a
            className="botao botao-contorno"
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(String(c.endereco))}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir no mapa
          </a>
        </div>
      );

    case "BOTAO":
      if (vazio(c.texto) || vazio(c.destino)) return null;
      return (
        <div className="bl bl-botao">
          <a className="botao botao-primario" href={String(c.destino)}>
            {c.texto}
          </a>
        </div>
      );

    case "SEPARADOR":
      return <hr className="bl bl-separador" />;

    case "NUMEROS": {
      if (ctx.arrecadadoCentavos == null) return null;
      return (
        <div className="bl bl-numeros">
          {!vazio(c.titulo) && <h3>{c.titulo}</h3>}
          <div className="bl-numeros-grade">
            <div>
              <span className="numero">{formatarBRLCurto(ctx.arrecadadoCentavos)}</span>
              <span className="bl-rotulo">arrecadados</span>
            </div>
            {ctx.apoiadores != null && (
              <div>
                <span className="numero">{ctx.apoiadores}</span>
                <span className="bl-rotulo">apoiadores</span>
              </div>
            )}
            {ctx.prazo && (
              <div>
                <span className="numero">{diasAte(ctx.prazo)}</span>
                <span className="bl-rotulo">dias restantes</span>
              </div>
            )}
          </div>
        </div>
      );
    }

    case "CONTAGEM": {
      if (vazio(c.ate)) return null;
      const dias = diasAte(String(c.ate));
      return (
        <div className="bl bl-contagem">
          <span className="bl-rotulo">{vazio(c.titulo) ? "Faltam" : c.titulo}</span>
          <span className="numero">{dias}</span>
          <span className="bl-rotulo">{dias === 1 ? "dia" : "dias"}</span>
        </div>
      );
    }

    // Estes dois sao desenhados pela pagina, que ja tem os dados na mao.
    // O bloco serve so pra dizer ONDE eles entram na ordem.
    case "APOIADORES":
    case "ACOES":
      return null;

    default:
      return null;
  }
}

export default function Blocos({ blocos, ctx = {} }: { blocos: Bloco[]; ctx?: Contexto }) {
  const visiveis = blocos.filter((b) => b.visivel).sort((a, b) => a.ordem - b.ordem);
  if (visiveis.length === 0) return null;

  return (
    <div className="blocos">
      {visiveis.map((b) => (
        <UmBloco key={b.id} bloco={b} ctx={ctx} />
      ))}
    </div>
  );
}
