let DATA = null;
const state = {
  kommunCode: null,
  monthlyGross: 35000,
  basis: "outcome", // "outcome" | "budget"
};

const els = {};

function cacheEls() {
  els.kommunSelect = document.getElementById("kommunSelect");
  els.salaryNumber = document.getElementById("salaryNumber");
  els.salarySlider = document.getElementById("salarySlider");
  els.langToggle = document.getElementById("langToggle");
  els.basisButtons = Array.from(document.querySelectorAll(".segmented-opt"));
  els.basisHint = document.getElementById("basisHint");
  els.budgetCaveat = document.getElementById("budgetCaveat");

  els.netValue = document.getElementById("netValue");
  els.netValueYear = document.getElementById("netValueYear");
  els.statGross = document.getElementById("statGross");
  els.statTax = document.getElementById("statTax");
  els.statRate = document.getElementById("statRate");

  els.overviewTrack = document.getElementById("overviewChart");
  els.overviewTable = document.getElementById("overviewTable");

  els.kommunTrack = document.getElementById("kommunChart");
  els.kommunTable = document.getElementById("kommunTable");
  els.kommunNameInHeading = document.getElementById("kommunNameInHeading");
  els.kommunSpendingSum = document.getElementById("kommunSpendingSum");

  els.regionTrack = document.getElementById("regionChart");
  els.regionTable = document.getElementById("regionTable");
  els.regionNameInHeading = document.getElementById("regionNameInHeading");
  els.regionSpendingSum = document.getElementById("regionSpendingSum");
  els.regionUnifiedNote = document.getElementById("regionUnifiedNote");
  els.regionChartWrap = document.getElementById("regionChartWrap");

  els.stateTrack = document.getElementById("stateChart");
  els.stateTable = document.getElementById("stateTable");
  els.stateSpendingSum = document.getElementById("stateSpendingSum");
  els.stateZeroNote = document.getElementById("stateZeroNote");
  els.stateBudgetCaveat = document.getElementById("stateBudgetCaveat");

  els.dataGeneratedAt = document.getElementById("dataGeneratedAt");
}

function populateKommunSelect() {
  const regionGroups = {};
  Object.entries(DATA.kommuner).forEach(([code, k]) => {
    if (!regionGroups[k.regionCode]) regionGroups[k.regionCode] = [];
    regionGroups[k.regionCode].push({ code, ...k });
  });

  const regionCodes = Object.keys(regionGroups).sort((a, b) =>
    (DATA.regions[a]?.name || "").localeCompare(DATA.regions[b]?.name || "", "sv")
  );

  els.kommunSelect.textContent = "";
  regionCodes.forEach((rc) => {
    const optgroup = document.createElement("optgroup");
    optgroup.label = DATA.regions[rc] ? DATA.regions[rc].name : rc;
    regionGroups[rc]
      .sort((a, b) => a.name.localeCompare(b.name, "sv"))
      .forEach((k) => {
        const opt = document.createElement("option");
        opt.value = k.code;
        opt.textContent = k.name;
        optgroup.appendChild(opt);
      });
    els.kommunSelect.appendChild(optgroup);
  });

  const stockholm = Object.entries(DATA.kommuner).find(
    ([, k]) => k.name.toLowerCase() === "stockholm"
  );
  state.kommunCode = stockholm ? stockholm[0] : Object.keys(DATA.kommuner)[0];
  els.kommunSelect.value = state.kommunCode;
}

function currentSpendingShares(entry) {
  if (state.basis === "budget" && entry.spendingSharesBudget) {
    return entry.spendingSharesBudget;
  }
  return entry.spendingShares;
}

function usingFallbackBudget() {
  return state.basis === "budget" && DATA.meta.budgetDataIsRealBudget === false;
}

function usingFallbackBudgetState() {
  return state.basis === "budget" && DATA.meta.stateBudgetDataIsRealBudget === false;
}

function buildCategorySegments(categories, shares, totalAmount) {
  return categories.map((name) => {
    const share = shares && shares[name] ? shares[name] : 0;
    return {
      name: translateCategory(name),
      share,
      value: share * totalAmount,
    };
  });
}

