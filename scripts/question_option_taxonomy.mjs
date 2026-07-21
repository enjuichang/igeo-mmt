const stopWords = new Set([
  "a",
  "all",
  "and",
  "at",
  "between",
  "by",
  "for",
  "from",
  "in",
  "of",
  "per",
  "the",
  "to",
  "total",
  "world",
  "year",
]);

export const worldmapperOptionCategories = [
  "hazards",
  "health",
  "migration",
  "culture-identity",
  "education-knowledge",
  "sport-leisure",
  "agriculture-food",
  "energy-resources",
  "environment-climate",
  "population-demography",
  "economy-work-trade",
  "politics-conflict",
  "connectivity-transport",
  "settlement-services",
  "tourism-heritage",
  "general-society",
];

export function normalizeOptionText(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function optionConceptKey(value) {
  return normalizeOptionText(value)
    .replace(/\b(?:18|19|20|21)\d{2}\b/g, " ")
    .replace(/\b(?:increase|increased|growth|grew|decline|declined|decrease|decreased)\b/g, " ")
    .replace(/\b(?:male|female|men|women|boys|girls|all|total)\b/g, " ")
    .split(/\s+/)
    .filter((token) => token && !stopWords.has(token))
    .join(" ");
}

export function worldmapperOptionCategory(item) {
  const name = normalizeOptionText(item.name ?? item);
  const categories = new Set(item.categories ?? []);

  if (/earthquake|flood|volcan|wildfire|fire damage|fire homeless|drought|storm|disaster|tsunami|landslide/.test(name)) return "hazards";
  if (/covid|coronavirus|malaria|measles|cancer|hiv|aids|tuberculosis|disease|health|under 5 deaths|cause of death/.test(name) || categories.has("Health")) return "health";
  if (/migration|migrant|refugee|asylum|displacement/.test(name)) return "migration";
  if (/language|religion|religious|christian|muslim|hindu|buddhist|jewish|atheist|identity/.test(name) || categories.has("Identity")) return "culture-identity";
  if (/education|literacy|school|university|science paper|nobel prize/.test(name) || categories.has("Education")) return "education-knowledge";
  if (/olympic|football|world cup|wimbledon|sport|medal/.test(name)) return "sport-leisure";
  if (/power|electricity generation|energy|coal|oil|gas|fuel|proven reserves|nuclear/.test(name)) return "energy-resources";
  if (/carbon|co2|emission|climate|chlorophyll|treecover|deforestation|environment|ecological|pollution|temperature|rainfall/.test(name) || categories.has("Environment")) return "environment-climate";
  if (/production|crop|agricultur|cattle|chicken|duck|camel|livestock|beehive|honey|fish catch|whale caught|forest area/.test(name)) return "agriculture-food";
  if (/population|birth|fertility|mortality|age |year olds|centenarian|life expectancy|deaths/.test(name)) return "population-demography";
  if (/gdp|income|wealth|work|employment|unemployment|worker|imports?|exports?|trade|industry|economic|imf/.test(name) || categories.has("Economy")) return "economy-work-trade";
  if (/election|vote|military|weapon|death penalty|conflict|government|politic/.test(name)) return "politics-conflict";
  if (/internet|mobile|telephone|broadband|ship|cargo|transport|rail|road|airport|flight|connectivity/.test(name) || categories.has("Connectivity")) return "connectivity-transport";
  if (/urban|rural|water access|sanitation|defecation|housing|habitation|electricity access|no electricity/.test(name) || categories.has("Habitation")) return "settlement-services";
  if (/tourist|tourism|unesco|michelin|heritage|restaurant/.test(name)) return "tourism-heritage";
  if (categories.has("People")) return "population-demography";
  if (categories.has("Resources")) return "energy-resources";
  if (categories.has("Society")) return "general-society";
  return "general-society";
}

export function assertDistinctConcepts(options, questionId) {
  const concepts = options.map(optionConceptKey);
  if (concepts.some((concept) => !concept) || new Set(concepts).size !== options.length) {
    throw new Error(`Options differ only by year, sex label, trend label, or wording: ${questionId}`);
  }
}
