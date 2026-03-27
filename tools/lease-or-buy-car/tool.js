const TOOL_NAME = "lease_or_buy_car";

const form = document.querySelector("#lease-buy-form");
const button = document.querySelector("#lease-buy-submit");
const message = document.querySelector("#lease-buy-message");
const results = document.querySelector("#lease-buy-results");
const thinking = document.querySelector("#lease-buy-thinking");
const thinkingText = document.querySelector("#lease-buy-thinking-text");
const card = document.querySelector("#lease-buy-card");
const verdictEl = document.querySelector("#lease-buy-verdict");
const confidenceEl = document.querySelector("#lease-buy-confidence");
const summaryEl = document.querySelector("#lease-buy-summary");
const reasonsEl = document.querySelector("#lease-buy-reasons");
const explainerEl = document.querySelector("#lease-buy-explainer");
const noteEl = document.querySelector("#lease-buy-note");
const examplesToggle = document.querySelector("#examples-toggle");
const extraExamples = Array.from(document.querySelectorAll(".extra-example"));

const timers = [];
const steps = [
  "Checking ownership timeline...",
  "Reviewing mileage pressure...",
  "Comparing payment vs ownership goals...",
  "Finalizing lease vs buy recommendation..."
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
    years: Number(data.get("years")),
    mileage: Number(data.get("mileage")),
    payment: data.get("payment"),
    ownership: data.get("ownership"),
    newCar: data.get("newCar"),
    restrictions: data.get("restrictions"),
    change: data.get("change")
  };
}

function validate(v) {
  if (!Number.isFinite(v.years) || v.years <= 0) return "Enter a valid ownership timeline in years.";
  if (!Number.isFinite(v.mileage) || v.mileage <= 0) return "Enter a valid annual mileage estimate.";
  if (v.mileage > 60000) return "That mileage looks unusually high. Check the number and try again.";
  return "";
}

function decide(v) {
  let score = 0;
  const reasons = [];
  let note = "";

  if (v.years <= 3) {
    score += 4;
    reasons.push("A shorter ownership timeline is one of the strongest signals toward leasing.");
  } else if (v.years <= 4.5) {
    score += 1;
    reasons.push("A mid-length timeline still leaves some room for leasing to make sense.");
  } else if (v.years <= 6) {
    score -= 2;
    reasons.push("Once you plan to keep the car for many years, buying starts to look stronger.");
  } else {
    score -= 4;
    reasons.push("A long ownership timeline usually favors buying because you can spread value over more years.");
  }

  if (v.mileage < 10000) {
    score += 3;
    reasons.push("Lower annual mileage fits leasing better because mileage limits are less likely to become a problem.");
  } else if (v.mileage <= 14000) {
    score += 1;
    reasons.push("Your mileage is still manageable for many lease setups.");
  } else if (v.mileage <= 18000) {
    score -= 2;
    reasons.push("Higher mileage makes lease limits harder to live with and pushes the decision toward buying.");
  } else {
    score -= 4;
    reasons.push("Very high mileage is a strong reason to buy rather than lease.");
  }

  if (v.payment === "high") {
    score += 3;
    reasons.push("Keeping monthly payments lower matters to you, which supports leasing.");
  } else if (v.payment === "medium") {
    score += 1;
    reasons.push("Monthly payment pressure adds some pull toward leasing.");
  } else {
    score -= 1;
    reasons.push("If lower monthly cost is not a priority, leasing loses one of its biggest advantages.");
  }

  if (v.ownership === "high") {
    score -= 4;
    reasons.push("Strong long-term ownership preference is one of the clearest reasons to buy.");
  } else if (v.ownership === "medium") {
    score -= 2;
    reasons.push("Wanting long-term ownership adds real weight toward buying.");
  } else {
    score += 1;
    reasons.push("If ownership itself does not matter much, leasing becomes easier to justify.");
  }

  if (v.newCar === "high") {
    score += 3;
    reasons.push("Wanting a newer car every few years is a classic lease-friendly signal.");
  } else if (v.newCar === "medium") {
    score += 1;
    reasons.push("Some preference for newer cars nudges the decision toward leasing.");
  }

  if (v.restrictions === "low") {
    score -= 3;
    reasons.push("Low tolerance for mileage or wear rules makes leasing harder to live with.");
  } else if (v.restrictions === "medium") {
    score -= 1;
    reasons.push("Some discomfort with lease restrictions lightly supports buying.");
  } else {
    score += 1;
    reasons.push("If you can comfortably live with lease rules, leasing becomes easier to defend.");
  }

  if (v.change === "yes") {
    score += 2;
    reasons.push("Changing needs in the next few years make flexibility more valuable, which supports leasing.");
  } else {
    score -= 1;
    reasons.push("Stable needs make long-term ownership easier to justify.");
  }

  if (v.years >= 6 && v.mileage >= 15000) {
    score -= 4;
    reasons.push("Long timeline plus high mileage strongly reinforces the case for buying.");
  }

  if (v.years <= 3 && v.mileage <= 12000 && (v.payment === "high" || v.newCar === "high")) {
    score += 3;
    note = "Strong lease fit: short timeline, manageable mileage, and a clear reason to value flexibility.";
  }

  if (v.ownership === "high" && v.restrictions === "low") {
    score -= 2;
    reasons.push("Wanting ownership and disliking restrictions together makes buying a much cleaner fit.");
  }

  if (v.newCar === "high" && v.ownership === "low" && v.years <= 4) {
    score += 2;
    reasons.push("Wanting newer cars without strong ownership attachment is a strong lease pattern.");
  }

  let verdict = "BORDERLINE";
  if (score >= 4) verdict = "LEASE";
  else if (score <= -4) verdict = "BUY";

  if (v.mileage >= 20000 && v.years >= 5) verdict = "BUY";
  if (v.years <= 2.5 && v.payment === "high" && v.ownership !== "high") verdict = "LEASE";

  const confidence = Math.abs(score) >= 9 ? "High" : Math.abs(score) >= 5 ? "Medium" : "Low";

  const summary = verdict === "LEASE"
    ? "Leasing looks stronger because your timeline and priorities put more value on flexibility and lower monthly pressure than on long-term ownership."
    : verdict === "BUY"
      ? "Buying looks stronger because mileage, ownership goals, or long-term use make lease limits and short-cycle value less attractive."
      : "This is a close call: your timeline and lifestyle leave enough room for either option to make sense depending on how much you value ownership versus flexibility.";

  const explanation = verdict === "LEASE"
    ? "The strongest lease cases usually combine a shorter timeline, manageable mileage, and a real reason to prefer lower monthly payments or newer vehicles. That is the pattern your answers are moving toward."
    : verdict === "BUY"
      ? "The strongest buy cases usually combine higher mileage, longer ownership plans, stronger ownership goals, or dislike of lease restrictions. Those signals are doing more work in your answers."
      : "Your inputs split the decision. Some signals support leasing for flexibility, while others support buying for long-term value. This is exactly the kind of case where personal preference can reasonably break the tie.";

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
    result.verdict === "LEASE"
      ? "verdict-repair"
      : result.verdict === "BUY"
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
    totalDuration: 1600,
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
