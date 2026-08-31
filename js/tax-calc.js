// Evaluates one of the piecewise segment tables from data/tax-data.json
// (national.grundavdrag.segments or national.jobbskatteavdrag.under66.segments)
// at income x (in kr). Segments carry fromKr/toKr bounds (toKr null = open-ended)
// and one of: a flat valueKr, or a linear baseKr+slope*(x-fromKr). A segment with
// neither (used for the first jobbskatteavdrag bracket) evaluates to x itself.
function evalSegment(seg, x) {
  if (typeof seg.slope === "number") return (seg.baseKr || 0) + seg.slope * (x - seg.fromKr);
  if (typeof seg.valueKr === "number") return seg.valueKr;
  if (typeof seg.baseKr === "number") return seg.baseKr; // flat ceiling/floor with no slope
  return x; // identity case: e.g. jobbskatteavdrag's first bracket, "reduction = (AI - GA) * KI"
}

function evalPiecewiseSegments(segments, x) {
  for (const seg of segments) {
    const inRange = x >= seg.fromKr && (seg.toKr === null || seg.toKr === undefined || x < seg.toKr);
    if (inRange) return evalSegment(seg, x);
  }
  return evalSegment(segments[segments.length - 1], x);
}

function roundUpTo(value, step) {
  return Math.ceil(value / step) * step;
}
function roundDownTo(value, step) {
  return Math.floor(value / step) * step;
}

// Grundavdrag (basic tax-free allowance), per Skatteverket SKV 433 sec. 6:
// piecewise function of FFI (fastställd förvärvsinkomst), capped at FFI itself,
// rounded up to the nearest 100 kr.
function calcGrundavdrag(national, ffi) {
  const raw = evalPiecewiseSegments(national.grundavdrag.segments, ffi);
  const capped = Math.min(raw, ffi);
  return roundUpTo(Math.max(0, capped), national.grundavdrag.roundingKr || 100);
}

// Jobbskatteavdrag (earned-income tax credit), per SKV 433 sec. 7.5.2.
// KI in Skatteverket's formula is the COMBINED kommunal + regional tax rate
// ("den kommunala inkomstskatten består av kommunalskatt och
// landstingsskatt/regional skatt") — not the kommun rate alone. The credit is
// only ever offset against kommunal + regional tax, never against state tax.
function calcJobbskatteavdrag(national, annualGross, grundavdrag, combinedLocalRate) {
  const jsa = national.jobbskatteavdrag.under66;
  const ai = roundDownTo(annualGross, national.jobbskatteavdrag.arbetsinkomstRounding?.toKr || 100);
  const x = evalPiecewiseSegments(jsa.segments, ai);
  const reduction = (x - grundavdrag) * combinedLocalRate;
  return Math.max(0, Math.floor(reduction));
}

// monthlyGross: gross salary per month, in kr.
// kommunRate / regionRate: fractions (e.g. 0.1942 / 0.1233), applied to income
// after grundavdrag.
// national: the "national" object from data/tax-data.json.
function calculateTax(monthlyGross, kommunRate, regionRate, national) {
  const annualGross = Math.max(0, monthlyGross) * 12;

  // Treated as both "arbetsinkomst" and "fastställd förvärvsinkomst" — the
  // standard simplification for a wage earner with no other deductions.
  const grundavdrag = calcGrundavdrag(national, annualGross);
  const taxable = Math.max(0, annualGross - grundavdrag);

  const kommunalSkattGross = taxable * kommunRate;
  const regionalSkattGross = taxable * regionRate;
  const localTaxGross = kommunalSkattGross + regionalSkattGross;

  const overSkiktgrans = Math.max(0, taxable - national.skiktgrans);
  const statligSkatt = overSkiktgrans * national.stateTaxRate;

  const combinedLocalRate = kommunRate + regionRate;
  const jobbskatteavdragRaw = calcJobbskatteavdrag(national, annualGross, grundavdrag, combinedLocalRate);
  const jobbskatteavdrag = Math.min(jobbskatteavdragRaw, localTaxGross);

  const localTaxAfterCredit = localTaxGross - jobbskatteavdrag;
  const factor = localTaxGross > 0 ? localTaxAfterCredit / localTaxGross : 0;
  const kommunalSkatt = kommunalSkattGross * factor;
  const regionalSkatt = regionalSkattGross * factor;

  const totalTax = kommunalSkatt + regionalSkatt + statligSkatt;
  const netAnnual = annualGross - totalTax;

  return {
    annualGross,
    monthlyGross,
    grundavdrag,
    taxable,
    kommunalSkatt,
    regionalSkatt,
    statligSkatt,
    jobbskatteavdrag,
    totalTax,
    netAnnual,
    netMonthly: netAnnual / 12,
    effectiveRate: annualGross > 0 ? totalTax / annualGross : 0,
  };
}
