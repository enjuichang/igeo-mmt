"use client";

import { useEffect, useMemo, useState } from "react";

type SourceKey =
  | "gapminder"
  | "worldmapper"
  | "usgs"
  | "noaa"
  | "nasa"
  | "worldbank"
  | "gbif"
  | "openmaps";

type Question = {
  id: string;
  source: SourceKey;
  sourceName: string;
  sourceUrl: string;
  topic: string;
  skill: string;
  prompt: string;
  options: string[];
  correct: number;
  explanation: string;
  variant: number;
};

const sourceInfo: Record<SourceKey, { name: string; url: string; short: string }> = {
  gapminder: {
    name: "Gapminder",
    url: "https://www.gapminder.org/data/",
    short: "Development indicators",
  },
  worldmapper: {
    name: "Worldmapper",
    url: "https://worldmapper.org/",
    short: "Cartograms",
  },
  usgs: {
    name: "USGS",
    url: "https://earthquake.usgs.gov/fdsnws/event/1/",
    short: "Earthquakes & hazards",
  },
  noaa: {
    name: "NOAA NCEI",
    url: "https://www.ncei.noaa.gov/support/access-data-service-api-user-documentation",
    short: "Climate observations",
  },
  nasa: {
    name: "NASA GIBS",
    url: "https://nasa-gibs.github.io/gibs-api-docs/",
    short: "Earth observation",
  },
  worldbank: {
    name: "World Bank",
    url: "https://datahelpdesk.worldbank.org/knowledgebase/articles/889392-about-the-indicators-api-documentation",
    short: "Global indicators",
  },
  gbif: {
    name: "GBIF",
    url: "https://techdocs.gbif.org/en/openapi/v1/occurrence",
    short: "Biodiversity records",
  },
  openmaps: {
    name: "Open map media",
    url: "https://www.naturalearthdata.com/about/terms-of-use/",
    short: "Maps & licensed media",
  },
};

function makeQuestions(
  source: SourceKey,
  items: Array<
    [string, string, string[], number, string, string, string]
  >,
): Question[] {
  const info = sourceInfo[source];
  return items.map(
    ([topic, skill, options, correct, prompt, explanation, id], index) => ({
      id,
      source,
      sourceName: info.name,
      sourceUrl: info.url,
      topic,
      skill,
      prompt,
      options,
      correct,
      explanation,
      variant: index,
    }),
  );
}

