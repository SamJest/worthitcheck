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
  revealResultCard,
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

function decide(values) {
  // Return: verdict, confidence, summary, reasons, explanation
  return {
    verdict: "BORDERLINE",
    confidence: "Low",
    summary: "",
    reasons: [],
    explanation: ""
  };
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

  confidenceEl.textContent = `${result.confidence} confidence`;
  confidenceEl.className = "confidence-pill";
  summaryEl.textContent = result.summary;
  reasonsEl.innerHTML = result.reasons.map((reason) => `<li>${reason}</li>`).join("");
  explainerEl.innerHTML = `<p>${result.explanation}</p>`;

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
      const result = decide(values);
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
