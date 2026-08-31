let DATA = null;
const state = {
  kommunCode: null,
  monthlyGross: 35000,
  basis: "outcome", // "outcome" | "budget"
};

const els = {};

function cacheEls() {
  els.kommunInput = document.getElementById("kommunInput");
  els.kommunListbox = document.getElementById("kommunListbox");
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

  els.stateTrack = document.getElementById("stateChart");
  els.stateTable = document.getElementById("stateTable");
  els.stateSpendingSum = document.getElementById("stateSpendingSum");
  els.stateZeroNote = document.getElementById("stateZeroNote");
  els.stateBudgetCaveat = document.getElementById("stateBudgetCaveat");

  els.dataGeneratedAt = document.getElementById("dataGeneratedAt");
}

// Searchable kommun combobox (plain text input + a filtered <ul role="listbox">
// list) instead of a native <select>, since scrolling a 290-item native select
// is painful on a touchscreen — typing a few letters isn't.
let kommunList = []; // [{code, name, regionName}], sorted by name
let kommunFiltered = [];
let kommunActiveIndex = -1;

function buildKommunList() {
  kommunList = Object.entries(DATA.kommuner)
    .map(([code, k]) => ({
      code,
      name: k.name,
      regionName: DATA.regions[k.regionCode] ? DATA.regions[k.regionCode].name : "",
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "sv"));

  const stockholm = kommunList.find((k) => k.name.toLowerCase() === "stockholm");
  state.kommunCode = stockholm ? stockholm.code : kommunList[0].code;
  els.kommunInput.value = (stockholm || kommunList[0]).name;
}

function appendHighlighted(el, text, query) {
  el.textContent = "";
  const idx = query ? text.toLowerCase().indexOf(query) : -1;
  if (idx === -1) {
    el.textContent = text;
    return;
  }
  el.appendChild(document.createTextNode(text.slice(0, idx)));
  const mark = document.createElement("mark");
  mark.textContent = text.slice(idx, idx + query.length);
  el.appendChild(mark);
  el.appendChild(document.createTextNode(text.slice(idx + query.length)));
}

function renderKommunOptions(query) {
  const q = query.trim().toLowerCase();
  kommunFiltered = q
    ? kommunList.filter((k) => k.name.toLowerCase().includes(q) || k.regionName.toLowerCase().includes(q))
    : kommunList;
  kommunActiveIndex = kommunFiltered.length ? 0 : -1;

  els.kommunListbox.textContent = "";

  if (kommunFiltered.length === 0) {
    const li = document.createElement("li");
    li.className = "combobox-empty";
    li.textContent = t("noKommunMatch");
    els.kommunListbox.appendChild(li);
    els.kommunInput.removeAttribute("aria-activedescendant");
    return;
  }

  kommunFiltered.forEach((k, i) => {
    const li = document.createElement("li");
    li.className = "combobox-option";
    li.id = `kommun-option-${k.code}`;
    li.setAttribute("role", "option");
    li.setAttribute("aria-selected", i === kommunActiveIndex ? "true" : "false");

    const nameEl = document.createElement("span");
    nameEl.className = "option-name";
    appendHighlighted(nameEl, k.name, q);

    const regionEl = document.createElement("span");
    regionEl.className = "option-region";
    appendHighlighted(regionEl, k.regionName, q);

    li.appendChild(nameEl);
    li.appendChild(regionEl);

    // Selecting via mousedown+preventDefault (not click) stops the input
    // from blurring first, which would otherwise close the list before the
    // click on it registers.
    li.addEventListener("mousedown", (e) => e.preventDefault());
    li.addEventListener("click", () => {
      selectKommun(k.code);
      closeKommunListbox();
    });

    els.kommunListbox.appendChild(li);
  });

  updateKommunActiveDescendant();
}

function updateKommunActiveDescendant() {
  const options = els.kommunListbox.querySelectorAll(".combobox-option");
  options.forEach((opt, i) => opt.setAttribute("aria-selected", i === kommunActiveIndex ? "true" : "false"));
  if (kommunActiveIndex >= 0 && options[kommunActiveIndex]) {
    els.kommunInput.setAttribute("aria-activedescendant", options[kommunActiveIndex].id);
    if (typeof options[kommunActiveIndex].scrollIntoView === "function") {
      options[kommunActiveIndex].scrollIntoView({ block: "nearest" });
    }
  } else {
    els.kommunInput.removeAttribute("aria-activedescendant");
  }
}

function openKommunListbox() {
  els.kommunListbox.hidden = false;
  els.kommunInput.setAttribute("aria-expanded", "true");
}

function closeKommunListbox() {
  els.kommunListbox.hidden = true;
  els.kommunInput.setAttribute("aria-expanded", "false");
  els.kommunInput.removeAttribute("aria-activedescendant");
}

function resetKommunInputText() {
  const k = kommunList.find((x) => x.code === state.kommunCode);
  els.kommunInput.value = k ? k.name : "";
}

function selectKommun(code) {
  state.kommunCode = code;
  resetKommunInputText();
  render();
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

function currentSpendingDetail(entry) {
  if (state.basis === "budget" && entry.spendingDetailBudget) {
    return entry.spendingDetailBudget;
  }
  return entry.spendingDetail || {};
}

function buildCategorySegments(categories, shares, totalAmount, detail) {
  return categories.map((name) => {
    const share = shares && shares[name] ? shares[name] : 0;
    const detailItems = detail && detail[name];
    return {
      name: translateCategory(name),
      share,
      value: share * totalAmount,
      detail: detailItems
        ? detailItems.map((d) => ({
            name: translateCategory(d.name),
            share: d.share,
            value: d.share * totalAmount,
          }))
        : null,
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
  const kommunDetail = currentSpendingDetail(kommun);
  const kommunSegments = buildCategorySegments(DATA.meta.categoriesKommun, kommunShares, result.kommunalSkatt, kommunDetail);
  els.kommunSpendingSum.textContent = `${formatCurrency(result.kommunalSkatt)}${t("perYear")}` + (kommun.estimated ? ` · ${t("estimatedNote")}` : "");
  renderStackBar(
    { trackEl: els.kommunTrack, legendEl: getOrCreateLegend(els.kommunTrack), tableEl: els.kommunTable },
    kommunSegments
  );

  // Region spending breakdown (annual kr). Gotland is both kommun and region in
  // one, and legally levies a single combined tax rate rather than a separate
  // regional one - but it still spends real money on regional services like
  // hospitals, so region.taxRate is an imputed split of that combined rate
  // (see gotland_imputed_region_rate in build.py) rather than 0, and the chart
  // renders normally. Only the explanatory note differs for a unified region.
  els.regionNameInHeading.textContent = t("inParens", { name: region.name });
  els.regionUnifiedNote.hidden = !region.taxRateUnified;
  const regionShares = currentSpendingShares(region);
  const regionDetail = currentSpendingDetail(region);
  const regionSegments = buildCategorySegments(DATA.meta.categoriesRegion, regionShares, result.regionalSkatt, regionDetail);
  els.regionSpendingSum.textContent = `${formatCurrency(result.regionalSkatt)}${t("perYear")}` + (region.estimated ? ` · ${t("estimatedNote")}` : "");
  renderStackBar(
    { trackEl: els.regionTrack, legendEl: getOrCreateLegend(els.regionTrack), tableEl: els.regionTable },
    regionSegments
  );

  els.budgetCaveat.hidden = !usingFallbackBudget();

  // State spending breakdown (annual kr). Most earners pay no statlig skatt at
  // all (it only applies above the skiktgräns) — the breakdown is still shown
  // in that case (0 kr against every category), so it's explicit about which
  // areas this person currently isn't contributing to, rather than just
  // disappearing.
  const stateHasTax = result.statligSkatt > 0;
  els.stateZeroNote.hidden = stateHasTax;
  const stateShares = currentSpendingShares(DATA.state);
  const stateDetail = currentSpendingDetail(DATA.state);
  const stateSegments = buildCategorySegments(DATA.meta.categoriesState, stateShares, result.statligSkatt, stateDetail);
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
  els.kommunInput.addEventListener("focus", () => {
    els.kommunInput.select();
    renderKommunOptions("");
    openKommunListbox();
  });
  els.kommunInput.addEventListener("input", () => {
    renderKommunOptions(els.kommunInput.value);
    openKommunListbox();
  });
  els.kommunInput.addEventListener("blur", () => {
    closeKommunListbox();
    resetKommunInputText();
  });
  els.kommunInput.addEventListener("keydown", (e) => {
    if (els.kommunListbox.hidden) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        renderKommunOptions(els.kommunInput.value);
        openKommunListbox();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (kommunFiltered.length) {
        kommunActiveIndex = (kommunActiveIndex + 1) % kommunFiltered.length;
        updateKommunActiveDescendant();
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (kommunFiltered.length) {
        kommunActiveIndex = (kommunActiveIndex - 1 + kommunFiltered.length) % kommunFiltered.length;
        updateKommunActiveDescendant();
      }
    } else if (e.key === "Enter") {
      if (kommunActiveIndex >= 0 && kommunFiltered[kommunActiveIndex]) {
        e.preventDefault();
        selectKommun(kommunFiltered[kommunActiveIndex].code);
        closeKommunListbox();
        els.kommunInput.blur();
      }
    } else if (e.key === "Escape") {
      closeKommunListbox();
      resetKommunInputText();
    }
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
  buildKommunList();
  wireEvents();
  els.dataGeneratedAt.textContent = t("dataGeneratedAt", { date: DATA.meta.generatedAt });
  setSalary(state.monthlyGross, "init");
  setBasis(state.basis);
}

init();
