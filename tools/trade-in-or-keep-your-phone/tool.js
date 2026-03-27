const TOOL_NAME = "trade_in_or_keep_your_phone";

const form = document.querySelector("#trade-phone-form");
const button = document.querySelector("#trade-phone-submit");
const message = document.querySelector("#trade-phone-message");
const results = document.querySelector("#trade-phone-results");
const thinking = document.querySelector("#trade-phone-thinking");
const thinkingText = document.querySelector("#trade-phone-thinking-text");
const card = document.querySelector("#trade-phone-card");
const verdictEl = document.querySelector("#trade-phone-verdict");
const confidenceEl = document.querySelector("#trade-phone-confidence");
const summaryEl = document.querySelector("#trade-phone-summary");
const reasonsEl = document.querySelector("#trade-phone-reasons");
const explainerEl = document.querySelector("#trade-phone-explainer");
const noteEl = document.querySelector("#trade-phone-note");
const examplesToggle = document.querySelector("#examples-toggle");
const extraExamples = Array.from(document.querySelectorAll(".extra-example"));

const timers = [];
const steps = [
  "Checking phone age and value...",
  "Reviewing battery and performance...",
  "Comparing trade-in timing vs remaining life...",
  "Finalizing recommendation..."
];

const {
  clearTimers,
  initializeExamplesToggle,
  revealResultCard,
  runAnalysis,
  setLoading,
  trackEvent
} = window.WorthItCheckTooling;

function values() {
  const data = new FormData(form);
  return {
    age: Number(data.get("age")),
    tradeValue: Number(data.get("tradeValue")),
    performance: data.get("performance"),
    battery: data.get("battery"),
    features: data.get("features"),
    holdMonths: Number(data.get("holdMonths"))
  };
}

function validate(v) {
  if (!Number.isFinite(v.age) || v.age < 0) return "Enter a valid phone age in years.";
  if (!Number.isFinite(v.tradeValue) || v.tradeValue < 0) return "Enter a valid trade-in estimate.";
  if (!Number.isFinite(v.holdMonths) || v.holdMonths <= 0) return "Enter how many more months you expect to keep it.";
  return "";
}

