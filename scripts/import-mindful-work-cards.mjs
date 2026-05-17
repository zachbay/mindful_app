import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const sourceDir =
  process.env.MINDFUL_WORK_CARD_FACE_PDF_DIR ??
  "/Users/zachsherry/Documents/Mindful Work/Card Face PDF ";

const files = fs
  .readdirSync(sourceDir)
  .filter((file) => /^Card \d+\.pdf$/.test(file))
  .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

const cards = [];

for (const file of files) {
  const cardNumber = Number(file.match(/\d+/)[0]);
  const data = new Uint8Array(fs.readFileSync(path.join(sourceDir, file)));
  const doc = await pdfjs.getDocument({ data, disableWorker: true }).promise;
  const page = await doc.getPage(1);
  const content = await page.getTextContent();

  const categoryParts = [];
  const groups = [];
  let group = [];

  for (const item of content.items) {
    const text = item.str.trim();
    const y = Math.round(item.transform[5]);

    if (!text) {
      if (group.length) {
        groups.push(group.join(" "));
        group = [];
      }
      continue;
    }

    if (y < 30) {
      categoryParts.push(text);
      continue;
    }

    group.push(text);
  }

  if (group.length) {
    groups.push(group.join(" "));
  }

  cards.push({
    cardId: `mw-${String(cardNumber).padStart(3, "0")}`,
    cardNumber,
    category: categoryParts.join(" "),
    prompt: groups[0] ?? "",
    exampleText: groups.slice(1).join(" "),
    templateFileName: file
  });
}

const ts = `import type { ReflectionCard } from "./decks";\n\nexport const mindfulWorkCards = ${JSON.stringify(
  cards,
  null,
  2
)} satisfies ReflectionCard[];\n`;

fs.mkdirSync(path.join(repoRoot, "data"), { recursive: true });
fs.writeFileSync(path.join(repoRoot, "lib/mindful-work-cards.ts"), ts);
fs.writeFileSync(
  path.join(repoRoot, "data/mindful-work-cards.json"),
  `${JSON.stringify(cards, null, 2)}\n`
);

console.log(`Imported ${cards.length} Mindful Work cards.`);
