const TOOL_NAME = "{{TOOL_NAME}}";

const form = document.querySelector("#{{ID_PREFIX}}-form");
const button = document.querySelector("#{{ID_PREFIX}}-submit");
const message = document.querySelector("#{{ID_PREFIX}}-message");
const results = document.querySelector("#{{ID_PREFIX}}-results");
const thinking = document.querySelector("#{{ID_PREFIX}}-thinking");
const thinkingText = document.querySelector("#{{ID_PREFIX}}-thinking-text");
const card = document.querySelector("#{{ID_PREFIX}}-card");
const verdictEl = document.querySelector("#{{ID_PREFIX}}-verdict");
const confidenceEl = document.querySelector("#{{ID_PREFIX}}-confidence");
const summaryEl = document.querySelector("#{{ID_PREFIX}}-summary");
const reasonsEl = document.querySelector("#{{ID_PREFIX}}-reasons");
const explainerEl = document.querySelector("#{{ID_PREFIX}}-explainer");
const practicalMetricOneEl = document.querySelector("#{{ID_PREFIX}}-practical-metric-1");
const practicalMetricTwoEl = document.querySelector("#{{ID_PREFIX}}-practical-metric-2");
const practicalMetricThreeEl = document.querySelector("#{{ID_PREFIX}}-practical-metric-3");
const realLifeEl = document.querySelector("#{{ID_PREFIX}}-real-life");
const generatedExamplesEl = document.querySelector("#{{ID_PREFIX}}-generated-examples");
const examplesToggle = document.querySelector("#examples-toggle");
const extraExamples = Array.from(document.querySelectorAll(".extra-example"));

const timers = [];
const steps = [
  "{{THINKING_STEP_1}}",
  "{{THINKING_STEP_2}}",
  "{{THINKING_STEP_3}}"
];

const {
  clearTimers,
  initializeExamplesToggle,
  renderExampleScenarios,
  revealResultCard,
  runDecisionEngine,
  runAnalysis,
  setLoading,
  trackEvent
} = window.WorthItCheckTooling;

function getValues() {
  const data = new FormData(form);

  return {
    // Map form values here.
  };
}

function validate(values) {
  // Return an error string when validation fails.
  return "";
}

function buildExamples(values) {
  // Return 2-3 lightweight scenarios:
  // [{ title, meta: [], verdict, description }]
  return [];
}

function decide(values, options) {
  const includeExamples = !options || options.includeExamples !== false;

  // Replace with page-specific scoring and practical signals.
  const score = 0;
  const closeness = 0;
  const reasons = [];
  const realLife = [];

  const result = runDecisionEngine({
    score,
    closeness,
    thresholds: {
      positive: 2,
      negative: -2
    },
    verdicts: {
      positive: "{{POSITIVE_VERDICT}}",
      negative: "{{NEGATIVE_VERDICT}}",
      neutral: "BORDERLINE"
    },
    reasons,
    realLife,
    summaryByVerdict: {
      "{{POSITIVE_VERDICT}}": "",
      "{{NEGATIVE_VERDICT}}": "",
      BORDERLINE: ""
    },
    explanationByVerdict: {
      "{{POSITIVE_VERDICT}}": "",
      "{{NEGATIVE_VERDICT}}": "",
      BORDERLINE: ""
    },
    details: {
      metricOne: "{{METRIC_VALUE_1}}",
      metricTwo: "{{METRIC_VALUE_2}}",
      metricThree: "{{METRIC_VALUE_3}}"
    }
  });

  result.examples = includeExamples ? buildExamples(values) : [];
  return result;
}

function render(result) {
  verdictEl.textContent = result.verdict;
  verdictEl.className = "verdict";
  verdictEl.classList.add(
    result.verdict === "BORDERLINE"
      ? "verdict-borderline"
      : result.verdict === "{{POSITIVE_VERDICT}}"
        ? "verdict-repair"
        : "verdict-replace"
  );

  confidenceEl.textContent = result.confidenceText;
  confidenceEl.className = "confidence-pill";
  summaryEl.textContent = result.summary;
  reasonsEl.innerHTML = result.reasons.map((reason) => `<li>${reason}</li>`).join("");
  practicalMetricOneEl.textContent = result.details.metricOne || "{{METRIC_VALUE_1}}";
  practicalMetricTwoEl.textContent = result.details.metricTwo || "{{METRIC_VALUE_2}}";
  practicalMetricThreeEl.textContent = result.details.metricThree || "{{METRIC_VALUE_3}}";
  realLifeEl.innerHTML = result.realLife.map((item) => `<li>${item}</li>`).join("");
  explainerEl.innerHTML = `<p>${result.explanation}</p>`;
  renderExampleScenarios(generatedExamplesEl, result.examples);

  revealResultCard(card, confidenceEl, timers);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  clearTimers(timers);

  const values = getValues();
  const error = validate(values);

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
      const result = decide(values, { includeExamples: true });
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
