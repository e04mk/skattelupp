const I18N = {
  sv: {
    intro: "Ange din månadslön före skatt och välj kommun för att se hur mycket skatt du betalar, vad du får kvar själv, och vart din kommunal- och regionskatt går.",
    controlsHeading: "Dina uppgifter",
    kommunLabel: "Kommun",
    salaryLabel: "Månadslön före skatt",
    basisLabel: "Vad ska visas i fördelningen?",
    basisOutcome: "Senaste bokslutet",
    basisBudget: "Årets budget",
    basisHintOutcome: "Bygger på det senast redovisade bokslutet (SCB:s räkenskapssammandrag).",
    basisHintBudget: "Bygger på årets skattesatser, tillämpade på senaste bokslutets fördelning mellan verksamheter (se not nedan).",
    heroHeading: "Din nettolön",
    netLabel: "Du får kvar",
    grossLabel: "Bruttolön",
    taxLabel: "Total skatt",
    rateLabel: "Effektiv skattesats",
    overviewHeading: "Så fördelas din bruttolön",
    overviewNote: "Inklusive jobbskatteavdrag, som höjer det du får kvar.",
    tableToggle: "Detaljerad vy",
    kommunSpendingHeading: "Din kommunalskatt gick till",
    regionSpendingHeading: "Din regionskatt gick till",
    budgetCaveat: "Det finns ingen samlad, strukturerad budgetuppdelning per verksamhet för alla kommuner och regioner. Fördelningen ovan bygger därför på senaste bokslutets fördelning, tillämpad på årets skattesatser.",
    privacyNote: "Den här sidan sparar inga kakor och skickar ingen data om dig till någon server — allt beräknas i din webbläsare.",
    sourcesNote: "Källor: Skatteverket och SCB.",
    perYear: "/år",
    perMonth: "/mån",
    netPaySegment: "Du får kvar",
    kommunalTaxSegment: "Kommunalskatt",
    regionalTaxSegment: "Regionskatt",
    stateTaxSegment: "Statlig skatt",
    dataGeneratedAt: "Uppdaterad {date}.",
    tableCategory: "Verksamhet",
    tableShare: "Andel",
    tableAmount: "Belopp",
    estimatedNote: "Uppskattat värde (regionens/rikets genomsnitt använt).",
    inParens: "({name})",
    noKommunMatch: "Inga träffar",
    regionUnifiedNote: "Här är kommun och region samma huvudman och tar ut en enda gemensam skattesats i stället för separat kommunal- och regionskatt. Fördelningen nedan bygger på hur mycket av den gemensamma skatten som verkligen gick till regionala verksamheter som sjukvård, baserat på huvudmannens egen bokföring.",
    stateSpendingHeading: "Din statliga skatt gick till",
    stateZeroNote: "Vid den här lönen betalar du 0 kr i statlig inkomstskatt (den tas bara ut på inkomster över brytpunkten) — du bidrar alltså inte till något av det nedan.",
    stateBudgetCaveat: "Det finns ingen strukturerad uppdelning av statens budget för innevarande år tillgänglig. Fördelningen ovan bygger därför på senaste utfallets fördelning mellan utgiftsområden.",
  },
  en: {
    intro: "Enter your monthly salary before tax and pick your municipality to see how much tax you pay, what you keep yourself, and where your municipal and regional tax goes.",
    controlsHeading: "Your details",
    kommunLabel: "Municipality",
    salaryLabel: "Monthly salary before tax",
    basisLabel: "What should the breakdown show?",
    basisOutcome: "Last year's actual results",
    basisBudget: "This year's budget",
    basisHintOutcome: "Based on the most recently reported annual accounts (SCB's Räkenskapssammandrag).",
    basisHintBudget: "Based on this year's tax rates, applied to the latest actual spending split between areas (see note below).",
    heroHeading: "Your net pay",
    netLabel: "You keep",
    grossLabel: "Gross salary",
    taxLabel: "Total tax",
    rateLabel: "Effective tax rate",
    overviewHeading: "Where your gross salary goes",
    overviewNote: "Includes the earned-income tax credit, which increases what you keep.",
    tableToggle: "Detailed view",
    kommunSpendingHeading: "Your municipal tax went to",
    regionSpendingHeading: "Your regional tax went to",
    budgetCaveat: "There is no consolidated, structured budget breakdown by area for all municipalities and regions. The breakdown above therefore uses the latest actual spending split, applied to this year's tax rates.",
    privacyNote: "This site stores no cookies and sends no data about you to any server — everything is calculated in your browser.",
    sourcesNote: "Sources: Skatteverket and Statistics Sweden (SCB).",
    perYear: "/year",
    perMonth: "/month",
    netPaySegment: "You keep",
    kommunalTaxSegment: "Municipal tax",
    regionalTaxSegment: "Regional tax",
    stateTaxSegment: "State tax",
    dataGeneratedAt: "Updated {date}.",
    tableCategory: "Area",
    tableShare: "Share",
    tableAmount: "Amount",
    estimatedNote: "Estimated value (region/national average used).",
    inParens: "({name})",
    noKommunMatch: "No matches",
    regionUnifiedNote: "Here, the municipality and the region are the same authority, and levy a single combined tax rate instead of separate municipal and regional tax. The breakdown below is based on how much of that combined tax actually went to regional services like healthcare, according to the authority's own accounts.",
    stateSpendingHeading: "Your state tax went to",
    stateZeroNote: "At this salary you pay 0 kr in state income tax (it's only charged on income above the threshold) — so you're not contributing to anything below.",
    stateBudgetCaveat: "No structured breakdown of the current year's state budget is available. The breakdown above therefore uses the latest outcome's split between expenditure areas.",
  },
};

