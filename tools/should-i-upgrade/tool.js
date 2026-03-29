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
const signalBreakdownEl = document.querySelector("#upgrade-signal-breakdown");
const actionPlanEl = document.querySelector("#upgrade-action-plan");
const decisionEdgesEl = document.querySelector("#upgrade-decision-edges");
const snapshotEl = document.querySelector("#upgrade-snapshot");
const copyLinkButton = document.querySelector("#upgrade-copy-link");
const copySummaryButton = document.querySelector("#upgrade-copy-summary");
const comparisonEl = document.querySelector("#upgrade-comparison");
const saveCompareButton = document.querySelector("#upgrade-save-compare");
const clearCompareButton = document.querySelector("#upgrade-clear-compare");

let latestValues = null;
let latestResult = null;
const examplesToggle = document.querySelector("#examples-toggle");
const extraExamples = Array.from(document.querySelectorAll(".extra-example"));

const timers = [];
const steps = [
  "Checking performance signals...",
  "Reviewing upgrade cycles...",
  "Evaluating real-world usage..."
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


function buildActionPlan(v, result) {
  if (result.verdict === "UPGRADE") {
    return [
      {
        title: "Do this next",
        tone: "primary",
        items: [
          "Set a replacement budget before you compare models.",
          "Back up the device and price the replacement while the pain points are fresh.",
          "Focus on fixing the exact issues causing friction instead of upgrading for specs alone."
        ]
      },
      {
        title: "Recheck if this changes",
        tone: "watch",
        items: [
          "Battery or reliability suddenly improves after a cheap fix.",
          "You stop using the device heavily enough for the slowdown to matter.",
          "A better-value upgrade window opens in the next few weeks."
        ]
      }
    ];
  }

  if (result.verdict === "KEEP") {
    return [
      {
        title: "Do this next",
        tone: "primary",
        items: [
          "Keep using it and avoid replacing it just because a newer model exists.",
          "Do one maintenance pass now: storage cleanup, updates, battery check, and a fresh backup.",
          `Review it again when it reaches about ${Number((v.age + 1).toFixed(1))} years old or the daily friction rises.`
        ]
      },
      {
        title: "Recheck if this changes",
        tone: "watch",
        items: [
          "Battery life drops from manageable to annoying.",
          "Performance moves from slowing to genuinely disruptive.",
          "New features become important for work or daily use rather than curiosity."
        ]
      }
    ];
  }

  return [
    {
      title: "Do this next",
      tone: "primary",
      items: [
        "Wait briefly rather than making a rushed upgrade call today.",
        "Decide which single issue would tip you: speed, battery, or reliability.",
        "Compare the cost of a small fix against the real replacement budget before acting."
      ]
    },
    {
      title: "Recheck if this changes",
      tone: "watch",
      items: [
        "One more everyday problem appears, like battery crashes or slow startup.",
        "You begin using the device more heavily than before.",
        "A good deal appears on a replacement that solves the main pain point."
      ]
    }
  ];
}


function buildDecisionEdges(v, result) {
  if (result.verdict === "UPGRADE") {
    return [
      {
        title: "What keeps this as an upgrade call",
        label: "Current verdict stays strong",
        tone: "keep",
        intro: "The current answer gets firmer when the daily friction stays real instead of temporary.",
        items: [
          v.performance === "very-slow" ? "Performance stays slow enough to interrupt normal tasks." : "The main slowdown still gets in the way of regular use.",
          v.battery === "poor" ? "Battery or reliability problems keep showing up in everyday use." : "Battery life remains annoying enough that you plan around it.",
          v.usage === "heavy" ? "Heavy use keeps magnifying every weak point in the device." : "You keep using the device often enough for the rough edges to matter."
        ]
      },
      {
        title: "What could flip it toward keeping",
        label: "Alternative outcome",
        tone: "flip",
        intro: "An upgrade verdict can soften quickly if the pain points turn out to be fixable rather than structural.",
        items: [
          "A cheap fix, reset, or battery replacement removes the main annoyance.",
          "You realise the pull is mostly novelty, not daily friction.",
          v.age < 4 ? "You can comfortably wait another 6 to 12 months without the device holding you back." : "You can delay replacement for a few months without the device becoming disruptive."
        ]
      }
    ];
  }

  if (result.verdict === "KEEP") {
    return [
      {
        title: "What keeps this as a keep call",
        label: "Current verdict stays strong",
        tone: "keep",
        intro: "Keeping stays sensible while the current device remains good enough in real life.",
        items: [
          "Performance stays acceptable for the way you actually use it.",
          v.battery === "good" ? "Battery life remains stable enough that you do not think about it much." : "Battery decline stays manageable rather than becoming disruptive.",
          "The desire for new features stays lower than the cost of replacing a still-usable device."
        ]
      },
      {
        title: "What could flip it toward upgrading",
        label: "Alternative outcome",
        tone: "flip",
        intro: "A keep verdict usually changes when friction goes from occasional to daily.",
        items: [
          "Performance drops another step and starts wasting time every day.",
          "Battery or reliability moves from acceptable to clearly annoying.",
          v.usage === "heavy" ? "Heavy use exposes more limits than the current device can handle comfortably." : "Your usage becomes heavier and the current device no longer keeps up."
        ]
      }
    ];
  }

  return [
    {
      title: "What would settle the call toward keeping",
      label: "Lower-pressure path",
      tone: "watch",
      intro: "Borderline cases lean toward keeping when the current device proves stable for a little longer.",
      items: [
        "A few more months pass without the same frustrations getting worse.",
        "Battery and reliability stay manageable rather than slipping further.",
        "New features feel nice to have, not necessary."
      ]
    },
    {
      title: "What would settle the call toward upgrading",
      label: "Higher-pressure path",
      tone: "flip",
      intro: "Close calls usually flip once one clear pain point stops feeling minor.",
      items: [
        "One issue becomes a daily blocker, like slow performance or battery crashes.",
        "You start depending on the device more heavily than before.",
        "A strong replacement deal appears and solves the main pain point cleanly."
      ]
    }
  ];
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
  result.signalBreakdown = [
    {
      label: "Performance",
      detail: v.performance === "very-slow" ? "Very slow right now" : v.performance === "slowing" ? "Noticeably slowing down" : "Still running fast",
      leanText: v.performance === "very-slow" ? "Pushes toward upgrading" : v.performance === "slowing" ? "Adds upgrade pressure" : "Pushes toward keeping",
      tone: result.verdict === "BORDERLINE" ? "mixed" : (v.performance === "fast" ? (result.verdict === "KEEP" ? "toward" : "away") : (result.verdict === "UPGRADE" ? "toward" : "away")),
      strength: v.performance === "very-slow" ? 94 : v.performance === "slowing" ? 68 : 30
    },
    {
      label: "Battery and reliability",
      detail: v.battery === "poor" ? "Poor battery or reliability" : v.battery === "degrading" ? "Battery or reliability is declining" : "Battery and reliability still feel solid",
      leanText: v.battery === "poor" ? "Pushes toward upgrading" : v.battery === "degrading" ? "Adds upgrade pressure" : "Pushes toward keeping",
      tone: result.verdict === "BORDERLINE" ? "mixed" : (v.battery === "good" ? (result.verdict === "KEEP" ? "toward" : "away") : (result.verdict === "UPGRADE" ? "toward" : "away")),
      strength: v.battery === "poor" ? 90 : v.battery === "degrading" ? 62 : 34
    },
    {
      label: "Device age",
      detail: `${v.age} years old`,
      leanText: v.age > 4 ? "Older device raises upgrade pressure" : v.age < 2 ? "Recent device supports keeping" : "Age is a moderate signal",
      tone: result.verdict === "BORDERLINE" ? "mixed" : (v.age < 2 ? (result.verdict === "KEEP" ? "toward" : "away") : v.age > 4 ? (result.verdict === "UPGRADE" ? "toward" : "away") : "mixed"),
      strength: v.age > 4 ? 80 : v.age < 2 ? 32 : 54
    },
    {
      label: "Usage and feature pull",
      detail: `${v.usage === "heavy" ? "Heavy" : v.usage === "moderate" ? "Moderate" : "Light"} use with ${v.features === "high" ? "high" : v.features === "medium" ? "medium" : "low"} feature interest`,
      leanText: v.usage === "heavy" || v.features === "high" ? "Makes upgrading easier to justify" : "Does not strongly force an upgrade",
      tone: result.verdict === "BORDERLINE" ? "mixed" : ((v.usage === "heavy" || v.features === "high") ? (result.verdict === "UPGRADE" ? "toward" : "away") : (result.verdict === "KEEP" ? "toward" : "away")),
      strength: (v.usage === "heavy" && v.features === "high") ? 78 : (v.usage === "heavy" || v.features === "high") ? 62 : 38
    }
  ];
  result.timingWindow = getTimingWindow(result.verdict, v);
  result.practicalLean = getPracticalLean(result.verdict);
  result.actionPlan = buildActionPlan(v, result);
  result.decisionEdges = buildDecisionEdges(v, result);

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
    device: String(v.device || ""),
    age: Number(v.age),
    performance: String(v.performance || ""),
    battery: String(v.battery || ""),
    features: String(v.features || ""),
    usage: String(v.usage || "")
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
        `Device: ${labelize(v.device)}`,
        `Age: ${v.age} years`,
        `Performance: ${labelize(v.performance)}`,
        `Battery or reliability: ${labelize(v.battery)}`,
        `Usage: ${labelize(v.usage)}`
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
    "WorthItCheck — Should I Upgrade",
    `Result: ${result.verdict} (${result.confidenceText})`,
    `Summary: ${result.summary}`,
    `Inputs: ${labelize(v.device)}, ${v.age} years old, performance ${humanize(v.performance)}, battery/reliability ${humanize(v.battery)}, feature importance ${humanize(v.features)}, usage ${humanize(v.usage)}.`,
    "Key reasons:",
    ...result.reasons.slice(0, 3).map((item) => `- ${item}`),
    "Next step:",
    ...nextMove.map((item) => `- ${item}`)
  ].join("\n");
}

