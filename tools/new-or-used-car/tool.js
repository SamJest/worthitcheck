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
const signalBreakdownEl = document.querySelector("#new-used-signal-breakdown");
const actionPlanEl = document.querySelector("#new-used-action-plan");
const decisionEdgesEl = document.querySelector("#new-used-decision-edges");
const snapshotEl = document.querySelector("#new-used-snapshot");
const copyLinkButton = document.querySelector("#new-used-copy-link");
const copySummaryButton = document.querySelector("#new-used-copy-summary");

let latestValues = null;
let latestResult = null;
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
  applyFormValues,
  bindCopyStateLinkButton,
  createShareUrl,
  bindCopySummaryButton,
  bindExampleReplay,
  clearTimers,
  initializeExamplesToggle,
  readShareState,
  renderDecisionSnapshot,
  renderExampleScenarios,
  renderActionPlan,
  renderDecisionEdges,
  renderSignalBreakdown,
  revealResultCard,
  runAnalysis,
  runDecisionEngine,
  setLoading,
  trackEvent,
  writeShareState
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


function buildActionPlan(v, result) {
  if (result.verdict === "NEW") {
    return [
      {
        title: "Do this next",
        tone: "primary",
        items: [
          "Compare total on-the-road price, warranty cover, and depreciation together.",
          "Keep extras and finance add-ons under control so the new-car premium stays justified.",
          "Shortlist models with strong reliability rather than paying only for badge or trim."
        ]
      },
      {
        title: "Recheck if this changes",
        tone: "watch",
        items: [
          "Your budget tightens more than expected.",
          "A lightly used option appears with most of the warranty still left.",
          "You become more comfortable accepting some uncertainty to save money."
        ]
      }
    ];
  }

  if (result.verdict === "USED") {
    return [
      {
        title: "Do this next",
        tone: "primary",
        items: [
          "Only shortlist cars with clean history and an independent inspection path.",
          "Keep a repair buffer aside so the cheaper purchase price stays a real saving.",
          "Compare several nearly identical used examples instead of falling for the first bargain."
        ]
      },
      {
        title: "Recheck if this changes",
        tone: "watch",
        items: [
          "Warranty and certainty start mattering much more than price.",
          "Used market pricing stops offering a meaningful discount versus new.",
          "Your risk tolerance drops after seeing weak history or condition on real cars."
        ]
      }
    ];
  }

  return [
    {
      title: "Do this next",
      tone: "primary",
      items: [
        "Compare one nearly-new option, one older used option, and one true new-car quote side by side.",
        "Decide whether budget pressure or peace of mind matters more before you shop longer.",
        "Use warranty length, mileage, and expected repair buffer as the tie-breakers."
      ]
    },
    {
      title: "Recheck if this changes",
      tone: "watch",
      items: [
        "Your budget range changes materially.",
        "You find a used example with unusually strong history and warranty cover.",
        "You realise you want long-term certainty more than upfront savings."
      ]
    }
  ];
}


