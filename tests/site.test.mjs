// Checks for the live site: the promoted page plus the files search and answer engines read.
// Run with: node --test tests/site.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(join(root, file), "utf8");
const SITE = "https://parsonsprojects.github.io/";

const html = read("index.html");
const meta = (attr, name) => html.match(new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`))?.[1];

test("index is the Powers of Ten page", () => {
  assert.match(html, /data-art="universe"/);
  assert.match(html, /const DEFAULT_TWISTS/);
});

test("zoom pictures are drawn on canvas each frame instead of scaling huge page layers", () => {
  assert.match(html, /<canvas class="pic"/, "levels have no picture canvas");
  assert.match(html, /createImageBitmap\(/, "pictures are not turned into bitmaps");
  assert.match(html, /\.drawImage\(/);
});

test("animation layers only run while their level is near its natural size", () => {
  assert.match(html, /const FX_RANGE = \[/);
});

test("title says who and what", () => {
  const title = html.match(/<title>([^<]*)<\/title>/)[1];
  assert.match(title, /Alan Parsons/);
  assert.match(title, /developer/i);
  assert.ok(title.length <= 60, `title is ${title.length} characters`);
});

test("has a description of a sensible length", () => {
  const description = meta("name", "description");
  assert.ok(description, "missing meta description");
  assert.ok(description.length >= 70 && description.length <= 160, `description is ${description.length} characters`);
});

test("declares British English, canonical URL and icons", () => {
  assert.match(html, /<html lang="en-GB"/);
  assert.match(html, new RegExp(`<link rel="canonical" href="${SITE}">`));
  assert.match(html, /<link rel="icon" [^>]*href="icon\.png"/);
});

test("has social preview tags", () => {
  for (const name of ["og:title", "og:description", "og:url", "og:type", "og:image"]) {
    assert.ok(meta("property", name), `missing ${name}`);
  }
  assert.equal(meta("property", "og:url"), SITE);
  assert.ok(meta("name", "twitter:card"), "missing twitter:card");
});

test("structured data describes Alan and his public projects", () => {
  const block = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(block, "missing JSON-LD");
  const graph = JSON.parse(block[1])["@graph"];
  const person = graph.find((n) => n["@type"] === "Person");
  assert.equal(person.name, "Alan Parsons");
  assert.ok(person.jobTitle, "person has no job title");
  assert.ok(person.sameAs.includes("https://github.com/ParsonsProjects"));
  const names = graph.map((n) => n.name);
  for (const project of ["Puzzles & Mortar", "Grove Bench"]) assert.ok(names.includes(project), `no entry for ${project}`);
  assert.ok(graph.some((n) => n["@type"] === "WebSite"), "no WebSite entry");
});

test("has a plain, visible summary of everything, not just the zoom captions", () => {
  const summary = html.match(/<section class="summary" id="summary"[\s\S]*?<\/section>/);
  assert.ok(summary, "missing summary section");
  assert.doesNotMatch(summary[0].split(">")[0], /hidden/);
  for (const project of ["Puzzles &amp; Mortar", "Grove Bench", "Deep Keep", "Deep Dungeon", "Tarsier", "Fluid Gallery"]) {
    assert.ok(summary[0].includes(project), `summary is missing ${project}`);
  }
});

test("features Tarsier, an earlier pre-AI project, instead of Whisper Recorder", () => {
  for (const [name, text] of [["index.html", html], ["llms.txt", read("llms.txt")]]) {
    assert.doesNotMatch(text, /Whisper Recorder|whisper-recorder/i, `${name} still mentions Whisper Recorder`);
    assert.ok(text.includes("https://github.com/ParsonsProjects/Tarsier"), `${name} doesn't link to Tarsier`);
  }
  const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])["@graph"];
  assert.ok(graph.some((n) => n.name === "Tarsier"), "no structured data entry for Tarsier");
});

test("features Fluid Gallery, an earlier project, instead of How Does This Sound", () => {
  for (const [name, text] of [["index.html", html], ["llms.txt", read("llms.txt")]]) {
    assert.doesNotMatch(text, /How Does This Sound|how-does-this-sound/i, `${name} still mentions How Does This Sound`);
    assert.ok(text.includes("https://github.com/ParsonsProjects/fluidgallery"), `${name} doesn't link to Fluid Gallery`);
    assert.ok(text.includes("https://parsonsprojects.github.io/fluidgallery/"), `${name} doesn't link to the demo`);
  }
  const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])["@graph"];
  assert.ok(graph.some((n) => n.name === "Fluid Gallery"), "no structured data entry for Fluid Gallery");
});