function render() {
  const kommun = DATA.kommuner[state.kommunCode];
  const region = DATA.regions[kommun.regionCode];
  const result = calculateTax(state.monthlyGross, kommun.taxRate, region.taxRate, DATA.national);

  els.netValue.textContent = formatCurrency(result.netMonthly);
  els.netValueYear.textContent = `${formatCurrency(result.netAnnual)}${t("perYear")}`;
  els.statGross.textContent = formatCurrency(result.monthlyGross);
  els.statTax.textContent = formatCurrency(result.totalTax / 12);
  els.statRate.textContent = formatPercent(result.effectiveRate, 1);

  // Overview: monthly split of gross salary.
  const overviewSegments = [
    { name: t("netPaySegment"), value: result.netMonthly },
    { name: t("kommunalTaxSegment"), value: result.kommunalSkatt / 12 },
    { name: t("regionalTaxSegment"), value: result.regionalSkatt / 12 },
    { name: t("stateTaxSegment"), value: result.statligSkatt / 12 },
  ].map((s) => ({ ...s, share: result.monthlyGross > 0 ? s.value / result.monthlyGross : 0 }));

  renderStackBar(
    { trackEl: els.overviewTrack, legendEl: getOrCreateLegend(els.overviewTrack), tableEl: els.overviewTable },
    overviewSegments
  );

  // Kommun spending breakdown (annual kr).
  els.kommunNameInHeading.textContent = t("inParens", { name: kommun.name });
  const kommunShares = currentSpendingShares(kommun);
  const kommunSegments = buildCategorySegments(DATA.meta.categoriesKommun, kommunShares, result.kommunalSkatt);
  els.kommunSpendingSum.textContent = `${formatCurrency(result.kommunalSkatt)}${t("perYear")}` + (kommun.estimated ? ` · ${t("estimatedNote")}` : "");
  renderStackBar(
    { trackEl: els.kommunTrack, legendEl: getOrCreateLegend(els.kommunTrack), tableEl: els.kommunTable },
    kommunSegments
  );

  // Region spending breakdown (annual kr). Gotland has no separate regional
  // tax (kommun and region are the same authority there), so region.taxRate
  // is 0 and there is nothing meaningful to chart.
  els.regionNameInHeading.textContent = t("inParens", { name: region.name });
  const regionIsUnified = region.taxRate === 0;
  els.regionUnifiedNote.hidden = !regionIsUnified;
  els.regionChartWrap.hidden = regionIsUnified;
  els.regionSpendingSum.hidden = regionIsUnified;
  if (!regionIsUnified) {
    const regionShares = currentSpendingShares(region);
    const regionSegments = buildCategorySegments(DATA.meta.categoriesRegion, regionShares, result.regionalSkatt);
    els.regionSpendingSum.textContent = `${formatCurrency(result.regionalSkatt)}${t("perYear")}` + (region.estimated ? ` · ${t("estimatedNote")}` : "");
    renderStackBar(
      { trackEl: els.regionTrack, legendEl: getOrCreateLegend(els.regionTrack), tableEl: els.regionTable },
      regionSegments
    );
  }

  els.budgetCaveat.hidden = !usingFallbackBudget();

  // State spending breakdown (annual kr). Most earners pay no statlig skatt at
  // all (it only applies above the skiktgräns) — the breakdown is still shown
  // in that case (0 kr against every category), so it's explicit about which
  // areas this person currently isn't contributing to, rather than just
  // disappearing.
  const stateHasTax = result.statligSkatt > 0;
  els.stateZeroNote.hidden = stateHasTax;
  const stateShares = currentSpendingShares(DATA.state);
  const stateSegments = buildCategorySegments(DATA.meta.categoriesState, stateShares, result.statligSkatt);
  els.stateSpendingSum.textContent = `${formatCurrency(result.statligSkatt)}${t("perYear")}`;
  renderStackBar(
    { trackEl: els.stateTrack, legendEl: getOrCreateLegend(els.stateTrack), tableEl: els.stateTable },
    stateSegments
  );
  els.stateBudgetCaveat.hidden = !usingFallbackBudgetState();
}

function getOrCreateLegend(trackEl) {
  let legend = trackEl.nextElementSibling;
  if (!legend || !legend.classList.contains("chart-legend")) {
    legend = document.createElement("ul");
    legend.className = "chart-legend";
    trackEl.insertAdjacentElement("afterend", legend);
  }
  return legend;
}

function setSalary(value, source) {
  const clamped = Math.max(0, Math.min(300000, Math.round(value / 500) * 500));
  state.monthlyGross = clamped;
  if (source !== "number") els.salaryNumber.value = clamped;
  if (source !== "slider") els.salarySlider.value = Math.min(clamped, 150000);
  render();
}

function setBasis(basis) {
  state.basis = basis;
  els.basisButtons.forEach((btn) => {
    const active = btn.dataset.basis === basis;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-checked", String(active));
  });
  els.basisHint.textContent = t(basis === "budget" ? "basisHintBudget" : "basisHintOutcome");
  render();
}

function setLang(lang) {
  currentLang = lang;
  applyStaticI18n();
  els.basisHint.textContent = t(state.basis === "budget" ? "basisHintBudget" : "basisHintOutcome");
  render();
}

function wireEvents() {
  els.kommunSelect.addEventListener("change", (e) => {
    state.kommunCode = e.target.value;
    render();
  });
  els.salaryNumber.addEventListener("input", (e) => setSalary(Number(e.target.value) || 0, "number"));
  els.salarySlider.addEventListener("input", (e) => setSalary(Number(e.target.value) || 0, "slider"));
  els.basisButtons.forEach((btn) => {
    btn.addEventListener("click", () => setBasis(btn.dataset.basis));
  });
  els.langToggle.addEventListener("click", () => setLang(currentLang === "sv" ? "en" : "sv"));
}

async function init() {
  cacheEls();
  applyStaticI18n();
  const res = await fetch("data/tax-data.json");
  DATA = await res.json();
  populateKommunSelect();
  wireEvents();
  els.dataGeneratedAt.textContent = t("dataGeneratedAt", { date: DATA.meta.generatedAt });
  setSalary(state.monthlyGross, "init");
  setBasis(state.basis);
}

init();
