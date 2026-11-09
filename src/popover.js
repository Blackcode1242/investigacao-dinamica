import OBR from "@owlbear-rodeo/sdk";
import "./style.css";

OBR.onReady(() => {
  document.getElementById("app").innerHTML = `
    <div style="padding: 12px; display: flex; flex-direction: column; gap: 10px;">
      <h3 style="margin: 0 0 4px 0; font-size: 15px;">Investigação Dinâmica</h3>
      <button class="primary" id="create-point" style="padding: 8px; cursor: pointer;">Criar Ponto no Centro</button>
    </div>
  `;

  document.getElementById("create-point").addEventListener("click", async () => {
    try {
      // 1. Pega o centro da viewport atual do jogador/mestre
      const viewport = await OBR.viewport.getCenter();

      // 2. Cria o item de marcador no mapa na posição central
      await OBR.scene.items.addItems([
        {
          id: `ponto_interesse_${Date.now()}`,
          type: "IMAGE",
          layer: "ATTACHMENT",
          position: { x: viewport.x, y: viewport.y },
          scale: { x: 1, y: 1 },
          rotation: 0,
          visible: true,
          locked: false,
          name: "Novo Ponto de Interesse",
          image: {
            url: "/sparkle.webp", // Ícone brilhante padrão da extensão
            mime: "image/webp",
            grid: { dpi: 150, offset: { x: 0, y: 0 } },
          },
          metadata: {
            "investigacao/metadata": {
              titulo: "Novo Ponto",
              descricao: "",
              notaMestre: "",
              pericias: []
            }
          }
        }
      ]);

      console.log("Ponto criado com sucesso no centro da tela!");
    } catch (error) {
      console.error("Erro ao criar ponto de interesse:", error);
    }
  });
});