test("Deep Keep is shown as live and playable at playdeepkeep.com", () => {
  for (const [name, text] of [["index.html", html], ["llms.txt", read("llms.txt")]]) {
    assert.ok(text.includes("https://playdeepkeep.com"), `${name} doesn't link to Deep Keep`);
  }
  const summaryEntry = html.match(/<section class="summary"[\s\S]*?<h3>Deep Keep<\/h3>[\s\S]*?<\/li>/)[0];
  assert.doesNotMatch(summaryEntry.slice(summaryEntry.lastIndexOf("<h3>Deep Keep")), /in progress/i);
  assert.doesNotMatch(html, /no random numbers/i, "Deep Keep does roll; it just shows the rolls up front");
  const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])["@graph"];
  const game = graph.find((n) => n.name === "Deep Keep");
  assert.equal(game?.url, "https://playdeepkeep.com/");
});

test("Puzzles & Mortar is not described as children-only", () => {
  for (const [name, text] of [["index.html", html], ["llms.txt", read("llms.txt")]]) {
    assert.doesNotMatch(text, /game for children/i, `${name} says it's a game for children`);
    assert.match(text, /anyone can play/i, `${name} doesn't say anyone can play`);
  }
  const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])["@graph"];
  const game = graph.find((n) => n.name === "Puzzles & Mortar");
  assert.equal(game.audience?.suggestedMaxAge, undefined, "structured data still caps the age at 13");
});

test("visible summary speaks in the first person, like the rest of the page", () => {
  const summary = html.match(/<section class="summary" id="summary"[\s\S]*?<\/section>/)[0];
  assert.doesNotMatch(summary, /Alan Parsons is|\bhe\b|\bhis\b/i);
  assert.match(summary, /\bI\b/);
});

test("uses the real contact email, not the placeholder", () => {
  assert.doesNotMatch(html, /example\.com/);
  assert.match(html, /href="mailto:parsonsprojects@outlook\.com"/);
  const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])["@graph"];
  assert.equal(graph.find((n) => n["@type"] === "Person").email, "mailto:parsonsprojects@outlook.com");
});

// Work history, as on LinkedIn.
const ROLES = [
  ["Craftsman+", "Technical Director", "March 2026"],
  ["Craftsman+", "Software Solutions Architect", "January 2022"],
  ["GForces", "Lead CSS / Frontend Developer", "September 2011"],
  ["SiteWizard.co.uk", "Graphics &amp; Web Designer", "May 2010"],
  ["1businesssystem", "Graphics &amp; Web Designer", "2009"],
];

test("summary has an experience section with every role", () => {
  const experience = html.match(/<section class="experience" id="experience"[\s\S]*?<\/section>/);
  assert.ok(experience, "missing experience section");
  for (const [company, title, start] of ROLES) {
    for (const part of [company, title, start]) assert.ok(experience[0].includes(part), `experience is missing ${part}`);
  }
  assert.match(experience[0], /href="cv\.html"/, "no link to the CV");
  assert.match(experience[0], /href="cv\.pdf"[^>]*download/, "no CV download");
});

test("zoom readout and scroll hint hide once the reader is past the zoom", () => {
  assert.match(html, /classList\.toggle\("past-tour"/);
  assert.match(html, /\.past-tour \.hud/);
});

test("desk caption mentions the day job", () => {
  const desk = html.match(/id="about"[\s\S]*?<\/section>/)[0];
  assert.match(desk, /Technical Director at Craftsman\+/);
});

test("structured data includes current job, education and LinkedIn", () => {
  const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])["@graph"];
  const person = graph.find((n) => n["@type"] === "Person");
  assert.equal(person.jobTitle, "Technical Director");
  assert.equal(person.worksFor?.name, "Craftsman+");
  assert.equal(person.alumniOf?.name, "University for the Creative Arts");
  assert.ok(person.sameAs.includes("https://www.linkedin.com/in/alan-parsons-474b2913"));
});

