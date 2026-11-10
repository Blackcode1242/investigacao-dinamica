import OBR from "@owlbear-rodeo/sdk";
import "./style.css";
import { KEY, POPOVER_ID, CHANNEL, PERICIAS, aplicarTema, novaPericia, pedidosValidos, resolver } from "./shared.js";
import { h, icon, debounce, cabecalho, pill } from "./ui.js";

const itemId = new URLSearchParams(location.search).get("id");
const app = document.getElementById("app");

let role = "PLAYER";
let meuNome = "Jogador";
let item = null; // o ponto exibido
let outros = []; // os demais pontos (para ligar pistas entre si)
let previa = false; // mestre vendo "como jogador"
let primeiraVez = true;
let renderPendente = false;
const abertos = new Set(); // perícias com "revelar pontos" aberto
const enviados = new Set(); // pedidos que acabei de enviar (resposta otimista)

const fechar = () => OBR.popover.close(POPOVER_ID);

/* Toda edição altera só o campo tocado, direto no dado mais recente do item.
   Assim nunca sobrescrevemos pedidos/resultados que chegaram enquanto o mestre digitava. */
function editar(fn) {
  return OBR.scene.items.updateItems([itemId], (its) => {
    const d = its[0]?.metadata[KEY];
    if (d) fn(d, its[0]);
  });
}

const campoFocado = () => {
  const a = document.activeElement;
  return !!a && app.contains(a) && /^(INPUT|TEXTAREA)$/.test(a.tagName);
};

/* Salva enquanto digita (com pausa) e ao sair do campo */
function ligarTexto(el, salvar) {
  const lento = debounce(() => salvar(el.value), 350);
  el.addEventListener("input", lento);
  el.addEventListener("change", () => salvar(el.value));
  return el;
}

/* ================= Visão do MESTRE ================= */

function corpoGM(d, pedidos) {
  const visivel = item.visible;

  const status = h("div", { class: `status ${visivel ? "on" : "off"}` },
    icon(visivel ? "eye" : "eyeOff", 18),
    h("div", { class: "status-txt" },
      h("strong", {}, visivel ? "Visível para os jogadores" : "Oculto dos jogadores"),
      h("span", {}, visivel ? "Eles podem selecionar e investigar." : "Só você enxerga este ponto.")
    ),
    h("button", {
      class: "btn btn-sm",
      onClick: () => OBR.scene.items.updateItems([itemId], (its) => { its[0].visible = !its[0].visible; }),
    }, visivel ? "Ocultar" : "Revelar")
  );

  const titulo = ligarTexto(
    h("input", { type: "text", value: d.titulo, placeholder: "Ex.: Estátua quebrada", maxlength: 80, "data-foco": "1" }),
    (v) => editar((x, it) => { x.titulo = v; it.name = v || "Ponto de interesse"; })
  );
  const descricao = ligarTexto(
    h("textarea", { rows: 3, placeholder: "O que os jogadores veem ou deduzem ao examinar o local…" }, ""),
    (v) => editar((x) => { x.descricao = v; })
  );
  descricao.value = d.descricao;
  const nota = ligarTexto(
    h("textarea", { rows: 3, placeholder: "Por que este ponto importa para a história…" }, ""),
    (v) => editar((x) => { x.notaMestre = v; })
  );
  nota.value = d.notaMestre;

  return [
    status,
    h("label", { class: "field" }, h("span", { class: "lbl" }, "Título"), titulo),
    h("label", { class: "field" }, h("span", { class: "lbl" }, "Descrição (visível aos jogadores)"), descricao),
    h("label", { class: "field" },
      h("span", { class: "lbl" }, icon("lock", 12), "Notas do mestre"), nota),
    h("div", { class: "sec" },
      h("h3", {}, "Perícias e pistas"),
      h("button", { class: "btn btn-sm", onClick: () => editar((x) => { x.pericias.push(novaPericia()); }) },
        icon("plus", 13), "Adicionar")
    ),
    d.pericias.length
      ? d.pericias.map((p) => cartaoPericia(p, pedidos.filter((r) => r.periciaId === p.id)))
      : h("p", { class: "muted" }, "Sem perícias: este ponto não tem nada para investigar."),
  ];
}