const questionBank: Question[] = [
  ...makeQuestions("gapminder", [
    ["Population and change", "Data interpretation", ["A strong positive relationship", "A broad negative relationship", "No visible relationship", "A perfectly constant relationship"], 1, "What broad relationship does this Gapminder-style plot show?", "Across the displayed countries, higher fertility generally coincides with lower life expectancy. The pattern is broad, not deterministic.", "gap-relationship"],
    ["Development geography", "Graphicacy", ["Land area", "Annual rainfall", "Population", "Median age"], 2, "In a Gapminder bubble chart, what does bubble area most commonly encode in this view?", "Bubble size represents population, adding a third variable to the two plotted axes.", "gap-bubbles"],
    ["Economic geography", "Scale literacy", ["To hide low-income countries", "To compare multiplicative income differences", "To sort countries alphabetically", "To convert dollars into percentages"], 1, "Why is income often shown on a logarithmic horizontal axis?", "A logarithmic scale gives equal visual distance to equal ratios, making wide income ranges readable.", "gap-log"],
    ["Population and change", "Temporal reasoning", ["Fertility falls as life expectancy rises", "Both indicators remain fixed", "Fertility and life expectancy both fall", "The country loses all population"], 0, "Which trajectory best matches the long-run development pattern in the resource?", "Many countries move toward lower fertility and higher life expectancy over time, though paths and timing vary.", "gap-trend"],
    ["Spatial inequality", "Inference", ["High fertility and shorter life expectancy", "Low fertility and longer life expectancy", "Low fertility and shorter life expectancy", "High fertility and longer life expectancy only"], 0, "Which combination is represented by the upper-left cluster?", "The vertical axis rises with fertility while the horizontal axis rises with life expectancy, placing high-fertility, shorter-life-expectancy observations upper left.", "gap-cluster"],
  ]),
  ...makeQuestions("worldmapper", [
    ["Climate change", "Cartogram interpretation", ["Area = per-capita emissions; colour = land area", "Area = absolute emissions; colour = per-capita emissions", "Area = population; colour = rainfall", "Area = GDP; colour = temperature"], 1, "How are the two variables encoded in this Worldmapper cartogram?", "Worldmapper states that territory area is resized by absolute CO₂ emissions while colour shading shows emissions per person.", "wm-encoding"],
    ["Map skills", "Cartogram interpretation", ["A rate such as population density", "A non-additive index", "A worldwide total such as tonnes emitted", "Latitude"], 2, "Which variable is most suitable for resizing territory area in a cartogram?", "Area cartograms work best with additive totals: each territory becomes its share of the world total.", "wm-additive"],
    ["Resources", "Spatial inference", ["It has a low absolute total", "It has no mapped borders", "Its rate must be zero", "It is physically small in land area"], 0, "A territory appears very small on this emissions cartogram. What can be inferred most safely?", "Cartogram size encodes the absolute mapped total, not physical land area or necessarily the per-capita rate.", "wm-small"],
    ["Map skills", "Ratio reasoning", ["Its mapped total is roughly twice as large", "Its land area is twice as large", "Its population density is half as large", "Its value is exactly equal"], 0, "Territory A has roughly twice the cartogram area of Territory B. What does that indicate?", "Within one cartogram, area is proportional to the mapped total, so a 2:1 area suggests roughly a 2:1 total.", "wm-ratio"],
    ["Cartography", "Critical map reading", ["The map is always north-up and equidistant", "Distance and direction are intentionally distorted", "Every border has its legal shape", "A scale bar would recover the original land area"], 1, "Why would a conventional scale bar be misleading on this map?", "A cartogram intentionally distorts geographic distance, direction and shape to make territory area proportional to data.", "wm-scale"],
  ]),
  ...makeQuestions("usgs", [
    ["Hazards", "Spatial analysis", ["Deep inland earthquakes", "Shallow offshore earthquakes", "Small earthquakes in stable interiors", "Any earthquake at the poles"], 1, "Which event pattern creates the greatest tsunami concern?", "Large, shallow earthquakes beneath or near the ocean can vertically displace the seafloor and generate tsunamis.", "usgs-tsunami"],
    ["Tectonics", "Pattern recognition", ["Random political borders", "Plate boundaries", "Lines of equal rainfall", "Ocean shipping routes"], 1, "The linear clusters of earthquake epicentres most strongly trace what feature?", "Earthquakes cluster where tectonic plates interact, outlining many plate boundaries.", "usgs-boundary"],
    ["Hazards", "Temporal reasoning", ["A monsoon season", "An aftershock sequence", "A glacial cycle", "Urbanisation"], 1, "Many smaller events follow one large event in the same area. What is this sequence called?", "Aftershocks are earthquakes that follow the main shock as the crust readjusts.", "usgs-aftershock"],
    ["Tectonics", "Graph interpretation", ["The shallowest event", "The event with the largest magnitude", "The northernmost event", "The oldest event"], 1, "Which plotted event released the most seismic energy?", "Magnitude is the relevant plotted measure of earthquake size; the largest magnitude releases the most energy.", "usgs-magnitude"],
    ["Hazard management", "Risk reasoning", ["Hazard alone determines losses", "Exposure and vulnerability shape disaster risk", "Magnitude has no relevance", "Population never affects risk"], 1, "Why can two earthquakes of similar magnitude produce very different losses?", "Disaster risk combines the physical hazard with exposure, vulnerability and capacity to cope.", "usgs-risk"],
  ]),
  ...makeQuestions("noaa", [
    ["Climate", "Graph interpretation", ["June–August", "September–November", "December–February", "It is uniform all year"], 0, "During which season is precipitation highest in the station record?", "The tallest precipitation bars occur in June, July and August.", "noaa-wet"],
    ["Climate", "Climate classification", ["A small annual temperature range", "A large annual temperature range", "No seasonality", "Temperatures below freezing all year"], 1, "Which feature most strongly suggests a continental climate?", "Continental interiors often have hotter summers and colder winters, producing a large annual temperature range.", "noaa-continental"],
    ["Climate change", "Critical thinking", ["One daily anomaly proves a climate trend", "A long record is needed to assess climate", "Weather and climate are identical", "A cold day disproves warming"], 1, "What is the soundest conclusion from one unusually warm day?", "A single event is weather. Climate trends require analysis of long-term records and variability.", "noaa-weather"],
    ["Climate", "Data quality", ["Ignore station metadata", "Check units, period and missing values", "Compare only the highest value", "Convert every value to a rank"], 1, "Before comparing two station records, what should be checked first?", "Comparable units, observation periods, station context and missing-data treatment are essential.", "noaa-quality"],
    ["Climate", "Seasonality", ["Mediterranean winter rain", "A summer monsoon", "A polar night", "A constant arid climate"], 1, "A sharp summer rainfall maximum with warm temperatures most likely indicates what regime?", "A concentrated warm-season rainfall maximum is characteristic of a summer monsoon regime.", "noaa-monsoon"],
  ]),
  ...makeQuestions("nasa", [
    ["Remote sensing", "GIS literacy", ["A field questionnaire", "Pre-generated satellite image tiles", "A census table", "A cadastral deed"], 1, "What kind of resource does NASA GIBS deliver for geographic analysis?", "GIBS serves full-resolution Earth observation visualisations as responsive pre-generated map tiles.", "nasa-gibs"],
    ["Vegetation", "Temporal reasoning", ["Seasonal greening and senescence", "Plate motion", "Ocean salinity only", "Political boundary change"], 0, "What process best explains the repeating annual pulse in vegetation imagery?", "Vegetation indices commonly rise during growing seasons and fall during dormancy or dry seasons.", "nasa-ndvi"],
    ["Hazards", "Image interpretation", ["Wind transports a plume downwind", "Smoke always moves north", "Fire removes all clouds", "The plume marks a plate boundary"], 0, "What can the elongated smoke plume reveal?", "Its shape and orientation provide evidence of atmospheric transport by the prevailing wind.", "nasa-smoke"],
    ["Cryosphere", "Seasonal reasoning", ["At the end of the melt season", "At the winter solstice in both hemispheres", "During maximum snowfall only", "On the same date every day"], 0, "When is annual sea-ice extent usually at its minimum?", "The minimum generally occurs near the end of the hemisphere's summer melt season.", "nasa-ice"],
    ["Land use", "Change detection", ["Compare aligned images from two dates", "Compare two unrelated map projections", "Remove all metadata", "Use one image without context"], 0, "Which method best reveals land-cover change?", "Aligned, comparable imagery from different dates makes expansion, loss and conversion visible.", "nasa-change"],
  ]),
  ...makeQuestions("worldbank", [
    ["Development", "Data interpretation", ["A broad inverse relationship", "A perfect positive relationship", "No relationship", "An alphabetical pattern"], 0, "What broad relationship appears between income per person and infant mortality?", "Higher income per person is generally associated with lower infant mortality, while important exceptions remain.", "wb-mortality"],
    ["Migration", "Multi-variable inference", ["Low literacy and high infant mortality", "Higher literacy and lower infant mortality", "Low income and rapid population growth", "High mortality and low service access"], 1, "Which profile suggests the weakest development-related push factors for emigration?", "Higher literacy, lower infant mortality and stronger economic conditions generally reduce development-related push pressures.", "wb-migration"],
    ["Urban geography", "Percentage reasoning", ["The share of people living in urban areas", "The number of cities", "The land covered by roads", "The share employed in farming only"], 0, "What does the indicator ‘urban population (% of total)’ measure?", "It is the share of a country's population classified as urban under the underlying statistical definition.", "wb-urban"],
    ["Population", "Rate reasoning", ["The population must shrink", "The population roughly doubles in 35 years", "The population doubles every 2 years", "No inference is possible"], 1, "Using the rule of 70, what does sustained 2% annual growth imply?", "Dividing 70 by a 2% growth rate gives an approximate doubling time of 35 years.", "wb-growth"],
    ["Development", "Data quality", ["Definitions and years should be checked", "Every country measures indicators identically", "Missing values equal zero", "Per-capita values are totals"], 0, "What caution matters when comparing indicators across countries?", "Definitions, years, collection methods and missing-data treatment can differ across observations.", "wb-compare"],
  ]),
  ...makeQuestions("gbif", [
    ["Biodiversity", "Spatial analysis", ["True absence everywhere without a dot", "Sampling effort as well as species presence", "Only national borders", "A complete population census"], 1, "What do dense clusters of occurrence records show most safely?", "Occurrence density reflects where records were collected and shared, so it combines ecological signal with sampling effort.", "gbif-bias"],
    ["Biodiversity", "Pattern recognition", ["High recorded species richness", "Low topographic relief", "No human observers", "Equal abundance of every species"], 0, "What does a cell with many distinct recorded species indicate?", "It indicates high recorded richness for the chosen filters and period, not necessarily complete richness.", "gbif-richness"],
    ["Climate change", "Temporal-spatial analysis", ["A poleward or upslope shift", "A change in country spelling", "A constant sampling method", "The removal of coordinates"], 0, "Which pattern could be consistent with a climate-linked range shift?", "Repeated records moving poleward or upslope over time can be consistent with a shifting climatic range, though sampling bias must be assessed.", "gbif-shift"],
    ["Biodiversity", "Critical thinking", ["The species is certainly absent", "No occurrence has been recorded in the dataset", "The habitat is unsuitable", "The species is extinct"], 1, "What does an empty map cell mean in an occurrence dataset?", "It means no matching record is shown; it does not prove biological absence.", "gbif-absence"],
    ["Data ethics", "Source evaluation", ["All records have one universal licence", "Dataset-level licences and citations must be preserved", "Attribution is never needed", "Coordinates may be republished without review"], 1, "What should a question generator preserve when using GBIF-mediated records?", "GBIF datasets carry machine-readable licences and source-specific citation requirements that should travel with derived questions.", "gbif-license"],
  ]),
  ...makeQuestions("openmaps", [
    ["Cartography", "Scale reasoning", ["A neighbourhood street plan", "A national relief map", "A world choropleth", "A building floor plan"], 0, "Which resource is most appropriate for identifying the safest walking route between two nearby sites?", "A detailed, large-scale street and path map provides the local network information required.", "map-scale"],
    ["Transport", "Network analysis", ["The route with the fewest drawn turns always", "The least-cost connected path", "The straight-line path through buildings", "The path farthest from all nodes"], 1, "In a route network, what does the shortest-path algorithm identify?", "It finds the connected path with the lowest specified cost, which may represent distance, time or another impedance.", "map-network"],
    ["Cartography", "Projection literacy", ["Area", "Every distance", "Every direction", "Every shape"], 0, "Which property does an equal-area world projection preserve?", "Equal-area projections preserve relative area while necessarily distorting some combination of shape, distance or direction.", "map-projection"],
    ["Landforms", "Image interpretation", ["A river delta", "A cirque glacier", "A fault scarp", "A sand dune"], 0, "A branching river enters standing water and deposits a fan-shaped body. Which landform is shown?", "Deposition at a river mouth can build distributary channels and a delta.", "media-delta"],
    ["Source literacy", "Attribution", ["Remove creator and licence metadata", "Carry creator, source and licence with the question", "Assume every online image is public domain", "Hotlink every full-resolution file"], 1, "What is the responsible way to reuse a Wikimedia Commons image?", "Each file has its own requirements; the generator should retain creator, source and licence details and verify reuse terms.", "media-credit"],
  ]),
];

