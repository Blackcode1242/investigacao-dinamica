import OBR from "@owlbear-rodeo/sdk";
import {
  KEY, KEY_CADERNO, POPOVER_ID, CHANNEL, PERICIAS,
  esc, nl, novaPericia, aplicarTema, pedidosValidos, resolver, revelarLigados,
} from "./shared.js";

const id = new URLSearchParams(location.search).get("id");
const app = document.getElementById("app");

let role, item, dados, meuNome = "";
let outros = []; // outros pontos da cena (para ligar)
let previa = false; // mestre vendo como jogador
const enviados = new Set(); // pedidos enviados ainda não registrados
const abertos = new Set(); // <details> abertos
const pend = new Map(); // edições aguardando gravação
let timer = null;

const achar = (d, pid) => d.pericias.find((x) => x.id === pid);

/* ---------- carregar / gravar ---------- */
async function carregar() {
  const [i] = await OBR.scene.items.getItems([id]);
  item = i;
  dados = i ? structuredClone(i.metadata[KEY]) : null;
  if (role === "GM") {
    const todos = await OBR.scene.items.getItems((x) => KEY in x.metadata && x.id !== id);
    outros = todos.map((x) => ({ id: x.id, titulo: x.metadata[KEY].titulo, visible: x.visible }));
  }
}

// Cada edição é um "patch": grava só o que mudou, sem sobrescrever o resto
// (assim pedidos e resultados que chegam enquanto você edita não se perdem).
function agendar(chave, fn, agora = false) {
  fn(dados);
  pend.set(chave, fn);
  clearTimeout(timer);
  if (agora) return flush();
  timer = setTimeout(flush, 300);
}
async function flush() {
  clearTimeout(timer);
  timer = null;
  if (!pend.size) return;
  const fns = [...pend.values()];
  pend.clear();
  await OBR.scene.items.updateItems([id], (its) => {
    const it = its[0];
    if (!it) return;
    for (const f of fns) f(it.metadata[KEY], it);
  });
}
const mut = (fn) => agendar(crypto.randomUUID(), fn, true);

async function fechar() {
  await flush();
  if (role !== "GM") await OBR.player.deselect();
  await OBR.popover.close(POPOVER_ID);
}

/* ---------- VISÃO DO JOGADOR (também usada na prévia) ---------- */
function renderJogador() {
  const ped = pedidosValidos(item);
  for (const r of ped) if (r.jogador === meuNome) enviados.delete(r.periciaId);

  app.innerHTML = `
    <div class="topo"><h1>${esc(dados.titulo)}</h1><button class="x" data-act="fechar">✕</button></div>
    ${
      previa
        ? `<div class="banner">Prévia: é assim que o jogador vê este ponto.<br><button data-act="editar">← Voltar à edição</button></div>`
        : ""
    }
    <p>${dados.descricao ? nl(dados.descricao) : "<em class='muted'>Nada de especial à primeira vista.</em>"}</p>
    <h2>O que você pode tentar</h2>
    ${dados.pericias
      .map((p) => {
        const aguardando = enviados.has(p.id) || ped.some((r) => r.periciaId === p.id && r.jogador === meuNome);
        let acao;
        if (p.descoberta) acao = `<span class="tag on">✓ Descoberta</span>`;
        else if (p.bloqueada) acao = `<span class="tag bad">✗ Sem sucesso</span>`;
        else if (aguardando) acao = `<span class="tag">Aguardando o mestre…</span>`;
        else acao = `<button data-act="usar" data-p="${p.id}" ${previa ? "disabled" : ""}>Usar perícia</button>`;
        return `
        <div class="card ${p.descoberta ? "ok" : ""}">
          <div class="linha"><strong>${esc(p.nome)}</strong>${acao}</div>
          ${p.descoberta && p.pista ? `<div class="pista">${nl(p.pista)}</div>` : ""}
        </div>`;
      })
      .join("")}`;
}