function buildDecisionEdges(v, result) {
  if (result.verdict === "NEW") {
    return [
      {
        title: "What keeps this as a new-car call",
        label: "Current verdict stays strong",
        tone: "keep",
        intro: "New stays stronger when certainty and low hassle matter more than squeezing out maximum value.",
        items: [
          v.warranty === "high" ? "Warranty protection still matters a lot to you." : "Certainty and lower surprise risk stay important.",
          "Your budget can comfortably absorb the premium for a newer car.",
          "You still plan to keep the car long enough for the cleaner ownership experience to matter."
        ]
      },
      {
        title: "What could flip it toward used",
        label: "Alternative outcome",
        tone: "flip",
        intro: "The case for new weakens when value-for-money becomes more important than certainty.",
        items: [
          "A well-inspected used option appears with the features you actually need.",
          "Budget pressure increases and the premium for new starts to feel unnecessary.",
          "You become more comfortable with some risk in exchange for better value."
        ]
      }
    ];
  }

  if (result.verdict === "USED") {
    return [
      {
        title: "What keeps this as a used-car call",
        label: "Current verdict stays strong",
        tone: "keep",
        intro: "Used stays stronger when value and depreciation matter more than a perfect ownership experience.",
        items: [
          "Budget discipline remains one of the main priorities.",
          v.inspection === "high" ? "You can inspect carefully enough to reduce the worst used-car risks." : "You are still comfortable screening for a good used example.",
          "The extra cost of new still feels bigger than the extra peace of mind."
        ]
      },
      {
        title: "What could flip it toward new",
        label: "Alternative outcome",
        tone: "flip",
        intro: "A used verdict can change when the cost of uncertainty starts outweighing the savings.",
        items: [
          "You struggle to find a clean used option you genuinely trust.",
          "Warranty, reliability, or predictable ownership suddenly matters much more.",
          "The used-vs-new price gap narrows enough that buying new feels reasonable."
        ]
      }
    ];
  }

  return [
    {
      title: "What would settle the call toward used",
      label: "Value path",
      tone: "watch",
      intro: "Close calls lean toward used when you can find a trustworthy car without paying for unnecessary certainty.",
      items: [
        "A well-documented used car passes inspection cleanly.",
        "The savings versus new stay meaningfully large.",
        "You remain comfortable trading some certainty for better value."
      ]
    },
    {
      title: "What would settle the call toward new",
      label: "Certainty path",
      tone: "flip",
      intro: "Close calls lean toward new when hassle reduction becomes the priority.",
      items: [
        "You cannot find a used option that feels reliable enough.",
        "Warranty and lower-risk ownership become more important than before.",
        "The premium for new starts to look acceptable within your budget."
      ]
    }
  ];
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
  result.signalBreakdown = [
    {
      label: "Upfront budget pressure",
      detail: v.budget === "high" ? "Keeping upfront cost down matters a lot" : v.budget === "medium" ? "Some pressure to spend less up front" : "Budget leaves room for a newer car",
      leanText: v.budget === "low" ? "Makes new easier to justify" : "Pushes toward used value",
      tone: result.verdict === "BORDERLINE" ? "mixed" : (v.budget === "low" ? (result.verdict === "NEW" ? "toward" : "away") : (result.verdict === "USED" ? "toward" : "away")),
      strength: v.budget === "high" ? 88 : v.budget === "medium" ? 64 : 34
    },
    {
      label: "Warranty and certainty",
      detail: v.warranty === "high" ? "You want strong warranty cover and peace of mind" : v.warranty === "medium" ? "Some certainty matters" : "Warranty certainty is not a big priority",
      leanText: v.warranty === "high" ? "Pushes toward buying new" : v.warranty === "low" ? "Leaves more room for used" : "Adds some new-car pull",
      tone: result.verdict === "BORDERLINE" ? "mixed" : (v.warranty === "low" ? (result.verdict === "USED" ? "toward" : "away") : (result.verdict === "NEW" ? "toward" : "away")),
      strength: v.warranty === "high" ? 90 : v.warranty === "medium" ? 62 : 36
    },
    {
      label: "Risk and inspection backup",
      detail: `${v.risk} comfort with used-car risk${v.inspection === "yes" ? ", with an inspection path" : ", without inspection backup"}`,
      leanText: (v.risk === "high" || v.inspection === "yes") ? "Makes used more defensible" : "Pushes toward new-car certainty",
      tone: result.verdict === "BORDERLINE" ? "mixed" : ((v.risk === "high" || v.inspection === "yes") ? (result.verdict === "USED" ? "toward" : "away") : (result.verdict === "NEW" ? "toward" : "away")),
      strength: (v.risk === "high" || v.inspection === "yes") ? 78 : 82
    },
    {
      label: "Ownership horizon and mileage",
      detail: `${v.years} year plan with ${v.mileage.toLocaleString()} miles per year`,
      leanText: (v.years >= 6 || v.mileage >= 18000) ? "Longer, heavier use helps new make sense" : "Shorter or lighter use keeps used appealing",
      tone: result.verdict === "BORDERLINE" ? "mixed" : ((v.years >= 6 || v.mileage >= 18000) ? (result.verdict === "NEW" ? "toward" : "away") : (result.verdict === "USED" ? "toward" : "away")),
      strength: (v.years >= 6 || v.mileage >= 18000) ? 74 : 52
    }
  ];
  result.budgetPressure = getBudgetPressure(v, result.verdict);
  result.certaintyNeed = getCertaintyNeed(v, result.verdict);
  result.practicalLean = getPracticalLean(result.verdict);
  result.actionPlan = buildActionPlan(v, result);
  result.decisionEdges = buildDecisionEdges(v, result);

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
        input: scenario.input,
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


function buildSharedState(v) {
  return {
    years: Number(v.years),
    mileage: Number(v.mileage),
    budget: String(v.budget || ""),
    warranty: String(v.warranty || ""),
    features: String(v.features || ""),
    risk: String(v.risk || ""),
    inspection: String(v.inspection || "")
  };
}

function humanize(value) {
  return String(value || "").replace(/-/g, " ");
}

function labelize(value) {
  const text = humanize(value).trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

function buildSnapshot(v, result) {
  return [
    {
      label: "Recommendation",
      emphasis: `${result.verdict} · ${result.confidenceText}`,
      body: result.summary,
      tone: "highlight"
    },
    {
      label: "Inputs used",
      items: [
        `Ownership timeline: ${v.years} years`,
        `Annual mileage: ${v.mileage.toLocaleString()} miles`,
        `Budget flexibility: ${labelize(v.budget)}`,
        `Warranty importance: ${labelize(v.warranty)}`,
        `Risk tolerance: ${labelize(v.risk)}`
      ]
    },
    {
      label: "Biggest signals",
      items: result.reasons.slice(0, 3)
    }
  ];
}

function buildCopySummary(v, result) {
  const nextMove = result.actionPlan && result.actionPlan[0] && result.actionPlan[0].items
    ? result.actionPlan[0].items.slice(0, 2)
    : [];

  return [
    "WorthItCheck — New or Used Car",
    `Result: ${result.verdict} (${result.confidenceText})`,
    `Summary: ${result.summary}`,
    result.note ? `Note: ${result.note}` : "",
    `Inputs: ${v.years}-year timeline, ${v.mileage.toLocaleString()} miles/year, budget ${humanize(v.budget)}, warranty importance ${humanize(v.warranty)}, feature priority ${humanize(v.features)}, risk tolerance ${humanize(v.risk)}.`,
    "Key reasons:",
    ...result.reasons.slice(0, 3).map((item) => `- ${item}`),
    "Next step:",
    ...nextMove.map((item) => `- ${item}`)
  ].filter(Boolean).join("\n");
}

function runScenario(v, source) {
  clearTimers(timers);

  const error = validate(v);
  if (error) {
    message.textContent = error;
    return;
  }

  const isReplay = source && source.kind === "replay";
  const isSharedLink = source && source.kind === "shared-link";
  message.textContent = isSharedLink ? "Loaded a shared setup." : "";
  setLoading(button, true, {
    loadingText: isReplay ? "Testing scenario..." : isSharedLink ? "Loading shared result..." : "Analyzing..."
  });

  if (isReplay) {
    trackEvent(TOOL_NAME, "tool_scenario_replay", {
      scenario_index: source.index,
      scenario_title: source.title
    });
  } else if (isSharedLink) {
    trackEvent(TOOL_NAME, "tool_shared_result_loaded");
  } else {
    trackEvent(TOOL_NAME, "tool_submit");
  }

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
      render(result, v);
      setLoading(button, false);
      trackEvent(TOOL_NAME, "tool_result", {
        verdict: result.verdict,
        confidence: result.confidenceScore
      });
    }
  });
}

