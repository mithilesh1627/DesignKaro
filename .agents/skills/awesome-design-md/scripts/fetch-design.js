#!/usr/bin/env node

/**
 * CLI helper to fetch, search, and inspect DESIGN.md specifications
 * from the VoltAgent/awesome-design-md repository.
 *
 * Usage:
 *   node fetch-design.js <brand> [--out <path>]
 *   node fetch-design.js --list
 *   node fetch-design.js --search <keyword>
 *   node fetch-design.js --inspect <brand>
 */

const fs = require("fs");
const path = require("path");

const REPO_RAW_BASE =
  "https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md";

const ALIASES = {
  linear: "linear.app",
  tailwind: "tailwindcss",
  mistral: "mistral.ai",
  opencode: "opencode.ai",
  runway: "runwayml",
  together: "together.ai",
  xai: "x.ai",
  dell: "dell-1996",
  nintendo: "nintendo-2001",
};

const BRANDS = [
  "airbnb",
  "airtable",
  "apple",
  "binance",
  "bmw",
  "bmw-m",
  "bugatti",
  "cal",
  "claude",
  "clay",
  "clickhouse",
  "cohere",
  "coinbase",
  "composio",
  "cursor",
  "dell-1996",
  "elevenlabs",
  "expo",
  "ferrari",
  "figma",
  "framer",
  "hashicorp",
  "hp",
  "ibm",
  "intercom",
  "kraken",
  "lamborghini",
  "linear.app",
  "lovable",
  "mastercard",
  "meta",
  "minimax",
  "mintlify",
  "miro",
  "mistral.ai",
  "mongodb",
  "nike",
  "nintendo-2001",
  "notion",
  "nvidia",
  "ollama",
  "opencode.ai",
  "pinterest",
  "playstation",
  "posthog",
  "raycast",
  "renault",
  "replicate",
  "resend",
  "revolut",
  "runwayml",
  "sanity",
  "sentry",
  "shopify",
  "slack",
  "spacex",
  "spotify",
  "starbucks",
  "stripe",
  "supabase",
  "superhuman",
  "tailwindcss",
  "tesla",
  "together.ai",
  "uber",
  "vercel",
  "voltagent",
  "warp",
  "x.ai",
  "youtube",
];

function printHelp() {
  console.log(`
Awesome DESIGN.md Skill CLI
===========================
Fetch, search, and apply design systems from VoltAgent/awesome-design-md.

Commands:
  node fetch-design.js <brand>              Download DESIGN.md to project root
  node fetch-design.js <brand> --out <dir>  Download DESIGN.md to custom path
  node fetch-design.js --list               List all 70+ available brands
  node fetch-design.js --search <query>     Search available brands
  node fetch-design.js --inspect <brand>    Display summary of brand design system

Examples:
  node fetch-design.js linear
  node fetch-design.js stripe --out ./styles/DESIGN.md
  node fetch-design.js --search ai
  node fetch-design.js --inspect vercel
`);
}

function resolveBrand(input) {
  if (!input) return null;
  const normalized = input.trim().toLowerCase();
  if (ALIASES[normalized]) return ALIASES[normalized];
  if (BRANDS.includes(normalized)) return normalized;
  // Match partial
  const matched = BRANDS.find((b) => b.includes(normalized));
  return matched || normalized;
}

async function fetchDesignMd(brand) {
  const resolved = resolveBrand(brand);
  const url = `${REPO_RAW_BASE}/${resolved}/DESIGN.md`;

  console.log(`Fetching DESIGN.md for "${resolved}" from ${url}...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch (${response.status} ${response.statusText}). Brand "${resolved}" might not exist in repository.`
    );
  }
  return { content: await response.text(), brand: resolved, url };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  if (args.includes("--list") || args.includes("-l")) {
    console.log(`\nAvailable Brands in Awesome DESIGN.md (${BRANDS.length} total):`);
    console.log("--------------------------------------------------");
    const cols = 3;
    for (let i = 0; i < BRANDS.length; i += cols) {
      const row = BRANDS.slice(i, i + cols)
        .map((b) => b.padEnd(24))
        .join("");
      console.log(`  ${row}`);
    }
    console.log("\nUsage: node fetch-design.js <brand>\n");
    return;
  }

  const searchIdx = args.indexOf("--search");
  if (searchIdx !== -1) {
    const query = args[searchIdx + 1]?.toLowerCase();
    if (!query) {
      console.error("Error: --search requires a query string.");
      process.exit(1);
    }
    const results = BRANDS.filter((b) => b.includes(query));
    console.log(`\nFound ${results.length} matches for "${query}":`);
    results.forEach((r) => console.log(`  • ${r}`));
    console.log("");
    return;
  }

  const inspectIdx = args.indexOf("--inspect");
  if (inspectIdx !== -1) {
    const brand = args[inspectIdx + 1];
    if (!brand) {
      console.error("Error: --inspect requires a brand name.");
      process.exit(1);
    }
    try {
      const { content, brand: resolved } = await fetchDesignMd(brand);
      // Print description or frontmatter
      const lines = content.split("\n").slice(0, 45).join("\n");
      console.log(`\n--- Summary: ${resolved} ---\n${lines}\n...\n`);
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
    return;
  }

  const brand = args[0];
  const outIdx = args.indexOf("--out");
  const targetPath =
    outIdx !== -1 && args[outIdx + 1]
      ? path.resolve(process.cwd(), args[outIdx + 1])
      : path.resolve(process.cwd(), "DESIGN.md");

  try {
    const { content, brand: resolved } = await fetchDesignMd(brand);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, content, "utf8");
    console.log(`\n[SUCCESS] Saved DESIGN.md for "${resolved}" to:`);
    console.log(`  ${targetPath}`);
    console.log(`\nNext steps:`);
    console.log(`  1. Review the tokens, typography, and component specs in ${targetPath}`);
    console.log(`  2. Prompt your agent: "Apply the design system from DESIGN.md to [component/page]"`);
  } catch (err) {
    console.error(`\n[ERROR] ${err.message}`);
    process.exit(1);
  }
}

main();
