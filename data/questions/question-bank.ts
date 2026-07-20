import { toPracticeQuestion } from "@/lib/questions/repository";
import type { QuestionDifficulty, QuestionRecord, SourceKey } from "@/lib/questions/types";
import { sourceRegistry } from "./sources";

type SeedQuestion = [
  category: string,
  skill: string,
  options: [string, string, string, string],
  answerIndex: 0 | 1 | 2 | 3,
  question: string,
  reasoning: string,
  id: string,
];

const SEED_TIMESTAMP = "2026-07-20T00:00:00.000Z";
const DIFFICULTIES: QuestionDifficulty[] = [
  "foundation",
  "foundation",
  "intermediate",
  "intermediate",
  "advanced",
];

function makeRecords(sourceKey: SourceKey, items: SeedQuestion[]): QuestionRecord[] {
  const source = sourceRegistry[sourceKey];
  return items.map(([category, skill, options, answerIndex, question, reasoning, id], index) => ({
    id,
    source,
    question,
    options,
    answer: { index: answerIndex, value: options[answerIndex] },
    reasoning,
    mediaLink: source.defaultMediaLink,
    mediaKind: source.defaultMediaKind,
    mediaAlt: source.mediaAlt,
    category,
    skill,
    difficulty: DIFFICULTIES[index] ?? "intermediate",
    status: "published",
    origin: "seed",
    visualVariant: index,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
    generationRunId: null,
  }));
}

