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
  const normalized = normalizeOptionText(value)
    .replace(/\b(?:18|19|20|21)\d{2}\b/g, " ")
    .replace(/\b(?:increase|increased|growth|grew|decline|declined|decrease|decreased)\b/g, " ")
    .replace(/\b(?:male|female|men|women|boys|girls|all|total)\b/g, " ")
    .split(/\s+/)
    .filter((token) => token && !stopWords.has(token))
    .join(" ");
  return normalized || normalizeOptionText(value);
}

export function worldmapperSubjectKey(value) {
  const normalized = optionConceptKey(value)
    .replace(/\b(?:no|without|spread|access|usage|production|produced|imports?|exports?|consumption|rates?|ratio|share|capita|population|people)\b/g, " ")
    .split(/\s+/)
    .filter((token) => token && !stopWords.has(token))
    .join(" ");
  return normalized || optionConceptKey(value);
}

export function worldmapperOptionCategory(item) {
  const name = normalizeOptionText(item.name ?? item);
  const categories = new Set(item.categories ?? []);

  if (/water access|electricity access|no electricity|sanitation|defecation/.test(name)) return "settlement-services";
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

export function worldmapperSemanticDomain(item) {
  const name = normalizeOptionText(item.name ?? item);

  if (/water access|electricity access|no electricity|sanitation|defecation/.test(name)) return "basic-services";
  if (/language/.test(name)) return "language";
  if (/religion|religious|christian|muslim|hindu|buddhist|jewish|atheist|confucian/.test(name)) return "religion";
  if (/migration|migrant|refugee|asylum|displacement/.test(name)) return "migration";
  if (/earthquake|flood|volcan|wildfire|fire damage|fire homeless|drought|storm|disaster|tsunami|landslide|avalanche|heatwave/.test(name)) return "hazards";
  if (/covid|coronavirus|malaria|measles|cancer|hiv|aids|tuberculosis|disease|health|cause of death|under 5 deaths/.test(name)) return "health";
  if (/carbon|co2|emission|climate|chlorophyll|treecover|deforestation|pollution|temperature|rainfall|biodiversity/.test(name)) return "environment";
  if (/population|birth|fertility|mortality|age |year olds|centenarian|life expectancy|deaths/.test(name)) return "demography";
  if (/crop|production|cattle|chicken|duck|camel|livestock|beehive|honey|fish catch|whale caught/.test(name)) return "agriculture-production";
  if (/power|energy|coal|oil|gas|fuel|proven reserves/.test(name)) return "energy-resources";
  if (/imports?|exports?|trade|cargo/.test(name)) return "trade";
  if (/gdp|income|wealth|employment|unemployment|worker|work force|workforce|labour|labor|industry|economic|poverty/.test(name)) return "economy-work";
  if (/education|literacy|school|university/.test(name)) return "education";
  if (/science paper|nobel prize/.test(name)) return "science-awards";
  if (/olympic|football|world cup|wimbledon|sport|medal/.test(name)) return "sport";
  if (/election|vote|military|weapon|death penalty|conflict|government|politic|state visit/.test(name)) return "politics";
  if (/internet|mobile|telephone|broadband|tweet/.test(name)) return "digital-connectivity";
  if (/ship|rail|road|airport|flight|transport/.test(name)) return "transport";
  if (/tourist|tourism|unesco|michelin|heritage|restaurant/.test(name)) return "tourism-heritage";
  if (/urban|rural|housing|habitation/.test(name)) return "settlement";
  return worldmapperOptionCategory(item);
}

export function worldmapperSemanticFamily(item) {
  const domain = worldmapperSemanticDomain(item);
  const families = {
    "basic-services": "human-development",
    health: "human-development",
    demography: "human-development",
    education: "human-development",
    settlement: "human-development",
    "economy-work": "human-development",
    language: "culture-belief",
    religion: "culture-belief",
    "tourism-heritage": "culture-belief",
    migration: "mobility-communication",
    "digital-connectivity": "mobility-communication",
    transport: "mobility-communication",
    hazards: "natural-environment",
    environment: "natural-environment",
    "agriculture-production": "production-exchange",
    "energy-resources": "production-exchange",
    trade: "production-exchange",
    politics: "institutions-achievement",
    sport: "institutions-achievement",
    "science-awards": "institutions-achievement",
  };
  if (families[domain]) return families[domain];

  const categoryFamilies = {
    hazards: "natural-environment",
    health: "human-development",
    migration: "mobility-communication",
    "culture-identity": "culture-belief",
    "education-knowledge": "human-development",
    "sport-leisure": "institutions-achievement",
    "agriculture-food": "production-exchange",
    "energy-resources": "production-exchange",
    "environment-climate": "natural-environment",
    "population-demography": "human-development",
    "economy-work-trade": "production-exchange",
    "politics-conflict": "institutions-achievement",
    "connectivity-transport": "mobility-communication",
    "settlement-services": "human-development",
    "tourism-heritage": "culture-belief",
    "general-society": "general-society",
  };
  return categoryFamilies[worldmapperOptionCategory(item)];
}

export function areAdjacentTopics(left, right) {
  const leftSubject = worldmapperSubjectKey(left.name ?? left);
  const rightSubject = worldmapperSubjectKey(right.name ?? right);
  if (leftSubject === rightSubject) return true;
  return worldmapperSemanticFamily(left) === worldmapperSemanticFamily(right);
}

export function assertDistinctConcepts(options, questionId) {
  const concepts = options.map(optionConceptKey);
  if (concepts.some((concept) => !concept) || new Set(concepts).size !== options.length) {
    throw new Error(`Options differ only by year, sex label, trend label, or wording: ${questionId}`);
  }
}
