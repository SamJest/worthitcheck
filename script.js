const TOOL_CONTENT = {
  categories: {
    refrigerator: {
      label: "Refrigerator",
      lifespan: 13,
      cheapThreshold: 350,
      categoryNote: "Large appliances often justify repair when they still have years of service left."
    },
    washer: {
      label: "Washing machine",
      lifespan: 11,
      cheapThreshold: 320,
      categoryNote: "Laundry appliances become harder to justify repairing once age and wear stack together."
    },
    dryer: {
      label: "Dryer",
      lifespan: 13,
      cheapThreshold: 280,
      categoryNote: "Dryers can be good repair candidates when the fix is isolated and the unit is otherwise sound."
    },
    dishwasher: {
      label: "Dishwasher",
      lifespan: 10,
      cheapThreshold: 300,
      categoryNote: "Repair value drops quickly when dishwashers are older and already showing broader wear."
    },
    phone: {
      label: "Phone",
      lifespan: 4,
      cheapThreshold: 500,
      categoryNote: "Phones age quickly, so repair value depends heavily on how new the device still feels."
    },
    laptop: {
      label: "Laptop",
      lifespan: 6,
      cheapThreshold: 650,
      categoryNote: "Laptops often reward repair when the device is still current enough to stay useful."
    },
    television: {
      label: "Television",
      lifespan: 8,
      cheapThreshold: 450,
      categoryNote: "TV repairs become tougher to justify because replacement pricing is often competitive."
    },
    car: {
      label: "Car",
      lifespan: 14,
      cheapThreshold: 3500,
      categoryNote: "Cars tolerate larger repair bills, but age and overall condition still matter a lot."
    },
    bike: {
      label: "Bike / e-bike",
      lifespan: 8,
      cheapThreshold: 400,
      categoryNote: "Repairing mobility gear can make strong financial sense when the frame and core parts are solid."
    },
    furniture: {
      label: "Furniture",
      lifespan: 12,
      cheapThreshold: 450,
      categoryNote: "Furniture is more likely to justify repair when quality or sentimental value is meaningful."
    }
  },
  conditionMap: {
    excellent: { label: "Excellent", score: 16 },
    good: { label: "Good", score: 7 },
    fair: { label: "Fair", score: -6 },
    poor: { label: "Poor", score: -18 }
  },
  importanceMap: {
    low: "Low importance",
    medium: "Moderate importance",
    high: "High importance"
  },
  thinkingSteps: [
    "Analyzing repair vs replacement cost...",
    "Checking typical lifespan...",
    "Evaluating long-term value...",
    "Comparing likely outcomes...",
    "Finalizing recommendation..."
  ]
};

const appState = {
  analysisTimerIds: []
};

const form = document.querySelector("#decision-form");
const categorySelect = document.querySelector("#category");
const importanceInput = document.querySelector("#importance");
const importanceValue = document.querySelector("#importance-value");
const analyzeButton = document.querySelector("#analyze-button");
const formMessage = document.querySelector("#form-message");
const resultsSection = document.querySelector("#results");
const thinkingPanel = document.querySelector("#thinking-panel");
const thinkingText = document.querySelector("#thinking-text");
const resultCard = document.querySelector("#result-card");
const verdictElement = document.querySelector("#verdict");
const confidencePill = document.querySelector("#confidence-pill");
const summaryElement = document.querySelector("#summary");
const metricsRow = document.querySelector("#metrics-row");
const factorList = document.querySelector("#factor-list");
const fullReasoning = document.querySelector("#full-reasoning");
const examplesToggle = document.querySelector("#examples-toggle");
const extraExamples = Array.from(document.querySelectorAll(".extra-example"));

const EURO_REGIONS = new Set(["AT", "BE", "CY", "DE", "EE", "ES", "FI", "FR", "GR", "HR", "IT", "LT", "LU", "LV", "MT", "NL", "PT", "SI", "SK"]);

