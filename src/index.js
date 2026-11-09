import OBR from "@owlbear-rodeo/sdk";
import "./style.css";
// Importamos as constantes oficiais do shared.js para garantir que o background reconheça o item
import { KEY } from "./shared.js";

// URL base onde a extensão está hospedada
const BASE_URL = "https://blackcode1242.github.io/investigacao-dinamica";

OBR.onReady(() => {
  const app = document.getElementById("app");
  if (!app) return;

  // Renderiza a interface do painel lateral
  app.innerHTML = `
    <div style="padding: 16px; display: flex; flex-direction: column; gap: 12px; font-family: Inter, system-ui, sans-serif;">
      <h3 style="margin: 0 0 4px 0; font-size: 16px; color: #f0f0f5;">Investigação Dinâmica</h3>
      <p style="font-size: 12px; color: #a1a1aa; margin: 0 0 8px 0;">Posicione o mapa onde deseja e clique no botão para criar um novo Ponto de Interesse.</p>
      
      <button class="primary" id="create-point" style="padding: 10px; background: #6366f1; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; transition: background 0.2s;">
        ➕ Criar Ponto no Centro da Tela
      </button>
      
      <div id="status-log" style="font-size: 11px; color: #a1a1aa; margin-top: 8px; word-break: break-word;">
        Status: Aguardando ação...
      </div>
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

      // 1. Pega largura e altura da tela (viewport) em pixels
      const [width, height] = await Promise.all([
        OBR.viewport.getWidth(),
        OBR.viewport.getHeight(),
      ]);

      // 2. Calcula o centro da tela em pixels
      const screenCenter = { x: width / 2, y: height / 2 };

      // 3. Converte o centro da tela para as coordenadas reais do mapa
      const worldCenter = await OBR.viewport.inverseTransformPoint(screenCenter);

      logStatus("Criando ponto de interesse...");
      
      // 4. Adiciona o item no mapa
      await OBR.scene.items.addItems([
        {
          id: `ponto_interesse_${Date.now()}`,
          type: "IMAGE",
          layer: "ATTACHMENT",
          position: { x: worldCenter.x, y: worldCenter.y }, // Posição calculada
          scale: { x: 1, y: 1 },
          rotation: 0,
          visible: true,
          locked: false,
          name: "Novo Ponto de Interesse",
          image: {
            url: `${BASE_URL}/sparkle.webp`, // Certifique-se de que esta imagem existe no seu GitHub Pages
            mime: "image/webp",
            grid: { dpi: 150, offset: { x: 0, y: 0 } },
          },
          metadata: {
            // Usa a chave importada para que o background.js e o popover.js reconheçam o item
            [KEY]: {
              titulo: "Novo Ponto",
              descricao: "",
              notaMestre: "",
              pericias: [] // Aqui você pode colocar uma perícia padrão se quiser, usando a função novaPericia() do shared.js
            }
          }
        }
      ]);

      logStatus("✅ Ponto criado com sucesso na cena!");
    } catch (error) {
      logStatus(`❌ Erro: ${error.message || error}`, true);
    }
  });
});
