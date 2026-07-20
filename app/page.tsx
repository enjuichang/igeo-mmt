"use client";

import { useEffect, useMemo, useState } from "react";
import { practiceQuestionBank as questionBank } from "@/data/questions/question-bank";
import { sourceInfo } from "@/data/questions/sources";
import type { PracticeQuestion as Question, SourceKey } from "@/lib/questions/types";

const sourceModes = {
  worldmapper: { label: "Worldmapper crop cartograms", keys: ["worldmapper"] as SourceKey[] },
};

function shuffled<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
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
  if (question.source === "worldmapper") {
    return (
      <figure className="worldmapper-figure">
        <img src={question.mediaLink} alt={question.mediaAlt} />
        <figcaption>Worldmapper · crop production cartogram · CC BY-NC-SA 4.0</figcaption>
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
  const initials: Record<SourceKey, string> = { gapminder: "G", worldmapper: "W", usgs: "U", noaa: "N", nasa: "N", worldbank: "WB", gbif: "GB", openmaps: "OM" };
  return <span className={`source-mark ${source}`}>{initials[source]}</span>;
}

export default function Home() {
  const [mode, setMode] = useState<keyof typeof sourceModes>("worldmapper");
  const [length, setLength] = useState(10);
  const [seconds, setSeconds] = useState(60);
  const [test, setTest] = useState<Question[] | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [remaining, setRemaining] = useState(seconds);
  const [finished, setFinished] = useState(false);

  const available = useMemo(() => questionBank.filter((question) => sourceModes[mode].keys.includes(question.source)), [mode]);
  const preview = available[1] ?? available[0];

  useEffect(() => {
    if (!test || finished) return;
    setRemaining(seconds);
  }, [index, test, seconds, finished]);

  useEffect(() => {
    if (!test || finished) return;
    if (remaining <= 0) {
      if (index >= test.length - 1) setFinished(true);
      else setIndex((current) => current + 1);
      return;
    }
    const timer = window.setTimeout(() => setRemaining((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [remaining, index, test, finished]);

  function generateTest() {
    const selected = shuffled(available).slice(0, Math.min(length, available.length));
    setTest(selected);
    setIndex(0);
    setAnswers({});
    setFinished(false);
    setRemaining(seconds);
  }

  function chooseAnswer(answer: number) {
    if (!test || finished) return;
    setAnswers((current) => ({ ...current, [index]: answer }));
  }

  function nextQuestion() {
    if (!test) return;
    if (index === test.length - 1) setFinished(true);
    else setIndex((current) => current + 1);
  }

  if (test) {
    const question = test[index];
    const score = test.reduce((total, item, itemIndex) => total + (answers[itemIndex] === item.correct ? 1 : 0), 0);
    if (finished) {
      const percent = Math.round((score / test.length) * 100);
      return (
        <main className="result-shell">
          <section className="result-card">
            <div className="eyebrow"><span>Practice complete</span><span>{test.length} resources reviewed</span></div>
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
          <div className={`timer ${remaining < 15 ? "urgent" : ""}`}><span>◷</span><b>{remaining}s</b></div>
        </header>
        <section className="question-layout">
          <div className="question-resource">
            <div className="resource-topline"><span>Resource {String(index + 1).padStart(2, "0")}</span><a href={question.sourceUrl} target="_blank" rel="noreferrer">Open source ↗</a></div>
            <ResourceVisual question={question} />
            <div className="resource-credit"><SourceMark source={question.source} /><span><b>{question.sourceName}</b>{sourceInfo[question.source].short}</span><span className="licence-chip">Attribution attached</span></div>
          </div>
          <div className="question-panel">
            <div className="question-meta"><span>{question.topic}</span><span>•</span><span>{question.skill}</span><span>•</span><span>{question.difficulty}</span></div>
            <h1><span>Q{index + 1}</span>{question.prompt}</h1>
            <div className="answers">
              {question.options.map((option, optionIndex) => (
                <button key={option} className={answers[index] === optionIndex ? "selected" : ""} onClick={() => chooseAnswer(optionIndex)}>
                  <span>{String.fromCharCode(65 + optionIndex)}</span>{option}
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
          <div className="kicker"><span>iGEO-style practice lab</span><span>{questionBank.length} reviewed Worldmapper questions</span></div>
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
        <div className="hero-stats"><div><strong>{questionBank.length}</strong><span>reviewed questions</span></div><div><strong>1</strong><span>focused topic family</span></div><div><strong>1</strong><span>verified source</span></div><div><strong>4</strong><span>close choices per question</span></div></div>
      </section>

      <section className="builder-section" id="builder">
        <div className="section-heading"><div><span className="section-index">01 / GENERATOR</span><h2>Build your test</h2></div><p>Choose a source mix, pace and length. We’ll assemble a fresh sequence from source-aware templates.</p></div>
        <div className="builder-grid">
          <div className="controls-card">
            <div className="control-group"><label>Source collection</label><div className="mode-list">
              {(Object.entries(sourceModes) as [keyof typeof sourceModes, typeof sourceModes.all][]).map(([key, item]) => (
                <button key={key} className={mode === key ? "active" : ""} onClick={() => setMode(key)}><span>{item.label}</span><small>{questionBank.filter((q) => item.keys.includes(q.source)).length} reviewed questions</small><i>{mode === key ? "●" : "○"}</i></button>
              ))}
            </div></div>
            <div className="control-row"><div className="control-group"><label>Questions</label><div className="segmented">
              {[5, 10].map((value) => <button key={value} disabled={value > available.length} className={length === value ? "active" : ""} onClick={() => setLength(value)}>{value}</button>)}
            </div></div><div className="control-group"><label>Time per item</label><div className="segmented">
              {[45, 60, 75].map((value) => <button key={value} className={seconds === value ? "active" : ""} onClick={() => setSeconds(value)}>{value}s</button>)}
            </div></div></div>
            <div className="coverage"><div><span>Coverage</span><b>{sourceModes[mode].keys.length} source family · {Math.min(length, available.length)} questions</b></div><div className="coverage-bar"><span style={{ width: `${available.length ? (Math.min(length, available.length) / available.length) * 100 : 0}%` }} /></div></div>
            <button className="generate-button" onClick={generateTest}><span>Generate practice test</span><b>↗</b></button>
            <small className="not-affiliated">Independent educational prototype. Not an official iGEO test.</small>
          </div>

          <div className="preview-card">
            <div className="preview-header"><span>QUESTION PREVIEW</span><div><i /> SOURCE VERIFIED</div></div>
            <div className="preview-resource"><ResourceVisual question={preview} /></div>
            <div className="preview-body"><div className="question-meta"><span>{preview.topic}</span><span>•</span><span>{preview.skill}</span><span>•</span><span>{preview.difficulty}</span></div><h3>{preview.prompt}</h3><div className="preview-options">{preview.options.map((option, i) => <span key={option}><b>{String.fromCharCode(65 + i)}</b>{option}</span>)}</div></div>
            <div className="preview-credit"><SourceMark source={preview.source} /><span>Question evidence from <b>{preview.sourceName}</b></span><a href={preview.sourceUrl} target="_blank" rel="noreferrer">View ↗</a></div>
          </div>
        </div>
      </section>

      <section className="method-section" id="method">
        <div className="section-heading inverse"><div><span className="section-index">02 / METHOD</span><h2>Built like an MMT,<br />not a trivia quiz.</h2></div><p>Every item begins with evidence. The prompt asks learners to interpret, compare, infer or evaluate.</p></div>
        <div className="method-grid">
          <article><span>01</span><div className="method-icon">⌁</div><h3>Start with a resource</h3><p>Maps, graphs, satellite imagery, photos and data tables anchor every question.</p></article>
          <article><span>02</span><div className="method-icon">◎</div><h3>Test geographic thinking</h3><p>Templates target map reading, graphicacy, spatial analysis and problem-solving.</p></article>
          <article><span>03</span><div className="method-icon">↗</div><h3>Keep provenance visible</h3><p>Source, licence notes and a verification link stay attached through review.</p></article>
        </div>
        <div className="sample-insight"><div><span>FROM THE PROVIDED SAMPLE</span><strong>40 × 4 × 1–2</strong><small>40 questions · 4 options · 1–2 minutes</small></div><p>The 2013 set ranges from landform identification and climate graphs to population pyramids, cartograms, urban change and hazard response—evidence of a deliberately broad mix of physical and human geography.</p></div>
      </section>

      <section className="sources-section" id="sources">
        <div className="section-heading"><div><span className="section-index">03 / SOURCE LIBRARY</span><h2>Evidence with a paper trail</h2></div><p>The registry separates data access from reuse rules, so future question adapters can refresh responsibly.</p></div>
        <div className="source-grid">
          {(Object.entries(sourceInfo) as [SourceKey, typeof sourceInfo.gapminder][]).map(([key, info], index) => (
            <a href={info.url} target="_blank" rel="noreferrer" key={key}><SourceMark source={key} /><span><b>{info.name}</b><small>{info.short}</small></span><em>{String(index + 1).padStart(2, "0")}</em><i>↗</i></a>
          ))}
        </div>
        <div className="source-note"><span>LICENSING RULE</span><p>Open access does not mean “no attribution.” GeoLens keeps provider, original dataset, creator and licence fields alongside each template.</p><a href="https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia" target="_blank" rel="noreferrer">Read reuse guidance ↗</a></div>
      </section>

      <footer><a className="brand inverse-brand" href="#top"><span className="brand-orbit">◎</span><b>GeoLens</b></a><p>A research-backed prototype for better geographic questions.</p><div><a href="https://geoolympiad.org/guidelines/" target="_blank" rel="noreferrer">iGEO guidelines ↗</a><a href="https://worldmapper.org/" target="_blank" rel="noreferrer">Worldmapper ↗</a><a href="https://www.gapminder.org/data/" target="_blank" rel="noreferrer">Gapminder ↗</a></div></footer>
    </main>
  );
}