function cartaoPericia(p, reqs) {
  const estado = p.descoberta ? "descoberta" : p.bloqueada ? "bloqueada" : "aberta";
  const ligados = new Set(p.revela ?? []);

  const nome = ligarTexto(
    h("input", { type: "text", list: "sugestoes-pericias", value: p.nome, placeholder: "Perícia", maxlength: 40 }),
    (v) => editar((x) => { const q = x.pericias.find((y) => y.id === p.id); if (q) q.nome = v; })
  );
  const dt = ligarTexto(
    h("input", { type: "number", min: 1, max: 99, value: p.dt }),
    (v) => {
      const n = parseInt(v, 10);
      if (Number.isNaN(n)) return;
      editar((x) => { const q = x.pericias.find((y) => y.id === p.id); if (q) q.dt = n; });
    }
  );
  const pista = ligarTexto(
    h("textarea", { rows: 2, placeholder: "O que o grupo descobre ao passar no teste…" }, ""),
    (v) => editar((x) => { const q = x.pericias.find((y) => y.id === p.id); if (q) q.pista = v; })
  );
  pista.value = p.pista;

  const revela = h("details", { class: "revela", open: abertos.has(p.id) },
    h("summary", {},
      icon("pin", 13),
      ligados.size
        ? `Revela ${ligados.size} ponto${ligados.size > 1 ? "s" : ""} ao descobrir`
        : "Revelar outros pontos ao descobrir"
    ),
    outros.length
      ? h("div", { class: "chips" }, outros.map((o) => {
          const on = ligados.has(o.id);
          return h("label", { class: `chip ${on ? "on" : ""}` },
            h("input", {
              type: "checkbox",
              checked: on,
              onChange: (e) => {
                const marcado = e.target.checked;
                editar((x) => {
                  const q = x.pericias.find((y) => y.id === p.id);
                  if (!q) return;
                  const s = new Set(q.revela ?? []);
                  if (marcado) s.add(o.id); else s.delete(o.id);
                  q.revela = [...s];
                });
              },
            }),
            o.metadata[KEY].titulo || "Sem título"
          );
        }))
      : h("p", { class: "muted small" }, "Crie outros pontos para ligá-los a esta pista.")
  );
  revela.addEventListener("toggle", () => (revela.open ? abertos.add(p.id) : abertos.delete(p.id)));

  const pedidosUI = reqs.map((r) =>
    h("div", { class: "pedido" },
      icon("clock", 14),
      h("span", { class: "pedido-txt" }, h("strong", {}, r.jogador), " quer testar ", h("span", { class: "muted" }, `(DT ${p.dt})`)),
      h("button", { class: "btn btn-sm btn-ok", onClick: () => resolver(itemId, p.id, r.jogador, true) }, icon("check", 13), "Passou"),
      h("button", { class: "btn btn-sm btn-bad", onClick: () => resolver(itemId, p.id, r.jogador, false) }, icon("x", 13), "Falhou")
    )
  );

  const resolvida = p.descoberta || p.bloqueada;
  return h("div", { class: `card pericia ${estado}` },
    h("div", { class: "row" },
      h("div", { class: "grow" }, nome),
      h("label", { class: "dt" }, h("span", { class: "dt-lbl" }, "DT"), dt),
      h("button", {
        class: "btn-icon", title: "Remover perícia",
        onClick: () => editar((x) => { x.pericias = x.pericias.filter((y) => y.id !== p.id); }),
      }, icon("trash", 15))
    ),
    pista,
    revela,
    ...pedidosUI,
    resolvida
      ? h("div", { class: "row between" },
          p.descoberta ? pill("ok", "Pista descoberta", "check") : pill("bad", "Jogadores falharam", "x"),
          h("button", {
            class: "btn btn-sm btn-ghost",
            onClick: () => editar((x) => {
              const q = x.pericias.find((y) => y.id === p.id);
              if (q) { q.descoberta = false; q.bloqueada = false; }
            }),
          }, icon("undo", 13), "Reabrir")
        )
      : null
  );
}

function rodapeGM() {
  const excluir = h("button", { class: "btn btn-ghost btn-danger", onClick: async (e) => {
    const b = e.currentTarget;
    if (!b.dataset.confirma) {
      b.dataset.confirma = "1";
      b.classList.add("armed");
      b.replaceChildren(icon("trash", 14), "Confirmar exclusão");
      setTimeout(() => {
        if (!b.isConnected) return;
        delete b.dataset.confirma;
        b.classList.remove("armed");
        b.replaceChildren(icon("trash", 14), "Excluir");
      }, 3500);
      return;
    }
    await OBR.scene.items.deleteItems([itemId]);
    fechar();
  } }, icon("trash", 14), "Excluir");

  return h("footer", { class: "footer" },
    h("button", { class: "btn btn-ghost", onClick: () => { previa = true; render(); } }, icon("eye", 14), "Ver como jogador"),
    excluir
  );
}

/* ================= Visão do JOGADOR ================= */

async function pedir(p) {
  enviados.add(p.id);
  render();
  try {
    await OBR.broadcast.sendMessage(CHANNEL, { itemId, periciaId: p.id, jogador: meuNome }, { destination: "REMOTE" });
    OBR.notification.show(`Pedido enviado: ${p.nome}. Aguarde o mestre.`, "INFO");
  } catch {
    enviados.delete(p.id);
    render();
    OBR.notification.show("Não foi possível enviar o pedido.", "ERROR");
  }
}

