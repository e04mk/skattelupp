# Data sources for skattelupp/data/tax-data.json

Retrieval date for everything below: **2026-08-31**. Output built by `build.py` in this
directory from the raw files in `raw/`.

## 1. Kommunal + regional (landstings) tax rates, 2026

- **Source**: Skatteverket, "Skattesatser kommuner 2026" (official Excel export, one row per
  församling/parish).
- **URL**: https://www.skatteverket.se/download/18.1522bf3f19aea8075ba429/1765179297305/skattesatser-kommuner-2026.xlsx
- **Local copy**: `raw/skattesatser-kommuner-2026.xlsx`
- **Processing**: The file lists every församling (1267 rows), not every kommun, but the
  `Kommunal-skatt` column is identical for every församling within a kommun, and
  `Landstings-skatt` is identical for every kommun sharing a län code (verified
  programmatically: 0 kommuner/län had inconsistent values). We dedupe on the 4-digit
  kommunkod (built from the `Församlings-kod` column, e.g. `"01 14"` -> `"0114"`) to get one
  kommunal rate per kommun (290 total) and one landstings rate per 2-digit län code (21
  total).
- **Special case - Gotland (kommunkod 0980)**: Region Gotland is the only kommun in Sweden
  that is also, itself, a full region. Skatteverket's file reports Gotland's ENTIRE combined
  kommun+region tax rate (33.6% for 2026) under the `Kommunal-skatt` column, with
  `Landstings-skatt` = 0 for län 09. We keep this as-is: `kommuner["0980"].taxRate` = 0.336
  and `regions["09"].taxRate` = 0.0, so `kommunalTax + regionalTax` still yields Gotland
  residents' correct combined rate.
- **To refresh next year**: Skatteverket publishes an equivalent file every autumn for the
  following income year - search skatteverket.se for "Skattesatser kommuner \<year>" (or
  check the "Kommunala skattesatser" page under Privat > Skatter) and swap the URL/year in
  `build.py`'s `load_tax_rates()`. The row/column structure has been stable for years.

## 2. National income tax parameters, 2026 (statlig skatt, grundavdrag, jobbskatteavdrag)

- **Source**: Skatteverket, "Teknisk beskrivning SKV 433, 2026 utgåva 36" — the technical
  specification Skatteverket publishes for payroll-software vendors, containing the exact
  legal formulas (not just a lookup table) used to build the preliminary tax tables.
- **URL**: https://www.skatteverket.se/download/18.1522bf3f19aea8075ba55c/1765284655603/teknisk-beskrivning-skv-433-2026-utgava-36.pdf
- **Local copy**: `raw/skv433-2026.pdf` (and extracted text `raw/skv433-2026.txt`)
- **Cross-check source**: Skatteverket, "Skiktgränser, brytpunkter, prisbasbelopp m.m."
  (summary table 2020-2026): https://www.skatteverket.se/download/18.1522bf3f19aea8075ba4a0/1765193942058/tabell-skiktgranser-2020-2026.pdf
  (local copy `raw/skiktgranser-2020-2026.pdf`) — used to cross-check skiktgräns,
  prisbasbelopp, and the högsta/lägsta grundavdrag boundary values.
- **Cross-check source**: Skatteverket's published 2026 grundavdrag lookup table (the actual
  table used in withholding, in 500 kr income bands): https://www.skatteverket.se/download/18.1522bf3f19aea8075ba5b1/1765287174718/grundavdragstabell-ej-forhojt-grundavdrag.pdf
  (local copy `raw/grundavdragstabell-2026.pdf`) — used to verify the formula below
  reproduces the table exactly (it does, see `build.py`'s inline sanity checks and the
  worked examples below).

### Statlig inkomstskatt (state income tax)
- Rate: **20%** of the "beskattningsbara förvärvsinkomsten" (taxable earned income, i.e.
  fastställd förvärvsinkomst minus grundavdrag) that exceeds the skiktgräns.