test("CV page lists every role, education and skills, and prints cleanly", () => {
  const cv = read("cv.html");
  assert.match(cv, /<title>[^<]*Alan Parsons[^<]*CV[^<]*<\/title>/);
  assert.match(cv, /<link rel="canonical" href="https:\/\/parsonsprojects\.github\.io\/cv\.html">/);
  // The CV uses short month names ("Mar 2026") so its date column doesn't wrap.
  const short = (date) => date.replace(/^([A-Z][a-z]{2})[a-z]+ /, "$1 ");
  for (const [company, title, start] of ROLES) {
    for (const part of [company, title, short(start)]) assert.ok(cv.includes(part), `CV is missing ${part}`);
  }
  assert.match(cv, /University for the Creative Arts/);
  for (const skill of ["TypeScript", "Svelte", "AWS", "TDD"]) assert.ok(cv.includes(skill), `CV is missing ${skill}`);
  assert.match(cv, /@media print/);
  assert.match(cv, /href="mailto:parsonsprojects@outlook\.com"/);
  assert.match(cv, /href="\/"|href="https:\/\/parsonsprojects\.github\.io\/"/, "CV doesn't link back to the site");
});

test("Craftsman+ roles list achievements drawn from the work itself", () => {
  const cv = read("cv.html");
  // Each role runs from its heading to the next role's heading.
  const between = (from, to) => cv.slice(cv.indexOf(from), cv.indexOf(to));
  const director = between("<h3>Technical Director", "<h3>Software Solutions Architect");
  const architect = between("<h3>Software Solutions Architect", "<h3>Lead CSS");
  assert.ok((director.match(/<li>/g) || []).length >= 4, "Technical Director needs at least four achievements");
  assert.ok((architect.match(/<li>/g) || []).length >= 3, "Solutions Architect needs at least three achievements");
  for (const theme of [/multiplayer/i, /MCP/, /usage|credit/i]) assert.match(director, theme);
  for (const theme of [/serverless/i, /analytics/i, /export/i]) assert.match(architect, theme);
  const work = html.match(/<section class="experience"[\s\S]*?<\/section>/)[0];
  assert.match(work, /multiplayer/i, "home page work section doesn't mention the headline achievement");
});

test("Craftsman+ roles back their claims with usage figures", () => {
  const cv = read("cv.html");
  const craftsman = cv.slice(cv.indexOf("<h3>Technical Director"), cv.indexOf("<h3>Lead CSS"));
  // Figures like "4,000", "600" or "30,000", but not years.
  const figures = (craftsman.match(/\b\d{1,3}(,\d{3})+\b|\b\d{3}\b/g) || []).filter((n) => !/^(19|20)\d\d$/.test(n));
  assert.ok(figures.length >= 4, `only ${figures.length} usage figures: ${figures.join(", ")}`);
  assert.match(craftsman, /past year|last 12 months|a year/i, "figures need a time frame");
  // Staff and anonymous share-link viewers inflated the first draft, so say whose usage it is.
  assert.match(craftsman, /customer/i, "figures should be customer usage, not staff or anonymous visitors");
  assert.doesNotMatch(craftsman, /4,000 people|roughly doubling|5,500|100,000 uploads|30,000 requests/);
});

test("analytics claims use the yearly ad session totals", () => {
  const cv = read("cv.html");
  const analytics = cv.match(/<li>Led and helped implement the playable analytics stack[\s\S]*?<\/li>/)[0].replace(/\s+/g, " ");
  // Alan led the analytics work and helped build it, so no wording that claims he built it alone.
  for (const [name, text] of [["index.html", html], ["llms.txt", read("llms.txt")]]) {
    assert.match(text.replace(/\s+/g, " "), /led and helped implement the playable analytics stack/i, `${name} overstates the analytics role`);
  }
  assert.match(analytics, /3 billion ad sessions/);
  assert.match(analytics, /110 million/);
  assert.match(html.match(/<section class="experience"[\s\S]*?<\/section>/)[0], /3 billion/);
  assert.match(read("llms.txt"), /3 billion/);
  // October 2025 looks like a partial month, so no growth multiple taken from it.
  assert.doesNotMatch(cv + html, /10x|10×|tenfold/i);
});

test("work history keeps clients, ticket numbers and internal repo names private", () => {
  for (const [name, text] of [["index.html", html], ["cv.html", read("cv.html")], ["llms.txt", read("llms.txt")]]) {
    assert.doesNotMatch(text, /T-Mobile|segasammy|Sega Sammy/i, `${name} names a client`);
    assert.doesNotMatch(text, /\b(API|CMP|PLAY|STUDIO)-\d{2,}\b/, `${name} contains a ticket number`);
    assert.doesNotMatch(text, /cmp-(serverless|frontend|tinybird|infrastructure)/, `${name} names an internal repo`);
  }
});