function corpoJogador(d) {
  const meus = pedidosValidos(item).filter((r) => r.jogador === meuNome).map((r) => r.periciaId);

  const linhas = d.pericias.map((p) => {
    if (p.descoberta) {
      return h("div", { class: "card pericia descoberta" },
        h("div", { class: "pericia-top" }, h("strong", {}, p.nome), pill("ok", "Descoberta", "check")),
        h("p", { class: "texto" }, p.pista || "Você notou algo, mas nada além disso.")
      );
    }
    if (p.bloqueada) {
      return h("div", { class: "card pericia bloqueada" },
        h("div", { class: "pericia-top" }, h("strong", {}, p.nome), pill("bad", "Sem sucesso", "x")),
        h("p", { class: "muted small" }, "O grupo não conseguiu nada com esta abordagem.")
      );
    }
    const aguardando = enviados.has(p.id) || meus.includes(p.id);
    return h("div", { class: "card pericia" },
      h("div", { class: "pericia-top" },
        h("div", { class: "pericia-nome" }, icon("search", 15), h("strong", {}, p.nome)),
        h("button", { class: "btn btn-pri btn-sm", disabled: aguardando || previa, onClick: () => pedir(p) },
          aguardando ? [icon("clock", 13), "Aguardando"] : "Investigar")
      )
    );
  });

  return [
    h("h2", { class: "poi-title" }, d.titulo || "Ponto de interesse"),
    d.descricao
      ? h("p", { class: "texto" }, d.descricao)
      : h("p", { class: "muted" }, "Nada de especial à primeira vista."),
    d.pericias.length
      ? [h("div", { class: "sec" }, h("h3", {}, "Como investigar")), ...linhas]
      : h("p", { class: "muted small" }, "Não há mais nada para investigar aqui."),
  ];
}

function rodapePrevia() {
  return h("footer", { class: "footer" },
    h("span", { class: "muted small" }, "É assim que os jogadores veem."),
    h("button", { class: "btn", onClick: () => { previa = false; render(); } }, "Voltar à edição")
  );
}

/* ================= Montagem ================= */

function montar() {
  const d = item.metadata[KEY];
  const gm = role === "GM" && !previa;
  const pedidos = pedidosValidos(item);

  let sub;
  if (previa) sub = "Prévia: visão do jogador";
  else if (gm && pedidos.length) sub = h("span", { class: "acc" }, `${pedidos.length} pedido${pedidos.length > 1 ? "s" : ""} aguardando`);
  else sub = gm ? "Painel do mestre" : "Examinando";

  return h("div", { class: "shell" },
    cabecalho("Ponto de interesse", sub,
      h("button", { class: "btn-icon", title: "Fechar", onClick: fechar }, icon("x", 16))),
    h("main", { class: "scroll" },
      gm ? corpoGM(d, pedidos) : corpoJogador(d),
      h("datalist", { id: "sugestoes-pericias" }, PERICIAS.map((n) => h("option", { value: n })))
    ),
    gm ? rodapeGM() : previa ? rodapePrevia() : null
  );
}

function render() {
  if (!item) return;
  // Não reconstrói a tela enquanto o mestre digita (perderia o foco); refaz ao sair do campo
  if (role === "GM" && !previa && campoFocado()) {
    renderPendente = true;
    return;
  }
  renderPendente = false;
  const y = app.querySelector(".scroll")?.scrollTop ?? 0;
  app.replaceChildren(montar());
  const scroll = app.querySelector(".scroll");
  if (scroll) scroll.scrollTop = y;

  if (primeiraVez) {
    primeiraVez = false;
    const t = app.querySelector("input[data-foco]");
    if (t && t.value === "Novo ponto de interesse") { t.focus(); t.select(); }
  }
}

OBR.onReady(async () => {
  await aplicarTema();
  [role, meuNome] = await Promise.all([OBR.player.getRole(), OBR.player.getName()]);

  const [it] = await OBR.scene.items.getItems([itemId]);
  if (!it || !it.metadata[KEY]) {
    app.replaceChildren(h("div", { class: "empty" }, icon("search", 28), h("p", {}, "Este ponto não existe mais.")));
    return;
  }
  item = it;
  if (role === "GM") outros = await OBR.scene.items.getItems((i) => KEY in i.metadata && i.id !== itemId);
  render();

  OBR.scene.items.onChange((items) => {
    const atual = items.find((i) => i.id === itemId);
    if (!atual || !atual.metadata[KEY]) return fechar();
    item = atual;
    if (role === "GM") outros = items.filter((i) => KEY in i.metadata && i.id !== itemId);
    render();
  });

  document.addEventListener("focusout", () => {
    setTimeout(() => { if (renderPendente && !campoFocado()) render(); }, 200);
  });
});
