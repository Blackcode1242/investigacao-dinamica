import OBR, { buildImage } from "@owlbear-rodeo/sdk";
import {
  KEY, KEY_CADERNO, esc, nl, novoPonto, abrirPopover, aplicarTema, pedidosValidos, resolver, BASE,
} from "./shared.js";

const app = document.getElementById("app");
let aba = null;

async function criar() {
  const w = await OBR.viewport.getWidth();
  const h = await OBR.viewport.getHeight();
  const centro = await OBR.viewport.inverseTransformPoint({ x: w / 2, y: h / 2 });
  const dados = novoPonto();

  const item = buildImage(
    { width: 256, height: 256, url: `${BASE}sparkle.webp`, mime: "image/webp" },
    { dpi: 256, offset: { x: 128, y: 128 } }
  )
    .position(centro)
    .layer("PROP")
    .name(dados.titulo)
    .visible(false) // começa oculto: o mestre revela quando quiser
    .metadata({ [KEY]: dados })
    .build();

  await OBR.scene.items.addItems([item]);
  await OBR.player.select([item.id]);
  await OBR.action.close();
  await abrirPopover(item.id);
}

function htmlPontos(itens) {
  const pedidos = itens.flatMap((i) =>
    pedidosValidos(i).map((r) => ({ item: i, r, p: i.metadata[KEY].pericias.find((x) => x.id === r.periciaId) }))
  );
  return `
    <button class="primario" data-act="criar">✨ Criar ponto no centro da tela</button>
    <p class="muted">Arraste o brilho para o lugar certo. Ele nasce oculto aos jogadores.</p>
    ${
      pedidos.length
        ? `<h2>Pedidos pendentes (${pedidos.length})</h2>` +
          pedidos
            .map(
              ({ item, r, p }) => `
        <div class="card" data-id="${item.id}">
          <div><strong>${esc(r.jogador)}</strong> quer usar <strong>${esc(p.nome)}</strong> · DT ${p.dt}</div>
          <div class="muted">${esc(item.metadata[KEY].titulo)}</div>
          <div class="linha acoes">
            <button class="sim" data-act="passou" data-p="${p.id}" data-j="${esc(r.jogador)}">✓ Passou</button>
            <button class="nao" data-act="falhou" data-p="${p.id}" data-j="${esc(r.jogador)}">✗ Falhou</button>
          </div>
        </div>`
            )
            .join("")
        : ""
    }
    <h2>Nesta cena (${itens.length})</h2>
    ${itens.length === 0 ? `<p class="muted">Nenhum ponto ainda.</p>` : ""}
    ${itens
      .map(
        (i) => `
      <div class="card" data-id="${i.id}">
        <div class="linha">
          <strong>${esc(i.metadata[KEY].titulo)}</strong>
          <span class="tag ${i.visible ? "on" : ""}">${i.visible ? "Visível" : "Oculto"}</span>
        </div>
        <div class="linha acoes">
          <button data-act="editar">Editar</button>
          <button data-act="focar">Ir até</button>
          <button data-act="vis">${i.visible ? "Ocultar" : "Revelar"}</button>
        </div>
      </div>`
      )
      .join("")}`;
}

async function htmlCaderno() {
  const meta = await OBR.room.getMetadata();
  const lista = (meta[KEY_CADERNO] ?? []).slice().sort((a, b) => b.ts - a.ts);
  if (!lista.length) return `<p class="muted">Nenhuma pista descoberta ainda.</p>`;
  const grupos = new Map();
  for (const e of lista) {
    if (!grupos.has(e.ponto)) grupos.set(e.ponto, []);
    grupos.get(e.ponto).push(e);
  }
  return [...grupos]
    .map(
      ([ponto, es]) => `
    <h2>${esc(ponto)}</h2>
    ${es
      .map(
        (e) => `<div class="card ok"><strong>${esc(e.pericia)}</strong>
          <div class="pista">${e.pista ? nl(e.pista) : `<span class="muted">(sem texto)</span>`}</div></div>`
      )
      .join("")}`
    )
    .join("");
}

async function render() {
  const gm = (await OBR.player.getRole()) === "GM";
  if (!gm) aba = "caderno";
  else if (!aba) aba = "pontos";

  const pronta = await OBR.scene.isReady();
  const itens = gm && pronta ? await OBR.scene.items.getItems((i) => KEY in i.metadata) : [];
  const nPed = itens.reduce((s, i) => s + pedidosValidos(i).length, 0);

  const abas = gm
    ? `<div class="abas">
        <button class="${aba === "pontos" ? "ativa" : ""}" data-act="aba" data-aba="pontos">Pontos${nPed ? ` (${nPed})` : ""}</button>
        <button class="${aba === "caderno" ? "ativa" : ""}" data-act="aba" data-aba="caderno">Caderno de pistas</button>
      </div>`
    : `<h1>Caderno de pistas</h1>`;

  let corpo;
  if (aba === "caderno") corpo = await htmlCaderno();
  else if (!pronta) corpo = `<p class="muted">Abra uma cena primeiro.</p>`;
  else corpo = htmlPontos(itens);

  app.innerHTML = abas + corpo;
}

app.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-act]");
  if (!btn) return;
  const act = btn.dataset.act;
  const id = btn.closest("[data-id]")?.dataset.id;

  if (act === "aba") {
    aba = btn.dataset.aba;
    return render();
  }
  if (act === "criar") return criar();
  if (act === "passou" || act === "falhou") {
    btn.disabled = true;
    return resolver(id, btn.dataset.p, btn.dataset.j, act === "passou");
  }
  if (act === "editar") {
    await OBR.player.select([id]);
    await OBR.action.close();
    return abrirPopover(id);
  }
  if (act === "focar") {
    const [i] = await OBR.scene.items.getItems([id]);
    const { x, y } = i.position;
    return OBR.viewport.animateToBounds({
      min: { x: x - 400, y: y - 400 },
      max: { x: x + 400, y: y + 400 },
      center: { x, y },
      width: 800,
      height: 800,
    });
  }
  if (act === "vis") {
    await OBR.scene.items.updateItems([id], (its) => {
      its[0].visible = !its[0].visible;
    });
  }
});

OBR.onReady(async () => {
  await aplicarTema();
  await render();
  OBR.scene.items.onChange(render);
  OBR.scene.onReadyChange(render);
  OBR.room.onMetadataChange(render);
});
