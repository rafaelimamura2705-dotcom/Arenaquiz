# Arena Quiz ⚔️

**Todo conhecimento é útil.** MVP de quiz 1v1 com identidade medieval/cartoon, interface em português brasileiro e layout responsivo. Implementado conforme o `AGENTS.md`.

## Executar no navegador

Requisitos: Node.js **20.19+ ou 22.12+**, npm e um navegador atual. O ambiente de desenvolvimento foi validado com Node.js 24.19.0.

```bash
cd /workspace/Arenaquiz
npm ci
npm run dev
```

O Vite usa a porta **5173** e escuta em `0.0.0.0`. Em sua máquina, abra `http://localhost:5173` no navegador. Em um ambiente remoto, encaminhe a porta **5173** para o seu computador usando o recurso de encaminhamento de portas do seu editor/plataforma; então abra o endereço informado por esse recurso. Este projeto não publica automaticamente uma URL pública.

Para uma cópia local, substitua `/workspace/Arenaquiz` pelo caminho em que o repositório foi clonado. Nenhuma variável de ambiente, credencial, serviço externo ou banco de dados é necessário para esta versão.

Para conferir o pacote de produção:

```bash
npm run build
npm run preview
```

A prévia de produção usa a porta **4173**. Processos de desenvolvimento precisam ser iniciados novamente após reiniciar o ambiente.

## Experimentar

1. Clique em **Entrar na arena**, escolha uma das seis categorias e clique em **Buscar duelo**.
2. O pareamento local encontra **Bruna, a Sábia**, uma adversária simulada. Clique em **Estou pronto** em até 30 segundos.
3. Escolha uma alternativa e confirme antes de terminar o prazo de 25 segundos. Veja o retorno e clique em **Continuar**.
4. Cada partida tem três perguntas regulares. Quem somar mais pontos vence a partida; quem vencer duas partidas encerra o duelo. Um 2×0 termina sem uma terceira partida; em 1×1, a terceira usa perguntas especialistas.
5. Consulte o resultado final, seu perfil e o histórico. O ranking usa dados ilustrativos e filtros demonstrativos.

O cadastro/login é acessível pelo botão de perfil → **Editar nome / Entrar**. Use dados fictícios: somente o nome e avatar são salvos; e-mail e senha são descartados. Não há uma conta ou autenticação real.

### Telas

Entrada, cadastro/login simulado, seleção e busca de categorias, matchmaking simulado, confirmação de prontidão, arena, resultado de cada partida, resultado final, perfil, histórico e ranking ilustrativo. As telas públicas têm rotas por fragmento: `#home`, `#auth`, `#categories`, `#profile`, `#history` e `#ranking`. Telas de partida dependem de estado válido e não podem ser acessadas diretamente após recarregar.

## Regras implementadas e limites do MVP

- Motor separado da UI, com modelos tipados de jogador, categoria, pergunta, duelo, partida, resposta e resultado.
- Sequência de níveis: abrangente → específica → especialista. Ambos recebem a mesma questão, na mesma ordem, no simulador.
- Acerto vale 100 pontos + bônus de velocidade de até 100. Erro, ausência ou confirmação fora do prazo valem zero. A duração de 25 segundos é **provisória**, definida em `src/domain/engine.ts`; a função de pontuação e o componente da arena aceitam outra duração.
- A confirmação exige ambos prontos em até 30 segundos. Quem não confirma volta à seleção; se somente a adversária falhar, o jogador confirmado retorna à fila com prioridade e precisa confirmar o novo pareamento. A adversária padrão desta demonstração sempre confirma.
- O relógio usa um prazo absoluto: sair da aba não pausa o tempo. Uma resposta só é registrada uma vez.
- Empates usam extras inéditas do mesmo nível e contam para pontos e estatísticas. Se acabarem as extras, o duelo fica bloqueado, explicando a necessidade de geração validada. É possível encerrar apenas essa demonstração, **sem registrar vencedor ou resultado**; isso não define uma regra de abandono para produção.
- O banco contém **72 questões demonstrativas**: seis categorias, quatro perguntas por nível. São exemplos editoriais com links de referência, **não um banco aprovado por validador independente**. Pode haver apenas uma extra por nível disponível para cada par.
- Uma pergunta é marcada como vista quando aparece, mesmo sem resposta. Reservas não contam como visualização. A seleção exclui tudo que qualquer um dos dois jogadores já viu. Quando não há ao menos três inéditas em cada nível, outro duelo naquela categoria é bloqueado. Não existe fallback que repete questões.
- Nome, avatar, IDs de questões vistas e resultados persistem em `localStorage` sob `arena-quiz-demo-v1`. Não há sincronização entre navegadores. O histórico guarda somente resultados e estatísticas; não guarda enunciados, alternativas ou gabaritos. O banco de perguntas é estático neste demo.
- O duelo em andamento não persiste: recarregar interrompe a demonstração, sem criar resultado, preservando os IDs já vistos. A navegação para outras telas fica bloqueada enquanto um duelo está ativo.
- Sugestões de categoria pedem somente o nome e ficam **pendentes nesta sessão**. Não são ativadas automaticamente. A geração de escopo, perguntas, conferência independente de fontes, deduplicação semântica e fila de prioridades são integrações futuras. A ativação real exigirá ao menos nove questões aprovadas, três por nível.
- Ranking, níveis e XP são **exemplos visuais**. Não há fórmula de XP ou elegibilidade de ranking aprovada, e os duelos não alteram esses exemplos. XP não representa dinheiro; não há pagamentos ou apostas.

