"use client";

import { useEffect, useMemo, useState } from "react";
import { practiceQuestionBank as localQuestionBank } from "@/data/questions/question-bank";
import { sourceInfo } from "@/data/questions/sources";
import type { PracticeQuestion as Question, SourceKey } from "@/lib/questions/types";

const selectableSources: { key: SourceKey; label: string }[] = [
  { key: "worldmapper", label: "Worldmapper cartograms" },
  { key: "pyramid", label: "Population pyramids" },
  { key: "igeo", label: "Past iGeo Multimedia Tests" },
];

const featuredSources = [
  {
    name: "Worldmapper",
    url: "https://worldmapper.org/",
    short: "Cartograms",
    description: "Real global datasets transformed into cartograms that make geographic patterns visible at a glance.",
    detail: "Thematic world maps",
    mark: "W",
    className: "worldmapper",
  },
  {
    name: "PopulationPyramid.net",
    url: "https://www.populationpyramid.net/",
    short: "Population pyramids",
    description: "Age-and-sex profiles built from UN population data for comparing demographic structure across places.",
    detail: "200 country profiles",
    mark: "P",
    className: "pyramid",
  },
  {
    name: "International Geography Olympiad",
    url: "https://geoolympiad.org/document-library/",
    short: "Past Multimedia Tests",
    description: "Official past MMT questions aligned with their original visual evidence, answer keys, year and host location.",
    detail: "12 iGeo editions",
    mark: "iG",
    className: "igeo",
  },
];

const comingSoonSources = (Object.entries(sourceInfo) as [SourceKey, typeof sourceInfo.gapminder][])
  .filter(([key]) => key !== "worldmapper" && key !== "pyramid" && key !== "igeo");

function shuffled<T>(items: T[]) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }
  return result;
}

function randomizeOptions(question: Question): Question {
  const options = shuffled(question.options.map((value, index) => ({
    value,
    correct: index === question.correct,
    media: question.optionMedia?.[index],
  })));
  return {
    ...question,
    options: options.map((option) => option.value),
    optionMedia: question.optionMedia
      ? options.map((option, index) => ({
          ...option.media!,
          label: String.fromCharCode(65 + index),
        }))
      : undefined,
    correct: options.findIndex((option) => option.correct),
  };
}

function selectRandomQuestions(items: Question[], targetLength: number, balanceCategories: boolean) {
  if (!balanceCategories) return shuffled(items).slice(0, Math.min(targetLength, items.length));

  const buckets = new Map<string, Question[]>();
  for (const item of items) {
    const bucket = buckets.get(item.topic) ?? [];
    bucket.push(item);
    buckets.set(item.topic, bucket);
  }
  for (const [category, bucket] of buckets) buckets.set(category, shuffled(bucket));

  const selected: Question[] = [];
  let categoryOrder = shuffled([...buckets.keys()]);
  while (selected.length < targetLength && categoryOrder.length > 0) {
    const nextRound: string[] = [];
    for (const category of categoryOrder) {
      const question = buckets.get(category)?.pop();
      if (question) selected.push(question);
      if ((buckets.get(category)?.length ?? 0) > 0) nextRound.push(category);
      if (selected.length === targetLength) break;
    }
    categoryOrder = shuffled(nextRound);
  }
  return selected;
}

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function Bars({ variant }: { variant: number }) {
  const sets = [
    [20, 22, 28, 34, 56, 82, 96, 90, 63, 42, 27, 21],
    [78, 70, 61, 48, 35, 24, 18, 20, 31, 47, 65, 75],
    [25, 29, 37, 51, 70, 88, 94, 91, 73, 54, 36, 27],
  ];
  const values = sets[variant % sets.length];
  return (
    <div className="bar-chart" aria-label="Monthly climate bars">
      <div className="chart-grid" />
      {values.map((value, index) => (
        <span key={index} style={{ height: `${value}%` }} title={`${value} mm`} />
      ))}
      <div className="month-labels"><b>J</b><b>M</b><b>M</b><b>J</b><b>S</b><b>N</b></div>
    </div>
  );
}

