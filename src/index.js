import OBR from "@owlbear-rodeo/sdk";
import "./style.css";

OBR.onReady(() => {
  console.log("Extensão Investigação Dinâmica carregada com sucesso.");

  // Função auxiliar para tornar painéis arrastáveis pela barra de título
  function makeDraggable(panelElement, handleElement) {
    let isDragging = false;
    let startX, startY, initialX, initialY;

    handleElement.addEventListener("mousedown", (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      
      const rect = panelElement.getBoundingClientRect();
      initialX = rect.left;
      initialY = rect.top;

      panelElement.style.position = "absolute";
      panelElement.style.left = `${initialX}px`;
      panelElement.style.top = `${initialY}px`;
      panelElement.style.right = "auto";
      panelElement.style.bottom = "auto";

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });

    function onMouseMove(e) {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      panelElement.style.left = `${initialX + dx}px`;
      panelElement.style.top = `${initialY + dy}px`;
    }

    function onMouseUp() {
      isDragging = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }
  }

  // Disponibiliza a função globalmente se necessário para os elementos injetados
  window.makeDraggable = makeDraggable;
});