- **Skiktgräns 2026: 643,000 kr.**
- (Brytpunkt — the pre-grundavdrag income level where state tax starts — is 660,400 kr for
  2026 for someone under 66, i.e. skiktgräns + the grundavdrag that applies at that income
  level; not needed directly since we compute grundavdrag explicitly.)
- Source text: SKV 433 section 7.2 "Statlig inkomstskatt", p.13.

### Grundavdrag (basic allowance), for persons who have NOT turned 66 by the start of 2026
- **Prisbasbelopp (PBB) 2026: 59,200 kr.**
- Exact legal formula (SKV 433 section 6, p.8), as a function of FFI = fastställd
  förvärvsinkomst (established earned income):

  | FFI range (kr)         | Grundavdrag                                              |
  |-------------------------|-----------------------------------------------------------|
  | 0 – 58,608 (≤0.99 PBB)  | 0.423 × PBB = 25,041.60 (flat)                             |
  | 58,608 – 161,024        | 0.423×PBB + 0.20 × (FFI − 0.99×PBB)                        |
  | 161,024 – 184,112 (2.72–3.11 PBB) | 0.77 × PBB = 45,584.00 (flat, the maximum)      |
  | 184,112 – 466,496       | 0.77×PBB − 0.10 × (FFI − 3.11×PBB)                         |
  | ≥ 466,496 (7.88 PBB)    | 0.293 × PBB = 17,345.60 (flat, the floor)                  |

  The result is capped so it never exceeds FFI itself, and is rounded **up** to the nearest
  100 kr. This is encoded verbatim in `national.grundavdrag.segments` in the JSON.
- **Verified**: reproduces both of Skatteverket's own worked examples exactly
  (FFI=120,000 → 37,400 kr; FFI=324,000 → 31,600 kr) and matches the official 2026
  grundavdrag lookup table at every checked band.
- A separate, higher "förhöjt grundavdrag" applies to persons who HAVE turned 66 — not
  currently modeled in the JSON (the site's default calculator targets people under 66); see
  SKV 433 section 6 "Förhöjt grundavdrag" (p.10) and `raw/grundavdragstabell-forhojt-grundavdrag.pdf`
  if this is added later.

### Jobbskatteavdrag (skattereduktion för arbetsinkomst)
- Only reduces **kommunal** income tax (not state or regional tax).
- For persons who have NOT turned 66 by the start of 2026, with AI = arbetsinkomst (rounded
  DOWN to the nearest 100 kr), GA = grundavdrag as above, KI = the person's kommunal tax rate
  as a fraction (the pure kommunal rate — NOT including begravningsavgift/kyrkoavgift, since
  our per-kommun rates already exclude those):

  | AI range (kr)                | Skattereduktion                                                    |
  |-------------------------------|---------------------------------------------------------------------|
  | 0 – 53,872 (≤0.91 PBB)         | (AI − GA) × KI                                                       |
  | 53,872 – 191,808 (0.91–3.24 PBB) | (0.91×PBB + 0.3874 × (AI − 0.91×PBB) − GA) × KI                    |
  | 191,808 – 478,336 (3.24–8.08 PBB) | (1.813×PBB + 0.251 × (AI − 3.24×PBB) − GA) × KI                    |
  | ≥ 478,336 (8.08 PBB)           | (3.027×PBB − GA) × KI                                                |

  Final result rounded **down** to the nearest whole krona. Encoded in
  `national.jobbskatteavdrag.under66.segments`.
- **Verified**: reproduces both of Skatteverket's own worked examples exactly (AI=90,000,
  KI=32.84% → 11,976 kr; AI=240,000, KI=32.84% → 26,083 kr).
- A different, simpler formula applies for persons who turned 66 before the start of the
  income year (flat percentage of AI, no grundavdrag subtraction, no KI multiplication —
  source: SKV 433 section 7.5.2, "Skattereduktion för den som ... fyllt 66 år"). Included for
  completeness under `national.jobbskatteavdrag.age66Plus`, unused by the default calculator.