function getCurrencyConfig() {
  const locale = (navigator.languages && navigator.languages[0]) || navigator.language || "en-US";
  const regionMatch = String(locale).match(/-([A-Za-z]{2})\b/);
  const region = regionMatch ? regionMatch[1].toUpperCase() : "";

  if (region === "GB") return { locale: "en-GB", currency: "GBP", symbol: "£" };
  if (region === "US") return { locale: "en-US", currency: "USD", symbol: "$" };
  if (region === "CA") return { locale: "en-CA", currency: "CAD", symbol: "$" };
  if (region === "AU") return { locale: "en-AU", currency: "AUD", symbol: "$" };
  if (region === "NZ") return { locale: "en-NZ", currency: "NZD", symbol: "$" };
  if (region === "IE") return { locale: "en-IE", currency: "EUR", symbol: "€" };
  if (EURO_REGIONS.has(region)) return { locale: locale, currency: "EUR", symbol: "€" };

  return { locale: "en-US", currency: "USD", symbol: "$" };
}

function applyCurrencySymbols(root = document) {
  const config = getCurrencyConfig();
  root.querySelectorAll("[data-currency-symbol]").forEach((element) => {
    element.textContent = config.symbol;
  });
  return config;
}

function currency(value) {
  const config = getCurrencyConfig();
  return new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency: config.currency,
    maximumFractionDigits: 0
  }).format(value);
}

function percent(value) {
  return `${Math.round(value * 100)}%`;
}

function trackEvent(eventName, details = {}) {
  if (typeof window.gtag !== "function") return;

  window.gtag("event", eventName, {
    event_category: "tool_interaction",
    tool_name: "repair_or_replace",
    ...details
  });
}

function getAgeBand(ageRatio) {
  if (ageRatio < 0.35) return { label: "well within", score: 18 };
  if (ageRatio < 0.65) return { label: "comfortably within", score: 7 };
  if (ageRatio < 0.9) return { label: "approaching", score: -4 };
  if (ageRatio < 1.15) return { label: "near the end of", score: -16 };
  return { label: "beyond", score: -24 };
}

function getImportanceData(importance) {
  if (importance >= 8) return { label: TOOL_CONTENT.importanceMap.high, score: 12 };
  if (importance >= 5) return { label: TOOL_CONTENT.importanceMap.medium, score: 6 };
  return { label: TOOL_CONTENT.importanceMap.low, score: 0 };
}

