# Skattelupp

**Live site: https://e04mk.github.io/skattelupp/**

Skattelupp lets you enter your gross salary and pick your Swedish municipality (kommun) to see:

- how much tax you actually pay, and what you keep as net pay
- a slider to see how that changes as your salary changes
- where your **kommunal**, **regional**, and **state** income tax goes — broken down by
  spending area (schools, healthcare, elderly care, defence, debt interest, etc.), based on
  real government figures rather than estimates

It's a plain static site: no backend, no build step, no analytics, and **no cookies or
tracking of any kind** — everything is fetched once as a static JSON file and calculated
entirely in your browser.

## Why

Swedish income tax is split across several recipients (kommun, region/landsting, and the
state above a threshold), and it's genuinely hard to get an intuitive feel for how a change
in salary changes your tax, or what that tax money actually funds. Skattelupp answers both
questions from one number: your gross salary.

## How it works

- **Tax calculation** (`js/tax-calc.js`) implements Skatteverket's actual 2026 formulas for
  grundavdrag (basic allowance) and jobbskatteavdrag (the earned-income tax credit) —
  verified against Skatteverket's own official worked examples, not an approximation.
- **Spending breakdowns** are built from real data: SCB's Räkenskapssammandrag for kommun
  and region spending, and the state budget's utgiftsområden (expenditure areas) from
  Ekonomistyrningsverket/Regeringskansliet. A given tax krona's spending-area breakdown is
  applied proportionally to however much of that tax you actually paid — the same approach
  used in public "where does your tax go" explainers.
- You can toggle between **last year's actual results (bokslut)** and **this year's budget**
  for the spending breakdown. For the state budget, both are genuine year-specific figures;
  for kommun/region, there's no structured nationwide budget dataset available (each
  publishes its own, mostly as PDFs), so the "budget" view reuses the latest actual spending
  split as a clearly labeled estimate — see `data/SOURCES.md` for the full explanation.
- Full data provenance — every figure, its exact source URL, retrieval date, and how to
  refresh it next year — is documented in [`data/SOURCES.md`](data/SOURCES.md).

## Running it locally

It's plain HTML/CSS/JS, but the page `fetch()`es `data/tax-data.json`, which browsers block
over a bare `file://` URL — so serve the folder over HTTP:

```
python3 -m http.server 8000
```

then open `http://localhost:8000`.

## Updating the data

The dataset (`data/tax-data.json`) is generated, not hand-written. To refresh it for a new
tax year:

1. Download the new source files listed in `data/SOURCES.md` into `data/raw/`.
2. Update the year constants at the top of `data/build.py`.
3. Run `python3 data/build.py` — it regenerates `tax-data.json` from the raw files, with
   built-in sanity checks (e.g. that shares sum to 1.0, that all 290 kommuner and 21 regions
   are present).

## Tech

Plain HTML, CSS, and vanilla JavaScript — no framework, no build tool, no dependencies.
Deployed as a static site on GitHub Pages, served straight from `main`.

## License

No license file is included, so all rights are reserved by default — ask before reusing.