- Source text: SKV 433 section 7.5.2 "Skattereduktion för arbetsinkomst", pp.16-18.

- **To refresh next year**: search skatteverket.se for "Teknisk beskrivning SKV 433
  \<year>" (payroll-software vendors always need this doc; it's usually published in
  November/December for the following income year) and re-derive the segment breakpoints
  from section 6 (grundavdrag) and section 7.5.2 (jobbskatteavdrag) the same way. The
  skiktgräns/PBB cross-check table lives at a stable-looking URL pattern under
  `/download/18.1522bf3f19aea8075ba4a0/...tabell-skiktgranser-YYYY-YYYY.pdf` — or just search
  "skatteverket skiktgränser brytpunkter prisbasbelopp".

## 3. Municipal & regional spending by verksamhetsområde (Räkenskapssammandraget, via SCB)

- **Source**: SCB Statistikdatabasen / PxWebApi v2, two tables:
  - **Kommuner**: `TAB4199` — "Kostnader och intäkter för kommuner efter region och
    verksamhetsområde. År 2011-2025"
  - **Regioner**: `TAB4242` — "Kostnader och intäkter för regioner efter verksamhetsområde.
    År 2007-2025"
- **API used**: SCB PxWebApi v2beta (https://api.scb.se/OV0104/v2beta/api/v2/), JSON-stat2
  output. Discovered via `GET /tables?query=verksamhetsområde`.
- **Exact queries used** (retrievable again by re-running with a later `Tid` value once
  2025 data is finalized):
  - Metadata: `GET https://api.scb.se/OV0104/v2beta/api/v2/tables/TAB4199/metadata?lang=sv`
    and same for `TAB4242` — saved as `raw/tab4199_meta.json` / `raw/tab4242_meta.json`.
  - Kommun data (net cost, `ContentsCode=0000005X` = Nettokostnad, `Tid=2024`, all 291
    Region values incl. Riket, 62 Verksomrkom leaf codes — every leaf under all 8 categories,
    not just the pre-aggregated rollups, so the same fetch also powers the "Visa som tabell"
    detail drill-down):
    `GET https://api.scb.se/OV0104/v2beta/api/v2/tables/TAB4199/data?lang=sv&valuecodes[Region]=*&valuecodes[Tid]=2024&valuecodes[ContentsCode]=0000005X&valuecodes[Verksomrkom]=<comma-separated codes>&outputformat=json-stat2`
    — saved as `raw/tab4199_kommun_2024.json`.
  - Region data (net cost incl. läkemedel, `ContentsCode=000000A7`, `Tid=2024`, all 22
    Region values incl. Riket, 15 Verksomrkom leaf codes, same reasoning as above):
    `GET https://api.scb.se/OV0104/v2beta/api/v2/tables/TAB4242/data?lang=sv&valuecodes[Region]=*&valuecodes[Tid]=2024&valuecodes[ContentsCode]=000000A7&valuecodes[Verksomrkom]=<comma-separated codes>&outputformat=json-stat2`
    — saved as `raw/tab4242_region_2024.json`.
- **Year used: 2024** — the latest year with complete RS data across (almost) all
  kommuner/regioner at the time of writing (2025 appears in the table's period list, i.e.
  "2011-2025", but preliminary/partial; 2024 is the safer choice for a complete cross-kommun
  dataset). `meta.outcomeYear` = 2024 in the JSON.

### Category mapping

We verified empirically (by pulling Riket-level totals and checking sums) that SCB's
verksamhetsområde codes cleanly aggregate into "TOTALT" rows (190, 290, 390, 490, 590, 690,
890 for kommuner; equivalent structure for regioner) with the finer leaf codes summing
exactly to their parent total (to within rounding). Every category below is now defined
directly by its leaf codes (rather than the pre-aggregated TOTALT rollup, as an earlier
version of this pipeline did for 290/390/190/690+890) so the same numbers can also drive the
"Visa som tabell" detail drill-down:

**Kommun categories** (`meta.categoriesKommun`), built from Verksomrkom codes:
| Category | Verksomrkom codes |
|---|---|
| Förskola & grundskola | 400, 407, 412, 415, 425, 435, 440, 443 |
| Gymnasieskola & vuxenutbildning | 450, 453, 470, 472, 474, 475, 476, 478 |
| Äldreomsorg | 500, 505, 510 |
| Individ- och familjeomsorg / stöd till personer med funktionsnedsättning | 513, 520, 530, 559, 569, 571, 575, 585 |
| Infrastruktur, skydd & miljö | 215, 220, 225, 230, 249, 250, 261, 263, 267, 270, 275 (leaves of the 290 rollup) |
| Kultur & fritid | 300, 310, 315, 320, 330, 340, 350 (leaves of the 390 rollup) |
| Politisk verksamhet & administration | 100, 110, 120, 130 (leaves of the 190 rollup) — note: RS does not report a separate central-administration cost pool at this level; central administrative overhead is folded into the reporting kommun's various verksamhetsområden per RS accounting rules, so this category mostly reflects political/governance costs (nämnd- och styrelseverksamhet, revision, etc.) |
| Övrigt | 600, 610 (leaves of 690, särskilt riktade insatser: flyktingmottagande, arbetsmarknadsåtgärder) + 800, 805, 810, 815, 830, 832, 834, 855, 860, 865, 870 (leaves of 890, affärsverksamhet: VA, avfall, elförsörjning etc., largely fee-financed) |

**Region categories** (`meta.categoriesRegion`), built from Verksomrkom codes:
| Category | Verksomrkom codes |
|---|---|
| Hälso- och sjukvård | 0 (primärvård), 1 (specialiserad somatisk vård), 2 (specialiserad psykiatrisk vård), 4 (övrig hälso- och sjukvård) — all TOTALT rows |
| Tandvård | 3 (total) |
| Kollektivtrafik | 7 (trafik och infrastruktur, total) |
| Regional utveckling | 5 (utbildning), 6 (kultur), 8 (allmän regional utveckling) — SCB's own aggregate "5-8 SUMMA REGIONAL UTVECKLING" groups these together as the non-healthcare branch of regional government, so folkhögskola/kultur/business-development all land here |
| Politisk verksamhet & administration | 910 (politisk verksamhet avseende hälso- och sjukvård) + 920 (politisk verksamhet avseende regional utveckling) |
| Övrigt | 940, 960, 980 (leaves of the 940-980 rollup, serviceverksamheter) + Jamf (jämförelsestörande poster) — both typically 0 or near-0 |

For every kommun/region, shares are computed as `category total / sum of all category
totals for that unit` (NOT divided by SCB's own grand-total row), so the 8 (kommun) or 6
(region) shares always sum to exactly 1.0 by construction. A small number of kommuner (18)
show a slightly negative net cost in "Övrigt" for 2024 (fee-financed affärsverksamhet, e.g.
elförsörjning, where fee income exceeded cost that year); these are floored at 0 rather than
rendered as a negative pie-chart slice — the effect is under 1.2 percentage points in every
case and the dropped amount represents a net gain, not an unaccounted-for cost. Cross-checked against SCB's own
grand totals (`900 SUMMA DRIFTVERKSAMHET` for kommuner, `0-9 TOTALSUMMA` for regioner): the
sum of our category totals matches SCB's official grand total to within ~0.01%, the residual
being SCB's own internal rounding.

### Detail drill-down ("Visa som tabell")

Each kommun/region/state entry also carries a `spendingDetail` object (and, for state,
`spendingDetailBudget`): per top-level category, the individual leaf codes (kommun/region) or
utgiftsområden (state) that make it up, as `{"name", "share"}` sorted descending by share.
Shares are of the *same* grand total as the top-level category shares, so a category's
detail items sum back to that category's own share (state to within ~1e-6 rounding noise;
kommun/region to within ~1 percentage point — see below). State detail item names are the
official UO names read straight from column B of the budget spreadsheet
(`load_uo_names()`); kommun/region detail names are hand-transcribed from the SCB
Verksomrkom labels (`KOMMUN_CODE_LABELS`/`REGION_CODE_LABELS` in `build.py`).

**"Övrigt" is deliberately excluded from detail on both the kommun and region side.** Its
leaf codes are largely internal kommunal business-accounting entries — e.g. "Arbetsområden
och lokaler" (code 800, internal real-estate cost allocation) — that can swing hugely
negative in a way the other categories don't (a municipality's internal cost-allocation or a
profitable municipal utility booking net revenue that year). Since a negative leaf can't be
shown as a row in a "where your money went" table, floor-at-0-and-drop is the only option,
but for "Övrigt" specifically that produces a *visible* sum far larger than the category's
real (small) share — e.g. Stockholm's Övrigt is really ~0.5% of its budget, but summing only
its positive leaves gives ~3.3%. Checked systematically across all 290 kommuner and 21
regions: every other category's detail sum stays within ~1 percentage point of its top-level
share; every violation larger than that was in "Övrigt". Region "Övrigt" also contains code
"Jamf" (jämförelsestörande poster — "comparison-distorting items"), an accounting-adjustment
bucket by definition. Both are left as an opaque residual rather than a misleading
breakdown.

