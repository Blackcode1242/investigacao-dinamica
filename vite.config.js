import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const p = (f) => fileURLToPath(new URL(f, import.meta.url));

export default defineConfig({
  base: "./",
  server: {
    port: 5173,
    // O Owlbear precisa de CORS liberado para ler o manifest
    headers: { "Access-Control-Allow-Origin": "*" },
  },
  build: {
    rollupOptions: {
      input: {
        popover: p("./popover.html"), // painel da barra de ferramentas
        ponto: p("./ponto.html"), // painel de um ponto (mestre e jogador)
        background: p("./background.html"), // lógica que roda em segundo plano
      },
    },
  },
});
