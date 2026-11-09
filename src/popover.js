import OBR from "@owlbear-rodeo/sdk";
import "./style.css";

OBR.onReady(() => {
  document.getElementById("app").innerHTML = `
    <div style="padding: 10px; display: flex; flex-direction: column; gap: 8px;">
      <h3 style="margin: 0 0 8px 0; font-size: 15px;">Investigação Dinâmica</h3>
      <button class="primary" id="create-point">Criar Ponto no Centro</button>
    </div>
  `;

  document.getElementById("create-point").addEventListener("click", () => {
    // Lógica de criação de ponto no centro da tela
    OBR.scene.grid.getPosition().then((pos) => {
      console.log("Criando ponto na posição:", pos);
    });
  });
});