### Known data-quality special case: Region Gotland (kommunkod 0980 / regionkod 09)

Gotland is the only kommun in Sweden that is also a full region. Because of this, SCB's RS
requires "Region Gotland" to submit BOTH a kommun-template return (TAB4199) and a
region-template return (TAB4242) — and Gotland's **kommun**-level return still carries
verksamhet codes 500 (Primärvård) and 505 (Hälso- och sjukvård, övrigt), i.e. its full
regional healthcare budget (~2.5 miljarder kr), duplicated from what is already reported
under `regions["09"]`. Left in, this would make ~35-50% of "kommun" Gotland's spend look
like elderly-care/healthcare, which is not comparable to any other kommun (healthcare is a
region-level responsibility everywhere else in Sweden). We exclude verksamhet 500 and 505
from Gotland's kommun-level category totals (see `GOTLAND_EXCLUDE_CODES` in `build.py`);
Gotland's real healthcare spend remains fully represented in `regions["09"].spendingShares`.
After this fix, Gotland's kommun-level shares (34% school, 22% elderly care, 19%
individ/familjeomsorg, ...) are in line with comparable kommuner.

- **To refresh next year**: re-run the same `/data` queries against TAB4199/TAB4242 with
  `valuecodes[Tid]=<latest complete year>` once next year's RS data is published (typically
  released ~September the following year, e.g. 2025 data around September 2026). No code
  changes needed beyond bumping the year and re-running `build.py`.

