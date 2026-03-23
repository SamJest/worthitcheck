const form = document.querySelector("#buy-wait-form");
const button = document.querySelector("#bw-submit");
const message = document.querySelector("#bw-message");
const results = document.querySelector("#bw-results");
const thinking = document.querySelector("#bw-thinking");
const thinkingText = document.querySelector("#bw-thinking-text");
const card = document.querySelector("#bw-result-card");
const verdictEl = document.querySelector("#bw-verdict");
const confidenceEl = document.querySelector("#bw-confidence");
const summaryEl = document.querySelector("#bw-summary");
const reasonsEl = document.querySelector("#bw-reasons");
const explainerEl = document.querySelector("#bw-explainer");
const noteEl = document.querySelector("#bw-note");
const examplesToggle = document.querySelector("#examples-toggle");
const extraExamples = Array.from(document.querySelectorAll(".extra-example"));

const timers = [];
const steps = [
  "Checking upgrade cycles...",
  "Scanning sale periods...",
  "Evaluating your situation...",
  "Comparing buy-now vs wait signals..."
];

function clearTimers() {
  while (timers.length) clearTimeout(timers.pop());
}

function setLoading(isLoading) {
  button.disabled = isLoading;
  button.classList.toggle("is-loading", isLoading);
  button.querySelector(".button-label").textContent = isLoading ? "Analysing..." : "Analyse";
}

function values() {
  const data = new FormData(form);
  return {
    category: data.get("category"),
    age: Number(data.get("age")),
    condition: data.get("condition"),
    urgency: data.get("urgency"),
    event: data.get("event"),
    features: data.get("features")
  };
}

function validate(v) {
  if (!v.category) return "Choose a category.";
  if (!Number.isFinite(v.age) || v.age < 0) return "Enter a valid age in years.";
  return "";
}

function getAgeState(category, age) {
  const limits = { phone: 3, electronics: 4, appliance: 8, car: 9, other: 5 };
  const high = { phone: 4.5, electronics: 6, appliance: 11, car: 11, other: 7 };
  if (age <= limits[category]) return "low";
  if (age >= high[category]) return "high";
  return "mid";
}

function decide(v) {
  const ageState = getAgeState(v.category, v.age);
  let score = 0;
  const reasons = [];
  let note = "";

  if (v.urgency === "now") {
    score += 4;
    reasons.push("You need a solution now, which reduces the practical value of waiting.");
  }
  if (v.condition === "major") {
    score += 4;
    reasons.push("Major issues make delays harder to justify.");
  } else if (v.condition === "minor") {
    score += 1;
    reasons.push("Minor issues add some pressure, but they do not force an immediate decision.");
  } else {
    score -= 2;
    reasons.push("Your current item is still working fine, which gives you room to wait.");
  }

  if (v.event !== "none" && v.urgency !== "now") {
    score -= 3;
    reasons.push("A meaningful timing event is close enough to make waiting more attractive.");
  }

  if (ageState === "low" && v.condition === "working") {
    score -= 3;
    reasons.push("The item is still relatively young, so replacing it now is harder to justify.");
  }

  if (ageState === "high" && v.features === "high") {
    score += 2;
    reasons.push("The item is already older and you care a lot about new features, which supports buying.");
  }

  if (ageState === "high" && v.condition !== "working") {
    score += 2;
    reasons.push("Age plus visible wear makes the current item more expensive to keep tolerating.");
  }

  if (v.features === "low" && v.condition === "working") score -= 1;

  let verdict = "BORDERLINE";
  if (score >= 4) verdict = "BUY";
  else if (score <= -3) verdict = "WAIT";

  if ((v.urgency === "now" || v.condition === "major") && score >= 2) verdict = "BUY";
  if (v.event !== "none" && v.urgency !== "now" && v.condition === "working") verdict = "WAIT";

  const confidence = Math.abs(score) >= 5 ? "High" : Math.abs(score) >= 3 ? "Medium" : "Low";

  const summary =
    verdict === "BUY"
      ? "Buying now is the stronger move because waiting is unlikely to create enough upside for your current situation."
      : verdict === "WAIT"
        ? "Waiting looks smarter because your current item still gives you enough room to benefit from better timing."
        : "This is close: there are real reasons to wait, but enough pressure to justify buying now if needed.";

  if (verdict === "WAIT" && v.event === "black-friday") note = "Recommended: wait for Black Friday deals.";
  if (verdict === "WAIT" && v.event === "release") note = "Recommended: wait for the next model release.";
  if (verdict === "WAIT" && v.event === "seasonal") note = "Recommended: wait for the next seasonal sale window.";

  const explanation =
    verdict === "BUY"
      ? "The strongest signals here point toward acting now. Urgency, condition, and overall age are doing more work than any potential savings from waiting."
      : verdict === "WAIT"
        ? "The current item still gives you some breathing room, so timing becomes valuable. A nearby sale or release window can improve value without much added downside."
        : "The signals are split. If convenience matters more, buying now is easy to justify. If value matters more and the item is still usable, waiting is reasonable.";

  return { verdict, confidence, summary, reasons: reasons.slice(0, 4), explanation, note };
}

function render(result) {
  verdictEl.textContent = result.verdict;
  verdictEl.className = "verdict";
  verdictEl.classList.add(result.verdict === "BUY" ? "verdict-replace" : result.verdict === "WAIT" ? "verdict-repair" : "verdict-borderline");
  confidenceEl.textContent = `${result.confidence} confidence`;
  confidenceEl.className = "confidence-pill";
  summaryEl.textContent = result.summary;
  reasonsEl.innerHTML = result.reasons.map((reason) => `<li>${reason}</li>`).join("");
  explainerEl.innerHTML = `<p>${result.explanation}</p>`;
  noteEl.hidden = !result.note;
  noteEl.innerHTML = result.note ? `<strong>${result.note}</strong>` : "";
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
  if (error) {
    message.textContent = error;
    return;
  }

  message.textContent = "";
  setLoading(true);
  results.hidden = false;
  thinking.hidden = false;
  card.hidden = true;
  results.scrollIntoView({ behavior: "smooth", block: "start" });

  steps.forEach((step, index) => {
    timers.push(setTimeout(() => { thinkingText.textContent = step; }, index * 320));
  });

  timers.push(setTimeout(() => {
    thinking.hidden = true;
    render(decide(v));
    setLoading(false);
  }, 1500));
});

initExamplesToggle();
