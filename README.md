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

Para uma cópia local, substitua `/workspace/Arenaquiz` pelo caminho em que o repositório foi clonado. `npm run dev` inicia o Vite em 5173 e a API Node em 3001; o Vite encaminha `/api` para ela. As seis categorias demonstrativas não precisam de credenciais. Novos temas podem ser criados sem chave, mas a pesquisa e geração automáticas exigem a configuração abaixo.

Para conferir o pacote de produção:

```bash
npm run build
npm start
```

`npm start` serve o build e a API juntos na porta **3001** (ou `PORT`). Essa é a execução indicada para hospedar a versão online. `npm run preview` continua disponível na porta 4173 apenas para a prévia estática. Processos precisam ser iniciados novamente após reiniciar o ambiente.

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
- Nome, avatar, categorias criadas, IDs de questões vistas e resultados persistem em `localStorage` sob `arena-quiz-demo-v1`. Não há sincronização entre navegadores. O histórico guarda somente resultados e estatísticas; não guarda enunciados, alternativas ou gabaritos. O banco inicial é estático; questões geradas e aprovadas são armazenadas separadamente para a simulação local. O histórico de resultados continua sem enunciados ou gabaritos.
- O duelo em andamento não persiste: recarregar interrompe a demonstração, sem criar resultado, preservando os IDs já vistos. A navegação para outras telas fica bloqueada enquanto um duelo está ativo.
- **Criar categoria** pede apenas o nome e adiciona a categoria imediatamente à lista, já selecionada. Ela fica salva neste navegador, pode ser buscada e permanece após recarregar. Nomes repetidos (ignorando acentos, maiúsculas e espaços extras) selecionam a categoria existente. A criação dispara automaticamente a pesquisa na versão online. O botão **Ver disponibilidade** permanece até haver pelo menos nove questões aprovadas, três por nível. A habilitação ocorre automaticamente, sem copiar perguntas de outros temas. O validador confere duplicatas semânticas no lote e nas questões já geradas. A fila de novas categorias é serial; reposição preventiva e prioridade de duelos bloqueados ainda são trabalho futuro.
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
- `src/services/`: persistência, cliente da geração e contratos de multiplayer futuro.
- `server/`: API, fila persistente de categorias, pesquisa web e validador em chamada separada.
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

O arquivo gerado é `downloads/Arena-Quiz.html`. Transfira esse arquivo para seu computador Windows e abra-o com dois cliques no Microsoft Edge ou Google Chrome. Ele contém os estilos, ícones, ilustração e código do jogo, e funciona sem servidor, sem `localhost` e sem conexão à internet. O HTML portátil permite criar e salvar categorias, mas **não consegue pesquisar ou gerar questões por IA**: essa etapa exige usar o endereço da versão online hospedada com o servidor e a chave configurados. Links opcionais de referências também precisam de internet.

Se receber o pacote ZIP, clique com o botão direito → **Extrair Tudo…** e abra o `Arena-Quiz.html` extraído. Não abra o jogo dentro do visualizador do ZIP. Perfil e resultados ficam no armazenamento local do navegador; mantenha o arquivo no mesmo local e use o mesmo navegador. O suporte a armazenamento em arquivos locais depende do navegador e das suas configurações. As limitações de demonstração descritas acima permanecem iguais.

Para validar o HTML autônomo: `ARENA_CHROMIUM_PATH=/usr/bin/chromium npm run test:portable` (ou omita a variável se o Playwright tiver seu próprio Chromium instalado). O teste abre o conteúdo do HTML por uma resposta em memória com o navegador offline, percorre cadastro, duelo e histórico, e verifica que nenhum recurso externo foi solicitado. Essa modalidade de teste é usada porque a política administrativa do Chromium deste ambiente bloqueia navegações `file://`; a abertura por dois cliques no Windows não foi executada neste host Linux.

## Pesquisa e geração automáticas de categorias

