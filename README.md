# Investigação Dinâmica - Manual de Utilização

Bem-vindo ao **Investigação Dinâmica**, uma extensão para o Owlbear Rodeo desenvolvida para enriquecer campanhas de RPG com pontos de interesse interativos, pistas ocultas, testes de perícia e controle dinâmico de cenas pelo Mestre.

---

## 🧭 Como Instalar e Utilizar no VS Code (Desenvolvimento / Teste Local)

Se você baixou os códigos e deseja rodar a extensão localmente usando o Visual Studio Code, siga o passo a passo abaixo:

1. **Abra a pasta do projeto** no **VS Code**:
   * Vá em `Arquivo` > `Abrir Pasta...` e selecione o diretório da extensão.
2. **Abra o terminal integrado**:
   * No menu superior, clique em `Terminal` > `Novo Terminal` (ou use o atalho `Ctrl + ~`).
3. **Instale as dependências** (necessário apenas na primeira vez):
   * Digite o comando abaixo e aperte Enter:
     ```bash
     npm install
     ```
4. **Inicie o servidor de desenvolvimento**:
   * Execute o comando:
     ```bash
     npm run dev
     ```
   * O terminal exibirá um endereço local (geralmente `http://localhost:5173`).
5. **Conecte ao Owlbear Rodeo**:
   * Carregue a extensão no seu painel de extensões do Owlbear Rodeo apontando para a URL de desenvolvimento fornecida pelo Vite.

---

## 🛠️ Funções do Sistema

* **Pontos de Interesse (Brilhos no Mapa)**: O Mestre ou os jogadores podem posicionar marcadores interativos pelo cenário.
* **Caderno de Pistas**: Gerenciamento completo de o que os jogadores já descobriram ou deixaram passar.
* **Painel do Mestre**: Permite configurar títulos, descrições visíveis aos jogadores, notas secretas exclusivas do Mestre, além de testes associados com marcação de Dificuldade (DT) e consequências automáticas ao passar ou falhar.
* **Modo Jogador vs. Mestre**: Visualize instantaneamente o que os jogadores enxergam para evitar spoilers acidentais na mesa.