function buildComparisonPayload(v, result) {
  return {
    verdict: result.verdict,
    confidenceText: result.confidenceText,
    confidenceScore: result.confidenceScore,
    summary: result.summary,
    snapshotSections: buildSnapshot(v, result),
    keyReasons: Array.isArray(result.reasons) ? result.reasons.slice(0, 3) : [],
    state: buildSharedState(v)
  };
}

function refreshComparison(v, result) {
  const currentPayload = buildComparisonPayload(v, result);
  const savedPayload = readStoredComparison(TOOL_NAME);
  renderComparisonPanel(comparisonEl, savedPayload, currentPayload, {
    emptyText: 'The compare view helps you see whether waiting or upgrading actually changes the practical call once you adjust timing and pain points.'
  });

  if (clearCompareButton) {
    clearCompareButton.disabled = !savedPayload;
  }
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
    totalDuration: 1500,
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
  renderSignalBreakdown(signalBreakdownEl, result.signalBreakdown);
  renderActionPlan(actionPlanEl, result.actionPlan);
  renderDecisionEdges(decisionEdgesEl, result.decisionEdges);
  renderDecisionSnapshot(snapshotEl, buildSnapshot(v, result));
  refreshComparison(v, result);
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
  runScenario(getValues());
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

if (saveCompareButton) {
  saveCompareButton.addEventListener("click", () => {
    if (!latestValues || !latestResult) return;
    const saved = saveStoredComparison(TOOL_NAME, buildComparisonPayload(latestValues, latestResult));
    saveCompareButton.textContent = saved ? "Saved baseline" : "Save failed";
    saveCompareButton.classList.toggle("is-success", Boolean(saved));
    saveCompareButton.classList.toggle("is-error", !saved);
    window.setTimeout(() => {
      saveCompareButton.textContent = "Save current as baseline";
      saveCompareButton.classList.remove("is-success", "is-error");
    }, 1800);
    if (saved) {
      refreshComparison(latestValues, latestResult);
    }
    trackEvent(TOOL_NAME, "tool_compare_save", { status: saved ? "success" : "error" });
  });
}

if (clearCompareButton) {
  clearCompareButton.addEventListener("click", () => {
    const cleared = clearStoredComparison(TOOL_NAME);
    clearCompareButton.textContent = cleared ? "Cleared" : "Clear failed";
    clearCompareButton.classList.toggle("is-success", Boolean(cleared));
    clearCompareButton.classList.toggle("is-error", !cleared);
    window.setTimeout(() => {
      clearCompareButton.textContent = "Clear saved baseline";
      clearCompareButton.classList.remove("is-success", "is-error");
      clearCompareButton.disabled = false;
    }, 1800);
    if (cleared && latestValues && latestResult) {
      refreshComparison(latestValues, latestResult);
    }
    trackEvent(TOOL_NAME, "tool_compare_clear", { status: cleared ? "success" : "error" });
  });
}

initializeExamplesToggle(examplesToggle, extraExamples);

const sharedState = readShareState();
if (sharedState) {
  const nextValues = buildSharedState(sharedState);
  applyFormValues(form, nextValues);
  if (!validate(nextValues)) {
    runScenario(nextValues, { kind: "shared-link" });
  }
}