/* ---------- VISÃO DO MESTRE ---------- */
function cardMestre(p) {
  const ligs = outros.length
    ? outros
        .map(
          (o) => `<label class="check ligado"><input type="checkbox" data-campo="revela" data-p="${p.id}" data-alvo="${o.id}"
            ${(p.revela ?? []).includes(o.id) ? "checked" : ""} /> ${esc(o.titulo)} ${o.visible ? "" : `<span class="muted">(oculto)</span>`}</label>`
        )
        .join("")
    : `<span class="muted">Crie outros pontos para poder ligá-los.</span>`;

  return `
  <div class="card">
    <div class="linha">
      <input list="lista-pericias" data-campo="nome" data-p="${p.id}" value="${esc(p.nome)}" placeholder="Perícia" />
      <label class="dt">DT <input type="number" min="0" step="5" data-campo="dt" data-p="${p.id}" value="${p.dt}" /></label>
      <button class="x" data-act="remover" data-p="${p.id}" title="Remover">✕</button>
    </div>
    <textarea data-campo="pista" data-p="${p.id}" rows="2" placeholder="Pista que essa perícia revela">${esc(p.pista)}</textarea>
    <label class="check"><input type="checkbox" data-campo="descoberta" data-p="${p.id}" ${p.descoberta ? "checked" : ""} /> Pista descoberta (mostrar aos jogadores)</label>
    <label class="check"><input type="checkbox" data-campo="bloqueada" data-p="${p.id}" ${p.bloqueada ? "checked" : ""} /> Bloqueada (jogadores falharam)</label>
    <details data-p="${p.id}" ${abertos.has(p.id) ? "open" : ""}>
      <summary>Ao descobrir, revelar pontos (${(p.revela ?? []).length})</summary>${ligs}
    </details>
  </div>`;
}

function renderMestre() {
  const ped = pedidosValidos(item);
  app.innerHTML = `
    <div class="topo"><h1>Ponto de interesse · Mestre</h1><button class="x" data-act="fechar">✕</button></div>
    <button data-act="previa">👁 Ver como jogador</button>
    ${
      ped.length
        ? `<h2>Pedidos pendentes</h2>` +
          ped
            .map((r) => {
              const p = achar(dados, r.periciaId);
              return `<div class="card"><div><strong>${esc(r.jogador)}</strong> quer usar <strong>${esc(p.nome)}</strong> · DT ${p.dt}</div>
              <div class="linha acoes">
                <button class="sim" data-act="passou" data-p="${p.id}" data-j="${esc(r.jogador)}">✓ Passou</button>
                <button class="nao" data-act="falhou" data-p="${p.id}" data-j="${esc(r.jogador)}">✗ Falhou</button>
              </div></div>`;
            })
            .join("")
        : ""
    }
    <label>Título<input data-campo="titulo" value="${esc(dados.titulo)}" /></label>
    <label>Descrição <span class="muted">(o jogador vê)</span>
      <textarea data-campo="descricao" rows="3">${esc(dados.descricao)}</textarea></label>
    <label>Nota do mestre <span class="muted">(por que este ponto importa)</span>
      <textarea data-campo="notaMestre" rows="3">${esc(dados.notaMestre)}</textarea></label>
    <h2>Perícias e pistas</h2>
    ${dados.pericias.map(cardMestre).join("")}
    <button data-act="add">+ Adicionar perícia</button>
    <datalist id="lista-pericias">${PERICIAS.map((n) => `<option value="${n}">`).join("")}</datalist>
    <div class="rodape">
      <button id="btnVis" data-act="visivel"></button>
      <button id="btnTrava" data-act="travar"></button>
      <button id="btnDel" class="perigo" data-act="excluir">Excluir ponto</button>
    </div>`;
  atualizarBarraMestre();
}
function atualizarBarraMestre() {
  const v = document.getElementById("btnVis");
  const t = document.getElementById("btnTrava");
  if (v) v.textContent = item.visible ? "👁 Visível aos jogadores (ocultar)" : "🙈 Oculto (revelar aos jogadores)";
  if (t) t.textContent = item.locked ? "🔒 Posição travada" : "🔓 Posição livre";
}

function renderTudo() {
  const y = window.scrollY;
  if (role === "GM" && !previa) renderMestre();
  else renderJogador();
  window.scrollTo(0, y);
}

/* ---------- eventos ---------- */
app.addEventListener("toggle", (e) => {
  const d = e.target;
  if (d.tagName !== "DETAILS") return;
  d.open ? abertos.add(d.dataset.p) : abertos.delete(d.dataset.p);
}, true);