// CV scanners (ATS) read the PDF's text layer: letter-spacing splits headings into letters ("S U M M A R Y"),
// and spaces at the edge of a bold run get dropped ("Technical Director· Craftsman+").
test("CV keeps only the strongest figures", () => {
  const cv = read("cv.html").replace(/\s+/g, " ");
  assert.doesNotMatch(cv, /successful exports a year/, "export count reads small next to 3 billion sessions");
  assert.doesNotMatch(cv, /uploads a year/, "upload count reads small next to 3 billion sessions");
});

test("CV folds the two early design jobs into one line", () => {
  const cv = read("cv.html");
  const earlier = cv.match(/<h3>Earlier roles[\s\S]*?<\/li>/);
  assert.ok(earlier, "no Earlier roles entry");
  assert.match(earlier[0], /SiteWizard\.co\.uk/);
  assert.match(earlier[0], /1businesssystem/);
  assert.equal((cv.match(/<h3>Graphics &amp; Web Designer/g) || []).length, 0, "early jobs still listed separately");
});

test("CV text survives CV scanners", () => {
  const cv = read("cv.html");
  const css = cv.match(/<style>([\s\S]*?)<\/style>/)[1];
  for (const rule of css.match(/(^|\n)\s*(h1|h2|\.when|\.org)[^{]*\{[^}]*\}/g) || []) {
    assert.doesNotMatch(rule, /letter-spacing/, `letter-spacing in: ${rule.trim()}`);
  }
  assert.doesNotMatch(cv, / <span class="org">·/, "the space before the separator must sit inside the company span");
  assert.match(cv, /<span class="org"> · /);
  for (const month of ["January", "February", "March", "April", "June", "July", "August", "September", "October", "November", "December"]) {
    const when = [...cv.matchAll(/<span class="when">([^<]*)<\/span>/g)].map((m) => m[1]).join(" | ");
    assert.ok(!when.includes(month), `full month name in dates (${month}) makes them wrap: ${when}`);
  }
});

test("CV PDF exists and is a real PDF", () => {
  assert.ok(existsSync(join(root, "cv.pdf")), "missing cv.pdf");
  const bytes = readFileSync(join(root, "cv.pdf"));
  assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
  assert.ok(bytes.length > 5000, "cv.pdf looks empty");
});

test("sitemap and llms.txt include the CV and work history", () => {
  assert.match(read("sitemap.xml"), /<loc>https:\/\/parsonsprojects\.github\.io\/cv\.html<\/loc>/);
  const llms = read("llms.txt");
  assert.match(llms, /Technical Director at Craftsman\+/);
  assert.match(llms, /GForces/);
  assert.ok(llms.includes("https://parsonsprojects.github.io/cv.html"));
});

test("does not link to the design prototypes", () => {
  assert.doesNotMatch(html, /href="(prototypes\/)?index\.html"/);
  assert.doesNotMatch(html, /prototypes\//);
});

test("local references resolve", () => {
  const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1])
    .filter((ref) => !/^(https?:|mailto:|data:|#|\$\{)/.test(ref));
  for (const ref of refs) assert.ok(existsSync(join(root, ref.split(/[?#]/)[0])), `missing ${ref}`);
});

test("robots.txt allows the site, hides prototypes and points at the sitemap", () => {
  const robots = read("robots.txt");
  assert.match(robots, /User-agent: \*/);
  assert.match(robots, /Disallow: \/prototypes\//);
  assert.match(robots, new RegExp(`Sitemap: ${SITE}sitemap\\.xml`));
});

test("sitemap lists the home page", () => {
  assert.match(read("sitemap.xml"), new RegExp(`<loc>${SITE}</loc>`));
});

test("llms.txt summarises the site for answer engines", () => {
  const llms = read("llms.txt");
  assert.match(llms, /^# Parsons Projects/);
  assert.match(llms, /^> /m);
  for (const link of ["https://puzzlesandmortar.com", "https://github.com/ParsonsProjects/grove-bench"]) {
    assert.ok(llms.includes(link), `llms.txt is missing ${link}`);
  }
});