function computeDecision(inputs) {
  const category = TOOL_CONTENT.categories[inputs.category];
  const condition = TOOL_CONTENT.conditionMap[inputs.condition];
  const costRatio = inputs.repairCost / inputs.replacementCost;
  const ageRatio = inputs.age / category.lifespan;
  const ageBand = getAgeBand(ageRatio);
  const importanceData = getImportanceData(inputs.importance);

  let score = 0;
  const reasons = [];
  const factors = [];
  const overrides = [];

  if (costRatio <= 0.2) score += 26;
  else if (costRatio <= 0.35) score += 14;
  else if (costRatio <= 0.5) score += 3;
  else if (costRatio <= 0.65) score -= 10;
  else score -= 24;

  score += ageBand.score;
  score += condition.score;
  score += importanceData.score;

  reasons.push(`Your repair cost is ${percent(costRatio)} of replacement cost, which ${costRatio <= 0.35 ? "keeps repair financially comfortable" : costRatio <= 0.55 ? "puts the decision under pressure" : "makes repair a much harder sell"}.`);
  reasons.push(`At ${inputs.age} years old, this ${category.label.toLowerCase()} is ${ageBand.label} its typical ${category.lifespan}-year lifespan.`);
  reasons.push(`Its current condition is ${condition.label.toLowerCase()}, which ${condition.score >= 0 ? "supports getting more life out of it" : "raises the odds that this is not the last issue"}.`);

  if (importanceData.score > 0) {
    reasons.push(`${importanceData.label} adds real weight toward repair, especially if avoiding waste or keeping this specific item matters to you.`);
  } else {
    reasons.push("There is little extra weighting pushing the decision away from the raw practical case.");
  }

  if (inputs.replacementCost <= category.cheapThreshold) {
    score -= 14;
    overrides.push("Low replacement price makes swapping it out easier to justify.");
  }

  if (ageRatio <= 0.2) {
    score += 14;
    overrides.push("This item is still very new for its category, which strongly supports repair.");
  }

  if (ageRatio >= 1.1) {
    score -= 14;
    overrides.push("It is already beyond its typical lifespan, which pushes the decision toward replacement.");
  }

  if (inputs.condition === "poor") {
    score -= 10;
    overrides.push("Poor overall condition suggests a repair may only solve part of the problem.");
  }

  if (importanceData.score >= 12 && costRatio < 0.58) {
    score += 8;
    overrides.push("High sentimental or environmental importance strengthens the case for one more repair cycle.");
  }

  if (costRatio >= 0.85) {
    score -= 20;
    overrides.push("The repair is so close to replacement cost that replacement becomes the safer long-term move.");
  }

  reasons.push(...overrides);

  let verdict = "Repair";
  if (score <= -18) verdict = "Replace";
  else if (score < 12) verdict = "Borderline";

  if (verdict === "Borderline" && importanceData.score >= 12 && costRatio <= 0.5 && inputs.condition !== "poor") {
    verdict = "Repair";
    reasons.push("This is close, but the personal value and still-manageable repair cost tilt it back toward repair.");
  }

  if (verdict === "Repair" && inputs.condition === "poor" && ageRatio > 0.95 && costRatio > 0.55) {
    verdict = "Replace";
    reasons.push("Even though a repair is still possible, the combination of age, cost, and poor condition makes replacement the stronger bet.");
  }

  const strength = Math.abs(score);
  let confidence = "Low";
  if (strength >= 34) confidence = "High";
  else if (strength >= 18) confidence = "Medium";

  const summaryMap = {
    Repair: costRatio <= 0.35
      ? `Repair is the stronger call because ${percent(costRatio)} is still a manageable share of replacement cost and this ${category.label.toLowerCase()} likely has more useful life to give.`
      : `Repair still comes out ahead because the remaining life and personal weighting make one more repair cycle feel worthwhile.`,
    Replace: ageRatio >= 0.9
      ? `Replacement is the stronger long-term choice because you would be spending ${percent(costRatio)} of replacement cost on an item already near the end of its expected run.`
      : `Replacement is the stronger move because the repair bill is too large relative to the value this ${category.label.toLowerCase()} is likely to return.`,
    Borderline: `This is a close call: ${percent(costRatio)} is not an easy repair bill to ignore, but the item still has enough going for it that either path can be defended.`
  };

  factors.push({
    title: "Repair cost ratio",
    detail: `${percent(costRatio)} of replacement cost`,
    emphasis: costRatio <= 0.35 ? "Repair-friendly" : costRatio <= 0.55 ? "Neutral pressure" : "Replace-leaning"
  });
  factors.push({
    title: "Lifespan position",
    detail: `${inputs.age} of ${category.lifespan} years`,
    emphasis: ageRatio < 0.65 ? "Room left" : ageRatio < 0.95 ? "Late-stage" : "End-of-life pressure"
  });
  factors.push({
    title: "Current condition",
    detail: condition.label,
    emphasis: condition.score >= 0 ? "Stable signal" : "Risk signal"
  });
  factors.push({
    title: "Personal weighting",
    detail: `${inputs.importance}/10 importance`,
    emphasis: importanceData.score >= 12 ? "Strong repair pull" : importanceData.score >= 6 ? "Light repair pull" : "Mostly neutral"
  });

  return {
    verdict,
    confidence,
    summary: summaryMap[verdict],
    detailedReasoning: reasons,
    factors,
    metrics: [
      {
        label: "Repair cost",
        value: currency(inputs.repairCost),
        note: `${percent(costRatio)} of replacement`
      },
      {
        label: "Expected lifespan",
        value: `${category.lifespan} years`,
        note: `${inputs.age} years old now`
      },
      {
        label: "Condition outlook",
        value: condition.label,
        note: category.categoryNote
      }
    ]
  };
}

function validateInputs(formData) {
  const category = formData.get("category");
  const age = Number(formData.get("age"));
  const repairCost = Number(formData.get("repairCost"));
  const replacementCost = Number(formData.get("replacementCost"));
  const condition = formData.get("condition");
  const importance = Number(formData.get("importance"));

  if (!category || !TOOL_CONTENT.categories[category]) return { error: "Choose an item category to get a realistic recommendation." };
  if (!Number.isFinite(age) || age < 0) return { error: "Enter a valid age in years." };
  if (!Number.isFinite(repairCost) || repairCost <= 0) return { error: "Enter a valid repair cost." };
  if (!Number.isFinite(replacementCost) || replacementCost <= 0) return { error: "Enter a valid replacement cost." };
  if (repairCost > replacementCost * 4) return { error: "That repair cost looks unusually high. Check the numbers and try again." };
  if (!TOOL_CONTENT.conditionMap[condition]) return { error: "Choose the current condition so the decision can weigh risk properly." };
  if (!Number.isFinite(importance) || importance < 0 || importance > 10) return { error: "Set importance between 0 and 10." };

  return {
    data: { category, age, repairCost, replacementCost, condition, importance }
  };
}

