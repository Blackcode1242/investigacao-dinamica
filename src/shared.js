import OBR from "@owlbear-rodeo/sdk";
import "./style.css";

// Endereço da pasta onde a extensão está hospedada (funciona na raiz ou em subpasta, como no GitHub Pages)
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

export const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const nl = (s = "") => esc(s).replace(/\n/g, "<br>");

function pintar(t) {
  const r = document.documentElement.style;
  r.setProperty("--bg", t.background.paper);
  r.setProperty("--fg", t.text.primary);
  r.setProperty("--fg2", t.text.secondary);
  r.setProperty("--pri", t.primary.main);
  r.setProperty("--line", t.mode === "DARK" ? "rgba(255,255,255,.16)" : "rgba(0,0,0,.18)");
  r.setProperty("--card", t.mode === "DARK" ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.05)");
}
export async function aplicarTema() {
  pintar(await OBR.theme.getTheme());
  OBR.theme.onChange(pintar);
}

export async function abrirPopover(itemId) {
  const role = await OBR.player.getRole();
  await OBR.popover.close(POPOVER_ID);
  await OBR.popover.open({
    id: POPOVER_ID,
    url: `${BASE}popover.html?id=${encodeURIComponent(itemId)}`,
    width: 360,
    height: role === "GM" ? 620 : 440,
    anchorElementId: itemId,
    anchorOrigin: { horizontal: "RIGHT", vertical: "CENTER" },
    transformOrigin: { horizontal: "LEFT", vertical: "CENTER" },
    disableClickAway: true,
  });
}

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
