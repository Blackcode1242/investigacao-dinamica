import OBR from "@owlbear-rodeo/sdk";
import "./style.css";
import { KEY } from "./shared.js";

OBR.onReady(() => {
  const app = document.getElementById("app");
  if (!app) return;

  app.innerHTML = `
    <div style="padding: 16px; display: flex; flex-direction: column; gap: 12px; font-family: sans-serif;">
      <h3 style="margin: 0; font-size: 16px;">Investigação Dinâmica</h3>
      <button id="create-point" style="padding: 10px; background: #6366f1; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">
        ➕ Criar Ponto no Centro
      </button>
      <div id="status" style="font-size: 12px; color: #a1a1aa;">Aguardando...</div>
    </div>
  `;

  document.getElementById("create-point").addEventListener("click", async () => {
    const status = document.getElementById("status");
    try {
      status.innerText = "Criando...";
      const [w, h] = await Promise.all([OBR.viewport.getWidth(), OBR.viewport.getHeight()]);
      const center = await OBR.viewport.inverseTransformPoint({ x: w / 2, y: h / 2 });
      
      await OBR.scene.items.addItems([{
        id: `ponto_${Date.now()}`,
        type: "IMAGE",
        layer: "ATTACHMENT",
        position: { x: center.x, y: center.y },
        scale: { x: 1, y: 1 },
        visible: true,
        name: "Novo Ponto",
        image: { url: "https://blackcode1242.github.io/investigacao-dinamica/sparkle.webp", mime: "image/webp", grid: { dpi: 150, offset: {x:0,y:0} } },
        metadata: { [KEY]: { titulo: "Ponto", descricao: "", notaMestre: "", pericias: [] } }
      }]);
      status.innerText = "✅ Criado!";
    } catch (e) {
      status.innerText = "❌ Erro: " + e.message;
    }
  });
});
