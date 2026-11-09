import OBR from "@owlbear-rodeo/sdk";
import {
  NS, KEY, KEY_PEDIDOS, KEY_CADERNO, POPOVER_ID, CHANNEL, CHANNEL_RESULT,
  abrirPopover, pedidosValidos, BASE,
} from "./shared.js";

/* Mestre: mantém o selo de pedidos e o caderno de pistas em dia */
let rodando = false;
let refazer = false;
async function manter() {
  if (rodando) {
    refazer = true;
    return;
  }
  rodando = true;
  try {
    do {
      refazer = false;
      const pois = await OBR.scene.items.getItems((i) => KEY in i.metadata);

      const pendentes = pois.reduce((s, i) => s + pedidosValidos(i).length, 0);
      try {
        await OBR.action.setBadgeText(pendentes ? String(pendentes) : undefined);
      } catch {}

      const meta = await OBR.room.getMetadata();
      const atual = meta[KEY_CADERNO] ?? [];
      const mapa = new Map(atual.map((e) => [e.id, e]));
      for (const it of pois) {
        const d = it.metadata[KEY];
        for (const p of d.pericias) {
          const eid = `${it.id}:${p.id}`;
          if (p.descoberta) {
            mapa.set(eid, { id: eid, ponto: d.titulo, pericia: p.nome, pista: p.pista, ts: mapa.get(eid)?.ts ?? Date.now() });
          } else {
            mapa.delete(eid);
          }
        }
      }
      const novo = [...mapa.values()];
      if (JSON.stringify(novo) !== JSON.stringify(atual)) await OBR.room.setMetadata({ [KEY_CADERNO]: novo });
    } while (refazer);
  } finally {
    rodando = false;
  }
}

OBR.onReady(async () => {
  const role = await OBR.player.getRole();

  // 1) Menu dos "três pontinhos" do item
  OBR.contextMenu.create({
    id: `${NS}/abrir`,
    icons: [
      {
        icon: `${BASE}open.svg`,
        label: "Ponto de interesse",
        filter: { every: [{ key: ["metadata", KEY], value: undefined, operator: "!=" }], max: 1 },
      },
    ],
    onClick(context) {
      abrirPopover(context.items[0].id);
    },
  });

  // 2) Jogador: selecionar o brilho abre o ponto automaticamente
  let aberto = null;
  OBR.player.onChange(async (player) => {
    if (player.role === "GM") return;
    const sel = player.selection ?? [];
    if (sel.length === 1) {
      const [item] = await OBR.scene.items.getItems(sel);
      if (item && item.metadata[KEY]) {
        if (aberto !== item.id) {
          aberto = item.id;
          abrirPopover(item.id);
        }
        return;
      }
    }
    if (aberto) {
      aberto = null;
      OBR.popover.close(POPOVER_ID);
    }
  });

  // 3) Mestre: guarda os pedidos de teste dos jogadores no próprio ponto
  OBR.broadcast.onMessage(CHANNEL, async (evento) => {
    if ((await OBR.player.getRole()) !== "GM") return;
    const { itemId, periciaId, jogador } = evento.data;
    const [it] = await OBR.scene.items.getItems([itemId]);
    const d = it?.metadata[KEY];
    const p = d?.pericias.find((x) => x.id === periciaId);
    if (!p) return;

    await OBR.scene.items.updateItems([itemId], (its) => {
      const x = its[0];
      const lista = x.metadata[KEY_PEDIDOS] ?? [];
      if (lista.some((r) => r.periciaId === periciaId && r.jogador === jogador)) return;
      x.metadata[KEY_PEDIDOS] = [...lista, { id: crypto.randomUUID(), jogador, periciaId, ts: Date.now() }];
    });
    OBR.notification.show(`${jogador} quer usar ${p.nome} em "${d.titulo}" (DT ${p.dt}). Abra o painel para resolver.`, "INFO");
  });

  // 4) Todos: aviso do resultado
  OBR.broadcast.onMessage(CHANNEL_RESULT, (evento) => {
    const { jogador, titulo, pericia, passou, novos } = evento.data;
    if (passou) {
      OBR.notification.show(
        `${jogador} passou em ${pericia} (${titulo}): pista descoberta!${novos ? ` ${novos > 1 ? "Novos pontos apareceram" : "Um novo ponto apareceu"} no mapa.` : ""}`,
        "SUCCESS"
      );
    } else {
      OBR.notification.show(`${jogador} não teve sucesso com ${pericia} (${titulo}).`, "WARNING");
    }
  });

  // 5) Mestre: sincronização contínua
  if (role === "GM") {
    OBR.scene.items.onChange(() => manter());
    OBR.scene.onReadyChange((pronta) => pronta && manter());
    if (await OBR.scene.isReady()) manter();
  }
});
