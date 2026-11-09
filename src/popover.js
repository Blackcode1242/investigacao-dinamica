import OBR from "@owlbear-rodeo/sdk";
import "./style.css";

OBR.onReady(() => {
  const app = document.getElementById("app");
  if (!app) return;
  app.innerHTML = `
    <div style="padding: 12px; display: flex; flex-direction: column; gap: 8px;">
      <h3 style="margin: 0 0 2px 0; font-size: 15px;">Investigação Dinâmica</h3>
      <div style="font-size: 12px; color: #a1a1aa;">Selecione a ferramenta de pontos na barra lateral para criar novos pontos clicando no mapa.</div>
    </div>
  `;
});
