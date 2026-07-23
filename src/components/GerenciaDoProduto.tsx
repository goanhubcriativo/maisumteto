"use client";

// A tela de gerência de um produto já criado.
//
// Antes, depois de cadastrar o produto numa tela feita pra ele, a pessoa caía
// num formulário genérico que não falava a mesma língua: "A peça", "Tabela de
// tamanhos", campos que o cadastro novo nem usa mais. Aqui a gerência repete a
// estrutura do cadastro (Sobre a ação / O produto), então quem acabou de criar
// reconhece tudo e sabe onde mexer.
//
// Os textos que aparecem pra quem compra usam o editor com negrito, itálico e
// cor (ver EditorDeTexto): é aqui que a pessoa refina o que escreveu correndo
// na hora de cadastrar.

import { useState } from "react";
import CampoDeImagem from "@/components/CampoDeImagem";
import EditorDeTexto from "@/components/EditorDeTexto";
import { Segmento, Interruptor } from "@/components/ControlesDeForm";
import { ENTREGAS } from "@/lib/produto";
import type { TextoRico } from "@/lib/textoRico";
import { PALETA } from "@/lib/paleta";
import { QUADRO_DA_ACAO } from "@/lib/quadros";

type ModoProducao = "ENCOMENDA" | "PRONTO";

export interface DadosDoProduto {
  titulo: string;
  historia: TextoRico | null;
  descricao: TextoRico | null;
  capaUrl: string | null;
  capaFoco: string | null;
  precoReais: string;
  metaReais: string;
  abreEm: string;
  fechaEm: string;
  cor: string;
  palavraChave: string;
  modoProducao: ModoProducao;
  prazo: string;
  entregas: { tipo: string; texto: string }[];
  corForte: string;
}

