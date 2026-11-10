import OBR, { buildImage } from "@owlbear-rodeo/sdk";

// Pasta onde a extensão está hospedada (funciona na raiz ou em subpasta, como no GitHub Pages)
export const BASE = new URL("./", location.href).href;

export const NS = "com.coruja.pontos-de-interesse";
export const KEY = `${NS}/poi`; // dados do ponto (metadados do item)
export const KEY_PEDIDOS = `${NS}/pedidos`; // pedidos de teste pendentes (metadados do item)
export const KEY_CADERNO = `${NS}/caderno`; // caderno de pistas (metadados da sala)
export const POPOVER_ID = `${NS}/popover`;
export const CHANNEL = `${NS}/pedido`; // jogador -> mestre
export const CHANNEL_RESULT = `${NS}/resultado`; // mestre -> todos

// Sugestões (o mestre também pode digitar qualquer outro nome)
export const PERICIAS = [
  "Acrobacia", "Adestramento", "Artes", "Atletismo", "Atualidades", "Ciências",
  "Crime", "Diplomacia", "Enganação", "Fortitude", "Furtividade", "Iniciativa",
  "Intimidação", "Intuição", "Investigação", "Luta", "Medicina", "Ocultismo",
  "Percepção", "Pilotagem", "Pontaria", "Profissão", "Reflexos", "Religião",
  "Sobrevivência", "Tática", "Tecnologia", "Vontade",
];

/* ---------- Modelo de dados ---------- */

export function novaPericia() {
  return {
    id: crypto.randomUUID(),
    nome: "Investigação",
    dt: 15,
    pista: "",
    descoberta: false,
    bloqueada: false, // jogadores já falharam
    revela: [], // ids de outros pontos revelados ao descobrir a pista
  };
}

export function novoPonto() {
  return { titulo: "Novo ponto de interesse", descricao: "", notaMestre: "", pericias: [novaPericia()] };
}

/* ---------- Tema do Owlbear ---------- */

function pintar(t) {
  const dark = t.mode === "DARK";
  const r = document.documentElement.style;
  r.setProperty("--bg", t.background.paper);
  r.setProperty("--fg", t.text.primary);
  r.setProperty("--fg2", t.text.secondary);
  r.setProperty("--pri", t.primary.main);
  r.setProperty("--line", dark ? "rgba(255,255,255,.14)" : "rgba(0,0,0,.16)");
  r.setProperty("--card", dark ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.04)");
  r.setProperty("--card2", dark ? "rgba(255,255,255,.09)" : "rgba(0,0,0,.07)");
  // Âmbar "lampião de detetive" como cor de destaque da extensão
  r.setProperty("--acc", dark ? "#e8b04a" : "#a86a00");
  r.setProperty("--acc-soft", dark ? "rgba(232,176,74,.14)" : "rgba(168,106,0,.12)");
  r.setProperty("--acc-fg", dark ? "#1b1405" : "#ffffff");
  r.setProperty("--ok", dark ? "#5fd48a" : "#15803d");
  r.setProperty("--ok-soft", dark ? "rgba(95,212,138,.14)" : "rgba(21,128,61,.12)");
  r.setProperty("--bad", dark ? "#f48a8a" : "#b91c1c");
  r.setProperty("--bad-soft", dark ? "rgba(244,138,138,.14)" : "rgba(185,28,28,.10)");
  r.setProperty("color-scheme", dark ? "dark" : "light");
}
export async function aplicarTema() {
  pintar(await OBR.theme.getTheme());
  OBR.theme.onChange(pintar);
}

/* ---------- Popover do ponto ---------- */

export async function abrirPopover(itemId) {
  const role = await OBR.player.getRole();
  await OBR.popover.close(POPOVER_ID);
  await OBR.popover.open({
    id: POPOVER_ID,
    url: `${BASE}ponto.html?id=${encodeURIComponent(itemId)}`,
    width: 360,
    height: role === "GM" ? 580 : 420,
    anchorElementId: itemId,
    anchorOrigin: { horizontal: "RIGHT", vertical: "CENTER" },
    transformOrigin: { horizontal: "LEFT", vertical: "CENTER" },
    disableClickAway: true,
  });
}

/* ---------- Criação e navegação ---------- */