function Scatter({ source, variant }: { source: SourceKey; variant: number }) {
  const points = Array.from({ length: 13 }, (_, index) => {
    const x = source === "gapminder" ? 14 + index * 5.8 : 12 + ((index * 31 + variant * 11) % 78);
    const y = source === "gapminder" ? 78 - index * 4.7 + ((index % 3) * 6) : 16 + ((index * 43 + variant * 7) % 70);
    return { x, y, size: 8 + ((index * 7) % 16) };
  });
  return (
    <div className={`scatter ${source}`} aria-label="Data scatter plot">
      <span className="axis-y">{source === "gapminder" ? "Fertility" : "Depth"}</span>
      <span className="axis-x">{source === "gapminder" ? "Life expectancy →" : "Longitude →"}</span>
      {points.map((point, index) => (
        <i key={index} style={{ left: `${point.x}%`, top: `${point.y}%`, width: point.size, height: point.size }} />
      ))}
    </div>
  );
}

function DotMap({ source, variant }: { source: SourceKey; variant: number }) {
  return (
    <div className={`dot-map ${source}`} aria-label="Stylised spatial distribution map">
      <div className="land land-a" /><div className="land land-b" /><div className="land land-c" />
      {Array.from({ length: 22 }, (_, index) => (
        <i key={index} style={{ left: `${8 + ((index * 37 + variant * 5) % 84)}%`, top: `${12 + ((index * 23 + variant * 13) % 70)}%` }} />
      ))}
      <span className="map-note">filtered observations · global view</span>
    </div>
  );
}

function DataCards({ variant }: { variant: number }) {
  const rows = [
    ["Lumenia", "$18.4k", "81", "8"],
    ["Cordova", "$7.9k", "74", "19"],
    ["Nambara", "$2.8k", "63", "41"],
  ];
  return (
    <div className="data-table" aria-label="Illustrative indicator table">
      <div className="table-title">Indicator snapshot <span>index {variant + 1}</span></div>
      <div className="table-row table-head"><b>Country</b><b>Income</b><b>Life exp.</b><b>Infant mort.</b></div>
      {rows.map((row) => <div className="table-row" key={row[0]}>{row.map((cell) => <span key={cell}>{cell}</span>)}</div>)}
      <small>Illustrative layout; question logic cites source definitions.</small>
    </div>
  );
}

function Satellite({ variant }: { variant: number }) {
  return (
    <div className={`satellite sat-${variant % 3}`} aria-label="Stylised satellite image tile">
      <div className="sat-grid" />
      <span className="sat-label">EARTH OBSERVATION · {String(variant + 1).padStart(2, "0")}</span>
      <span className="sat-date">2024 / seasonal composite</span>
    </div>
  );
}

function ResourceVisual({ question }: { question: Question }) {
  if (question.optionMedia) {
    return (
      <div className="comparison-resource" aria-label="Four population-pyramid answer choices are shown with the question">
        <span>VISUAL COMPARISON</span>
        <strong>Four population pyramids</strong>
        <p>Read the scenario, then compare the age structure and sex balance in choices A–D.</p>
      </div>
    );
  }
  if (question.source === "worldmapper") {
    return (
      <figure className="worldmapper-figure">
        <img src={question.mediaLink} alt={question.mediaAlt} />
        <figcaption>Worldmapper · thematic cartogram · CC BY-NC-SA 4.0</figcaption>
      </figure>
    );
  }
  if (question.source === "pyramid") {
    return (
      <figure className={`worldmapper-figure population-pyramid-figure ${question.hideMediaIdentity ? "identity-hidden" : ""}`}>
        <img src={question.mediaLink} alt={question.mediaAlt} />
        <figcaption>{question.hideMediaIdentity ? "Country label hidden · infer from structure" : "PopulationPyramid.net · age-sex structure · CC BY 3.0 IGO"}</figcaption>
      </figure>
    );
  }
  if (question.source === "igeo") {
    return (
      <figure className="worldmapper-figure igeo-figure">
        <img src={question.mediaLink} alt={question.mediaAlt} />
        <figcaption>{question.igeoYear} iGeo · {question.location} · official MMT source page</figcaption>
      </figure>
    );
  }
  if (question.source === "gapminder" || question.source === "usgs") return <Scatter source={question.source} variant={question.variant} />;
  if (question.source === "noaa") return <Bars variant={question.variant} />;
  if (question.source === "nasa") return <Satellite variant={question.variant} />;
  if (question.source === "worldbank") return <DataCards variant={question.variant} />;
  return <DotMap source={question.source} variant={question.variant} />;
}

