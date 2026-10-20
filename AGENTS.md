# Arena Quiz — instruções para o Codex

## Objetivo
Desenvolver um quiz competitivo 1v1 para navegador, responsivo (desktop e celular), com identidade medieval/cartoon e slogan "Todo conhecimento é útil". Priorizar um MVP navegável, depois conectar multiplayer e IA. Idioma da interface: português brasileiro.

## Primeira entrega
Criar projeto executável (preferir TypeScript, React e Vite, salvo justificativa), com README de instalação, componentes reutilizáveis, visual consistente e dados demonstrativos explicitamente identificados. Telas: entrada, cadastro/login simulado, seleção/busca de categorias, matchmaking simulado, confirmação "Estou pronto", arena de perguntas, resultado por partida, resultado final, perfil, histórico e ranking ilustrativo. Navegação real entre telas; estado consistente. Não afirmar que recursos simulados são produção.

## Regras confirmadas
- Duelo 1v1, melhor de 3 partidas; cada partida tem 3 perguntas regulares, quatro alternativas, uma correta.
- Partida 1 abrangente, 2 específica, 3 especialista. Mesmas perguntas na mesma ordem para ambos.
- Vencedor da partida: maior soma de pontos de suas perguntas. Vencedor do duelo: primeiro a vencer 2 partidas. Encerrar imediatamente em 2x0; caso 1x1, jogar a terceira.
- Acerto: 100 pontos + bônus de velocidade de até 100. Erro/sem resposta: 0. Duração da pergunta de 25s é provisória, configurável, não regra final.
- Empate na partida: perguntas extras inéditas, validadas, do mesmo nível para ambos, até desempatar. Contam para pontuação e estatísticas.
- Perguntas nunca se repetem para um jogador depois de exibidas, mesmo sem resposta. Para um par, excluir perguntas já vistas por qualquer dos dois. Reservar não é marcar como vista.
- Categoria criada pelo usuário digitando apenas nome; IA planeja escopo, gera perguntas, e validador independente confere fontes e conteúdo. Ativar categoria com mínimo 9 questões aprovadas (3 por nível). Filtrar duplicatas semânticas.
- Fila de geração: duelos bloqueados > categoria nova > reposição preventiva. Se faltarem perguntas, aguardar geração; nunca repetir.
- Matchmaking: preparar perguntas elegíveis, checar presença, reservar, exigir clique "Estou pronto" dos dois em até 30 segundos. Se um falhar, outro volta à fila com prioridade e nova confirmação no próximo pareamento.
- Servidor autoritativo para relógio, respostas, pontuação e conclusão; WebSocket para multiplayer futuro. Queda durante pergunta não pausa prazo; reconexão pode responder antes do fim.
- Histórico visível: apenas resultados e estatísticas, nunca enunciados, alternativas ou gabaritos antigos. Backend pode guardar IDs/versões para auditoria.
- Progressão apenas por XP acumulativo (sem ligas ou patentes competitivas); XP não é saldo financeiro. Fórmula de XP e curva de níveis ainda NÃO aprovadas.
- Rankings geral, por categoria e por período são desejados; fórmula e elegibilidade ainda NÃO aprovadas.
- Correção de perguntas após contestação vale para duelos futuros, não reabre duelos concluídos.

## Pontos ainda não decididos
Fórmula exata de XP e curva de níveis; critério de ranking; tempo final por pergunta; regras de desistência/abandono; economia/moedas e aspectos legais; autenticação, infraestrutura e moderação. Tratar valores de demonstração como placeholders configuráveis, sem assumir decisão definitiva.

## Arquitetura futura
Separar motor de duelo de UI; modelos tipados de Player, Category, Question, Duel, Round, Answer, Result; funções puras para pontuação e encerramento; interfaces para backend, matchmaking, geração/validação de questões. Nunca enviar gabaritos de partidas ativas ao cliente em produção. Preparar testes unitários para melhor-de-três, empate e não repetição.

## Fluxo de trabalho
Implementar primeira versão visual e navegável, rodar testes/build, explicar como visualizar e quais partes ainda são simuladas. Evitar adicionar pagamentos/apostas nesta fase.