app.addEventListener("input", (e) => {
  const el = e.target;
  const campo = el.dataset.campo;
  if (!campo || role !== "GM" || previa) return;
  const pid = el.dataset.p;
  const valor = el.type === "checkbox" ? el.checked : el.type === "number" ? Number(el.value) || 0 : el.value;

  if (campo === "revela") {
    const alvo = el.dataset.alvo;
    agendar(`${pid}:revela:${alvo}`, (d) => {
      const p = achar(d, pid);
      if (!p) return;
      const s = new Set(p.revela ?? []);
      valor ? s.add(alvo) : s.delete(alvo);
      p.revela = [...s];
    }, true);
    return;
  }

  const fn = pid
    ? (d) => { const p = achar(d, pid); if (p) p[campo] = valor; }
    : (d, it) => { d[campo] = valor; if (campo === "titulo" && it) it.name = valor; };

  const gravando = agendar(`${pid ?? ""}:${campo}`, fn, el.type === "checkbox");

  // marcar "descoberta" na mão também revela os pontos ligados
  if (campo === "descoberta" && valor) {
    const ligados = [...(achar(dados, pid)?.revela ?? [])].filter((v) => v !== id);
    gravando.then(() => revelarLigados(ligados));
  }
});

let confirmaExcluir = null;
app.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-act]");
  if (!btn) return;
  const act = btn.dataset.act;
  const pid = btn.dataset.p;

  if (act === "fechar") return fechar();

  if (act === "usar") {
    if (previa) return;
    enviados.add(pid);
    renderJogador();
    return OBR.broadcast.sendMessage(CHANNEL, { itemId: id, periciaId: pid, jogador: meuNome }, { destination: "REMOTE" });
  }

  if (role !== "GM") return;

  if (act === "previa") {
    await flush();
    await carregar();
    previa = true;
    return renderTudo();
  }
  if (act === "editar") {
    previa = false;
    await carregar();
    return renderTudo();
  }
  if (act === "passou" || act === "falhou") {
    btn.disabled = true;
    await flush();
    return resolver(id, pid, btn.dataset.j, act === "passou");
  }
  if (act === "add") {
    const nova = novaPericia();
    return mut((d) => d.pericias.push(nova));
  }
  if (act === "remover") {
    return mut((d) => { d.pericias = d.pericias.filter((x) => x.id !== pid); });
  }
  if (act === "visivel") {
    return OBR.scene.items.updateItems([id], (its) => { its[0].visible = !its[0].visible; });
  }
  if (act === "travar") {
    return OBR.scene.items.updateItems([id], (its) => { its[0].locked = !its[0].locked; });
  }
  if (act === "excluir") {
    if (!confirmaExcluir) {
      btn.textContent = "Clique de novo para excluir";
      confirmaExcluir = setTimeout(() => {
        confirmaExcluir = null;
        btn.textContent = "Excluir ponto";
      }, 3000);
      return;
    }
    pend.clear();
    clearTimeout(timer);
    await OBR.scene.items.deleteItems([id]);
    // tira as pistas deste ponto do caderno
    const meta = await OBR.room.getMetadata();
    const cad = meta[KEY_CADERNO] ?? [];
    const novo = cad.filter((x) => !x.id.startsWith(`${id}:`));
    if (novo.length !== cad.length) await OBR.room.setMetadata({ [KEY_CADERNO]: novo });
    return OBR.popover.close(POPOVER_ID);
  }
});

/* ---------- início ---------- */
OBR.onReady(async () => {
  await aplicarTema();
  role = await OBR.player.getRole();
  meuNome = await OBR.player.getName();
  await carregar();
  if (!item) {
    app.innerHTML = `<p class="muted">Ponto não encontrado.</p>`;
    return;
  }
  renderTudo();

  OBR.scene.items.onChange(async () => {
    await carregar();
    if (!item) return OBR.popover.close(POPOVER_ID);
    const ae = document.activeElement;
    const digitando = ae && (ae.tagName === "TEXTAREA" || (ae.tagName === "INPUT" && ae.type !== "checkbox"));
    if (role === "GM" && !previa && digitando) return; // não atrapalha quem está digitando
    renderTudo();
  });
});