export default function GerenciaDoProduto({
  dados,
  action,
  coresOcupadas,
}: {
  dados: DadosDoProduto;
  action: (dados: FormData) => void;
  coresOcupadas: string[];
}) {
  const [cor, setCor] = useState(dados.cor);
  const [palavraChave, setPalavraChave] = useState(dados.palavraChave);
  const [modo, setModo] = useState<ModoProducao>(dados.modoProducao);

  const [entregas, setEntregas] = useState<Record<string, { ativo: boolean; texto: string }>>(() =>
    Object.fromEntries(
      ENTREGAS.map((e) => {
        const salva = dados.entregas.find((x) => x.tipo === e.tipo);
        return [e.tipo, { ativo: Boolean(salva), texto: salva?.texto ?? "" }];
      })
    )
  );

  const entregasPayload = ENTREGAS.filter((e) => entregas[e.tipo].ativo).map((e) => ({
    tipo: e.tipo,
    rotulo: e.rotulo,
    texto: entregas[e.tipo].texto.trim(),
  }));

  // A cor escolhida agora, pra "Cor da ação" no editor de texto mostrar o tom
  // certo enquanto a pessoa escreve, sem precisar salvar antes.
  const corForte = PALETA.find((c) => c.id === cor)?.forte ?? dados.corForte;

  return (
    <form id="form-acao" action={action} className="formulario">
      <input type="hidden" name="cor" value={cor} />
      <input type="hidden" name="palavraChave" value={palavraChave} />
      <input type="hidden" name="modoProducao" value={modo} />
      <input type="hidden" name="entregas" value={JSON.stringify(entregasPayload)} />

      {/* ---------------- SOBRE A AÇÃO ---------------- */}
      <h2 className="formulario-secao">Sobre a ação</h2>
      <p className="campo-ajuda" style={{ margin: "-8px 0 16px" }}>
        A motivação da ação, que é o que aparece no alto da página e convence
        quem chega.
      </p>

      <div className="campo">
        <span className="campo-rotulo">Explique a ação</span>
        <EditorDeTexto
          nome="historia"
          valorInicial={dados.historia}
          corDaAcao={corForte}
          placeholder="Por que essa ação existe e pra onde vai o dinheiro."
          rows={5}
        />
      </div>

      <div className="campo-dupla">
        <label className="campo">
          <span className="campo-rotulo">Início das vendas</span>
          <input className="campo-entrada" name="abreEm" type="date" defaultValue={dados.abreEm} />
          <span className="campo-ajuda">Vazio: já começa assim que publicar.</span>
        </label>
        <label className="campo">
          <span className="campo-rotulo">Fim das vendas</span>
          <input
            className="campo-entrada"
            name="fechaEm"
            type="date"
            defaultValue={dados.fechaEm}
          />
          <span className="campo-ajuda">Vazio: fica no ar até a campanha acabar.</span>
        </label>
      </div>

      <div className="campo-dupla">
        <label className="campo">
          <span className="campo-rotulo">Meta da ação</span>
          <input
            className="campo-entrada"
            name="meta"
            inputMode="decimal"
            defaultValue={dados.metaReais}
            placeholder="usa o que falta no contrato"
          />
          <span className="campo-ajuda">
            Só o lucro entra na meta. Produto de R$ 50 com custo de R$ 25 sobe R$ 25 por venda.
          </span>
        </label>

        <label className="campo">
          <span className="campo-rotulo">Palavra-chave</span>
          <input
            className="campo-entrada"
            maxLength={30}
            value={palavraChave}
            onChange={(e) => setPalavraChave(e.target.value)}
            placeholder="PRODUTO"
          />
          <span className="campo-ajuda">
            Corre na faixa do cartão. Até 30 caracteres. Em branco, fica PRODUTO.
          </span>
        </label>
      </div>

      <fieldset className="campo escolha-cor">
        <legend className="campo-rotulo">Cor da ação</legend>
        <span className="campo-ajuda" style={{ marginTop: 0, marginBottom: 10 }}>
          Pinta o cartão desta ação e a fatia dela no gráfico da campanha.
        </span>
        <div className="cores">
          {PALETA.map((c) => (
            <label key={c.id} className="cor" title={c.nome}>
              <input
                type="radio"
                name="corVisual"
                checked={cor === c.id}
                onChange={() => setCor(c.id)}
              />
              <span className="cor-bolha" style={{ background: c.marca ?? c.forte }} />
              <span className="cor-nome">{c.nome}</span>
            </label>
          ))}
        </div>
        {coresOcupadas.includes(cor) && (
          <p className="cor-aviso">
            Outra ação já usa esta cor. No gráfico da campanha as duas ficam com a mesma fatia, e aí
            a cor deixa de dizer de onde veio o dinheiro.
          </p>
        )}
      </fieldset>

      {/* ---------------- O PRODUTO ---------------- */}
      <h2 className="formulario-secao">O produto</h2>

      <CampoDeImagem
        name="capa"
        valorInicial={dados.capaUrl}
        quadros={QUADRO_DA_ACAO.map((q) => ({ ...q, valorInicial: dados.capaFoco }))}
        rotulo="Foto do produto"
        ajuda="Aparece grande na página, junto da descrição do produto."
      />

      <label className="campo">
        <span className="campo-rotulo">Nome do produto</span>
        <input className="campo-entrada" name="titulo" defaultValue={dados.titulo} />
      </label>

      <div className="campo">
        <span className="campo-rotulo">Descrição do produto</span>
        <EditorDeTexto
          nome="descricao"
          valorInicial={dados.descricao}
          corDaAcao={corForte}
          placeholder="Explique a peça para quem vai comprar: detalhes, material, diferenciais."
          rows={4}
        />
      </div>

      <div className="campo-dupla">
        <label className="campo">
          <span className="campo-rotulo">Preço de venda</span>
          <input
            className="campo-entrada"
            name="preco"
            inputMode="decimal"
            defaultValue={dados.precoReais}
            placeholder="valor livre"
          />
        </label>

        <div className="campo">
          <span className="campo-rotulo">Modo de produção</span>
          <Segmento
            valor={modo}
            aoTrocar={setModo}
            opcoes={[
              { valor: "ENCOMENDA", rotulo: "Sob encomenda" },
              { valor: "PRONTO", rotulo: "Já tenho pronto" },
            ]}
          />
        </div>
      </div>

      <label className="campo">
        <span className="campo-rotulo">Prazo de produção ou entrega</span>
        <input
          className="campo-entrada"
          name="prazo"
          defaultValue={dados.prazo}
          placeholder="Até 15 dias após o fechamento das vendas"
        />
      </label>

      <div className="campo">
        <span className="campo-rotulo">Como a peça chega em quem comprou</span>
        <span className="campo-ajuda" style={{ marginBottom: 12 }}>
          Ligue as formas que você oferece e explique cada uma.
        </span>

        <div className="produto-entregas">
          {ENTREGAS.map((e) => {
            const estado = entregas[e.tipo];
            return (
              <div key={e.tipo} className="produto-entrega">
                <div className="produto-entrega-cabeca">
                  <span className="produto-entrega-nome">{e.rotulo}</span>
                  <Interruptor
                    ligado={estado.ativo}
                    aoTrocar={(v) =>
                      setEntregas((atual) => ({
                        ...atual,
                        [e.tipo]: { ...atual[e.tipo], ativo: v },
                      }))
                    }
                  />
                </div>
                {estado.ativo && (
                  <textarea
                    className="campo-entrada"
                    rows={2}
                    value={estado.texto}
                    onChange={(ev) =>
                      setEntregas((atual) => ({
                        ...atual,
                        [e.tipo]: { ...atual[e.tipo], texto: ev.target.value },
                      }))
                    }
                    placeholder={e.ajuda}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <button className="botao botao-primario" type="submit">
        Salvar ação
      </button>
    </form>
  );
}