const sourceModes = {
  all: { label: "All verified sources", keys: Object.keys(sourceInfo) as SourceKey[] },
  core: { label: "Gapminder + Worldmapper", keys: ["gapminder", "worldmapper"] as SourceKey[] },
  open: { label: "Open data mix", keys: ["usgs", "noaa", "nasa", "worldbank", "gbif", "openmaps"] as SourceKey[] },
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
        <img src="/worldmapper-co2-2020.png" alt="Worldmapper CO2 emissions per capita 2020 cartogram" />
        <figcaption>Worldmapper · CO₂ emissions per capita 2020 · CC BY-NC-SA 4.0</figcaption>
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
  const [mode, setMode] = useState<keyof typeof sourceModes>("all");
  const [length, setLength] = useState(10);
  const [seconds, setSeconds] = useState(60);
  const [test, setTest] = useState<Question[] | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [remaining, setRemaining] = useState(seconds);
  const [finished, setFinished] = useState(false);

  const available = useMemo(() => questionBank.filter((question) => sourceModes[mode].keys.includes(question.source)), [mode]);
  const preview = available[mode === "core" ? 5 : 1] ?? available[0];

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
            <div className="question-meta"><span>{question.topic}</span><span>•</span><span>{question.skill}</span></div>
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
          <div className="kicker"><span>iGEO-style practice lab</span><span>40 source-verified templates</span></div>
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
        <div className="hero-stats"><div><strong>40</strong><span>question templates</span></div><div><strong>12</strong><span>iGEO topic areas</span></div><div><strong>8</strong><span>trusted source families</span></div><div><strong>4</strong><span>choices per question</span></div></div>
      </section>

      <section className="builder-section" id="builder">
        <div className="section-heading"><div><span className="section-index">01 / GENERATOR</span><h2>Build your test</h2></div><p>Choose a source mix, pace and length. We’ll assemble a fresh sequence from source-aware templates.</p></div>
        <div className="builder-grid">
          <div className="controls-card">
            <div className="control-group"><label>Source collection</label><div className="mode-list">
              {(Object.entries(sourceModes) as [keyof typeof sourceModes, typeof sourceModes.all][]).map(([key, item]) => (
                <button key={key} className={mode === key ? "active" : ""} onClick={() => { setMode(key); if (key === "core" && length > 10) setLength(10); }}><span>{item.label}</span><small>{questionBank.filter((q) => item.keys.includes(q.source)).length} templates</small><i>{mode === key ? "●" : "○"}</i></button>
              ))}
            </div></div>
            <div className="control-row"><div className="control-group"><label>Questions</label><div className="segmented">
              {[5, 10, 20, 40].map((value) => <button key={value} disabled={value > available.length} className={length === value ? "active" : ""} onClick={() => setLength(value)}>{value}</button>)}
            </div></div><div className="control-group"><label>Time per item</label><div className="segmented">
              {[45, 60, 75].map((value) => <button key={value} className={seconds === value ? "active" : ""} onClick={() => setSeconds(value)}>{value}s</button>)}
            </div></div></div>
            <div className="coverage"><div><span>Coverage</span><b>{sourceModes[mode].keys.length} source families · {Math.min(length, available.length)} questions</b></div><div className="coverage-bar"><span style={{ width: `${Math.min(100, (Math.min(length, available.length) / 40) * 100)}%` }} /></div></div>
            <button className="generate-button" onClick={generateTest}><span>Generate practice test</span><b>↗</b></button>
            <small className="not-affiliated">Independent educational prototype. Not an official iGEO test.</small>
          </div>

          <div className="preview-card">
            <div className="preview-header"><span>QUESTION PREVIEW</span><div><i /> SOURCE VERIFIED</div></div>
            <div className="preview-resource"><ResourceVisual question={preview} /></div>
            <div className="preview-body"><div className="question-meta"><span>{preview.topic}</span><span>•</span><span>{preview.skill}</span></div><h3>{preview.prompt}</h3><div className="preview-options">{preview.options.map((option, i) => <span key={option}><b>{String.fromCharCode(65 + i)}</b>{option}</span>)}</div></div>
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
