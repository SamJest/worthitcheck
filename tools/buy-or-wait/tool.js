const TOOL_NAME = "buy_or_wait";

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
const actionWindowEl = document.querySelector("#bw-action-window");
const pressureLevelEl = document.querySelector("#bw-pressure-level");
const practicalLeanEl = document.querySelector("#bw-practical-lean");
const realLifeEl = document.querySelector("#bw-real-life");
const generatedExamplesEl = document.querySelector("#bw-generated-examples");
const examplesToggle = document.querySelector("#examples-toggle");
const extraExamples = Array.from(document.querySelectorAll(".extra-example"));

const timers = [];
const steps = [
  "Checking upgrade cycles...",
  "Scanning sale periods...",
  "Evaluating your situation...",
  "Comparing buy-now vs wait signals..."
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

function getPressureLevel(v, score) {
  if (v.urgency === "now" || v.condition === "major" || Math.abs(score) >= 5) return "High";
  if (v.condition === "working" && v.urgency !== "now" && score <= -2) return "Low";
  return "Moderate";
}

function getActionWindow(v, verdict) {
  if (verdict === "BUY") return "Act now";
  if (verdict === "WAIT" && v.event === "black-friday") return "Wait for Black Friday";
  if (verdict === "WAIT" && v.event === "release") return "Wait for release";
  if (verdict === "WAIT" && v.event === "seasonal") return "Wait for sale";
  if (verdict === "WAIT") return "Hold for now";
  return "Watch closely";
}

function getPracticalLean(verdict) {
  if (verdict === "BUY") return "Immediate replacement";
  if (verdict === "WAIT") return "Timing advantage";
  return "Balanced call";
}

function evaluateScenario(v, options) {
  const includeExamples = !options || options.includeExamples !== false;
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
    reasons.push("Minor issues add pressure, but they do not force an immediate decision.");
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

  if (v.features === "low" && v.condition === "working") {
    score -= 1;
  }

  let verdictOverride = "";
  if ((v.urgency === "now" || v.condition === "major") && score >= 2) {
    verdictOverride = "BUY";
  }
  if (v.event !== "none" && v.urgency !== "now" && v.condition === "working") {
    verdictOverride = "WAIT";
  }

  if (verdictOverride === "WAIT" && v.event === "black-friday") note = "Recommended: wait for Black Friday deals.";
  if (verdictOverride === "WAIT" && v.event === "release") note = "Recommended: wait for the next model release.";
  if (verdictOverride === "WAIT" && v.event === "seasonal") note = "Recommended: wait for the next seasonal sale window.";

  const closeness = 1 - Math.min(Math.abs(score) / 8, 1);
  const result = runDecisionEngine({
    score,
    maxScore: 8,
    closeness: 1 - closeness,
    thresholds: { positive: 4, negative: -3 },
    verdicts: { positive: "BUY", negative: "WAIT", neutral: "BORDERLINE" },
    verdictOverride,
    reasons,
    realLife: [
      verdictOverride === "BUY" || score >= 4
        ? "In real life, this means delaying is likely to create more hassle than savings."
        : "In real life, you still have enough breathing room for timing to matter.",
      v.event !== "none"
        ? "Because there is a visible sale or release window, waiting has a concrete upside instead of being wishful thinking."
        : "Because there is no obvious timing event ahead, waiting mainly buys optionality rather than a guaranteed deal.",
      ageState === "high"
        ? "The age of the current item increases the risk that waiting turns into paying for more inconvenience."
        : "The current item is not especially old, which lowers the penalty for waiting a bit longer.",
      v.features === "high"
        ? "Your interest in new features adds real value to upgrading sooner if the current item is already limiting you."
        : "Since new features are not a major priority, this decision is more about need and timing than excitement."
    ],
    summaryByVerdict: {
      BUY: "Buying now is the stronger move because waiting is unlikely to create enough upside for your current situation.",
      WAIT: "Waiting looks smarter because your current item still gives you enough room to benefit from better timing.",
      BORDERLINE: "This is close: there are real reasons to wait, but enough pressure to justify buying now if needed."
    },
    explanationByVerdict: {
      BUY: "The strongest signals here point toward acting now. Urgency, condition, and age are doing more work than any possible savings from waiting.",
      WAIT: "The current item still gives you some breathing room, so timing becomes valuable. A nearby sale or release window can improve value without much added downside.",
      BORDERLINE: "The signals are split. If convenience matters more, buying now is easy to justify. If value matters more and the item is still usable, waiting is reasonable."
    }
  });

  const verdict = result.verdict;
  if (!note && verdict === "WAIT" && v.event === "black-friday") note = "Recommended: wait for Black Friday deals.";
  if (!note && verdict === "WAIT" && v.event === "release") note = "Recommended: wait for the next model release.";
  if (!note && verdict === "WAIT" && v.event === "seasonal") note = "Recommended: wait for the next seasonal sale window.";

  result.note = note;
  result.actionWindow = getActionWindow(v, verdict);
  result.pressureLevel = getPressureLevel(v, score);
  result.practicalLean = getPracticalLean(verdict);

  if (includeExamples) {
    const scenarios = [
      {
        title: "If the current item gets worse",
        input: { ...v, condition: "major", urgency: "now" }
      },
      {
        title: "If a meaningful sale is close",
        input: { ...v, event: "black-friday", urgency: "soon" }
      },
      {
        title: "If you keep using it another year",
        input: { ...v, age: v.age + 1, urgency: "later" }
      }
    ];

    result.examples = scenarios.map((scenario) => {
      const scenarioResult = evaluateScenario(scenario.input, { includeExamples: false });
      return {
        title: scenario.title,
        meta: [
          scenario.input.category,
          `${scenario.input.age} years`,
          scenario.input.condition.replace("-", " ")
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
      ? "verdict-replace"
      : result.verdict === "WAIT"
        ? "verdict-repair"
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
  actionWindowEl.textContent = result.actionWindow;
  pressureLevelEl.textContent = result.pressureLevel;
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
