const form = document.querySelector("#upgrade-form");
const button = document.querySelector("#upgrade-submit");
const message = document.querySelector("#upgrade-message");
const results = document.querySelector("#upgrade-results");
const thinking = document.querySelector("#upgrade-thinking");
const thinkingText = document.querySelector("#upgrade-thinking-text");
const card = document.querySelector("#upgrade-card");
const verdictEl = document.querySelector("#upgrade-verdict");
const confidenceEl = document.querySelector("#upgrade-confidence");
const summaryEl = document.querySelector("#upgrade-summary");
const reasonsEl = document.querySelector("#upgrade-reasons");
const explainerEl = document.querySelector("#upgrade-explainer");
const examplesToggle = document.querySelector("#examples-toggle");
const extraExamples = Array.from(document.querySelectorAll(".extra-example"));
const timers = [];
const steps = [
  "Checking performance signals...",
  "Reviewing upgrade cycles...",
  "Evaluating real-world usage..."
];

function clearTimers() { while (timers.length) clearTimeout(timers.pop()); }
function setLoading(on) {
  button.disabled = on;
  button.classList.toggle("is-loading", on);
  button.querySelector(".button-label").textContent = on ? "Analysing..." : "Analyse";
}
function getValues() {
  const data = new FormData(form);
  return {
    device: data.get("device"),
    age: Number(data.get("age")),
    performance: data.get("performance"),
    battery: data.get("battery"),
    features: data.get("features"),
    usage: data.get("usage")
  };
}
function validate(v) {
  if (!v.device) return "Choose a device type.";
  if (!Number.isFinite(v.age) || v.age < 0) return "Enter a valid age in years.";
  return "";
}
function decide(v) {
  let score = 0;
  const reasons = [];
  if (v.performance === "very-slow") { score += 4; reasons.push("Very slow performance is a strong upgrade signal."); }
  else if (v.performance === "slowing") { score += 2; reasons.push("Performance is slipping enough to matter."); }
  else { score -= 2; reasons.push("Performance is still strong, which supports keeping it."); }
  if (v.battery === "poor") { score += 4; reasons.push("Poor battery or reliability makes the current device harder to live with."); }
  else if (v.battery === "degrading") { score += 1; reasons.push("Battery or reliability decline adds some upgrade pressure."); }
  if (v.age < 2 && v.performance === "fast") { score -= 3; reasons.push("The device is still recent, so upgrading now is harder to justify."); }
  if (v.age > 4 && v.performance !== "fast") { score += 3; reasons.push("Age plus weaker performance points toward upgrading."); }
  if (v.features === "high") { score += v.age > 2 ? 2 : 1; reasons.push("New features matter to you, which nudges the decision toward upgrading."); }
  if (v.usage === "heavy" && v.performance !== "fast") { score += 1; reasons.push("Heavy use makes slowdowns feel more important in daily life."); }
  let verdict = "BORDERLINE";
  if (score >= 4) verdict = "UPGRADE";
  else if (score <= -2) verdict = "KEEP";
  if ((v.performance === "very-slow" || v.battery === "poor") && score >= 2) verdict = "UPGRADE";
  if (v.age < 2 && v.performance === "fast" && v.battery === "good") verdict = "KEEP";
  const confidence = Math.abs(score) >= 5 ? "High" : Math.abs(score) >= 3 ? "Medium" : "Low";
  const summary = verdict === "UPGRADE"
    ? "Upgrading is the stronger move because the current device is starting to hold you back."
    : verdict === "KEEP"
      ? "Keeping the current device makes more sense because it still has solid everyday value."
      : "This is a close call: there is some upgrade pressure, but not enough to make the decision obvious.";
  const explanation = verdict === "UPGRADE"
    ? "Performance, battery health, age, or heavy usage are creating enough real-world friction that upgrading now is easy to justify."
    : verdict === "KEEP"
      ? "The current device still performs well enough that upgrading now would likely be more about preference than need."
      : "The device is no longer perfect, but it is not clearly overdue either. The answer depends on how much the rough edges bother you.";
  return { verdict, confidence, reasons: reasons.slice(0, 4), summary, explanation };
}
function render(result) {
  verdictEl.textContent = result.verdict;
  verdictEl.className = "verdict";
  verdictEl.classList.add(result.verdict === "KEEP" ? "verdict-repair" : result.verdict === "UPGRADE" ? "verdict-replace" : "verdict-borderline");
  confidenceEl.textContent = `${result.confidence} confidence`;
  confidenceEl.className = "confidence-pill";
  summaryEl.textContent = result.summary;
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
  const v = getValues();
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