// O sparkle.webp tem 256×256; com dpi = 256 ele ocupa exatamente 1 quadrado do grid
const SPARKLE = { width: 256, height: 256, dpi: 256 };

/* Centro da tela em coordenadas da cena
   (OBR.viewport não tem getBounds: usamos largura/altura + inverseTransformPoint) */
export async function centroDaTela() {
  const [w, h] = await Promise.all([OBR.viewport.getWidth(), OBR.viewport.getHeight()]);
  return OBR.viewport.inverseTransformPoint({ x: w / 2, y: h / 2 });
}

/* Cria um ponto oculto no centro da tela e devolve o item */
export async function criarPonto() {
  if (!(await OBR.scene.isReady())) throw new Error("Abra uma cena para criar pontos.");
  const centro = await centroDaTela();

  const item = buildImage(
    { url: `${BASE}sparkle.webp`, mime: "image/webp", width: SPARKLE.width, height: SPARKLE.height },
    { dpi: SPARKLE.dpi, offset: { x: SPARKLE.width / 2, y: SPARKLE.height / 2 } }
  )
    .name("Ponto de interesse")
    .position(centro)
    .layer("ATTACHMENT")
    .visible(false) // nasce oculto dos jogadores
    .metadata({ [KEY]: novoPonto() })
    .build();

  await OBR.scene.items.addItems([item]);
  return item;
}

/* Centraliza a câmera num item, mantendo o zoom atual */
export async function focar(id) {
  const [it] = await OBR.scene.items.getItems([id]);
  if (!it) return;
  const [w, h, scale, pos, tela] = await Promise.all([
    OBR.viewport.getWidth(),
    OBR.viewport.getHeight(),
    OBR.viewport.getScale(),
    OBR.viewport.getPosition(),
    OBR.viewport.transformPoint(it.position),
  ]);
  await OBR.viewport.animateTo({
    scale,
    position: { x: pos.x + (w / 2 - tela.x), y: pos.y + (h / 2 - tela.y) },
  });
}

/* Seleciona o ponto, leva a câmera até ele e abre o painel */
export async function irParaPonto(id) {
  await OBR.player.select([id]);
  try { await focar(id); } catch {}
  await abrirPopover(id);
}

/* ---------- Pedidos e resolução ---------- */

/* Pedidos de teste ainda sem resposta (ignora os de perícias já resolvidas) */
export function pedidosValidos(item) {
  const d = item.metadata[KEY];
  if (!d) return [];
  return (item.metadata[KEY_PEDIDOS] ?? []).filter((r) =>
    d.pericias.some((p) => p.id === r.periciaId && !p.descoberta && !p.bloqueada)
  );
}

/* Torna visíveis os pontos ligados; devolve quantos eram ocultos */
export async function revelarLigados(ids = []) {
  if (!ids.length) return 0;
  const alvos = await OBR.scene.items.getItems(ids);
  const ocultos = alvos.filter((a) => !a.visible).map((a) => a.id);
  if (ocultos.length) {
    await OBR.scene.items.updateItems(ocultos, (its) => {
      for (const x of its) x.visible = true;
    });
  }
  return ocultos.length;
}

/* Resolver pedido: passou = pista descoberta + revela pontos ligados; falhou = perícia bloqueada */
export async function resolver(itemId, periciaId, jogador, passou) {
  const [it] = await OBR.scene.items.getItems([itemId]);
  if (!it) return;
  const d = it.metadata[KEY];
  const p = d.pericias.find((x) => x.id === periciaId);
  if (!p) return;

  await OBR.scene.items.updateItems([itemId], (its) => {
    const x = its[0];
    const pp = x.metadata[KEY].pericias.find((y) => y.id === periciaId);
    if (passou) pp.descoberta = true;
    else pp.bloqueada = true;
    x.metadata[KEY_PEDIDOS] = (x.metadata[KEY_PEDIDOS] ?? []).filter((r) => r.periciaId !== periciaId);
  });

  const novos = passou ? await revelarLigados((p.revela ?? []).filter((v) => v !== itemId)) : 0;
  OBR.broadcast.sendMessage(
    CHANNEL_RESULT,
    { jogador, titulo: d.titulo, pericia: p.nome, passou, novos },
    { destination: "ALL" }
  );
}