## 4. Does a structured, cross-kommun BUDGET (not outcome) dataset exist?

**No.** We searched SCB's Statistikdatabasen/PxWebApi for a table analogous to TAB4199/
TAB4242 but for adopted current-year budgets ("budgeterad resultaträkning" /
"budget efter verksamhetsområde") broken down the same way, for all kommuner/regioner, and
found none. SCB's RS-based tables (TAB4199, TAB4242, and siblings like TAB4202
"Verksamhetskostnader ... efter kontopost") only publish **actual outcomes** (bokslut), one
year in arrears. Individual kommuner and regions do publish their own annual budgets, but
these are released as unstructured PDFs/Excel files per kommun (~290 separate documents,
inconsistent formats, inconsistent verksamhetsområde breakdowns) with no central,
machine-readable aggregator — scraping and normalizing 290+ PDFs was judged out of scope and
too fragile to maintain.

**Consequence for the site**: `meta.budgetDataIsRealBudget = false`. The "budget" toggle in
the frontend reuses the same `outcomeYear` (2024) actual-outcome `spendingShares` for both
toggle positions — there is only one set of spending shares in the JSON per
kommun/region. The frontend must clearly label the "budget" view as an estimate based on the
latest known actual outcome, not this year's real adopted budget. `meta.budgetYear` (2026)
records which year the estimate is being presented AS IF it were the budget for, purely for
UI labeling purposes (e.g. "estimate based on 2024 outcome, presented as a stand-in for the
2026 budget").

## 5. Kommun/region reference list (names, codes)

- **Source**: the `Region` dimension metadata of SCB's own TAB4199 (kommuner) and TAB4242
  (regioner) tables — see section 3 above for the metadata URLs/local files. This gives the
  canonical, properly-capitalized kommun names (e.g. "Upplands Väsby") and 4-digit
  kommunkoder (290 total, excluding Riket "00"), and the region names/2-digit län codes (21
  total, excluding Riket "00").
- Region display names are derived from SCB's row labels (e.g. "Region Jönköpings län" →
  "Jönköping", "Västra Götalandsregionen" → "Västra Götaland", "Region Gotland" →
  "Gotland") by stripping the "Region "/" län" boilerplate — see `clean_region_name()` in
  `build.py`.
