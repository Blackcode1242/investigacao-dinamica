import OBR from "@owlbear-rodeo/sdk";
import "./style.css";
import { KEY, KEY_CADERNO, aplicarTema, criarPonto, focar, irParaPonto, abrirPopover, pedidosValidos } from "./shared.js";
import { h, icon, cabecalho, pill } from "./ui.js";

const app = document.getElementById("app");

let role = "PLAYER";
let aba = "pontos";
let pontos = []; // só o mestre enxerga todos
let caderno = [];
let pronta = false;
let criando = false;

const aviso = (msg, tipo = "ERROR") => OBR.notification.show(msg, tipo);

/* ---------- Mestre: lista de pontos ---------- */

async function criarClick() {
  criando = true;
  render();
  try {
    const it = await criarPonto();
    await OBR.player.select([it.id]);
    await new Promise((r) => setTimeout(r, 150)); // dá tempo do item aparecer para ancorar o painel
    await abrirPopover(it.id);
    OBR.action.close();
  } catch (e) {
    aviso(`Não foi possível criar o ponto: ${e?.message ?? e}`);
  } finally {
    criando = false;
    render();
  }
}

function linhaPonto(i) {
  const d = i.metadata[KEY];
  const total = d.pericias.length;
  const feitas = d.pericias.filter((p) => p.descoberta).length;
  const pend = pedidosValidos(i).length;

  return h("div", { class: `poi-row ${i.visible ? "" : "oculto"}` },
    h("button", {
      class: `btn-icon ${i.visible ? "vis-on" : ""}`,
      title: i.visible ? "Visível: clique para ocultar" : "Oculto: clique para revelar",
      onClick: () => OBR.scene.items.updateItems([i.id], (its) => { its[0].visible = !its[0].visible; }),
    }, icon(i.visible ? "eye" : "eyeOff", 16)),
    h("button", {
      class: "poi-main",
      onClick: async () => {
        try { await irParaPonto(i.id); OBR.action.close(); } catch (e) { aviso(`Erro ao abrir: ${e?.message ?? e}`); }
      },
    },
      h("div", { class: "poi-name" }, d.titulo || "Sem título"),
      h("div", { class: "poi-meta" },
        `${feitas}/${total} pista${total === 1 ? "" : "s"}`,
        pend ? pill("acc", `${pend} pedido${pend > 1 ? "s" : ""}`, "clock") : null
      )
    ),
    h("button", { class: "btn-icon", title: "Mostrar no mapa", onClick: () => focar(i.id).catch(() => {}) }, icon("target", 16))
  );
}

function viewPontos() {
  const lista = [...pontos].sort((a, b) =>
    (a.metadata[KEY].titulo || "").localeCompare(b.metadata[KEY].titulo || "", "pt-BR")
  );
  return [
    h("button", { class: "btn btn-pri btn-block", disabled: !pronta || criando, onClick: criarClick },
      icon("plus", 16), criando ? "Criando…" : "Criar ponto no centro da tela"),
    !pronta
      ? h("p", { class: "hint" }, "Abra uma cena para criar pontos de interesse.")
      : h("p", { class: "hint" }, "O ponto nasce oculto. Arraste-o até o local certo e revele quando quiser."),
    lista.length
      ? h("div", { class: "lista" }, lista.map(linhaPonto))
      : h("div", { class: "empty" }, icon("sparkle", 28), h("p", {}, "Nenhum ponto de interesse ainda."))
  ];
}

/* ---------- Caderno de pistas (mestre e jogadores) ---------- */

function viewCaderno() {
  if (!caderno.length) {
    return h("div", { class: "empty" },
      icon("book", 28),
      h("p", {}, "Nenhuma pista descoberta ainda."),
      h("p", { class: "muted small" },
        role === "GM" ? "As pistas que os jogadores descobrirem aparecem aqui." : "Selecione um brilho no mapa para investigar.")
    );
  }
  const grupos = new Map();
  for (const e of [...caderno].sort((a, b) => a.ts - b.ts)) {
    if (!grupos.has(e.ponto)) grupos.set(e.ponto, []);
    grupos.get(e.ponto).push(e);
  }
  return h("div", { class: "grupos" }, [...grupos].map(([ponto, es]) =>
    h("section", { class: "grupo" },
      h("div", { class: "grupo-titulo" }, icon("pin", 13), ponto),
      es.map((e) => h("div", { class: "nota" },
        h("div", { class: "nota-pericia" }, e.pericia),
        h("p", {}, e.pista || "—")
      ))
    )
  ));
}

/* ---------- Montagem ---------- */

function render() {
  const gm = role === "GM";
  const atual = gm ? aba : "caderno";
  const pend = pontos.reduce((s, i) => s + pedidosValidos(i).length, 0);

  let sub = "Seu caderno de pistas";
  if (gm) sub = pend ? h("span", { class: "acc" }, `${pend} pedido${pend > 1 ? "s" : ""} aguardando`) : "Painel do mestre";

  const tab = (id, rotulo, n) =>
    h("button", { class: `tab ${aba === id ? "on" : ""}`, onClick: () => { aba = id; render(); } },
      rotulo, n ? h("span", { class: "count" }, n) : null);

  const y = app.querySelector(".scroll")?.scrollTop ?? 0;
  app.replaceChildren(
    h("div", { class: "shell" },
      cabecalho("Investigação", sub,
        h("button", { class: "btn-icon", title: "Fechar", onClick: () => OBR.action.close() }, icon("x", 16))),
      gm ? h("nav", { class: "tabs" }, tab("pontos", "Pontos", pontos.length), tab("caderno", "Caderno", caderno.length)) : null,
      h("main", { class: "scroll" }, atual === "pontos" ? viewPontos() : viewCaderno())
    )
  );
  const scroll = app.querySelector(".scroll");
  if (scroll) scroll.scrollTop = y;
}

async function carregarPontos() {
  pontos = role === "GM" && pronta ? await OBR.scene.items.getItems((i) => KEY in i.metadata) : [];
}

OBR.onReady(async () => {
  await aplicarTema();
  role = await OBR.player.getRole();
  pronta = await OBR.scene.isReady();
  caderno = (await OBR.room.getMetadata())[KEY_CADERNO] ?? [];
  await carregarPontos();
  render();

  OBR.room.onMetadataChange((m) => { caderno = m[KEY_CADERNO] ?? []; render(); });
  OBR.scene.onReadyChange(async (r) => { pronta = r; await carregarPontos(); render(); });
  OBR.scene.items.onChange((items) => {
    if (role !== "GM") return;
    pontos = items.filter((i) => KEY in i.metadata);
    render();
  });
  OBR.player.onChange((p) => { if (p.role !== role) { role = p.role; carregarPontos().then(render); } });
});