function decide(v) {
  let score = 0;
  const reasons = [];
  let note = "";

  if (v.age >= 4) {
    score += 4;
    reasons.push("An older phone is more exposed to declining trade-in value and everyday wear, which supports acting sooner.");
  } else if (v.age >= 3) {
    score += 2;
    reasons.push("Your phone is getting old enough that timing the trade-in starts to matter more.");
  } else if (v.age <= 2) {
    score -= 2;
    reasons.push("A relatively recent phone is often still worth keeping if it remains solid in daily use.");
  }

  if (v.performance === "rough") {
    score += 4;
    reasons.push("Rough performance is a strong signal that the remaining value of keeping the phone is shrinking.");
  } else if (v.performance === "slowing") {
    score += 2;
    reasons.push("Performance is slipping enough to add real pressure toward trading in.");
  } else {
    score -= 2;
    reasons.push("If performance is still fast, keeping the phone becomes easier to justify.");
  }

  if (v.battery === "poor") {
    score += 4;
    reasons.push("Poor battery or reliability makes the phone harder to keep comfortably for much longer.");
  } else if (v.battery === "declining") {
    score += 2;
    reasons.push("Battery decline adds trade-in pressure because the phone may lose usefulness faster from here.");
  } else {
    score -= 1;
    reasons.push("If battery health is still good, keeping the phone has more of a practical case.");
  }

  if (v.tradeValue >= 350) {
    score += 3;
    reasons.push("A relatively strong trade-in offer makes acting now more attractive before value falls further.");
  } else if (v.tradeValue >= 200) {
    score += 1;
    reasons.push("There is still enough trade-in value on the table to make the timing decision matter.");
  } else if (v.tradeValue <= 120) {
    score -= 2;
    reasons.push("If the trade-in value is already weak, keeping the phone often becomes easier to justify.");
  }

  if (v.features === "high") {
    score += 2;
    reasons.push("A strong desire for new features adds some pull toward trading in now.");
  } else if (v.features === "low") {
    score -= 1;
    reasons.push("If new features do not matter much, there is less pressure to give up a usable phone.");
  }

  if (v.holdMonths >= 18) {
    score -= 2;
    reasons.push("If you expect to keep the phone for a long stretch and it is still workable, keeping gets more value from it.");
  } else if (v.holdMonths <= 6) {
    score += 2;
    reasons.push("If you likely will not keep it much longer anyway, capturing value now becomes more attractive.");
  }

  if (v.age >= 4 && v.battery === "poor" && v.tradeValue >= 200) {
    score += 3;
    note = "Strong trade-in fit: the phone is aging, the battery is slipping, and the current value is still meaningful enough to preserve.";
  }

  if (v.age <= 2 && v.performance === "fast" && v.battery === "good" && v.features === "low") {
    score -= 3;
    note = "Strong keep fit: the phone is still recent, stable, and not being pushed out by a strong upgrade need.";
  }

  let verdict = "BORDERLINE";
  if (score >= 4) verdict = "TRADE IN";
  else if (score <= -3) verdict = "KEEP";

  const confidence = Math.abs(score) >= 9 ? "High" : Math.abs(score) >= 5 ? "Medium" : "Low";

  const summary = verdict === "TRADE IN"
    ? "Trading in looks stronger because the phone's remaining everyday value is falling while the current trade-in value is still worth preserving."
    : verdict === "KEEP"
      ? "Keeping the phone looks stronger because it still has enough everyday value that trading it in now would likely be giving up useful life too early."
      : "This is a close call: the phone still has usable life left, but the current trade-in value is strong enough that acting now can still be defended.";

  const explanation = verdict === "TRADE IN"
    ? "The strongest trade-in cases usually combine age, battery or performance decline, and enough current value that waiting feels more expensive than it first appears. Those are the signals doing the most work here."
    : verdict === "KEEP"
      ? "The strongest keep cases usually combine a relatively stable phone, weaker trade-in value, and low pressure to upgrade. That means the everyday value of keeping it still outweighs the money you would lock in now."
      : "Your inputs split the decision. Some signals support locking in value now, while others support squeezing more life out of the device. This is the kind of case where convenience and tolerance for rough edges can reasonably decide it.";

  return {
    verdict,
    confidence,
    reasons: reasons.slice(0, 4),
    summary,
    explanation,
    note
  };
}

function render(result) {
  verdictEl.textContent = result.verdict;
  verdictEl.className = "verdict";
  verdictEl.classList.add(
    result.verdict === "KEEP"
      ? "verdict-repair"
      : result.verdict === "TRADE IN"
        ? "verdict-replace"
        : "verdict-borderline"
  );
  confidenceEl.textContent = `${result.confidence} confidence`;
  confidenceEl.className = "confidence-pill";
  summaryEl.textContent = result.summary;
  reasonsEl.innerHTML = result.reasons.map((reason) => `<li>${reason}</li>`).join("");
  explainerEl.innerHTML = `<p>${result.explanation}</p>`;
  noteEl.hidden = !result.note;
  noteEl.innerHTML = result.note ? `<strong>${result.note}</strong>` : "";

  revealResultCard(card, confidenceEl, timers);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  clearTimers(timers);

  const v = values();
  const error = validate(v);

  if (error) {
    message.textContent = error;
    return;
  }

  message.textContent = "";
  setLoading(button, true);
  trackEvent(TOOL_NAME, "tool_submit");

  runAnalysis({
    timers,
    results,
    thinking,
    thinkingText,
    card,
    steps,
    totalDuration: 1500,
    onComplete() {
      const result = decide(v);
      render(result);
      setLoading(button, false);
      trackEvent(TOOL_NAME, "tool_result", {
        verdict: result.verdict,
        confidence: result.confidence
      });
    }
  });
});

initializeExamplesToggle(examplesToggle, extraExamples);