- **To refresh**: this list changes only when Sweden creates/merges/renames a kommun or
  region (rare — last kommun split was Upplands Väsby-related decades ago); simply re-fetch
  the same table metadata endpoints each year, no separate lookup needed.

## 6. Statens budget: spending by utgiftsområde (statlig inkomstskatt breakdown)

Retrieval date: **2026-08-31**.

This is the third breakdown on the site: where the **state's** 20% "statlig inkomstskatt"
goes, broken down by the central government budget's 27 utgiftsområden (UO1-UO27), grouped
into the same ~8-9-category shape as the kommun/region breakdowns. Money is fungible, so
(exactly as for kommunalSkatt/regionalSkatt) we apply the state budget's own spending-share
percentages to however much a person actually paid in statlig skatt.

### 6.1 Outcome year (utfall) 2024

- **Source**: Statskontoret (the agency that inherited ESV's statsbudget-outfall function),
  "Årsutfall för statens budget" open-data page, the **definitive** (final, not preliminary)
  annual-outcome time series for expenditures, 1997-2025, at anslag (appropriation) level.
- **Page**: https://www.statskontoret.se/analys-och-statistik/oppna-data/arsutfall/
- **Exact file URL**:
  `https://www.statskontoret.se/OpenDataArsUtfallPage/GetFile?documentType=Utgift&fileType=Excel&fileName=%C3%85rsutfall%20utgifter%201997%20-%202025,%20definitivt.xlsx&Year=2025&month=0&status=Definitiv`
- **Local copy**: `raw/arsutfall-utgifter-1997-2025.xlsx` (sheet `data`; one row per
  utgiftsområde/anslag/år, with columns including `Utgiftsområde`, `Utgiftsområdesnamn`,
  `År`, and `Utfall` in miljoner kronor).
- **Processing**: filtered to `År == 2024`, summed `Utfall` grouped by `Utgiftsområde`
  (1-27). Rows with no `Utgiftsområde` value - `Utgiftstak`, `Marginal till utgiftstaket`,
  `Ålderspensionssystemet vid sidan av statens budget`, `Riksgäldskontorets
  nettoutlåning`, `Kassamässig korrigering`, `Förändring av anslagsbehållningar` - are
  correctly outside the 27 utgiftsområden (the old-age pension system in particular is
  explicitly *off-budget*, per how "statsbudgeten" is legally defined) and are excluded.
  This reproduces the well-known total: 2024 on-budget outcome across all 27 UO =
  **1,364.7 mdkr**, matching the commonly cited "statsbudgetens utgifter 2024 ~1 365 mdkr"
  figure (cross-checked against ESV/Statskontoret's own summary reporting, e.g. "Utfallet för
  statens budget 2024").
- **Year used: 2024** — the same `meta.outcomeYear` (2024) already used for the kommun/region
  breakdowns, so all three breakdowns are outcome-year-aligned.

### 6.2 Budget year (statsbudgeten) 2026 - REAL structured budget data (not a proxy)

Unlike the kommun/region case (~290+21 separate PDF budgets with no central aggregator, see
section 4 above), the state has exactly one budget with 27 line items, and the government
itself publishes it as a clean, structured spreadsheet. We used this real data rather than
falling back to the outcome-year proxy.

- **Source**: Regeringskansliet/Finansdepartementet, "Specifikation av budgetens utgifter för
  2026" - the line-item spreadsheet accompanying Budgetpropositionen för 2026 (Proposition
  2025/26:1), submitted to riksdagen 22 September 2025.
- **Page**: https://www.regeringen.se/sveriges-regering/finansdepartementet/statens-budget/statens-budget-som-excel/
- **Exact file URL**: https://www.regeringen.se/contentassets/c68c8aa508f44f7d9341a460c33c9143/specifikation-av-budgetens-utgifter-och-inkomster-2026.xlsx
- **Local copy**: `raw/statsbudget-2026-specifikation.xlsx` (sheet `Utgifter`; tusental
  kronor). Each utgiftsområde appears as one top-level row (column A = UO number 1-27,
  column B = name, column C = total in tkr), followed by indented anslag/anslagspost detail
  rows (column A blank) which are skipped when reading the top-level totals.
- **Processing**: read the 27 top-level rows directly; total = **1,543.3 mdkr**, matching the
  officially reported ~1,542 mdkr total expenditure for the 2026 budget (the small ~1 mdkr
  difference is later riksdagen amendments to the original proposition - see below).
- **Note on precision vs. the final adopted budget**: this file is the government's original
  *proposition* figures (September 2025). Riksdagen's subsequent "rambeslut" (Betänkande
  2025/26:FiU1) and several 2026 "ändringsbudgetar" (19 February, 13 April, 28 May 2026 -
  also downloadable from the same regeringen.se page as separate small Excel files) tweaked
  individual utgiftsområden by amounts that are immaterial at the category-aggregation level
  used here (well under 1% of the total). We used the original proposition spreadsheet
  because it is the single complete, canonical, all-27-UO document; refreshing to net in the
  amendments would require manually reconciling several small files and was judged not worth
  the added fragility for a percentage-share breakdown.
