# Investigação Dinâmica

Extensão do **Owlbear Rodeo** para gerenciar exploração, pontos de interesse e pistas ocultas em sessões de investigação e mistério. O Mestre espalha brilhos pelo mapa; os jogadores investigam com perícias e registram o que descobrem no **Caderno de Pistas**.

## Instalação

No Owlbear Rodeo: *Perfil → Extensions → Add Extension* e cole:

```
https://blackcode1242.github.io/investigacao-dinamica/manifest.json
```

## Como usar

### Mestre
1. Abra o painel **Investigação** (ícone de lupa) e clique em **Criar ponto no centro da tela**. O brilho nasce **oculto** (aparece translúcido só para você) e o editor abre sozinho.
2. Arraste o brilho até o local certo (porta secreta, estátua, cadáver…).
3. No editor, defina:
   - **Título** e **descrição** (o que os jogadores veem) e **notas do mestre** (só você vê);
   - **Perícias e pistas**: perícia, DT e o texto da pista. Cada ponto pode ter várias;
   - **Revelar outros pontos**: ao descobrir a pista, pontos ocultos ligados aparecem no mapa.
4. Use **Revelar/Ocultar** quando quiser liberar o ponto. **Ver como jogador** mostra a tela exata do grupo.
5. Quando um jogador pedir um teste, chega uma notificação e um selo no ícone da extensão. Abra o ponto e clique em **Passou** (pista descoberta, entra no caderno) ou **Falhou** (a perícia fica bloqueada). **Reabrir** desfaz.
6. A aba **Pontos** lista tudo (com visibilidade, progresso e pedidos). Clicar leva a câmera até o ponto.

### Jogadores
Selecione um brilho no mapa: o painel abre. Clique em **Investigar** na perícia escolhida e aguarde o mestre. Pistas descobertas ficam no **Caderno** do painel da extensão.

## Desenvolvimento

```bash
npm install
npm run dev     # http://localhost:5173/manifest.json
npm run build   # gera dist/ (o workflow do GitHub Pages faz isso no push)
```

Para testar localmente, troque as URLs de `public/manifest.json` por `http://localhost:5173/...`.

## Estrutura

| Arquivo | Função |
|---|---|
| `src/background.js` | Segundo plano: menu do item, pedidos, selo, caderno e abertura automática para jogadores |
| `src/painel.js` | Painel da barra de ferramentas (pontos + caderno) |
| `src/ponto.js` | Painel de um ponto (editor do mestre / visão do jogador) |
| `src/shared.js` | Dados, tema, criação de pontos, resolução de testes |
| `src/ui.js` · `src/style.css` | Componentes e visual |

## Limitação conhecida
Os dados do ponto (inclusive notas do mestre) ficam nos metadados do item. Enquanto o ponto está **oculto**, jogadores não o recebem; depois de revelado, um jogador técnico poderia lê-los pelo console do navegador. Não coloque nas notas nada que o grupo jamais possa ver.