## Testes e build

```bash
npm test                # Vitest: regras do motor e integridade do banco
npm run build           # TypeScript + build de produção Vite
```

Testes de navegação e jogo no Chromium:

```bash
npx playwright install chromium
npm run test:e2e
```

Se o sistema já tem Chromium, não é necessário baixá-lo:

```bash
ARENA_CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e
```

O Playwright inicia seu próprio Vite na porta 5173. Os testes cobrem duelos em 2×0 e 2×1, prazo e expiração de confirmação, persistência, não repetição, cadastro/login local, categorias, perfil, filtros de ranking e telas responsivas em 390 e 1280 pixels. Cada teste usa um contexto isolado de navegador. No motor, há testes adicionais de empate com pergunta extra e falta de estoque.

## Estrutura e próximos passos

- `src/domain/`: tipos e funções puras de pontuação, seleção e encerramento.
- `src/data/demo.ts`: categorias e perguntas locais; gabaritos presentes **somente porque é uma demonstração**.
- `src/services/`: persistência e contratos de backend, matchmaking, geração e validação.
- `src/components/`: ilustração SVG própria, componentes compartilhados, confirmação e arena.
- `src/App.tsx`: navegação, orquestração e telas.
- `src/styles.css`: identidade visual, estados interativos e breakpoints.
- `e2e/`: testes reais de navegador.

A evolução para produção requer autenticação, persistência de servidor, reservas transacionais, presença, WebSocket e **servidor autoritativo** para relógio, respostas, pontuação e conclusão. Gabaritos de partidas ativas jamais devem ser enviados ao cliente em produção. A demo local não oferece segurança contra manipulação de pontuação. Reconexão, contestação, moderação, política de abandono e critérios oficiais de XP/ranking ainda não foram implementados nem definidos nesta entrega.

## Versão portátil para Windows (sem instalar Node.js)

Para exportar uma versão que abre diretamente no navegador:

```bash
npm run build:portable
```

O arquivo gerado é `downloads/Arena-Quiz.html`. Transfira esse arquivo para seu computador Windows e abra-o com dois cliques no Microsoft Edge ou Google Chrome. Ele contém os estilos, ícones, ilustração e código do jogo, e funciona sem servidor, sem `localhost` e sem conexão à internet. Somente os links opcionais de referências das questões precisam de internet.

Se receber o pacote ZIP, clique com o botão direito → **Extrair Tudo…** e abra o `Arena-Quiz.html` extraído. Não abra o jogo dentro do visualizador do ZIP. Perfil e resultados ficam no armazenamento local do navegador; mantenha o arquivo no mesmo local e use o mesmo navegador. O suporte a armazenamento em arquivos locais depende do navegador e das suas configurações. As limitações de demonstração descritas acima permanecem iguais.

Para validar o HTML autônomo: `ARENA_CHROMIUM_PATH=/usr/bin/chromium npm run test:portable` (ou omita a variável se o Playwright tiver seu próprio Chromium instalado). O teste abre o conteúdo do HTML por uma resposta em memória com o navegador offline, percorre cadastro, duelo e histórico, e verifica que nenhum recurso externo foi solicitado. Essa modalidade de teste é usada porque a política administrativa do Chromium deste ambiente bloqueia navegações `file://`; a abertura por dois cliques no Windows não foi executada neste host Linux.