- **Year used: 2026** — matches `meta.budgetYear` (2026).
- **Consequence for the site**: `meta.stateBudgetDataIsRealBudget = true` and
  `state.spendingSharesBudget` contains genuine 2026 budget-year shares (NOT a reused
  outcome-year proxy), unlike `budgetDataIsRealBudget = false` for kommun/region.

### 6.3 Category mapping (`meta.categoriesState`)

Built from the 27 utgiftsområden as follows (see `STATE_CATEGORIES` in `build.py`):

| Category | UO numbers | UO names |
|---|---|---|
| Vård, omsorg & socialförsäkringar | 9, 10, 11, 12 | Hälsovård, sjukvård och social omsorg; Ekonomisk trygghet vid sjukdom och funktionsnedsättning; Ekonomisk trygghet vid ålderdom; Ekonomisk trygghet för familjer och barn |
| Arbetsmarknad, näringsliv & infrastruktur | 14, 19, 21, 22, 23, 24 | Arbetsmarknad och arbetsliv; Regional utveckling; Energi; Kommunikationer; Areella näringar, landsbygd och livsmedel; Näringsliv |
| Utbildning & forskning | 15, 16 | Studiestöd; Utbildning och universitetsforskning |
| Allmänna bidrag till kommuner och regioner | 25 | Allmänna bidrag till kommuner (kept as its own category - conceptually adjacent to the site's kommun/region charts, but must stay clearly separate since it is a state-budget line, not kommun/region spending) |
| Rättsväsende, försvar & samhällsskydd | 4, 6 | Rättsväsendet; Försvar och samhällets krisberedskap |
| Migration | 8 | Migration |
| Bistånd & internationellt | 5, 7 | Internationell samverkan; Internationellt bistånd |
| Rikets styrelse & allmän förvaltning | 1, 2, 3 | Rikets styrelse; Samhällsekonomi och finansförvaltning; Skatt, tull och exekution |
| Räntor på statsskulden | 26 | Statsskuldsräntor m.m. |
| Övrigt | 13, 17, 18, 20, 27 | Integration och jämställdhet; Kultur, medier, trossamfund och fritid; Samhällsplanering, bostadsförsörjning och byggande samt konsumentpolitik; Klimat, miljö och natur; Avgiften till Europeiska unionen |

All 27 utgiftsområden are used exactly once (`assert`ed in `build.py`). Migration (UO8) was
given its own category rather than folding into "Övrigt" despite being a relatively small
share (0.86% outcome / 0.88% budget), since it is a frequently-asked-about budget line in
public discourse and users specifically want to see it broken out. "Övrigt" ends up at 6.0%
(outcome) / 6.4% (budget) of the total, the largest single component of it being the EU
membership fee (UO27, ~3.5% of the whole budget) - each of the other UOs folded into Övrigt is
individually under 1.5% of the total, so it was judged better to keep the rest grouped than to
give each its own single-UO category.

Resulting shares (see `tax-data.json`'s `state.spendingShares` / `state.spendingSharesBudget`
for the authoritative numbers):

| Category | Outcome 2024 | Budget 2026 |
|---|---|---|
| Vård, omsorg & socialförsäkringar | 29.50% | 26.78% |
| Arbetsmarknad, näringsliv & infrastruktur | 15.22% | 15.69% |
| Utbildning & forskning | 9.25% | 9.25% |
| Allmänna bidrag till kommuner och regioner | 12.77% | 11.71% |
| Rättsväsende, försvar & samhällsskydd | 15.13% | 20.72% |
| Bistånd & internationellt | 3.81% | 2.99% |
| Rikets styrelse & allmän förvaltning | 4.16% | 3.83% |
| Räntor på statsskulden | 3.31% | 1.75% |
| Övrigt | 6.85% | 7.28% |

The large jump in "Rättsväsende, försvar & samhällsskydd" and drop in "Räntor på
statsskulden" between 2024 outcome and 2026 budget are real and expected: Sweden's defence
budget (UO6) has grown sharply 2024→2026 as part of the post-2022 rearmament plan, while
falling market interest rates have sharply reduced projected 2026 statsskuldsräntor (UO26)
versus the higher-rate 2024 outcome.

### 6.4 To refresh next year

1. **Outcome**: re-download the Statskontoret "Årsutfall utgifter ... definitivt" Excel from
   https://www.statskontoret.se/analys-och-statistik/oppna-data/arsutfall/ (same URL pattern,
   the filename's year range grows by one each year once the following year's data is
   finalized - typically definitive figures for year N are published around March/April of
   year N+1) and change `load_state_outcome_by_uo(year=...)`'s argument in `build.py`.
2. **Budget**: re-download that autumn's "Specifikation av budgetens utgifter för \<year>"
   spreadsheet from https://www.regeringen.se/sveriges-regering/finansdepartementet/statens-budget/statens-budget-som-excel/
   (published each September alongside the new budgetproposition) and swap the filename in
   `load_state_budget_by_uo()`. The sheet layout (one top-level row per UO in columns A-C,
   tusental kronor) has been stable for years.
3. Re-run `python3 build.py`. No changes needed to `STATE_CATEGORIES` unless riksdagen
   restructures the utgiftsområden themselves (rare - last major restructuring created UO27
   for the EU fee in 2018).

## Files in this directory

- `tax-data.json` — the finished output consumed by the frontend.
- `build.py` — the script that produces `tax-data.json` from the files in `raw/`. Re-run
  `python3 build.py` after refreshing any of the raw inputs above.
- `raw/` — all downloaded source files (Excel, PDF, JSON-stat2 API responses), kept for
  provenance/reproducibility and so `build.py` can be re-run offline. Includes
  `arsutfall-utgifter-1997-2025.xlsx` (state outcome, section 6.1) and
  `statsbudget-2026-specifikation.xlsx` (state budget, section 6.2).