function render(result, v) {
  latestValues = v;
  latestResult = result;
  writeShareState(buildSharedState(v));
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
  renderSignalBreakdown(signalBreakdownEl, result.signalBreakdown);
  renderActionPlan(actionPlanEl, result.actionPlan);
  renderDecisionEdges(decisionEdgesEl, result.decisionEdges);
  renderDecisionSnapshot(snapshotEl, buildSnapshot(v, result));
  renderExampleScenarios(generatedExamplesEl, result.examples, {
    buttonText: "Try this setup"
  });
  bindExampleReplay(generatedExamplesEl, result.examples, (scenario, index) => {
    if (!scenario || !scenario.input) return;
    applyFormValues(form, scenario.input);
    runScenario(scenario.input, {
      kind: "replay",
      index,
      title: scenario.title || `Scenario ${index + 1}`
    });
  });

  revealResultCard(card, confidenceEl, timers);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  runScenario(values());
});

bindCopySummaryButton(copySummaryButton, () => {
  if (!latestValues || !latestResult) return "";
  return buildCopySummary(latestValues, latestResult);
}, {
  onStatusChange(status) {
    trackEvent(TOOL_NAME, "tool_copy_summary", { status });
  }
});

bindCopyStateLinkButton(copyLinkButton, () => {
  if (!latestValues) return "";
  return createShareUrl(buildSharedState(latestValues));
}, {
  onStatusChange(status) {
    trackEvent(TOOL_NAME, "tool_copy_exact_link", { status });
  }
});

initializeExamplesToggle(examplesToggle, extraExamples);

const sharedState = readShareState();
if (sharedState) {
  const nextValues = buildSharedState(sharedState);
  applyFormValues(form, nextValues);
  if (!validate(nextValues)) {
    runScenario(nextValues, { kind: "shared-link" });
  }
}
