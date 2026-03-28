const TOOL_NAME = "new_or_used_car";

const form = document.querySelector("#new-used-form");
const button = document.querySelector("#new-used-submit");
const message = document.querySelector("#new-used-message");
const results = document.querySelector("#new-used-results");
const thinking = document.querySelector("#new-used-thinking");
const thinkingText = document.querySelector("#new-used-thinking-text");
const card = document.querySelector("#new-used-card");
const verdictEl = document.querySelector("#new-used-verdict");
const confidenceEl = document.querySelector("#new-used-confidence");
const summaryEl = document.querySelector("#new-used-summary");
const reasonsEl = document.querySelector("#new-used-reasons");
const explainerEl = document.querySelector("#new-used-explainer");
const noteEl = document.querySelector("#new-used-note");
const budgetPressureEl = document.querySelector("#new-used-budget-pressure");
const certaintyNeedEl = document.querySelector("#new-used-certainty-need");
const practicalLeanEl = document.querySelector("#new-used-practical-lean");
const realLifeEl = document.querySelector("#new-used-real-life");
const generatedExamplesEl = document.querySelector("#new-used-generated-examples");
const examplesToggle = document.querySelector("#examples-toggle");
const extraExamples = Array.from(document.querySelectorAll(".extra-example"));

const timers = [];
const steps = [
  "Checking budget pressure...",
  "Reviewing warranty value...",
  "Comparing new-car certainty vs used-car value...",
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

function values() {
  const data = new FormData(form);
  return {
    years: Number(data.get("years")),
    mileage: Number(data.get("mileage")),
    budget: data.get("budget"),
    warranty: data.get("warranty"),
    features: data.get("features"),
    risk: data.get("risk"),
    inspection: data.get("inspection")
  };
}

function validate(v) {
  if (!Number.isFinite(v.years) || v.years <= 0) return "Enter a valid ownership timeline in years.";
  if (!Number.isFinite(v.mileage) || v.mileage <= 0) return "Enter a valid annual mileage estimate.";
  if (v.mileage > 60000) return "That mileage looks unusually high. Check the number and try again.";
  return "";
}

function getBudgetPressure(v, verdict) {
  if (verdict === "USED" && v.budget === "high") return "High used-car pull";
  if (verdict === "NEW" && v.budget === "low") return "Budget allows new";
  return "Moderate";
}

function getCertaintyNeed(v, verdict) {
  if (verdict === "NEW" && (v.warranty === "high" || v.risk === "low")) return "New-car certainty matters";
  if (verdict === "USED" && v.inspection === "yes") return "Used risk is manageable";
  return "Mixed";
}

function getPracticalLean(verdict) {
  if (verdict === "NEW") return "Warranty and predictability";
  if (verdict === "USED") return "Value and lower upfront spend";
  return "Comfort with risk decides";
}

function evaluateScenario(v, options) {
  const includeExamples = !options || options.includeExamples !== false;
  let score = 0;
  const reasons = [];
  let note = "";

  if (v.budget === "high") {
    score -= 4;
    reasons.push("Keeping the upfront price lower matters a lot to you, which is one of the clearest reasons to lean used.");
  } else if (v.budget === "medium") {
    score -= 2;
    reasons.push("Upfront price pressure adds real weight toward a used car.");
  } else {
    score += 1;
    reasons.push("If price pressure is lighter, a new car becomes easier to justify.");
  }

  if (v.warranty === "high") {
    score += 4;
    reasons.push("Strong warranty and reliability certainty is one of the biggest reasons to choose new.");
  } else if (v.warranty === "medium") {
    score += 2;
    reasons.push("Warranty and peace of mind matter enough to add some pull toward new.");
  } else {
    score -= 1;
    reasons.push("If warranty certainty is not a major priority, used becomes easier to defend.");
  }

  if (v.features === "high") {
    score += 3;
    reasons.push("A strong desire for the latest tech and features nudges the decision toward new.");
  } else if (v.features === "medium") {
    score += 1;
    reasons.push("Some interest in newer features adds light support for buying new.");
  }

  if (v.risk === "high") {
    score -= 3;
    reasons.push("Comfort with maintenance and used-car history risk makes used much easier to justify.");
  } else if (v.risk === "medium") {
    score -= 1;
    reasons.push("Moderate comfort with used-car risk adds a little support for used.");
  } else {
    score += 3;
    reasons.push("Low tolerance for used-car risk makes new the cleaner fit.");
  }

  if (v.years <= 3) {
    score -= 3;
    reasons.push("A shorter ownership timeline often supports used because paying a new-car premium is harder to justify.");
  } else if (v.years <= 5) {
    score -= 1;
    reasons.push("A mid-length ownership plan still leaves room for used-car value to matter.");
  } else if (v.years <= 7) {
    score += 1;
    reasons.push("A longer ownership plan starts to strengthen the case for new.");
  } else {
    score += 3;
    reasons.push("A very long ownership timeline makes new more attractive because certainty can pay off for longer.");
  }

  if (v.mileage >= 18000) {
    score += 3;
    reasons.push("High annual mileage strengthens the case for new because long-term certainty matters more.");
  } else if (v.mileage >= 13000) {
    score += 1;
    reasons.push("Moderately higher mileage adds some weight toward new.");
  } else if (v.mileage <= 9000) {
    score -= 1;
    reasons.push("Lower annual mileage makes used easier to justify because you may not need maximum long-term certainty.");
  }

  if (v.inspection === "yes") {
    score -= 2;
    reasons.push("Access to a trusted mechanic or inspection lowers some of the risk that usually pushes buyers toward new.");
  } else {
    score += 1;
    reasons.push("Without a trusted inspection path, new gains some extra safety value.");
  }

  if (v.budget === "high" && v.risk === "high" && v.warranty !== "high") {
    score -= 3;
    note = "Strong used fit: price pressure matters and you are comfortable managing the uncertainty that comes with a used car.";
  }

  if (v.warranty === "high" && v.risk === "low" && v.years >= 5) {
    score += 3;
    note = "Strong new fit: certainty and long-term ownership matter enough to justify paying for a cleaner starting point.";
  }

  if (v.mileage >= 18000 && v.years >= 6) {
    score += 2;
    reasons.push("Higher mileage plus a longer ownership plan strongly reinforces the case for new.");
  }

  let verdictOverride = "";
  if (v.budget === "high" && v.years <= 3 && v.risk !== "low") verdictOverride = "USED";
  if (v.warranty === "high" && v.risk === "low" && v.years >= 6) verdictOverride = "NEW";

  const result = runDecisionEngine({
    score,
    maxScore: 14,
    closeness: Math.min(Math.abs(score) / 14, 1),
    thresholds: { positive: 4, negative: -4 },
    verdicts: { positive: "NEW", negative: "USED", neutral: "BORDERLINE" },
    verdictOverride,
    reasons,
    realLife: [
      v.budget === "high"
        ? "In real life, paying less up front is doing a lot of work here, so used value matters more than a perfectly clean starting point."
        : "In real life, you have more room to pay for certainty if it genuinely reduces stress and future surprises.",
      v.warranty === "high" || v.risk === "low"
        ? "Because predictability matters to you, the extra money for new buys more than just smell and shiny paint."
        : "Because you can tolerate some uncertainty, the extra new-car premium has to work harder to justify itself.",
      v.inspection === "yes"
        ? "Having a trusted inspection path makes a used car much safer than it would be for a buyer going in blind."
        : "Without a trusted inspection or mechanic, used risk stays more expensive than it first looks.",
      v.years >= 6
        ? "A longer ownership plan gives reliability and warranty certainty more time to matter."
        : "A shorter ownership plan makes it harder to recover the extra price of buying new."
    ],
    summaryByVerdict: {
      NEW: "Buying new looks stronger because warranty certainty, long-term use, or low tolerance for used-car risk are doing more work than the upfront savings of used.",
      USED: "Buying used looks stronger because upfront value and your comfort with used-car risk matter more than paying a premium for certainty.",
      BORDERLINE: "This is a close call: the case for used-car value is real, but so is the appeal of warranty certainty and a cleaner starting point."
    },
    explanationByVerdict: {
      NEW: "The strongest new-car cases usually combine longer ownership, heavier use, stronger warranty needs, or low tolerance for surprise issues. Those are the signals doing the most work in your answers.",
      USED: "The strongest used-car cases usually combine stronger price pressure, shorter ownership, and enough comfort with inspection and maintenance risk to make the savings worth it. That is the pattern your answers are moving toward.",
      BORDERLINE: "Your inputs split the decision. Some signals support used for value, while others support new for certainty. This is the kind of car-buying decision where personal comfort with risk can reasonably break the tie."
    }
  });

  result.note = note;
  result.budgetPressure = getBudgetPressure(v, result.verdict);
  result.certaintyNeed = getCertaintyNeed(v, result.verdict);
  result.practicalLean = getPracticalLean(result.verdict);

  if (includeExamples) {
    const scenarios = [
      {
        title: "Shorter ownership, tighter budget",
        input: { ...v, years: Math.min(v.years, 3), budget: "high", risk: "medium" }
      },
      {
        title: "Long ownership, low surprise tolerance",
        input: { ...v, years: Math.max(v.years, 7), warranty: "high", risk: "low" }
      },
      {
        title: "Used car with trusted inspection path",
        input: { ...v, inspection: "yes", budget: "medium", risk: "high" }
      }
    ];

    result.examples = scenarios.map((scenario) => {
      const scenarioResult = evaluateScenario(scenario.input, { includeExamples: false });
      return {
        title: scenario.title,
        meta: [
          `${scenario.input.years} years`,
          `${scenario.input.mileage.toLocaleString()} miles/year`,
          scenario.input.inspection === "yes" ? "Inspection available" : "No inspection backup"
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
    result.verdict === "USED"
      ? "verdict-repair"
      : result.verdict === "NEW"
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
  budgetPressureEl.textContent = result.budgetPressure;
  certaintyNeedEl.textContent = result.certaintyNeed;
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
    totalDuration: 1600,
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
