const SERIES_COLORS = [
  "var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)",
  "var(--series-5)", "var(--series-6)", "var(--series-7)", "var(--series-8)",
];

let _tooltipEl = null;
function getTooltip() {
  if (!_tooltipEl) {
    _tooltipEl = document.createElement("div");
    _tooltipEl.className = "viz-tooltip";
    _tooltipEl.setAttribute("role", "tooltip");
    document.body.appendChild(_tooltipEl);
  }
  return _tooltipEl;
}

function showTooltip(x, y, name, valueStr) {
  const el = getTooltip();
  el.textContent = "";
  const strong = document.createElement("strong");
  strong.textContent = valueStr;
  el.appendChild(strong);
  el.appendChild(document.createTextNode(" — "));
  el.appendChild(document.createTextNode(name));
  el.style.left = x + "px";
  el.style.top = y + "px";
  el.classList.add("is-visible");
}

function hideTooltip() {
  if (_tooltipEl) _tooltipEl.classList.remove("is-visible");
}

// segments: [{ name: string, value: number, share: number (0-1) }]
// container: { trackEl, legendEl, tableEl }
function renderStackBar(container, segments) {
  const { trackEl, legendEl, tableEl } = container;
  trackEl.textContent = "";
  legendEl.textContent = "";
  if (tableEl) tableEl.textContent = "";

  // When the whole pool is 0 (e.g. someone paying no state tax at all), there's
  // nothing to draw proportionally — but the legend/table still lists every
  // category at 0 kr, so it's explicit about what isn't being funded, rather
  // than just filtering everything away into an empty chart.
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const visible = total > 0 ? segments.filter((s) => s.value > 0) : [];
  const listed = total > 0 ? visible : segments;

  visible.forEach((seg, i) => {
    const color = SERIES_COLORS[i % SERIES_COLORS.length];
    const pct = seg.share * 100;

    const segEl = document.createElement("div");
    segEl.className = "stackbar-seg";
    segEl.style.width = pct + "%";
    segEl.style.background = color;
    segEl.tabIndex = 0;
    segEl.setAttribute("role", "img");
    const valueStr = formatCurrency(seg.value);
    segEl.setAttribute("aria-label", `${seg.name}: ${valueStr} (${formatPercent(seg.share, 1)})`);

    const showFn = (evt) => {
      const rect = segEl.getBoundingClientRect();
      const x = evt && evt.clientX ? evt.clientX : rect.left + rect.width / 2;
      showTooltip(x, rect.top, seg.name, `${valueStr} (${formatPercent(seg.share, 1)})`);
    };
    segEl.addEventListener("pointermove", showFn);
    segEl.addEventListener("pointerenter", showFn);
    segEl.addEventListener("focus", showFn);
    segEl.addEventListener("pointerleave", hideTooltip);
    segEl.addEventListener("blur", hideTooltip);

    trackEl.appendChild(segEl);
  });

  listed.forEach((seg, i) => {
    const color = SERIES_COLORS[i % SERIES_COLORS.length];
    const valueStr = formatCurrency(seg.value);

    const li = document.createElement("li");
    const dot = document.createElement("span");
    dot.className = "legend-dot";
    dot.style.background = color;
    const nameEl = document.createElement("span");
    nameEl.className = "legend-name";
    nameEl.textContent = seg.name;
    const valueEl = document.createElement("span");
    valueEl.className = "legend-value";
    valueEl.textContent = valueStr;
    const pctEl = document.createElement("span");
    pctEl.className = "legend-pct";
    pctEl.textContent = formatPercent(seg.share, 1);
    li.appendChild(dot);
    li.appendChild(nameEl);
    li.appendChild(valueEl);
    li.appendChild(pctEl);
    legendEl.appendChild(li);
  });

  if (tableEl) {
    const table = document.createElement("table");
    table.className = "data-table";
    const thead = document.createElement("thead");
    thead.innerHTML = "";
    const headRow = document.createElement("tr");
    [t("tableCategory"), t("tableShare"), t("tableAmount")].forEach((h) => {
      const th = document.createElement("th");
      th.textContent = h;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);
    const tbody = document.createElement("tbody");
    listed.forEach((seg) => {
      const row = document.createElement("tr");
      const c1 = document.createElement("td");
      c1.textContent = seg.name;
      const c2 = document.createElement("td");
      c2.textContent = formatPercent(seg.share, 1);
      const c3 = document.createElement("td");
      c3.textContent = formatCurrency(seg.value);
      row.appendChild(c1);
      row.appendChild(c2);
      row.appendChild(c3);
      tbody.appendChild(row);

      if (seg.detail && seg.detail.length) {
        seg.detail.forEach((sub) => {
          const subRow = document.createElement("tr");
          subRow.className = "data-table-subrow";
          const s1 = document.createElement("td");
          s1.textContent = sub.name;
          const s2 = document.createElement("td");
          s2.textContent = formatPercent(sub.share, 1);
          const s3 = document.createElement("td");
          s3.textContent = formatCurrency(sub.value);
          subRow.appendChild(s1);
          subRow.appendChild(s2);
          subRow.appendChild(s3);
          tbody.appendChild(subRow);
        });
      }
    });
    table.appendChild(tbody);
    tableEl.appendChild(table);
  }
}