/** Canonical local records. The website imports only the projected view below. */
export const questionRecords: QuestionRecord[] = [
  ...makeRecords("gapminder", [
    ["Population and change", "Data interpretation", ["A strong positive relationship", "A broad negative relationship", "No visible relationship", "A perfectly constant relationship"], 1, "What broad relationship does this Gapminder-style plot show?", "Across the displayed countries, higher fertility generally coincides with lower life expectancy. The pattern is broad, not deterministic.", "gap-relationship"],
    ["Development geography", "Graphicacy", ["Land area", "Annual rainfall", "Population", "Median age"], 2, "In a Gapminder bubble chart, what does bubble area most commonly encode in this view?", "Bubble size represents population, adding a third variable to the two plotted axes.", "gap-bubbles"],
    ["Economic geography", "Scale literacy", ["To hide low-income countries", "To compare multiplicative income differences", "To sort countries alphabetically", "To convert dollars into percentages"], 1, "Why is income often shown on a logarithmic horizontal axis?", "A logarithmic scale gives equal visual distance to equal ratios, making wide income ranges readable.", "gap-log"],
    ["Population and change", "Temporal reasoning", ["Fertility falls as life expectancy rises", "Both indicators remain fixed", "Fertility and life expectancy both fall", "The country loses all population"], 0, "Which trajectory best matches the long-run development pattern in the resource?", "Many countries move toward lower fertility and higher life expectancy over time, though paths and timing vary.", "gap-trend"],
    ["Spatial inequality", "Inference", ["High fertility and shorter life expectancy", "Low fertility and longer life expectancy", "Low fertility and shorter life expectancy", "High fertility and longer life expectancy only"], 0, "Which combination is represented by the upper-left cluster?", "The vertical axis rises with fertility while the horizontal axis rises with life expectancy, placing high-fertility, shorter-life-expectancy observations upper left.", "gap-cluster"],
  ]),
  ...makeRecords("worldmapper", [
    ["Climate change", "Cartogram interpretation", ["Area = per-capita emissions; colour = land area", "Area = absolute emissions; colour = per-capita emissions", "Area = population; colour = rainfall", "Area = GDP; colour = temperature"], 1, "How are the two variables encoded in this Worldmapper cartogram?", "Worldmapper states that territory area is resized by absolute CO₂ emissions while colour shading shows emissions per person.", "wm-encoding"],
    ["Map skills", "Cartogram interpretation", ["A rate such as population density", "A non-additive index", "A worldwide total such as tonnes emitted", "Latitude"], 2, "Which variable is most suitable for resizing territory area in a cartogram?", "Area cartograms work best with additive totals: each territory becomes its share of the world total.", "wm-additive"],
    ["Resources", "Spatial inference", ["It has a low absolute total", "It has no mapped borders", "Its rate must be zero", "It is physically small in land area"], 0, "A territory appears very small on this emissions cartogram. What can be inferred most safely?", "Cartogram size encodes the absolute mapped total, not physical land area or necessarily the per-capita rate.", "wm-small"],
    ["Map skills", "Ratio reasoning", ["Its mapped total is roughly twice as large", "Its land area is twice as large", "Its population density is half as large", "Its value is exactly equal"], 0, "Territory A has roughly twice the cartogram area of Territory B. What does that indicate?", "Within one cartogram, area is proportional to the mapped total, so a 2:1 area suggests roughly a 2:1 total.", "wm-ratio"],
    ["Cartography", "Critical map reading", ["The map is always north-up and equidistant", "Distance and direction are intentionally distorted", "Every border has its legal shape", "A scale bar would recover the original land area"], 1, "Why would a conventional scale bar be misleading on this map?", "A cartogram intentionally distorts geographic distance, direction and shape to make territory area proportional to data.", "wm-scale"],
  ]),
  ...makeRecords("usgs", [
    ["Hazards", "Spatial analysis", ["Deep inland earthquakes", "Shallow offshore earthquakes", "Small earthquakes in stable interiors", "Any earthquake at the poles"], 1, "Which event pattern creates the greatest tsunami concern?", "Large, shallow earthquakes beneath or near the ocean can vertically displace the seafloor and generate tsunamis.", "usgs-tsunami"],
    ["Tectonics", "Pattern recognition", ["Random political borders", "Plate boundaries", "Lines of equal rainfall", "Ocean shipping routes"], 1, "The linear clusters of earthquake epicentres most strongly trace what feature?", "Earthquakes cluster where tectonic plates interact, outlining many plate boundaries.", "usgs-boundary"],
    ["Hazards", "Temporal reasoning", ["A monsoon season", "An aftershock sequence", "A glacial cycle", "Urbanisation"], 1, "Many smaller events follow one large event in the same area. What is this sequence called?", "Aftershocks are earthquakes that follow the main shock as the crust readjusts.", "usgs-aftershock"],
    ["Tectonics", "Graph interpretation", ["The shallowest event", "The event with the largest magnitude", "The northernmost event", "The oldest event"], 1, "Which plotted event released the most seismic energy?", "Magnitude is the relevant plotted measure of earthquake size; the largest magnitude releases the most energy.", "usgs-magnitude"],
    ["Hazard management", "Risk reasoning", ["Hazard alone determines losses", "Exposure and vulnerability shape disaster risk", "Magnitude has no relevance", "Population never affects risk"], 1, "Why can two earthquakes of similar magnitude produce very different losses?", "Disaster risk combines the physical hazard with exposure, vulnerability and capacity to cope.", "usgs-risk"],
  ]),
  ...makeRecords("noaa", [
    ["Climate", "Graph interpretation", ["June–August", "September–November", "December–February", "It is uniform all year"], 0, "During which season is precipitation highest in the station record?", "The tallest precipitation bars occur in June, July and August.", "noaa-wet"],
    ["Climate", "Climate classification", ["A small annual temperature range", "A large annual temperature range", "No seasonality", "Temperatures below freezing all year"], 1, "Which feature most strongly suggests a continental climate?", "Continental interiors often have hotter summers and colder winters, producing a large annual temperature range.", "noaa-continental"],
    ["Climate change", "Critical thinking", ["One daily anomaly proves a climate trend", "A long record is needed to assess climate", "Weather and climate are identical", "A cold day disproves warming"], 1, "What is the soundest conclusion from one unusually warm day?", "A single event is weather. Climate trends require analysis of long-term records and variability.", "noaa-weather"],
    ["Climate", "Data quality", ["Ignore station metadata", "Check units, period and missing values", "Compare only the highest value", "Convert every value to a rank"], 1, "Before comparing two station records, what should be checked first?", "Comparable units, observation periods, station context and missing-data treatment are essential.", "noaa-quality"],
    ["Climate", "Seasonality", ["Mediterranean winter rain", "A summer monsoon", "A polar night", "A constant arid climate"], 1, "A sharp summer rainfall maximum with warm temperatures most likely indicates what regime?", "A concentrated warm-season rainfall maximum is characteristic of a summer monsoon regime.", "noaa-monsoon"],
  ]),
  ...makeRecords("nasa", [
    ["Remote sensing", "GIS literacy", ["A field questionnaire", "Pre-generated satellite image tiles", "A census table", "A cadastral deed"], 1, "What kind of resource does NASA GIBS deliver for geographic analysis?", "GIBS serves full-resolution Earth observation visualisations as responsive pre-generated map tiles.", "nasa-gibs"],
    ["Vegetation", "Temporal reasoning", ["Seasonal greening and senescence", "Plate motion", "Ocean salinity only", "Political boundary change"], 0, "What process best explains the repeating annual pulse in vegetation imagery?", "Vegetation indices commonly rise during growing seasons and fall during dormancy or dry seasons.", "nasa-ndvi"],
    ["Hazards", "Image interpretation", ["Wind transports a plume downwind", "Smoke always moves north", "Fire removes all clouds", "The plume marks a plate boundary"], 0, "What can the elongated smoke plume reveal?", "Its shape and orientation provide evidence of atmospheric transport by the prevailing wind.", "nasa-smoke"],
    ["Cryosphere", "Seasonal reasoning", ["At the end of the melt season", "At the winter solstice in both hemispheres", "During maximum snowfall only", "On the same date every day"], 0, "When is annual sea-ice extent usually at its minimum?", "The minimum generally occurs near the end of the hemisphere's summer melt season.", "nasa-ice"],
    ["Land use", "Change detection", ["Compare aligned images from two dates", "Compare two unrelated map projections", "Remove all metadata", "Use one image without context"], 0, "Which method best reveals land-cover change?", "Aligned, comparable imagery from different dates makes expansion, loss and conversion visible.", "nasa-change"],
  ]),
  ...makeRecords("worldbank", [
    ["Development", "Data interpretation", ["A broad inverse relationship", "A perfect positive relationship", "No relationship", "An alphabetical pattern"], 0, "What broad relationship appears between income per person and infant mortality?", "Higher income per person is generally associated with lower infant mortality, while important exceptions remain.", "wb-mortality"],
    ["Migration", "Multi-variable inference", ["Low literacy and high infant mortality", "Higher literacy and lower infant mortality", "Low income and rapid population growth", "High mortality and low service access"], 1, "Which profile suggests the weakest development-related push factors for emigration?", "Higher literacy, lower infant mortality and stronger economic conditions generally reduce development-related push pressures.", "wb-migration"],
    ["Urban geography", "Percentage reasoning", ["The share of people living in urban areas", "The number of cities", "The land covered by roads", "The share employed in farming only"], 0, "What does the indicator ‘urban population (% of total)’ measure?", "It is the share of a country's population classified as urban under the underlying statistical definition.", "wb-urban"],
    ["Population", "Rate reasoning", ["The population must shrink", "The population roughly doubles in 35 years", "The population doubles every 2 years", "No inference is possible"], 1, "Using the rule of 70, what does sustained 2% annual growth imply?", "Dividing 70 by a 2% growth rate gives an approximate doubling time of 35 years.", "wb-growth"],
    ["Development", "Data quality", ["Definitions and years should be checked", "Every country measures indicators identically", "Missing values equal zero", "Per-capita values are totals"], 0, "What caution matters when comparing indicators across countries?", "Definitions, years, collection methods and missing-data treatment can differ across observations.", "wb-compare"],
  ]),
  ...makeRecords("gbif", [
    ["Biodiversity", "Spatial analysis", ["True absence everywhere without a dot", "Sampling effort as well as species presence", "Only national borders", "A complete population census"], 1, "What do dense clusters of occurrence records show most safely?", "Occurrence density reflects where records were collected and shared, so it combines ecological signal with sampling effort.", "gbif-bias"],
    ["Biodiversity", "Pattern recognition", ["High recorded species richness", "Low topographic relief", "No human observers", "Equal abundance of every species"], 0, "What does a cell with many distinct recorded species indicate?", "It indicates high recorded richness for the chosen filters and period, not necessarily complete richness.", "gbif-richness"],
    ["Climate change", "Temporal-spatial analysis", ["A poleward or upslope shift", "A change in country spelling", "A constant sampling method", "The removal of coordinates"], 0, "Which pattern could be consistent with a climate-linked range shift?", "Repeated records moving poleward or upslope over time can be consistent with a shifting climatic range, though sampling bias must be assessed.", "gbif-shift"],
    ["Biodiversity", "Critical thinking", ["The species is certainly absent", "No occurrence has been recorded in the dataset", "The habitat is unsuitable", "The species is extinct"], 1, "What does an empty map cell mean in an occurrence dataset?", "It means no matching record is shown; it does not prove biological absence.", "gbif-absence"],
    ["Data ethics", "Source evaluation", ["All records have one universal licence", "Dataset-level licences and citations must be preserved", "Attribution is never needed", "Coordinates may be republished without review"], 1, "What should a question generator preserve when using GBIF-mediated records?", "GBIF datasets carry machine-readable licences and source-specific citation requirements that should travel with derived questions.", "gbif-license"],
  ]),
  ...makeRecords("openmaps", [
    ["Cartography", "Scale reasoning", ["A neighbourhood street plan", "A national relief map", "A world choropleth", "A building floor plan"], 0, "Which resource is most appropriate for identifying the safest walking route between two nearby sites?", "A detailed, large-scale street and path map provides the local network information required.", "map-scale"],
    ["Transport", "Network analysis", ["The route with the fewest drawn turns always", "The least-cost connected path", "The straight-line path through buildings", "The path farthest from all nodes"], 1, "In a route network, what does the shortest-path algorithm identify?", "It finds the connected path with the lowest specified cost, which may represent distance, time or another impedance.", "map-network"],
    ["Cartography", "Projection literacy", ["Area", "Every distance", "Every direction", "Every shape"], 0, "Which property does an equal-area world projection preserve?", "Equal-area projections preserve relative area while necessarily distorting some combination of shape, distance or direction.", "map-projection"],
    ["Landforms", "Image interpretation", ["A river delta", "A cirque glacier", "A fault scarp", "A sand dune"], 0, "A branching river enters standing water and deposits a fan-shaped body. Which landform is shown?", "Deposition at a river mouth can build distributary channels and a delta.", "media-delta"],
    ["Source literacy", "Attribution", ["Remove creator and licence metadata", "Carry creator, source and licence with the question", "Assume every online image is public domain", "Hotlink every full-resolution file"], 1, "What is the responsible way to reuse a Wikimedia Commons image?", "Each file has its own requirements; the generator should retain creator, source and licence details and verify reuse terms.", "media-credit"],
  ]),
];

export const practiceQuestionBank = questionRecords.map(toPracticeQuestion);
