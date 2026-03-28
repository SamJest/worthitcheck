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
const valueWindowEl = document.querySelector("#trade-phone-value-window");
const holdWindowEl = document.querySelector("#trade-phone-hold-window");
const practicalLeanEl = document.querySelector("#trade-phone-practical-lean");
const realLifeEl = document.querySelector("#trade-phone-real-life");
const generatedExamplesEl = document.querySelector("#trade-phone-generated-examples");
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
  renderExampleScenarios,
  revealResultCard,
  runAnalysis,
  runDecisionEngine,
  setLoading,
  trackEvent
} = window.WorthItCheckTooling;

function currency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

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

function getPracticalLean(verdict) {
  if (verdict === "TRADE IN") return "Lock in value now";
  if (verdict === "KEEP") return "Use the remaining life";
  return "Tolerance for rough edges decides";
}

function evaluateScenario(v, options) {
  const includeExamples = !options || options.includeExamples !== false;
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

  const result = runDecisionEngine({
    score,
    maxScore: 14,
    closeness: Math.min(Math.abs(score) / 14, 1),
    thresholds: { positive: 4, negative: -3 },
    verdicts: { positive: "TRADE IN", negative: "KEEP", neutral: "BORDERLINE" },
    reasons,
    realLife: [
      v.tradeValue > 0
        ? `The current trade-in estimate works out to about ${currency(v.tradeValue / Math.max(v.holdMonths, 1))} of value potentially at risk each month you keep it.`
        : "Because the current trade-in estimate is already minimal, there is less financial urgency to act right now.",
      v.performance === "rough" || v.battery === "poor"
        ? "In real life, the phone is already costly in daily friction, so preserving some trade-in value matters more."
        : "In real life, the phone still sounds usable enough that you can continue extracting value if the rough edges are manageable.",
      v.holdMonths <= 6
        ? "A short remaining hold window makes acting now easier to justify because you are not giving up much extra use."
        : "A longer planned hold window gives you more time to squeeze value out of the phone if it is still stable enough.",
      v.features === "high"
        ? "Because new features matter to you, trading in now buys more than money alone."
        : "Because features are not a major pull, this decision is mainly about preserving value versus using what you already own."
    ],
    summaryByVerdict: {
      "TRADE IN": "Trading in looks stronger because the phone's remaining everyday value is falling while the current trade-in value is still worth preserving.",
      KEEP: "Keeping the phone looks stronger because it still has enough everyday value that trading it in now would likely be giving up useful life too early.",
      BORDERLINE: "This is a close call: the phone still has usable life left, but the current trade-in value is strong enough that acting now can still be defended."
    },
    explanationByVerdict: {
      "TRADE IN": "The strongest trade-in cases usually combine age, battery or performance decline, and enough current value that waiting feels more expensive than it first appears. Those are the signals doing the most work here.",
      KEEP: "The strongest keep cases usually combine a relatively stable phone, weaker trade-in value, and low pressure to upgrade. That means the everyday value of keeping it still outweighs the money you would lock in now.",
      BORDERLINE: "Your inputs split the decision. Some signals support locking in value now, while others support squeezing more life out of the device. This is the kind of case where convenience and tolerance for rough edges can reasonably decide it."
    }
  });

  result.note = note;
  result.valueWindow = currency(v.tradeValue / Math.max(v.holdMonths, 1));
  result.holdWindow = `${v.holdMonths} months`;
  result.practicalLean = getPracticalLean(result.verdict);

  if (includeExamples) {
    const scenarios = [
      {
        title: "If trade-in value is still strong",
        input: { ...v, tradeValue: Math.max(v.tradeValue, 350), holdMonths: Math.min(v.holdMonths, 6) }
      },
      {
        title: "If the phone stays mostly stable",
        input: { ...v, performance: "fast", battery: "good", holdMonths: Math.max(v.holdMonths, 18) }
      },
      {
        title: "If battery and performance get worse",
        input: { ...v, performance: "rough", battery: "poor", age: Math.max(v.age, 4) }
      }
    ];

    result.examples = scenarios.map((scenario) => {
      const scenarioResult = evaluateScenario(scenario.input, { includeExamples: false });
      return {
        title: scenario.title,
        meta: [
          `${scenario.input.age} years`,
          currency(scenario.input.tradeValue),
          `${scenario.input.holdMonths} more months`
        ],
        verdict: scenarioResult.verdict,
        description: scenarioResult.summary
      };
    });
  } else {
    result.examples = [];
  }

  return result;
}

function decide(v) {
  return evaluateScenario(v, { includeExamples: true });
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
  confidenceEl.textContent = result.confidenceText;
  confidenceEl.className = "confidence-pill";
  summaryEl.textContent = result.summary;
  reasonsEl.innerHTML = result.reasons.map((reason) => `<li>${reason}</li>`).join("");
  realLifeEl.innerHTML = result.realLife.map((item) => `<li>${item}</li>`).join("");
  explainerEl.innerHTML = `<p>${result.explanation}</p>`;
  noteEl.hidden = !result.note;
  noteEl.innerHTML = result.note ? `<strong>${result.note}</strong>` : "";
  valueWindowEl.textContent = result.valueWindow;
  holdWindowEl.textContent = result.holdWindow;
  practicalLeanEl.textContent = result.practicalLean;
  renderExampleScenarios(generatedExamplesEl, result.examples);

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
        confidence: result.confidenceScore
      });
    }
  });
});

initializeExamplesToggle(examplesToggle, extraExamples);
