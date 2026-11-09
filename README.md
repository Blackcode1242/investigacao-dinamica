# Pontos de Interesse — extensão para Owlbear Rodeo

## Rodar
    npm install
    npm run dev          # manifest em http://localhost:5173/manifest.json
No Owlbear: perfil > Add Extension > cole a URL do manifest.

## Publicar
    npm run build        # gera a pasta dist/
Suba a `dist/` na RAIZ de um domínio (Netlify, Vercel, Cloudflare Pages).

## Estrutura
- public/manifest.json  -> configuração da extensão
- public/sparkle.webp   -> brilho animado (troque por outro .webp/.gif/.png)
- src/background.js     -> menu dos 3 pontinhos, abrir ao clicar (jogador), pedidos, caderno
- src/index.js          -> painel da barra de ferramentas (Pontos / Caderno de pistas)
- src/popover.js        -> janela do ponto (mestre, jogador e prévia)
- src/shared.js         -> constantes, modelo de dados e lógica de resolver testes
