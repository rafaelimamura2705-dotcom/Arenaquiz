import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ArenaArt } from "./components/Art";
import { DemoNote, Icon, SectionTitle } from "./components/ui";
import { Matchmaking, Ready } from "./components/Matchmaking";
import { Arena } from "./components/Arena";
import {
  categories,
  illustrativeHistory,
  opponent,
  questions,
} from "./data/demo";
import {
  createDuel,
  createRound,
  eligibleQuestions,
  finishRound,
  LEVELS,
  markSeen,
  total,
} from "./domain/engine";
import type { Answer, Duel, Result, Screen } from "./domain/types";
import { loadData, STORAGE_KEY } from "./services/storage";
const publicScreens: Screen[] = [
  "home",
  "auth",
  "categories",
  "profile",
  "history",
  "ranking",
];
const navItems: [Screen, string, string][] = [
  ["home", "Início", "castle"],
  ["categories", "Categorias", "book"],
  ["ranking", "Ranking", "trophy"],
  ["history", "Histórico", "scroll"],
];
function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
function initialScreen(): Screen {
  const hash = location.hash.slice(1) as Screen;
  return publicScreens.includes(hash) ? hash : "home";
}
export default function App() {
  const [screen, setScreen] = useState<Screen>(initialScreen),
    [data, setData] = useState(loadData),
    [categoryId, setCategoryId] = useState("history"),
    [search, setSearch] = useState(""),
    [menu, setMenu] = useState(false),
    [toast, setToast] = useState(""),
    [duel, setDuel] = useState<Duel | null>(null),
    [questionIndex, setQuestionIndex] = useState(0),
    [blocked, setBlocked] = useState(""),
    [priority, setPriority] = useState(false),
    [modal, setModal] = useState(false),
    [requested, setRequested] = useState<string[]>([]),
    [authTab, setAuthTab] = useState<"login" | "signup">("signup"),
    [rankingCategory, setRankingCategory] = useState("all"),
    [period, setPeriod] = useState("week");
  const reservations = useRef<string[][]>([]);
  const contentRef = useRef<HTMLElement>(null);
  const navGuard = useRef({ screen, duel });
  navGuard.current = { screen, duel };
  const category = categories.find((c) => c.id === categoryId)!;
  const visibleCategories = categories.filter((c) =>
    normalizeSearch(`${c.name} ${c.description}`).includes(
      normalizeSearch(search),
    ),
  );
  const currentRound = duel?.rounds.at(-1),
    currentQuestion = currentRound
      ? questions.find((q) => q.id === currentRound.questionIds[questionIndex])
      : undefined;
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      setToast(
        "O navegador não permitiu salvar os dados. O progresso fica apenas nesta sessão.",
      );
    }
  }, [data]);
  useEffect(() => {
    const listener = () => {
      const requested = location.hash.slice(1) as Screen;
      const current = navGuard.current;
      if (
        current.duel?.status === "active" &&
        ["arena", "round-result"].includes(current.screen)
      ) {
        if (requested !== current.screen) {
          history.replaceState(null, "", `#${current.screen}`);
          setToast("Conclua o duelo antes de sair da arena.");
        }
        return;
      }
      if (publicScreens.includes(requested)) setScreen(requested);
      else if (requested !== current.screen) {
        setScreen("home");
        history.replaceState(null, "", "#home");
      }
    };
    window.addEventListener("hashchange", listener);
    window.addEventListener("popstate", listener);
    return () => {
      window.removeEventListener("hashchange", listener);
      window.removeEventListener("popstate", listener);
    };
  }, []);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    contentRef.current?.focus();
    setMenu(false);
  }, [screen]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 6500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (screen === "arena" && currentQuestion)
      setData((prev) => ({
        ...prev,
        seen: {
          ...prev.seen,
          [prev.player.id]: markSeen(
            prev.seen[prev.player.id] ?? [],
            currentQuestion.id,
          ),
          [opponent.id]: markSeen(
            prev.seen[opponent.id] ?? [],
            currentQuestion.id,
          ),
        },
      }));
  }, [screen, currentQuestion?.id]);
  function go(next: Screen, internal = false) {
    if (
      !internal &&
      duel?.status === "active" &&
      ["arena", "round-result"].includes(screen)
    ) {
      setToast("Conclua o duelo antes de sair da arena.");
      return;
    }
    history.pushState(null, "", `#${next}`);
    setScreen(next);
  }
  function selectCategory(id: string) {
    setCategoryId(id);
    setBlocked("");
    go("categories");
  }
  function startQueue() {
    const bank = questions.filter((q) => q.categoryId === categoryId);
    const eligible = LEVELS.map((level) =>
      eligibleQuestions(
        bank,
        level,
        data.seen[data.player.id] ?? [],
        data.seen[opponent.id] ?? [],
      )
        .slice(0, 3)
        .map((q) => q.id),
    );
    if (eligible.some((list) => list.length < 3)) {
      setBlocked(
        "O estoque de perguntas inéditas desta categoria acabou para este par. Uma nova geração validada seria necessária. A IA ainda não está conectada nesta demonstração; explore outra categoria.",
      );
      return;
    }
    reservations.current = eligible;
    setBlocked("");
    setPriority(false);
    setDuel(null);
    go("matchmaking");
  }
  const found = useCallback(() => {
    history.pushState(null, "", "#ready");
    setScreen("ready");
  }, []);
  const timedOut = useCallback((priorityEligible: boolean) => {
    setPriority(priorityEligible);
    const next = priorityEligible ? "matchmaking" : "categories";
    history.pushState(null, "", `#${next}`);
    setScreen(next);
    setToast(
      priorityEligible
        ? "A adversária não confirmou. Você voltou à fila com prioridade e precisa confirmar o novo pareamento."
        : "Você não confirmou a tempo. Faça uma nova busca quando estiver pronto. A prioridade seria da adversária que confirmou.",
    );
  }, []);
  function startDuel() {
    setDuel(
      createDuel(
        crypto.randomUUID(),
        categoryId,
        [data.player, opponent],
        reservations.current[0],
      ),
    );
    setQuestionIndex(0);
    go("arena", true);
  }
  function recordAnswers(a: Answer, b: Answer) {
    setDuel((prev) => {
      if (!prev || prev.status === "complete") return prev;
      const round = prev.rounds.at(-1)!;
      if (round.answers[0].some((answer) => answer.questionId === a.questionId))
        return prev;
      return {
        ...prev,
        rounds: [
          ...prev.rounds.slice(0, -1),
          {
            ...round,
            answers: [
              [...round.answers[0], a],
              [...round.answers[1], b],
            ],
          },
        ],
      };
    });
  }
  function nextQuestion() {
    if (!duel || !currentRound) return;
    if (questionIndex < 2) {
      setQuestionIndex((i) => i + 1);
      return;
    }
    const finished = finishRound(duel);
    if (finished.rounds.at(-1)!.winner !== null) {
      setDuel(finished);
      go("round-result", true);
      return;
    }
    const extra = eligibleQuestions(
      questions.filter((q) => q.categoryId === categoryId),
      currentRound.level,
      data.seen[data.player.id] ?? [],
      data.seen[opponent.id] ?? [],
      currentRound.questionIds,
    )[0];
    if (!extra) {
      setBlocked(
        "Empate! O banco local não tem mais perguntas inéditas deste nível. Em produção, o duelo aguardará geração e validação. Não vamos repetir questões.",
      );
      return;
    }
    setDuel({
      ...duel,
      rounds: [
        ...duel.rounds.slice(0, -1),
        {
          ...currentRound,
          questionIds: [...currentRound.questionIds, extra.id],
        },
      ],
    });
    setQuestionIndex((i) => i + 1);
    setToast(
      "Pontuação empatada: uma pergunta extra inédita do mesmo nível decide a partida.",
    );
  }
  function continueDuel() {
    if (!duel) return;
    if (duel.status === "complete") {
      const answers = duel.rounds.flatMap((r) => r.answers[0]);
      const result: Result = {
        id: duel.id,
        date: new Date().toLocaleDateString("pt-BR"),
        category: category.name,
        opponent: opponent.name,
        wins: duel.wins,
        winner: duel.winner!,
        points: total(answers),
        correct: answers.filter((a) => a.points > 0).length,
        questions: answers.length,
      };
      setData((prev) =>
        prev.results.some((r) => r.id === result.id)
          ? prev
          : { ...prev, results: [result, ...prev.results].slice(0, 100) },
      );
      go("final-result", true);
      return;
    }
    setDuel({
      ...duel,
      rounds: [
        ...duel.rounds,
        createRound(
          duel.rounds.length,
          reservations.current[duel.rounds.length],
        ),
      ],
    });
    setQuestionIndex(0);
    go("arena", true);
  }
  function authenticate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = new FormData(e.currentTarget).get("name")?.toString().trim();
    if (!name) {
      setToast("Escolha um nome com pelo menos uma letra ou número.");
      return;
    }
    setData((prev) => ({
      ...prev,
      player: { ...prev.player, name: name.slice(0, 24) },
    }));
    setToast(
      `Bem-vindo à arena, ${name}! Perfil demonstrativo salvo neste navegador.`,
    );
    go("categories");
  }
  const played = data.results.length,
    won = data.results.filter((r) => r.winner === 0).length,
    correct = data.results.reduce((n, r) => n + r.correct, 0),
    answered = data.results.reduce((n, r) => n + r.questions, 0);
  function ResultTable({
    results,
    example = false,
  }: {
    results: Result[];
    example?: boolean;
  }) {
    return (
      <div className="result-list">
        {results.map((r) => (
          <div className="result-row" key={r.id}>
            <span
              className={`result-emblem ${r.winner === 0 ? "win" : "loss"}`}
            >
              <Icon name={r.winner === 0 ? "trophy" : "shield"} size={22} />
            </span>
            <div className="result-name">
              <strong>{r.category}</strong>
              <small>
                vs. {r.opponent} {example && "· exemplo"}
              </small>
            </div>
            <div className="result-value">
              <strong>{r.wins.join(" × ")}</strong>
              <small>{r.winner === 0 ? "Vitória" : "Derrota"}</small>
            </div>
            <div className="result-detail">
              <strong>{r.points.toLocaleString("pt-BR")} pts</strong>
              <small>
                {r.correct}/{r.questions} acertos · {r.date}
              </small>
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <>
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          contentRef.current?.focus();
        }}
      >
        Pular para o conteúdo
      </a>
      <header className="site-header">
        <div className="header-inner">
          <button
            className="brand"
            onClick={() => go("home")}
            aria-label="Arena Quiz, início"
          >
            <span className="brand-shield">
              <Icon name="swords" size={25} />
            </span>
            <span>
              ARENA<span className="brand-quiz">QUIZ</span>
            </span>
          </button>
          <nav aria-label="Navegação principal" className={menu ? "open" : ""}>
            {navItems.map(([key, label, icon]) => (
              <button
                key={key}
                className={screen === key ? "nav-item active" : "nav-item"}
                onClick={() => go(key)}
                aria-current={screen === key ? "page" : undefined}
              >
                <Icon name={icon} size={17} />
                {label}
              </button>
            ))}
          </nav>
          <div className="header-actions">
            <span className="demo-badge">
              <i /> DEMO
            </span>
            <button
              className={`profile-button ${screen === "profile" ? "active" : ""}`}
              onClick={() => go("profile")}
              aria-label="Meu perfil"
            >
              <span>{data.player.avatar}</span>
              <span className="profile-label">{data.player.name}</span>
              <Icon name="chevron" size={15} />
            </button>
            <button
              className="menu-toggle"
              aria-label="Abrir menu"
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              <Icon name={menu ? "x" : "menu"} />
            </button>
          </div>
        </div>
      </header>
      <main
        id="main"
        tabIndex={-1}
        ref={contentRef}
        className={`main-content screen-${screen}`}
      >
        {screen === "home" && (
          <>
            <section className="hero">
              <div className="hero-copy">
                <span className="hero-tag">
                  <span /> SUA PRÓXIMA GRANDE AVENTURA
                </span>
                <h1>
                  Sua mente.
                  <br />
                  Sua melhor <em>arma.</em>
                </h1>
                <p>
                  Entre na arena, desafie seus conhecimentos e transforme cada
                  resposta em uma conquista.
                </p>
                <div className="hero-buttons">
                  <button
                    className="btn gold big"
                    onClick={() => go("categories")}
                  >
                    <Icon name="swords" />
                    Entrar na arena
                    <Icon name="arrow" size={18} />
                  </button>
                  <button
                    className="hero-secondary"
                    onClick={() => {
                      document
                        .getElementById("how-it-works")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    Como jogar <Icon name="help" size={17} />
                  </button>
                </div>
                <div className="hero-caption">
                  <span className="little-shield">
                    <Icon name="shield" size={16} />
                  </span>
                  Todo conhecimento é útil.
                </div>
              </div>
              <div className="hero-illustration">
                <div className="floating-label label-top">
                  <Icon name="sparkles" size={16} />
                  Uma nova jornada começa
                </div>
                <ArenaArt />
                <div className="floating-label label-bottom">
                  <Icon name="swords" size={18} />
                  Duelos 1 vs 1<span>Melhor de 3</span>
                </div>
              </div>
            </section>
            <div className="feature-strip">
              <div>
                <Icon name="swords" />
                <span>
                  <strong>Um duelo. Duas mentes.</strong>
                  <small>Conhecimento frente a frente</small>
                </span>
              </div>
              <div>
                <Icon name="book" />
                <span>
                  <strong>Escolha seu território</strong>
                  <small>Categorias para toda curiosidade</small>
                </span>
              </div>
              <div>
                <Icon name="trophy" />
                <span>
                  <strong>Aprenda a cada batalha</strong>
                  <small>A evolução é a sua recompensa</small>
                </span>
              </div>
            </div>
            <section className="home-categories">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">QUAL É A SUA ESPECIALIDADE?</span>
                  <h2>Escolha seu campo de batalha</h2>
                </div>
                <button
                  className="text-button"
                  onClick={() => go("categories")}
                >
                  Ver todas as categorias <Icon name="arrow" size={17} />
                </button>
              </div>
              <div className="category-grid home-grid">
                {categories.slice(0, 3).map((c) => (
                  <button
                    key={c.id}
                    className={`category-card ${c.color}`}
                    onClick={() => selectCategory(c.id)}
                  >
                    <span className="category-art">
                      <Icon name={c.icon} size={42} />
                      <i className="art-star one">✦</i>
                      <i className="art-star two">✧</i>
                    </span>
                    <span className="category-body">
                      <small>{c.tag}</small>
                      <strong>{c.name}</strong>
                      <span>{c.description}</span>
                    </span>
                    <span className="category-bottom">
                      12 perguntas demonstrativas{" "}
                      <Icon name="arrow" size={17} />
                    </span>
                  </button>
                ))}
              </div>
            </section>
            <section className="how-section" id="how-it-works">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">SEU GUIA PARA A ARENA</span>
                  <h2>Uma aventura em três passos</h2>
                </div>
                <span className="scribble">
                  Coragem. Curiosidade. Conhecimento.
                </span>
              </div>
              <div className="steps">
                {[
                  [
                    "01",
                    "Escolha uma categoria",
                    "Da História à Ciência, encontre o tema que desperta sua curiosidade.",
                    "book",
                  ],
                  [
                    "02",
                    "Encontre seu desafio",
                    "Confirme que está pronto e enfrente uma adversária simulada.",
                    "swords",
                  ],
                  [
                    "03",
                    "Conquiste a vitória",
                    "Responda com precisão e agilidade. Quem vencer 2 partidas leva o duelo.",
                    "trophy",
                  ],
                ].map(([n, title, text, icon]) => (
                  <div className="step" key={n}>
                    <div>
                      <span>{n}</span>
                      <Icon name={icon} size={23} />
                    </div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                ))}
              </div>
            </section>
            <DemoNote />
          </>
        )}
        {screen === "auth" && (
          <div className="auth-layout">
            <div className="auth-story">
              <span className="eyebrow">O CONHECIMENTO ABRE PORTÕES</span>
              <h1>
                Toda lenda começa
                <br />
                com um nome.
              </h1>
              <ArenaArt />
              <p>Crie sua identidade e escreva o próximo capítulo na arena.</p>
            </div>
            <div className="panel auth-panel">
              <div className="auth-tabs">
                <button
                  className={authTab === "signup" ? "active" : ""}
                  onClick={() => setAuthTab("signup")}
                >
                  Criar perfil
                </button>
                <button
                  className={authTab === "login" ? "active" : ""}
                  onClick={() => setAuthTab("login")}
                >
                  Entrar
                </button>
              </div>
              <h2>
                {authTab === "signup"
                  ? "Bem-vindo, aventureiro!"
                  : "Bom ter você de volta!"}
              </h2>
              <p>
                Simulação local. Use dados fictícios; não há uma conta real ou
                autenticação.
              </p>
              <form onSubmit={authenticate}>
                <label>
                  Nome na arena
                  <input
                    name="name"
                    placeholder="Como devemos chamar você?"
                    required
                    maxLength={24}
                    minLength={2}
                    autoComplete="off"
                    defaultValue={
                      data.player.name === "Aventureiro" ? "" : data.player.name
                    }
                  />
                </label>
                <label>
                  E-mail fictício
                  <input
                    name="email"
                    type="email"
                    placeholder="aventureiro@exemplo.com"
                    autoComplete="off"
                    required
                  />
                </label>
                <label>
                  Senha fictícia
                  <input
                    name="password"
                    type="password"
                    minLength={6}
                    placeholder="6 ou mais caracteres"
                    autoComplete="new-password"
                    required
                  />
                </label>
                <small className="fine-print">
                  E-mail e senha não são enviados nem armazenados. Só o nome
                  fica neste navegador.
                </small>
                <button className="btn primary big" type="submit">
                  {authTab === "signup"
                    ? "Começar minha jornada"
                    : "Entrar na arena"}
                  <Icon name="arrow" />
                </button>
              </form>
              <button className="text-button" onClick={() => go("categories")}>
                Continuar como aventureiro
              </button>
            </div>
          </div>
        )}
        {screen === "categories" && (
          <>
            <SectionTitle
              eyebrow="SEU CONHECIMENTO, SEU TERRITÓRIO"
              title="Escolha seu campo de batalha"
              subtitle="O primeiro passo para uma grande disputa é uma boa dose de curiosidade."
            />
            <div className="category-toolbar">
              <label className="search-field">
                <Icon name="search" />
                <input
                  aria-label="Buscar categorias"
                  placeholder="Buscar uma categoria…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    aria-label="Limpar busca"
                    onClick={() => setSearch("")}
                  >
                    <Icon name="x" size={16} />
                  </button>
                )}
              </label>
              <button className="btn secondary" onClick={() => setModal(true)}>
                <Icon name="plus" size={18} />
                Sugerir categoria
              </button>
            </div>
            <div className="category-grid">
              {visibleCategories.map((c) => (
                <button
                  key={c.id}
                  className={`category-card compact ${c.color} ${categoryId === c.id ? "chosen" : ""}`}
                  aria-pressed={categoryId === c.id}
                  onClick={() => {
                    setCategoryId(c.id);
                    setBlocked("");
                  }}
                >
                  <span className="category-art">
                    <Icon name={c.icon} size={36} />
                    <i className="art-star one">✦</i>
                  </span>
                  <span className="category-body">
                    <small>{c.tag}</small>
                    <strong>{c.name}</strong>
                    <span>{c.description}</span>
                  </span>
                  <span className="category-bottom">
                    <span>
                      {
                        questions.filter(
                          (q) =>
                            q.categoryId === c.id &&
                            !new Set([
                              ...(data.seen[data.player.id] ?? []),
                              ...(data.seen[opponent.id] ?? []),
                            ]).has(q.id),
                        ).length
                      }{" "}
                      inéditas · 3 níveis
                    </span>
                    <Icon
                      name={categoryId === c.id ? "success" : "arrow"}
                      size={19}
                    />
                  </span>
                </button>
              ))}
            </div>
            {visibleCategories.length === 0 && search && (
              <p className="fine-print">
                Não encontrou seu tema? Você pode sugerir uma categoria. A
                geração por IA é uma integração futura.
              </p>
            )}
            {requested.length > 0 && (
              <div className="panel pending-categories">
                <strong>Sugestões desta sessão</strong>
                {requested.map((name) => (
                  <p key={name}>
                    {name}
                    <span className="pill">Pendente · IA não conectada</span>
                  </p>
                ))}
                <small>
                  Uma categoria real só será ativada com pelo menos 9 questões
                  aprovadas, 3 por nível.
                </small>
              </div>
            )}
            {blocked && (
              <div className="notice" role="alert">
                <Icon name="clock" />
                <p>{blocked}</p>
              </div>
            )}
            <div className="play-bar">
              <div>
                <span className={`category-mini ${category.color}`}>
                  <Icon name={category.icon} />
                </span>
                <div>
                  <strong>{category.name}</strong>
                  <small>1 vs 1 · Melhor de 3 · Adversária simulada</small>
                </div>
              </div>
              <button className="btn primary" onClick={startQueue}>
                <Icon name="swords" />
                Buscar duelo
                <Icon name="arrow" size={17} />
              </button>
            </div>
            <DemoNote>
              Banco demonstrativo com referências editoriais. Não passou por um
              validador independente; a IA ainda não está conectada.
            </DemoNote>
          </>
        )}
        {screen === "matchmaking" && (
          <Matchmaking
            category={category.name}
            priority={priority}
            onFound={found}
            onCancel={() => go("categories")}
          />
        )}
        {screen === "ready" && (
          <Ready
            player={data.player}
            opponent={opponent}
            category={category.name}
            onStart={startDuel}
            onTimeout={timedOut}
            onCancel={() => go("categories")}
          />
        )}
        {screen === "arena" && duel && currentQuestion && (
          <>
            <Arena
              key={currentQuestion.id}
              duel={duel}
              question={currentQuestion}
              index={questionIndex}
              onAnswer={recordAnswers}
              onNext={nextQuestion}
            />
            {blocked && (
              <div className="notice" role="alert">
                <Icon name="clock" />
                <div>
                  <p>{blocked}</p>
                  <button
                    className="text-button"
                    onClick={() => {
                      setDuel(null);
                      setBlocked("");
                      go("categories", true);
                      setToast(
                        "Demonstração interrompida por falta de questões. Nenhum resultado foi registrado.",
                      );
                    }}
                  >
                    Encerrar demonstração sem resultado
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        {screen === "round-result" && duel && currentRound && (
          <div className="narrow">
            <SectionTitle
              eyebrow={`PARTIDA ${duel.rounds.length} · ${currentRound.level.toUpperCase()}`}
              title={
                currentRound.winner === 0
                  ? "Essa partida é sua!"
                  : "A disputa continua!"
              }
              subtitle={
                duel.status === "complete"
                  ? "Temos um vencedor do duelo. Veja o resultado final."
                  : "Respire fundo. A próxima partida traz um novo nível de desafio."
              }
            />
            <div className="panel round-panel">
              <div className="award-icon">
                <Icon
                  name={currentRound.winner === 0 ? "trophy" : "shield"}
                  size={48}
                />
              </div>
              <h2>
                {currentRound.winner === 0 ? data.player.name : opponent.name}{" "}
                venceu a partida
              </h2>
              <div className="round-scores">
                <div>
                  <span>{data.player.avatar} Você</span>
                  <strong>{total(currentRound.answers[0])}</strong>
                  <small>pontos</small>
                </div>
                <span>×</span>
                <div>
                  <span>{opponent.avatar} Bruna</span>
                  <strong>{total(currentRound.answers[1])}</strong>
                  <small>pontos</small>
                </div>
              </div>
              <div className="round-progress">
                {LEVELS.map((level, i) => (
                  <div
                    className={i < duel.rounds.length ? "done" : ""}
                    key={level}
                  >
                    <span>
                      {i < duel.rounds.length ? (
                        <Icon
                          name={
                            duel.rounds[i].winner === 0 ? "trophy" : "shield"
                          }
                          size={18}
                        />
                      ) : (
                        i + 1
                      )}
                    </span>
                    <small>{level}</small>
                  </div>
                ))}
              </div>
              <div className="duel-tally">
                Placar do duelo <strong>{duel.wins.join(" × ")}</strong>
              </div>
              <button className="btn primary big" onClick={continueDuel}>
                {duel.status === "complete"
                  ? "Ver resultado final"
                  : `Ir para a ${duel.rounds.length + 1}ª partida`}
                <Icon name="arrow" />
              </button>
            </div>
          </div>
        )}
        {screen === "final-result" && duel && (
          <div className="narrow">
            <SectionTitle
              eyebrow="AS ESPADAS DESCANSAM. O CONHECIMENTO FICA."
              title={
                duel.winner === 0
                  ? "Uma vitória para a história!"
                  : "Todo duelo ensina algo novo."
              }
              subtitle={
                duel.winner === 0
                  ? "Sua curiosidade conquistou a arena. Que venha a próxima aventura."
                  : "Hoje a Bruna levou a melhor. Sua próxima conquista está logo ali."
              }
            />
            <div className="panel final-panel">
              <span className="confetti">✦ ✧ ✦</span>
              <div className="award-icon">
                <Icon
                  name={duel.winner === 0 ? "trophy" : "shield"}
                  size={60}
                />
              </div>
              <h2>
                {duel.winner === 0 ? "Duelo vencido!" : "Duelo concluído"}
              </h2>
              <p>{category.name} · adversária simulada</p>
              <div className="final-score">
                <span>
                  {data.player.avatar}
                  <small>Você</small>
                </span>
                <strong>{duel.wins.join(" : ")}</strong>
                <span>
                  {opponent.avatar}
                  <small>Bruna</small>
                </span>
              </div>
              <div className="stats-grid three">
                <Stat
                  icon="target"
                  value={`${duel.rounds.flatMap((r) => r.answers[0]).filter((a) => a.points > 0).length}/${duel.rounds.flatMap((r) => r.answers[0]).length}`}
                  label="Acertos"
                />
                <Stat
                  icon="zap"
                  value={total(
                    duel.rounds.flatMap((r) => r.answers[0]),
                  ).toLocaleString("pt-BR")}
                  label="Pontos"
                />
                <Stat
                  icon="flag"
                  value={String(duel.rounds.length)}
                  label="Partidas"
                />
              </div>
              <button
                className="btn primary big"
                onClick={() => {
                  setDuel(null);
                  go("categories");
                }}
              >
                <Icon name="swords" />
                Explorar outro desafio
              </button>
              <button className="text-button" onClick={() => go("history")}>
                Ver meu histórico
                <Icon name="arrow" size={17} />
              </button>
            </div>
          </div>
        )}
        {screen === "profile" && (
          <>
            <SectionTitle
              eyebrow="O AVENTUREIRO POR TRÁS DAS RESPOSTAS"
              title="Meu perfil"
              subtitle="Cada pergunta é um novo passo na sua jornada."
            />
            <div className="profile-layout">
              <section className="panel profile-card">
                <span className="avatar portrait">{data.player.avatar}</span>
                <h2>{data.player.name}</h2>
                <span className="pill">Aventureiro do conhecimento</span>
                <p>Seu perfil é local e demonstrativo.</p>
                <button className="btn secondary" onClick={() => go("auth")}>
                  <Icon name="user" size={17} />
                  Editar nome / Entrar
                </button>
                <div className="avatar-picker">
                  <span>Escolha seu avatar</span>
                  <div>
                    {["🧑‍🚀", "🧙‍♀️", "🧝", "🦉", "🦊"].map((avatar) => (
                      <button
                        key={avatar}
                        className={
                          avatar === data.player.avatar ? "selected" : ""
                        }
                        aria-label={`Usar avatar ${avatar}`}
                        aria-pressed={avatar === data.player.avatar}
                        onClick={() =>
                          setData((prev) => ({
                            ...prev,
                            player: { ...prev.player, avatar },
                          }))
                        }
                      >
                        {avatar}
                      </button>
                    ))}
                  </div>
                </div>
              </section>
              <div>
                <div className="stats-grid">
                  <Stat
                    icon="swords"
                    value={String(played)}
                    label="Duelos jogados"
                  />
                  <Stat icon="trophy" value={String(won)} label="Vitórias" />
                  <Stat
                    icon="target"
                    value={
                      answered
                        ? `${Math.round((correct / answered) * 100)}%`
                        : "—"
                    }
                    label="Precisão"
                  />
                  <Stat
                    icon="book"
                    value={String(data.seen[data.player.id]?.length ?? 0)}
                    label="Perguntas vistas"
                  />
                </div>
                <section className="panel progress-panel">
                  <span className="eyebrow">UM VISLUMBRE DA SUA JORNADA</span>
                  <h2>Conhecimento que evolui com você</h2>
                  <div className="xp-example">
                    <span className="xp-level">7</span>
                    <div>
                      <strong>
                        Nível 7 <span className="pill">Exemplo visual</span>
                      </strong>
                      <div className="xp-track">
                        <span />
                      </div>
                      <small>720 / 1.000 XP · valores ilustrativos</small>
                    </div>
                    <Icon name="sparkles" size={30} />
                  </div>
                  <p>
                    XP será acumulativo, sem ligas ou patentes. A fórmula de XP
                    e a curva de níveis ainda precisam ser aprovadas; seus
                    duelos não alteram este exemplo.
                  </p>
                </section>
                <section className="panel">
                  <div className="section-heading">
                    <h2>Últimos desafios</h2>
                    <button
                      className="text-button"
                      onClick={() => go("history")}
                    >
                      Ver histórico
                      <Icon name="arrow" size={16} />
                    </button>
                  </div>
                  {data.results.length ? (
                    <ResultTable results={data.results.slice(0, 3)} />
                  ) : (
                    <Empty onPlay={() => go("categories")} />
                  )}
                </section>
              </div>
            </div>
          </>
        )}
        {screen === "history" && (
          <>
            <SectionTitle
              eyebrow="AS HISTÓRIAS QUE VOCÊ LEVA DA ARENA"
              title="Histórico de duelos"
              subtitle="Resultados e estatísticas da sua jornada. As perguntas antigas ficam fora deste registro."
            />
            <div className="stats-grid three">
              <Stat
                icon="swords"
                value={String(played)}
                label="Duelos locais"
              />
              <Stat icon="trophy" value={String(won)} label="Vitórias locais" />
              <Stat
                icon="target"
                value={
                  answered ? `${Math.round((correct / answered) * 100)}%` : "—"
                }
                label="Precisão local"
              />
            </div>
            <section className="panel">
              <div className="section-heading">
                <h2>Seus duelos</h2>
                <span className="pill">Salvos neste navegador</span>
              </div>
              {data.results.length ? (
                <ResultTable results={data.results} />
              ) : (
                <Empty onPlay={() => go("categories")} />
              )}
            </section>
            <section className="panel example-panel">
              <div className="section-heading">
                <h2>Como seu histórico vai aparecer</h2>
                <span className="pill">Dados ilustrativos</span>
              </div>
              <ResultTable results={illustrativeHistory} example />
            </section>
            <DemoNote>
              O histórico guarda apenas resultado, placar e estatísticas. Não
              armazena enunciados, alternativas nem gabaritos antigos.
            </DemoNote>
          </>
        )}
        {screen === "ranking" && (
          <>
            <SectionTitle
              eyebrow="CURIOSIDADE MERECE SER CELEBRADA"
              title="O mural dos aventureiros"
              subtitle="Encontre inspiração entre as mentes mais curiosas da arena."
            />
            <div className="ranking-toolbar">
              <div className="period-tabs" aria-label="Período do ranking">
                {[
                  ["week", "Esta semana"],
                  ["month", "Este mês"],
                  ["all", "Todo o período"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    className={period === key ? "active" : ""}
                    aria-pressed={period === key}
                    onClick={() => setPeriod(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label className="select-label">
                Categoria
                <select
                  aria-label="Categoria"
                  value={rankingCategory}
                  onChange={(e) => setRankingCategory(e.target.value)}
                >
                  <option value="all">Todas as categorias</option>
                  {categories.map((c) => (
                    <option value={c.id} key={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <DemoNote>
              Ranking ilustrativo. Pontos, ordem e elegibilidade são exemplos; a
              fórmula oficial ainda não foi definida.
            </DemoNote>
            <div className="podium">
              {[1, 0, 2].map((rank) => (
                <div className={`podium-card place-${rank + 1}`} key={rank}>
                  {rank === 0 && <Icon name="crown" size={29} />}
                  <span className="avatar large">
                    {["🦉", "🧙‍♀️", "🦊"][rank]}
                  </span>
                  <span className="podium-medal">{rank + 1}</span>
                  <h3>
                    {["Mestre Coruja", "Luna Estelar", "Raposa Curiosa"][rank]}
                  </h3>
                  <p>
                    {(
                      6240 -
                      rank * 470 +
                      (period === "month"
                        ? 3200
                        : period === "all"
                          ? 8600
                          : 0) -
                      (rankingCategory === "all" ? 0 : 2100)
                    ).toLocaleString("pt-BR")}{" "}
                    pts de exemplo
                  </p>
                </div>
              ))}
            </div>
            <section className="panel ranking-list">
              <div className="ranking-heading">
                <span>POSIÇÃO / AVENTUREIRO</span>
                <span>PONTOS ILUSTRATIVOS</span>
              </div>
              {[
                "Atlas",
                "Cavaleiro do Norte",
                "Aurora",
                "Guardião dos Livros",
                "Bia, a Exploradora",
              ].map((name, i) => (
                <div className="ranking-row" key={name}>
                  <span className="rank-number">{i + 4}</span>
                  <span className="avatar small">
                    {["🧝", "🛡️", "🌻", "📚", "🧭"][i]}
                  </span>
                  <strong>{name}</strong>
                  <span>
                    {(
                      4510 -
                      i * 390 +
                      (period === "month"
                        ? 3200
                        : period === "all"
                          ? 8600
                          : 0) -
                      (rankingCategory === "all" ? 0 : 2100)
                    ).toLocaleString("pt-BR")}{" "}
                    <small>pts</small>
                  </span>
                </div>
              ))}
            </section>
            <p className="fine-print center">
              Exibindo:{" "}
              {rankingCategory === "all"
                ? "geral"
                : categories.find((c) => c.id === rankingCategory)?.name}{" "}
              ·{" "}
              {period === "week"
                ? "semana"
                : period === "month"
                  ? "mês"
                  : "todo o período"}
              . Os filtros alteram apenas os valores de demonstração.
            </p>
          </>
        )}
      </main>
      <footer className="site-footer">
        <span className="footer-brand">
          <Icon name="shield" size={17} />
          ARENA QUIZ<span>Todo conhecimento é útil.</span>
        </span>
        <span>
          Feito de curiosidade e um pouco de coragem.{" "}
          <span className="footer-demo">Versão demonstrativa</span>
        </span>
      </footer>
      {toast && (
        <div className="toast" role="status">
          <Icon name="help" />
          <span>{toast}</span>
          <button onClick={() => setToast("")} aria-label="Fechar aviso">
            <Icon name="x" size={17} />
          </button>
        </div>
      )}
      {modal && (
        <CategoryModal
          onClose={() => setModal(false)}
          onRequest={(name) => {
            setRequested((prev) =>
              prev.includes(name) ? prev : [...prev, name],
            );
            setModal(false);
            setToast(
              "Sugestão anotada nesta sessão. Geração e validação por IA ainda não estão conectadas.",
            );
          }}
        />
      )}
    </>
  );
}
function Stat({
  icon,
  value,
  label,
}: {
  icon: string;
  value: string;
  label: string;
}) {
  return (
    <div className="stat">
      <span>
        <Icon name={icon} size={22} />
      </span>
      <strong>{value}</strong>
      <small>{label}</small>
    </div>
  );
}
function Empty({ onPlay }: { onPlay: () => void }) {
  return (
    <div className="empty-state">
      <Icon name="scroll" size={38} />
      <h3>Sua história começa no primeiro duelo</h3>
      <p>Os resultados das suas partidas aparecerão aqui.</p>
      <button className="btn secondary" onClick={onPlay}>
        Encontrar um desafio
        <Icon name="arrow" size={16} />
      </button>
    </div>
  );
}
function CategoryModal({
  onClose,
  onRequest,
}: {
  onClose: () => void;
  onRequest: (name: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="category-modal"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-heading">
        <span className="category-mini sage">
          <Icon name="sparkles" size={24} />
        </span>
        <button className="icon-button" aria-label="Fechar" onClick={onClose}>
          <Icon name="x" />
        </button>
      </div>
      <h2>Toda curiosidade tem espaço.</h2>
      <p>Qual tema você gostaria de levar para a arena?</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const name = new FormData(e.currentTarget)
            .get("category")
            ?.toString()
            .trim();
          if (name) onRequest(name);
        }}
      >
        <label>
          Nome da categoria
          <input
            name="category"
            placeholder="Ex.: Mitologia nórdica"
            required
            minLength={3}
            maxLength={60}
            autoFocus
          />
        </label>
        <div className="notice">
          <Icon name="help" />
          <p>
            A IA ainda não está conectada. Sua sugestão fica pendente nesta
            sessão. Nenhuma pergunta será gerada ou validada automaticamente.
          </p>
        </div>
        <button className="btn primary big">
          Registrar sugestão
          <Icon name="plus" size={17} />
        </button>
      </form>
    </dialog>
  );
}
