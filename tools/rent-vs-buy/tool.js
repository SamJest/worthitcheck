const form = document.querySelector("#rent-buy-form");
const button = document.querySelector("#rent-buy-submit");
const message = document.querySelector("#rent-buy-message");
const results = document.querySelector("#rent-buy-results");
const thinking = document.querySelector("#rent-buy-thinking");
const thinkingText = document.querySelector("#rent-buy-thinking-text");
const card = document.querySelector("#rent-buy-card");
const verdictEl = document.querySelector("#rent-buy-verdict");
const confidenceEl = document.querySelector("#rent-buy-confidence");
const summaryEl = document.querySelector("#rent-buy-summary");
const rentTotalEl = document.querySelector("#rent-total");
const buyTotalEl = document.querySelector("#buy-total");
const reasonsEl = document.querySelector("#rent-buy-reasons");
const explainerEl = document.querySelector("#rent-buy-explainer");
const examplesToggle = document.querySelector("#examples-toggle");
const extraExamples = Array.from(document.querySelectorAll(".extra-example"));
const timers = [];
const steps = [
  "Calculating long-term costs...",
  "Comparing rent vs ownership...",
  "Evaluating your timeline..."
];

function clearTimers() { while (timers.length) clearTimeout(timers.pop()); }
function gbp(v) { return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(v); }
function setLoading(on) {
  button.disabled = on;
  button.classList.toggle("is-loading", on);
  button.querySelector(".button-label").textContent = on ? "Analysing..." : "Analyse";
}
function values() {
  const data = new FormData(form);
  return {
    rent: Number(data.get("rent")),
    price: Number(data.get("price")),
    ownership: Number(data.get("ownership")),
    years: Number(data.get("years")),
    stability: data.get("stability")
  };
}
function validate(v) {
  if (!Number.isFinite(v.rent) || v.rent <= 0) return "Enter a valid monthly rent.";
  if (!Number.isFinite(v.price) || v.price <= 0) return "Enter a valid purchase price.";
  if (!Number.isFinite(v.ownership) || v.ownership < 0) return "Enter a valid monthly ownership cost.";
  if (!Number.isFinite(v.years) || v.years <= 0) return "Enter a valid time horizon.";
  return "";
}
function decide(v) {
  const totalRent = v.rent * 12 * v.years;
  const totalOwnership = v.price + (v.ownership * 12 * v.years);
  let score = 0;
  const reasons = [];
  const diff = totalRent - totalOwnership;
  const closeness = Math.abs(diff) / Math.max(totalRent, totalOwnership);

  if (v.years <= 2 && v.stability === "short") {
    score -= 4;
    reasons.push("A short timeline makes the upfront buy cost harder to justify.");
  }
  if (diff > 0) {
    score += diff / Math.max(totalRent, 1) > 0.12 ? 3 : 1;
    reasons.push(`Over ${v.years} years, owning costs ${gbp(totalOwnership)} vs ${gbp(totalRent)} renting.`);
  } else {
    score -= Math.abs(diff) / Math.max(totalOwnership, 1) > 0.12 ? 3 : 1;
    reasons.push(`Over ${v.years} years, renting costs ${gbp(totalRent)} vs ${gbp(totalOwnership)} owning.`);
  }
  if (v.stability === "long") {
    score += 1;
    reasons.push("Long-term stability makes buying easier to justify.");
  } else if (v.stability === "short") {
    score -= 1;
    reasons.push("Short-term plans favour flexibility, which supports renting.");
  }
  if (v.years < 3) score -= 1;

  let verdict = "BORDERLINE";
  if (score >= 2 && closeness > 0.08) verdict = "BUY";
  else if (score <= -2 && closeness > 0.08) verdict = "RENT";
  else if (v.years <= 2 && v.stability === "short") verdict = "RENT";

  const confidence = closeness > 0.18 ? "High" : closeness > 0.08 ? "Medium" : "Low";
  const summary = verdict === "BUY"
    ? `Over ${v.years} years, owning looks cheaper than renting.`
    : verdict === "RENT"
      ? `Over ${v.years} years, renting looks safer or cheaper than buying.`
      : `Over ${v.years} years, renting and buying come out close enough that the decision is not one-sided.`;
  const explanation = verdict === "BUY"
    ? "Buying is stronger here because the longer timeline gives ownership cost enough room to beat renting."
    : verdict === "RENT"
      ? "Renting is stronger here because the timeline is short, the upfront cost is hard to recover, or ownership stays more expensive."
      : "The totals are close enough that flexibility, certainty, and personal preference matter alongside the numbers.";

  return { verdict, confidence, totalRent, totalOwnership, reasons: reasons.slice(0, 4), summary, explanation };
}
function render(result) {
  verdictEl.textContent = result.verdict;
  verdictEl.className = "verdict";
  verdictEl.classList.add(result.verdict === "BUY" ? "verdict-repair" : result.verdict === "RENT" ? "verdict-replace" : "verdict-borderline");
  confidenceEl.textContent = `${result.confidence} confidence`;
  confidenceEl.className = "confidence-pill";
  summaryEl.textContent = result.summary;
  rentTotalEl.textContent = gbp(result.totalRent);
  buyTotalEl.textContent = gbp(result.totalOwnership);
  reasonsEl.innerHTML = result.reasons.map((r) => `<li>${r}</li>`).join("");
  explainerEl.innerHTML = `<p>${result.explanation}</p>`;
  card.hidden = false;
  card.classList.remove("is-visible");
  confidenceEl.classList.remove("is-visible");
  requestAnimationFrame(() => card.classList.add("is-visible"));
  timers.push(setTimeout(() => confidenceEl.classList.add("is-visible"), 220));
}
function initExamplesToggle() {
  if (!examplesToggle || !extraExamples.length) return;
  examplesToggle.hidden = false;
  extraExamples.forEach((item) => item.classList.add("is-hidden"));
  examplesToggle.addEventListener("click", () => {
    const open = examplesToggle.getAttribute("aria-expanded") === "true";
    extraExamples.forEach((item) => item.classList.toggle("is-hidden", open));
    examplesToggle.setAttribute("aria-expanded", String(!open));
    examplesToggle.textContent = open ? "Show more examples" : "Show fewer examples";
  });
}
form.addEventListener("submit", (event) => {
  event.preventDefault();
  clearTimers();
  const v = values();
  const error = validate(v);
  if (error) { message.textContent = error; return; }
  message.textContent = "";
  setLoading(true);
  results.hidden = false;
  thinking.hidden = false;
  card.hidden = true;
  results.scrollIntoView({ behavior: "smooth", block: "start" });
  steps.forEach((step, i) => timers.push(setTimeout(() => { thinkingText.textContent = step; }, i * 340)));
  timers.push(setTimeout(() => {
    thinking.hidden = true;
    render(decide(v));
    setLoading(false);
  }, 1500));
});
initExamplesToggle();
