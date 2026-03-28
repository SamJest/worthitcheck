const TOOL_NAME = "rent_vs_buy";

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
const monthlyDifferenceEl = document.querySelector("#rent-buy-monthly-difference");
const breakEvenEl = document.querySelector("#rent-buy-break-even");
const practicalLeanEl = document.querySelector("#rent-buy-practical-lean");
const realLifeEl = document.querySelector("#rent-buy-real-life");
const generatedExamplesEl = document.querySelector("#rent-buy-generated-examples");
const examplesToggle = document.querySelector("#examples-toggle");
const extraExamples = Array.from(document.querySelectorAll(".extra-example"));

const timers = [];
const steps = [
  "Calculating long-term costs...",
  "Comparing rent vs ownership...",
  "Evaluating your timeline..."
];

const {
  clearTimers,
  initializeExamplesToggle,
  revealResultCard,
  renderExampleScenarios,
  runAnalysis,
  runDecisionEngine,
  setLoading,
  trackEvent
} = window.WorthItCheckTooling;

function gbp(value, options) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: options && options.precise ? 2 : 0
  }).format(value);
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

function getBreakEvenYears(v) {
  const monthlySaving = v.rent - v.ownership;
  if (monthlySaving <= 0) return null;
  return v.price / (monthlySaving * 12);
}

function buildPracticalLean(verdict) {
  if (verdict === "BUY") return "Ownership builds value";
  if (verdict === "RENT") return "Flexibility stays valuable";
  return "Choice stays close";
}

function evaluateScenario(v, options) {
  const includeExamples = !options || options.includeExamples !== false;
  const totalRent = v.rent * 12 * v.years;
  const totalOwnership = v.price + (v.ownership * 12 * v.years);
  const diff = totalRent - totalOwnership;
  const closeness = Math.abs(diff) / Math.max(totalRent, totalOwnership, 1);
  const breakEvenYears = getBreakEvenYears(v);
  const monthlyGap = Math.abs(v.rent - v.ownership);
  let score = 0;
  const reasons = [];

  if (v.years <= 2 && v.stability === "short") {
    score -= 4;
    reasons.push("A short timeline makes the upfront buy cost harder to justify.");
  }

  if (diff > 0) {
    score += diff / Math.max(totalRent, 1) > 0.12 ? 3 : 1;
    reasons.push(`Over ${v.years} years, owning costs ${gbp(totalOwnership)} versus ${gbp(totalRent)} renting.`);
  } else {
    score -= Math.abs(diff) / Math.max(totalOwnership, 1) > 0.12 ? 3 : 1;
    reasons.push(`Over ${v.years} years, renting costs ${gbp(totalRent)} versus ${gbp(totalOwnership)} owning.`);
  }

  if (v.stability === "long") {
    score += 1;
    reasons.push("Long-term stability makes buying easier to justify.");
  } else if (v.stability === "short") {
    score -= 1;
    reasons.push("Short-term plans favor flexibility, which supports renting.");
  }

  if (v.years < 3) {
    score -= 1;
  } else if (v.years >= 6) {
    score += 1;
    reasons.push("A longer horizon gives ownership more time to beat rent on total cost.");
  }

  const realLife = [
    `The cost gap works out to about ${gbp(monthlyGap)} per month between renting and owning before the purchase price is recovered.`,
    breakEvenYears
      ? `At this spread, buying starts to make sense after roughly ${breakEvenYears.toFixed(1)} years.`
      : "Owning does not currently recover the upfront price through monthly savings alone.",
    diff > 0
      ? `If your timeline holds, buying could save about ${gbp(diff)} across the full period.`
      : `If your timeline stays uncertain, renting avoids tying up ${gbp(v.price)} upfront for a weaker payoff.`,
    v.stability === "long"
      ? "Because your plans look stable, the practical downside of owning is lower than it would be in a short stay."
      : "Because your plans are less stable, flexibility carries real value beyond the headline totals."
  ];

  let verdictOverride = "";
  if (v.years <= 2 && v.stability === "short") {
    verdictOverride = "RENT";
  }

  const result = runDecisionEngine({
    score,
    maxScore: 7,
    closeness,
    thresholds: { positive: 2, negative: -2 },
    verdicts: { positive: "BUY", negative: "RENT", neutral: "BORDERLINE" },
    verdictOverride,
    reasons,
    realLife,
    summaryByVerdict: {
      BUY: `Over ${v.years} years, owning looks cheaper than renting.`,
      RENT: `Over ${v.years} years, renting looks safer or cheaper than buying.`,
      BORDERLINE: `Over ${v.years} years, renting and buying come out close enough that the decision is not one-sided.`
    },
    explanationByVerdict: {
      BUY: "Buying is stronger here because the longer timeline gives ownership cost enough room to beat renting, and the trade-off is easier to recover in real life.",
      RENT: "Renting is stronger here because the timeline is short, the upfront cost is hard to recover, or ownership stays more expensive once flexibility is included.",
      BORDERLINE: "The totals are close enough that flexibility, certainty, and personal preference matter alongside the numbers."
    },
    details: {
      totalRent,
      totalOwnership,
      monthlyGap,
      breakEvenYears
    }
  });

  result.practicalLean = buildPracticalLean(result.verdict);

  if (includeExamples) {
    const scenarios = [
      {
        title: "Shorter stay",
        input: {
          ...v,
          years: Math.max(1, Number((v.years - 1).toFixed(1))),
          stability: "short"
        }
      },
      {
        title: "Longer stable stay",
        input: {
          ...v,
          years: Number((v.years + 2).toFixed(1)),
          stability: "long"
        }
      },
      {
        title: "Higher ownership costs",
        input: {
          ...v,
          ownership: Math.round(v.ownership * 1.2)
        }
      }
    ];

    result.examples = scenarios.map((scenario) => {
      const scenarioResult = evaluateScenario(scenario.input, { includeExamples: false });
      return {
        title: scenario.title,
        meta: [
          `${scenario.input.years} year horizon`,
          scenario.input.stability === "long" ? "Long-term plan" : "Short-term plan",
          `${gbp(scenario.input.rent)}/mo rent`
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
    result.verdict === "BUY"
      ? "verdict-repair"
      : result.verdict === "RENT"
        ? "verdict-replace"
        : "verdict-borderline"
  );
  confidenceEl.textContent = result.confidenceText;
  confidenceEl.className = "confidence-pill";
  summaryEl.textContent = result.summary;
  rentTotalEl.textContent = gbp(result.details.totalRent);
  buyTotalEl.textContent = gbp(result.details.totalOwnership);
  monthlyDifferenceEl.textContent = gbp(result.details.monthlyGap);
  breakEvenEl.textContent = result.details.breakEvenYears
    ? `${result.details.breakEvenYears.toFixed(1)} years`
    : "Not reached";
  practicalLeanEl.textContent = result.practicalLean;
  reasonsEl.innerHTML = result.reasons.map((reason) => `<li>${reason}</li>`).join("");
  realLifeEl.innerHTML = result.realLife.map((item) => `<li>${item}</li>`).join("");
  explainerEl.innerHTML = `<p>${result.explanation}</p>`;
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