function SourceMark({ source }: { source: SourceKey }) {
  const initials: Record<SourceKey, string> = { gapminder: "G", worldmapper: "W", pyramid: "P", igeo: "iG", usgs: "U", noaa: "N", nasa: "N", worldbank: "WB", gbif: "GB", openmaps: "OM" };
  return <span className={`source-mark ${source}`}>{initials[source]}</span>;
}

export default function Home() {
  const [questionBank, setQuestionBank] = useState<Question[]>(localQuestionBank);
  const [selectedSources, setSelectedSources] = useState<SourceKey[]>(() => selectableSources.map(({ key }) => key));
  const [testType, setTestType] = useState<"practice" | "mock">("practice");
  const [length, setLength] = useState(10);
  const [seconds, setSeconds] = useState(60);
  const [mockMinutes, setMockMinutes] = useState(30);
  const [category, setCategory] = useState("all");
  const [igeoEdition, setIgeoEdition] = useState("all");
  const [test, setTest] = useState<Question[] | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [remaining, setRemaining] = useState(seconds);
  const [finished, setFinished] = useState(false);

  const sourceQuestions = useMemo(
    () => questionBank.filter((question) => selectedSources.includes(question.source)),
    [selectedSources, questionBank],
  );
  const editionOptions = useMemo(() => {
    const counts = new Map<string, { year: number; location: string; count: number }>();
    for (const question of sourceQuestions) {
      if (!question.igeoYear || !question.location) continue;
      const key = String(question.igeoYear);
      const current = counts.get(key);
      counts.set(key, {
        year: question.igeoYear,
        location: question.location,
        count: (current?.count ?? 0) + 1,
      });
    }
    return [...counts.entries()].sort(([, left], [, right]) => left.year - right.year);
  }, [sourceQuestions]);
  const editionQuestions = useMemo(
    () => igeoEdition === "all"
      ? sourceQuestions
      : sourceQuestions.filter((question) => String(question.igeoYear) === igeoEdition),
    [igeoEdition, sourceQuestions],
  );
  const categoryOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const question of editionQuestions) counts.set(question.topic, (counts.get(question.topic) ?? 0) + 1);
    return [...counts].sort(([left], [right]) => left.localeCompare(right));
  }, [editionQuestions]);
  const available = useMemo(
    () => category === "all" ? editionQuestions : editionQuestions.filter((question) => question.topic === category),
    [category, editionQuestions],
  );
  const preview = available[1] ?? available[0] ?? editionQuestions[0] ?? questionBank[0];
  const targetLength = testType === "mock" ? 40 : length;
  const testQuestionCount = Math.min(targetLength, available.length);
  const allSourcesSelected = selectableSources.every(({ key }) => selectedSources.includes(key));

  useEffect(() => {
    const controller = new AbortController();

    async function loadPublishedQuestions() {
      try {
        const response = await fetch("/api/questions", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) return;

        const payload = await response.json() as { questions?: Question[] };
        if (Array.isArray(payload.questions) && payload.questions.length > 0) {
          const remoteQuestionIds = new Set(payload.questions.map((question) => question.id));
          const localFallbackQuestions = localQuestionBank.filter(
            (question) => question.source === "pyramid" || question.source === "igeo",
          );
          setQuestionBank([
            ...payload.questions,
            ...localFallbackQuestions.filter((question) => !remoteQuestionIds.has(question.id)),
          ]);
          setCategory("all");
          setIgeoEdition("all");
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("Unable to load the published Supabase question bank.", error);
        }
      }
    }

    void loadPublishedQuestions();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!test || finished) return;
    const timer = window.setTimeout(() => {
      if (remaining <= 1) {
        if (testType === "mock" || index >= test.length - 1) setFinished(true);
        else {
          setIndex((current) => current + 1);
          setRemaining(seconds);
        }
      } else {
        setRemaining((value) => value - 1);
      }
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [remaining, index, test, finished, testType, seconds]);

  function generateTest() {
    const selected = selectRandomQuestions(available, targetLength, category === "all")
      .map(randomizeOptions);
    window.scrollTo({ top: 0, behavior: "auto" });
    setTest(selected);
    setIndex(0);
    setAnswers({});
    setFinished(false);
    setRemaining(testType === "mock" ? mockMinutes * 60 : seconds);
  }

  function toggleSource(source: SourceKey) {
    setSelectedSources((current) => current.includes(source)
      ? current.filter((item) => item !== source)
      : [...current, source]);
    setCategory("all");
    setIgeoEdition("all");
  }

  function toggleAllSources() {
    setSelectedSources(allSourcesSelected ? [] : selectableSources.map(({ key }) => key));
    setCategory("all");
    setIgeoEdition("all");
  }

  function chooseAnswer(answer: number) {
    if (!test || finished) return;
    setAnswers((current) => ({ ...current, [index]: answer }));
  }

  function nextQuestion() {
    if (!test) return;
    if (index === test.length - 1) setFinished(true);
    else {
      window.scrollTo({ top: 0, behavior: "auto" });
      setIndex((current) => current + 1);
      if (testType === "practice") setRemaining(seconds);
    }
  }

  if (test) {
    const question = test[index];
    const score = test.reduce((total, item, itemIndex) => total + (answers[itemIndex] === item.correct ? 1 : 0), 0);
    if (finished) {
      const percent = Math.round((score / test.length) * 100);
      return (
        <main className="result-shell">
          <section className="result-card">
            <div className="eyebrow"><span>{testType === "mock" ? "Mock exam complete" : "Practice complete"}</span><span>{test.length} resources explored</span></div>
            <div className="score-ring" style={{ "--score": `${percent * 3.6}deg` } as React.CSSProperties}><strong>{percent}%</strong><span>{score}/{test.length}</span></div>
            <h1>{percent >= 80 ? "Excellent geographic reading." : percent >= 60 ? "A strong foundation." : "Keep reading the evidence."}</h1>
            <p>Your score reflects interpretation of maps, charts, satellite imagery and spatial data—not just factual recall.</p>
            <div className="result-actions">
              <button className="primary-button" onClick={generateTest}>Generate a new test <span>↗</span></button>
              <button className="text-button" onClick={() => setTest(null)}>Back to studio</button>
            </div>
            <div className="review-list">
              {test.map((item, itemIndex) => {
                const correct = answers[itemIndex] === item.correct;
                return (
                  <article key={item.id}>
                    <span className={correct ? "review-ok" : "review-miss"}>{correct ? "✓" : "×"}</span>
                    <div><b>{item.prompt}</b><p>{item.explanation}</p><a href={item.sourceUrl} target="_blank" rel="noreferrer">Verify with {item.sourceName} ↗</a></div>
                  </article>
                );
              })}
            </div>
          </section>
        </main>
      );
    }
    return (
      <main className="test-shell">
        <header className="test-header">
          <button className="brand compact" onClick={() => setTest(null)} aria-label="Exit test"><span className="brand-orbit">◎</span><b>GeoLens</b></button>
          <div className="test-progress"><span style={{ width: `${((index + 1) / test.length) * 100}%` }} /></div>
          <div className={`timer ${remaining < (testType === "mock" ? 60 : 15) ? "urgent" : ""}`}><span>◷</span><b>{testType === "mock" ? formatCountdown(remaining) : `${remaining}s`}</b></div>
        </header>
        <section className="question-layout">
          <div className="question-resource">
            <div className="resource-topline"><span>Resource {String(index + 1).padStart(2, "0")}</span><a href={question.sourceUrl} target="_blank" rel="noreferrer">Open source ↗</a></div>
            <ResourceVisual question={question} />
            <div className="resource-credit"><SourceMark source={question.source} /><span><b>{question.sourceName}</b>{sourceInfo[question.source].short}</span><span className="licence-chip">Attribution attached</span></div>
          </div>
          <div className="question-panel">
            <div className="question-meta"><span>{question.topic}</span><span>•</span><span>{question.skill}</span>{question.igeoYear && <><span>•</span><span>{question.igeoYear} · {question.location}</span></>}<span>•</span><span>{question.difficulty}</span></div>
            <h1><span>Q{index + 1}</span>{question.prompt}</h1>
            <div className="answers">
              {question.options.map((option, optionIndex) => (
                <button key={option} className={`${answers[index] === optionIndex ? "selected" : ""} ${question.optionMedia ? "has-option-media" : ""}`} onClick={() => chooseAnswer(optionIndex)}>
                  <span>{String.fromCharCode(65 + optionIndex)}</span>
                  {question.optionMedia?.[optionIndex] && <img src={question.optionMedia[optionIndex].mediaLink} alt={question.optionMedia[optionIndex].mediaAlt} />}
                  <b>{option}</b>
                </button>
              ))}
            </div>
            <div className="question-footer"><span>{index + 1} of {test.length}</span><button onClick={nextQuestion} disabled={answers[index] === undefined}>{index === test.length - 1 ? "Finish test" : "Next question"} <span>→</span></button></div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top"><span className="brand-orbit">◎</span><b>GeoLens</b><small>MMT STUDIO</small></a>
        <nav><a href="#builder">Generator</a><a href="#method">Method</a><a href="#sources">Sources</a></nav>
        <a className="header-cta" href="#builder">Build a test <span>↗</span></a>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="kicker"><span>iGEO-style practice lab</span><span>{questionBank.length.toLocaleString("en-US")} source-linked questions</span></div>
          <h1>Read the world.<br /><em>Question</em> the evidence.</h1>
          <p>Generate fast, visual geography practice from trusted global datasets—with every map, chart and answer tied back to its source.</p>
          <div className="hero-actions"><a className="primary-button" href="#builder">Generate a practice test <span>↗</span></a><a className="text-button" href="#method">See how it works <span>↓</span></a></div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <span className="ring ring-one" /><span className="ring ring-two" /><span className="ring ring-three" />
          <div className="coordinate-card"><small>LIVE SOURCE SYSTEM</small><strong>12° 46′ N</strong><span>interpret · compare · infer</span></div>
          <div className="pulse-dot" />
          <div className="hero-label label-a">CARTOGRAM</div><div className="hero-label label-b">CLIMATE</div><div className="hero-label label-c">CHANGE</div>
        </div>
        <div className="hero-stats"><div><strong>{questionBank.length.toLocaleString("en-US")}</strong><span>source-linked questions</span></div><div><strong>{categoryOptions.length}</strong><span>curiosity categories</span></div><div><strong>{selectableSources.length}</strong><span>verified sources</span></div><div><strong>4</strong><span>close choices per question</span></div></div>
      </section>

      <section className="builder-section" id="builder">
        <div className="section-heading"><div><span className="section-index">01 / GENERATOR</span><h2>Build your test</h2></div><p>Combine trusted sources, then follow your curiosity into one category or draw a balanced random mix.</p></div>
        <div className="builder-grid">
          <div className="controls-card">
            <div className="control-group"><label>Test format</label><div className="test-type-list">
              <button className={testType === "practice" ? "active" : ""} onClick={() => setTestType("practice")}><b>Practice test</b><span>5 or 10 questions</span><small>Adjustable time per item</small></button>
              <button className={testType === "mock" ? "active" : ""} onClick={() => setTestType("mock")}><b>Mock test</b><span>40 questions</span><small>One exam countdown</small></button>
            </div></div>
            <div className="control-group"><label>Source collection</label><div className="source-checklist">
              <label className="source-choice select-all">
                <input type="checkbox" checked={allSourcesSelected} onChange={toggleAllSources} />
                <span><b>Select all sources</b><small>{allSourcesSelected ? "All available sources selected" : `${selectedSources.length} of ${selectableSources.length} selected`}</small></span>
              </label>
              {selectableSources.map(({ key, label }) => (
                <label className="source-choice" key={key}>
                  <input type="checkbox" checked={selectedSources.includes(key)} onChange={() => toggleSource(key)} />
                  <SourceMark source={key} />
                  <span><b>{label}</b><small>{questionBank.filter((question) => question.source === key).length.toLocaleString("en-US")} source-linked questions</small></span>
                </label>
              ))}
            </div></div>
            <div className="control-group category-control"><label htmlFor="category">Category you’re curious about</label><div className="select-wrap">
              <select id="category" value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="all">Surprise me — balanced mix ({sourceQuestions.length.toLocaleString("en-US")})</option>
                {categoryOptions.map(([name, count]) => <option key={name} value={name}>{name} ({count})</option>)}
              </select><span aria-hidden="true">⌄</span>
            </div><small className="category-hint">Each generation reshuffles both questions and answer choices.</small></div>
            {selectedSources.includes("igeo") && editionOptions.length > 0 && (
              <div className="control-group category-control"><label htmlFor="igeo-edition">iGeo year and host location</label><div className="select-wrap">
                <select id="igeo-edition" value={igeoEdition} onChange={(event) => { setIgeoEdition(event.target.value); setCategory("all"); }}>
                  <option value="all">All iGeo editions ({editionOptions.reduce((total, [, item]) => total + item.count, 0)})</option>
                  {editionOptions.map(([key, item]) => <option key={key} value={key}>{item.year} · {item.location} ({item.count})</option>)}
                </select><span aria-hidden="true">⌄</span>
              </div><small className="category-hint">Edition metadata is stored separately from topic tags.</small></div>
            )}
            {testType === "practice" ? (
              <div className="control-row"><div className="control-group"><label>Questions</label><div className="segmented">
                {[5, 10].map((value) => <button key={value} disabled={value > available.length} className={length === value ? "active" : ""} onClick={() => setLength(value)}>{value}</button>)}
              </div></div><div className="control-group"><label>Time per item</label><div className="segmented">
                {[45, 60, 75].map((value) => <button key={value} className={seconds === value ? "active" : ""} onClick={() => setSeconds(value)}>{value}s</button>)}
              </div></div></div>
            ) : (
              <div className="control-row"><div className="control-group"><label>Questions</label><div className="fixed-value">{testQuestionCount} <span>{testQuestionCount < 40 ? "available" : "fixed"}</span></div></div><div className="control-group"><label>Total exam time</label><div className="segmented mock-time">
                {[20, 30, 40, 50, 60].map((value) => <button key={value} className={mockMinutes === value ? "active" : ""} onClick={() => setMockMinutes(value)}>{value}m</button>)}
              </div></div></div>
            )}
            <div className="coverage"><div><span>Coverage</span><b>{selectedSources.length} sources · {category === "all" ? `balanced across ${categoryOptions.length} categories` : category} · {testQuestionCount} questions</b></div><div className="coverage-bar"><span style={{ width: `${available.length ? (testQuestionCount / available.length) * 100 : 0}%` }} /></div></div>
            <button className="generate-button" onClick={generateTest} disabled={available.length === 0}><span>Generate {testType === "mock" ? "mock test" : "practice test"}</span><b>↗</b></button>
            <small className="not-affiliated">Independent educational prototype. Not an official iGEO test.</small>
          </div>

          <div className="preview-card">
            <div className="preview-header"><span>QUESTION PREVIEW</span><div><i /> SOURCE-LINKED</div></div>
            <div className="preview-resource"><ResourceVisual question={preview} /></div>
            <div className="preview-body"><div className="question-meta"><span>{preview.topic}</span><span>•</span><span>{preview.skill}</span>{preview.igeoYear && <><span>•</span><span>{preview.igeoYear} · {preview.location}</span></>}<span>•</span><span>{preview.difficulty}</span></div><h3>{preview.prompt}</h3><div className={`preview-options ${preview.optionMedia ? "with-media" : ""}`}>{preview.options.map((option, i) => <span key={option}><b>{String.fromCharCode(65 + i)}</b>{preview.optionMedia?.[i] && <img src={preview.optionMedia[i].mediaLink} alt="" />}{option}</span>)}</div></div>
            <div className="preview-credit"><SourceMark source={preview.source} /><span>Question evidence from <b>{preview.sourceName}</b></span><a href={preview.sourceUrl} target="_blank" rel="noreferrer">View ↗</a></div>
          </div>
        </div>
      </section>

      <section className="method-section" id="method">
        <div className="method-layout">
          <div className="method-lead">
            <span className="section-index">02 / METHOD</span>
            <h2>From real-world evidence to a question you can trust.</h2>
            <p>Every item uses real geographic data, deliberately curated from trusted sources and verified by a human before it reaches learners.</p>
            <div className="method-seal"><span>HUMAN VERIFIED</span><strong>Nothing is published without a final evidence check.</strong></div>
          </div>
          <div className="method-grid" aria-label="Three-stage question method">
            <article><div className="method-step"><span>01</span><i>REAL INPUT</i></div><div className="method-icon">⌁</div><div><h3>Start with real data</h3><p>Every map, chart and population pyramid comes from a named, traceable source—not an invented example.</p></div></article>
            <article><div className="method-step"><span>02</span><i>EDITORIAL CRAFT</i></div><div className="method-icon">◎</div><div><h3>Curate for learning</h3><p>We select useful evidence and shape it into a focused question that tests interpretation, comparison and reasoning.</p></div></article>
            <article><div className="method-step"><span>03</span><i>QUALITY GATE</i></div><div className="method-icon">✓</div><div><h3>Verify with a human</h3><p>A human checks the evidence, answer choices, explanation and attribution before the question is published.</p></div></article>
          </div>
        </div>
        <div className="method-proof"><span>REAL SOURCE ATTACHED</span><span>ANSWER CHECKED</span><span>ATTRIBUTION PRESERVED</span></div>
      </section>

      <section className="sources-section" id="sources">
        <div className="section-heading"><div><span className="section-index">03 / SOURCE LIBRARY</span><h2>Three sources.<br />Fully in focus.</h2></div><p>Worldmapper, PopulationPyramid.net and the official past iGeo MMT archive power the current question library. The next collections are visible on our roadmap.</p></div>
        <div className="featured-source-grid">
          {featuredSources.map((source, index) => (
            <a className={`featured-source-card ${source.className}`} href={source.url} target="_blank" rel="noreferrer" key={source.name}>
              <div className="featured-source-top"><span className={`source-mark ${source.className}`}>{source.mark}</span><strong>ACTIVE SOURCE</strong><em>0{index + 1}</em></div>
              <div className="featured-source-copy"><small>{source.short}</small><h3>{source.name}</h3><p>{source.description}</p></div>
              <div className="featured-source-bottom"><span>{source.detail}</span><b>Explore source ↗</b></div>
            </a>
          ))}
        </div>
        <div className="source-roadmap">
          <div className="source-roadmap-heading"><span>NEXT IN THE LIBRARY</span><p>Additional trusted geographic datasets are coming soon.</p></div>
          <div className="source-roadmap-grid">
            {comingSoonSources.map(([key, info]) => (
              <div className="coming-soon-source" key={key} aria-label={`${info.name}, coming soon`}>
                <SourceMark source={key} /><span><b>{info.name}</b><small>{info.short}</small></span><strong>COMING SOON</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer><a className="brand inverse-brand" href="#top"><span className="brand-orbit">◎</span><b>GeoLens</b></a><p>A research-backed prototype for better geographic questions.</p><div><a href="https://geoolympiad.org/guidelines/" target="_blank" rel="noreferrer">iGEO guidelines ↗</a><a href="https://worldmapper.org/" target="_blank" rel="noreferrer">Worldmapper ↗</a><a href="https://www.gapminder.org/data/" target="_blank" rel="noreferrer">Gapminder ↗</a></div></footer>
    </main>
  );
}