// Swedish category name -> English translation, for the fixed spending
// categories produced by the data pipeline (see data/SOURCES.md).
const CATEGORY_TRANSLATIONS = {
  "Förskola & grundskola": "Preschool & primary school",
  "Gymnasieskola & vuxenutbildning": "Upper secondary & adult education",
  "Äldreomsorg": "Elderly care",
  "Individ- och familjeomsorg / stöd till personer med funktionsnedsättning": "Social services & disability support",
  "Infrastruktur, skydd & miljö": "Infrastructure, safety & environment",
  "Kultur & fritid": "Culture & leisure",
  "Politisk verksamhet & administration": "Politics & administration",
  "Övrigt": "Other",
  "Hälso- och sjukvård": "Healthcare",
  "Tandvård": "Dental care",
  "Kollektivtrafik": "Public transport",
  "Regional utveckling": "Regional development",
  "Vård, omsorg & socialförsäkringar": "Healthcare, care & social insurance",
  "Arbetsmarknad, näringsliv & infrastruktur": "Labour market, business & infrastructure",
  "Utbildning & forskning": "Education & research",
  "Allmänna bidrag till kommuner och regioner": "General grants to municipalities & regions",
  "Rättsväsende, försvar & samhällsskydd": "Justice, defence & civil protection",
  "Migration": "Migration",
  "Bistånd & internationellt": "Aid & international affairs",
  "Rikets styrelse & allmän förvaltning": "Government & public administration",
  "Räntor på statsskulden": "Interest on national debt",
};

let currentLang = "sv";

function t(key, vars) {
  const dict = I18N[currentLang] || I18N.sv;
  let str = dict[key] !== undefined ? dict[key] : (I18N.sv[key] || key);
  if (vars) {
    for (const k in vars) str = str.replace(`{${k}}`, vars[k]);
  }
  return str;
}

function translateCategory(name) {
  if (currentLang === "sv") return name;
  return CATEGORY_TRANSLATIONS[name] || name;
}

function formatCurrency(value, opts) {
  opts = opts || {};
  const locale = currentLang === "sv" ? "sv-SE" : "en-GB";
  const rounded = Math.round(value);
  const num = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(rounded);
  return opts.noUnit ? num : `${num} kr`;
}

function formatPercent(fraction, digits) {
  const locale = currentLang === "sv" ? "sv-SE" : "en-GB";
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: digits || 0,
    maximumFractionDigits: digits || 0,
  }).format(fraction);
}

function applyStaticI18n() {
  document.documentElement.lang = currentLang;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  document.querySelectorAll(".lang-opt").forEach((el) => {
    el.setAttribute("data-active", el.getAttribute("data-lang") === currentLang ? "true" : "false");
  });
}
