import OBR from "@owlbear-rodeo/sdk";
import "./style.css";

const BASE_URL = "https://blackcode1242.github.io/investigacao-dinamica";

OBR.onReady(() => {
  const app = document.getElementById("app");
  app.innerHTML = `
    <div style="padding: 12px; display: flex; flex-direction: column; gap: 8px;">
      <h3 style="margin: 0 0 2px 0; font-size: 15px;">Investigação Dinâmica</h3>
      <button class="primary" id="create-point" style="padding: 8px; cursor: pointer;">Criar Ponto no Centro</button>
      <div id="status-log" style="font-size: 11px; color: #a1a1aa; word-break: break-all; margin-top: 4px;">Status: Aguardando ação...</div>
    </div>
  `;

  const logStatus = (message, isError = false) => {
    const logEl = document.getElementById("status-log");
    if (logEl) {
      logEl.style.color = isError ? "#f87171" : "#4ade80";
      logEl.textContent = message;
    }
    console.log(message);
  };

  document.getElementById("create-point").addEventListener("click", async () => {
    try {
      logStatus("Verificando se a cena está pronta...");

      const sceneReady = await OBR.scene.isReady();
      if (!sceneReady) {
        throw new Error("A cena do Owlbear Rodeo não está pronta. Abra um mapa ativo.");
      }

      logStatus("Obtendo centro da tela...");
      // CORREÇÃO: Usando OBR.viewport.getPosition() que é o método correto da SDK
      const viewport = await OBR.viewport.getPosition();

      logStatus("Enviando comando para criar item...");
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
            url: `${BASE_URL}/sparkle.webp`,
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

      logStatus("Ponto criado com sucesso na cena!");
    } catch (error) {
      logStatus(`Erro: ${error.message || error}`, true);
    }
  });
});
