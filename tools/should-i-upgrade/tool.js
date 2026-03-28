const TOOL_NAME = "should_i_upgrade";

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
const frictionLevelEl = document.querySelector("#upgrade-friction-level");
const timingWindowEl = document.querySelector("#upgrade-timing-window");
const practicalLeanEl = document.querySelector("#upgrade-practical-lean");
const realLifeEl = document.querySelector("#upgrade-real-life");
const generatedExamplesEl = document.querySelector("#upgrade-generated-examples");
const examplesToggle = document.querySelector("#examples-toggle");
const extraExamples = Array.from(document.querySelectorAll(".extra-example"));

const timers = [];
const steps = [
  "Checking performance signals...",
  "Reviewing upgrade cycles...",
  "Evaluating real-world usage..."
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

function getDailyFrictionLevel(v, score) {
  if (v.performance === "very-slow" || v.battery === "poor" || Math.abs(score) >= 5) return "High";
  if (v.performance === "fast" && v.battery === "good" && score <= -2) return "Low";
  return "Moderate";
}

function getTimingWindow(verdict, v) {
  if (verdict === "UPGRADE") return "Soon";
  if (verdict === "KEEP" && v.age < 2) return "No rush";
  if (verdict === "KEEP") return "Review later";
  return "Watch for change";
}

function getPracticalLean(verdict) {
  if (verdict === "UPGRADE") return "Upgrade pressure";
  if (verdict === "KEEP") return "Keep current device";
  return "Balanced call";
}

function evaluateScenario(v, options) {
  const includeExamples = !options || options.includeExamples !== false;
  let score = 0;
  const reasons = [];

  if (v.performance === "very-slow") {
    score += 4;
    reasons.push("Very slow performance is a strong upgrade signal.");
  } else if (v.performance === "slowing") {
    score += 2;
    reasons.push("Performance is slipping enough to matter.");
  } else {
    score -= 2;
    reasons.push("Performance is still strong, which supports keeping it.");
  }

  if (v.battery === "poor") {
    score += 4;
    reasons.push("Poor battery or reliability makes the current device harder to live with.");
  } else if (v.battery === "degrading") {
    score += 1;
    reasons.push("Battery or reliability decline adds some upgrade pressure.");
  } else {
    reasons.push("Battery and reliability still look stable enough for everyday use.");
  }

  if (v.age < 2 && v.performance === "fast") {
    score -= 3;
    reasons.push("The device is still recent, so upgrading now is harder to justify.");
  }

  if (v.age > 4 && v.performance !== "fast") {
    score += 3;
    reasons.push("Age plus weaker performance points toward upgrading.");
  }

  if (v.features === "high") {
    score += v.age > 2 ? 2 : 1;
    reasons.push("New features matter to you, which nudges the decision toward upgrading.");
  } else if (v.features === "low") {
    reasons.push("Because new features are not a major pull, need matters more than novelty here.");
  }

  if (v.usage === "heavy" && v.performance !== "fast") {
    score += 1;
    reasons.push("Heavy use makes slowdowns feel more important in daily life.");
  } else if (v.usage === "light" && v.performance === "fast") {
    score -= 1;
  }

  let verdictOverride = "";
  if ((v.performance === "very-slow" || v.battery === "poor") && score >= 2) {
    verdictOverride = "UPGRADE";
  }
  if (v.age < 2 && v.performance === "fast" && v.battery === "good") {
    verdictOverride = "KEEP";
  }

  const normalizedGap = Math.min(Math.abs(score) / 7, 1);
  const result = runDecisionEngine({
    score,
    maxScore: 7,
    closeness: normalizedGap,
    thresholds: { positive: 4, negative: -2 },
    verdicts: { positive: "UPGRADE", negative: "KEEP", neutral: "BORDERLINE" },
    verdictOverride,
    reasons,
    realLife: [
      v.performance === "very-slow" || v.battery === "poor"
        ? "In real life, this device is already creating enough drag that waiting longer is likely to feel expensive in time and frustration."
        : "In real life, the current device still sounds usable enough that you do not need to replace it just because a newer option exists.",
      v.usage === "heavy"
        ? "Because you use it heavily, small performance issues compound faster than they would for a light-use device."
        : "Because your usage is not especially heavy, you can tolerate more imperfection before an upgrade becomes urgent.",
      v.features === "high"
        ? "Your interest in new features gives the upgrade more real-world value than it would have for a purely practical user."
        : "Since features are not a huge priority, the best decision is mostly about friction, reliability, and age.",
      v.age > 4
        ? "At this age, new issues are more likely to stack up, so a borderline result can shift quickly over the next year."
        : "At this age, you still have room to reassess later if the device remains basically stable."
    ],
    summaryByVerdict: {
      UPGRADE: "Upgrading is the stronger move because the current device is starting to hold you back.",
      KEEP: "Keeping the current device makes more sense because it still has solid everyday value.",
      BORDERLINE: "This is a close call: there is some upgrade pressure, but not enough to make the decision obvious."
    },
    explanationByVerdict: {
      UPGRADE: "Performance, battery health, age, or heavy usage are creating enough real-world friction that upgrading now is easy to justify.",
      KEEP: "The current device still performs well enough that upgrading now would likely be more about preference than need.",
      BORDERLINE: "The device is no longer perfect, but it is not clearly overdue either. The answer depends on how much the rough edges bother you."
    }
  });

  result.frictionLevel = getDailyFrictionLevel(v, score);
  result.timingWindow = getTimingWindow(result.verdict, v);
  result.practicalLean = getPracticalLean(result.verdict);

  if (includeExamples) {
    const scenarios = [
      {
        title: "If the device gets one year older",
        input: {
          ...v,
          age: Number((v.age + 1).toFixed(1)),
          performance: v.performance === "fast" ? "slowing" : v.performance
        }
      },
      {
        title: "If battery or reliability worsens",
        input: {
          ...v,
          battery: v.battery === "good" ? "degrading" : "poor"
        }
      },
      {
        title: "If you hold off and keep using it lightly",
        input: {
          ...v,
          usage: "light",
          features: "low"
        }
      }
    ];

    result.examples = scenarios.map((scenario) => {
      const scenarioResult = evaluateScenario(scenario.input, { includeExamples: false });
      return {
        title: scenario.title,
        meta: [
          `${scenario.input.age} years`,
          scenario.input.performance.replace("-", " "),
          scenario.input.battery.replace("-", " ")
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
      : result.verdict === "UPGRADE"
        ? "verdict-replace"
        : "verdict-borderline"
  );
  confidenceEl.textContent = result.confidenceText;
  confidenceEl.className = "confidence-pill";
  summaryEl.textContent = result.summary;
  reasonsEl.innerHTML = result.reasons.map((reason) => `<li>${reason}</li>`).join("");
  realLifeEl.innerHTML = result.realLife.map((item) => `<li>${item}</li>`).join("");
  frictionLevelEl.textContent = result.frictionLevel;
  timingWindowEl.textContent = result.timingWindow;
  practicalLeanEl.textContent = result.practicalLean;
  explainerEl.innerHTML = `<p>${result.explanation}</p>`;
  renderExampleScenarios(generatedExamplesEl, result.examples);

  revealResultCard(card, confidenceEl, timers);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  clearTimers(timers);

  const v = getValues();
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