function clearTimers() {
  appState.analysisTimerIds.forEach((id) => window.clearTimeout(id));
  appState.analysisTimerIds = [];
}

function setLoadingState(isLoading) {
  analyzeButton.disabled = isLoading;
  analyzeButton.classList.toggle("is-loading", isLoading);
  analyzeButton.querySelector(".button-label").textContent = isLoading ? "Analyzing..." : "Analyze";
}

function renderResult(result) {
  verdictElement.textContent = result.verdict;
  verdictElement.className = "verdict";
  verdictElement.classList.add(
    result.verdict === "Repair"
      ? "verdict-repair"
      : result.verdict === "Replace"
        ? "verdict-replace"
        : "verdict-borderline"
  );

  confidencePill.textContent = `${result.confidence} confidence`;
  confidencePill.className = "confidence-pill";
  summaryElement.textContent = result.summary;

  metricsRow.innerHTML = result.metrics.map((metric) => `
    <article class="metric">
      <strong>${metric.value}</strong>
      <span>${metric.label}</span>
      <p>${metric.note}</p>
    </article>
  `).join("");

  factorList.innerHTML = result.factors.map((factor) => `
    <article class="factor-item">
      <strong>${factor.title}</strong>
      <span class="text-emphasis">${factor.detail}</span>
      <p>${factor.emphasis}</p>
    </article>
  `).join("");

  fullReasoning.innerHTML = result.detailedReasoning
    .map((line) => `<p>${line}</p>`)
    .join("");

  resultCard.hidden = false;
  resultCard.classList.remove("is-visible");
  confidencePill.classList.remove("is-visible");

  requestAnimationFrame(() => {
    resultCard.classList.add("is-visible");
  });

  const confidenceTimer = window.setTimeout(() => {
    confidencePill.classList.add("is-visible");
  }, 240);
  appState.analysisTimerIds.push(confidenceTimer);
}

function runAnalysis(inputs) {
  clearTimers();
  resultsSection.hidden = false;
  thinkingPanel.hidden = false;
  resultCard.hidden = true;
  formMessage.textContent = "";
  resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });

  const duration = 1500 + Math.round(Math.random() * 500);
  const steps = TOOL_CONTENT.thinkingSteps;
  const stepDelay = Math.max(220, Math.floor(duration / steps.length));

  steps.forEach((message, index) => {
    const timer = window.setTimeout(() => {
      thinkingText.textContent = message;
    }, stepDelay * index);
    appState.analysisTimerIds.push(timer);
  });

  const finalTimer = window.setTimeout(() => {
    const result = computeDecision(inputs);
    thinkingPanel.hidden = true;
    renderResult(result);
    setLoadingState(false);
    trackEvent("tool_result", {
      verdict: result.verdict,
      confidence: result.confidence
    });
  }, duration);

  appState.analysisTimerIds.push(finalTimer);
}

function populateCategories() {
  Object.entries(TOOL_CONTENT.categories).forEach(([value, category]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = category.label;
    categorySelect.append(option);
  });
}

function initializeExamplesToggle() {
  if (!examplesToggle || extraExamples.length === 0) return;

  examplesToggle.hidden = false;

  extraExamples.forEach((example) => {
    example.classList.add("is-hidden");
  });

  examplesToggle.addEventListener("click", () => {
    const isExpanded = examplesToggle.getAttribute("aria-expanded") === "true";

    extraExamples.forEach((example) => {
      example.classList.toggle("is-hidden", isExpanded);
    });

    examplesToggle.setAttribute("aria-expanded", String(!isExpanded));
    examplesToggle.textContent = isExpanded ? "Show more examples" : "Show fewer examples";
  });
}

importanceInput.addEventListener("input", () => {
  importanceValue.textContent = `${importanceInput.value}/10`;
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  clearTimers();
  setLoadingState(true);

  const validation = validateInputs(new FormData(form));

  if (validation.error) {
    formMessage.textContent = validation.error;
    setLoadingState(false);
    return;
  }

  trackEvent("tool_submit");
  runAnalysis(validation.data);
});

populateCategories();
initializeExamplesToggle();
applyCurrencySymbols();