Na versão online, **Criar categoria** inicia este fluxo sem um segundo clique:

1. A categoria aparece imediatamente e fica salva no navegador.
2. O agente usa a Responses API da OpenAI com a ferramenta `web_search` e acesso web ativo para pesquisar o tema, planejar o escopo e escrever 12 questões (4 por nível).
3. Outra chamada, com instruções de validador independente e sem reutilizar a conversa do autor, pesquisa as fontes e verifica cada questão, gabarito, alternativas, nível e duplicatas semânticas.
4. O serviço exige uma pesquisa concluída nas duas etapas e confere se as URLs das questões aprovadas apareceram nas fontes consultadas. Falhas e referências não verificadas bloqueiam a liberação.
5. Com pelo menos 3 aprovadas em cada nível, as perguntas são salvas e a categoria passa automaticamente a **Pronta para duelos**. Durante o processamento, a interface mostra os estados de pesquisa e validação.

Isso não é instantâneo: criar o nome é imediato, mas pesquisar e validar depende da latência e da disponibilidade da API. Se a validação não produzir o mínimo, a categoria continua bloqueada e permite tentar novamente, sem inventar questões ou repetir as já vistas. A conferência automática não substitui revisão editorial humana.

### Configuração segura do servidor

- `QUIZ_AI_API_KEY`: chave própria da API da OpenAI, inserida nas configurações seguras do ambiente ou injetada como variável do servidor. **Nunca coloque a chave no HTML, no código do frontend, em um arquivo compartilhado ou no chat.** O serviço se conecta somente a `https://api.openai.com/v1/responses`. A assinatura do ChatGPT não fornece automaticamente créditos de API.
- `QUIZ_AI_MODEL`: modelo com pesquisa web e saída estruturada; padrão `gpt-4.1`. A disponibilidade e as cotas precisam ser confirmadas com a conta da API.
- `QUIZ_MAX_DAILY_GENERATIONS`: limite operacional de tentativas por dia; padrão 20. Cada tentativa usa uma chamada de autoria e outra de validação, com custos cobrados pelo provedor.
- `QUIZ_DATA_DIR`: pasta persistente; padrão `.arena-data`, ignorada pelo Git. Não há segredo nos dados de perguntas. Preserve essa pasta em reinícios/deploys.
- `PORT`: porta do servidor; padrão 3001. Os proxies HTTPS e a cadeia de certificados do ambiente são respeitados pelo cliente HTTP; não é necessário desabilitar a verificação TLS.

`GET /api/health` retorna apenas estado do serviço e presença da configuração, nunca valores de credenciais. `POST /api/categories` recebe `{id, name}` e inicia uma tarefa; `GET /api/categories/:id` retorna o progresso e somente libera as questões após a aprovação. Solicitações repetidas com o mesmo identificador reaproveitam a tarefa. Um reinício durante a geração exige nova tentativa para evitar cobranças automáticas duplicadas. A fila e os resultados são persistidos em arquivo local; a implantação suporta **uma única instância de servidor** nesta versão.

O serviço de categorias está preparado, mas **a pesquisa real ainda não foi validada com a OpenAI**, pois nenhuma chave foi fornecida neste ambiente. Os testes usam respostas controladas: verificam contratos, pesquisa obrigatória, fontes, rejeições, ativação, persistência, erros e integração com o jogo, sem cobrar uma API real. O build e o HTML offline não estabelecem que uma conta ou um modelo esteja autorizado na OpenAI.

Antes de disponibilizar publicamente um serviço com créditos reais, ainda é necessário autenticar usuários e autorizar a criação de categorias. O login permanece demonstrativo. O limite diário não substitui autenticação. A geração online também não torna o duelo multiplayer autoritativo: as perguntas aprovadas ainda são entregues ao simulador local, incluindo gabaritos, e esse transporte precisa ser substituído no backend de duelos para produção.
