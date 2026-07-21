import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const year = Number(process.argv.find((arg) => arg.startsWith("--year="))?.split("=")[1] ?? 2026);
const sourcePath = path.join(projectRoot, "data/population-pyramids", `${year}.json`);
const dataRoot = path.join(projectRoot, "data/population-pyramids");
const outputPath = path.join(dataRoot, "pyramids.json");
const csvPath = path.join(dataRoot, "pyramids.csv");

const records = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
if (!Array.isArray(records) || records.length !== 200) {
  throw new Error(`Expected 200 population-pyramid records in ${path.relative(projectRoot, sourcePath)}`);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function csvCell(value) {
  const text = value == null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const items = records.map((record, offset) => {
  const sourceImage = path.join(projectRoot, "public", record.imagePath);
  const localFile = path.posix.join("images", String(year), record.shapeClass, `${record.slug}.png`);
  const targetImage = path.join(dataRoot, localFile);
  fs.mkdirSync(path.dirname(targetImage), { recursive: true });
  fs.copyFileSync(sourceImage, targetImage);
  const image = fs.readFileSync(targetImage);
  if (image.length < 10_000 || image.subarray(1, 4).toString() !== "PNG") {
    throw new Error(`Invalid PNG: ${path.relative(projectRoot, targetImage)}`);
  }
  return {
    name: `${record.name} population pyramid ${year}`,
    country: record.name,
    slug: record.slug,
    location_code: record.locationCode,
    source_page: "https://www.populationpyramid.net/",
    map_page_url: record.pageUrl,
    image_url: record.imageUrl,
    categories: unique([
      "People",
      "Population and demography",
      record.shapeLabel,
      record.incomeGroup,
      ...record.interestingTagLabels,
    ]),
    index: offset + 1,
    local_file: localFile,
    status: "existing",
    bytes: image.length,
    sha256: crypto.createHash("sha256").update(image).digest("hex"),
    error: "",
    image_source: "PopulationPyramid.net capture service",
    year: record.year,
    population: record.population,
    shape_class: record.shapeClass,
    shape_label: record.shapeLabel,
    base_to_core_ratio: record.baseToCoreRatio,
    children_share: record.childrenShare,
    working_age_share: record.workingAgeShare,
    older_share: record.olderShare,
    income_group: record.incomeGroup,
    income_group_code: record.incomeGroupCode,
    world_bank_code: record.worldBankCode,
    male_to_female_20_49: record.maleToFemale20to49,
    female_to_male_65_plus: record.femaleToMale65Plus,
    interesting_tags: record.interestingTags,
    interesting_tag_labels: record.interestingTagLabels,
    notched_cohorts: record.notchedCohorts,
    male_dent_cohorts: record.maleDentCohorts,
    data_url: record.dataUrl,
  };
});

const manifest = {
  source: "https://www.populationpyramid.net/",
  data_source: "United Nations World Population Prospects 2024",
  income_source: "World Bank Country API",
  year,
  generated_at: new Date().toISOString(),
  item_count: items.length,
  available_image_count: items.filter((item) => item.status === "existing").length,
  failed_image_count: items.filter((item) => item.status !== "existing").length,
  items,
};
fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);

const columns = [
  "index", "country", "slug", "location_code", "year", "map_page_url", "image_url", "local_file",
  "categories", "status", "bytes", "sha256", "population", "shape_class", "shape_label",
  "base_to_core_ratio", "children_share", "working_age_share", "older_share", "income_group",
  "income_group_code", "world_bank_code", "male_to_female_20_49", "female_to_male_65_plus",
  "interesting_tags", "notched_cohorts", "male_dent_cohorts", "data_url",
];
const csv = [
  columns.join(","),
  ...items.map((item) => columns.map((key) => {
    const value = Array.isArray(item[key]) ? item[key].join(" | ") : item[key];
    return csvCell(value);
  }).join(",")),
].join("\n") + "\n";
fs.writeFileSync(csvPath, csv);

console.log(JSON.stringify({
  output: path.relative(projectRoot, outputPath),
  csv: path.relative(projectRoot, csvPath),
  images: items.length,
  bytes: items.reduce((sum, item) => sum + item.bytes, 0),
}, null, 2));
