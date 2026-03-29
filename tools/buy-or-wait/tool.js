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
const signalBreakdownEl = document.querySelector("#bw-signal-breakdown");
const actionPlanEl = document.querySelector("#bw-action-plan");
const decisionEdgesEl = document.querySelector("#bw-decision-edges");
const snapshotEl = document.querySelector("#bw-snapshot");
const copyLinkButton = document.querySelector("#bw-copy-link");
const copySummaryButton = document.querySelector("#bw-copy-summary");

let latestValues = null;
let latestResult = null;
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
  applyFormValues,
  bindCopyStateLinkButton,
  createShareUrl,
  bindCopySummaryButton,
  bindExampleReplay,
  clearTimers,
  initializeExamplesToggle,
  readShareState,
  revealResultCard,
  renderDecisionSnapshot,
  renderExampleScenarios,
  renderActionPlan,
  renderDecisionEdges,
  renderSignalBreakdown,
  runAnalysis,
  runDecisionEngine,
  setLoading,
  trackEvent,
  writeShareState
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


function buildActionPlan(v, result) {
  if (result.verdict === "BUY") {
    return [
      {
        title: "Do this next",
        tone: "primary",
        items: [
          "Set a hard price ceiling and buy within the current shopping window.",
          "Compare only the top two options instead of continuing an open-ended search.",
          "Ignore vague promises of a future deal unless you already know the exact date and discount."
        ]
      },
      {
        title: "Recheck if this changes",
        tone: "watch",
        items: [
          "A confirmed sale or new-model release lands very soon.",
          "The current item keeps working acceptably after a small repair or reset.",
          "Your urgency drops from now to something you can comfortably postpone."
        ]
      }
    ];
  }

  if (result.verdict === "WAIT") {
    const timingLine = v.event === "none" ? "Wait only if you can name the exact future trigger for buying." : `Wait for the ${v.event.replace('-', ' ')} window instead of browsing early.`;
    return [
      {
        title: "Do this next",
        tone: "primary",
        items: [
          timingLine,
          "Set a target buy price or date now so waiting has a real finish line.",
          "Keep the current item going with only low-cost fixes while you wait."
        ]
      },
      {
        title: "Recheck if this changes",
        tone: "watch",
        items: [
          "Condition worsens from minor annoyance to major problem.",
          "Your need moves from later to now.",
          "The event you were waiting for passes without giving you a clear upside."
        ]
      }
    ];
  }

  return [
    {
      title: "Do this next",
      tone: "primary",
      items: [
        "Decide how much convenience is worth to you before you keep comparing prices.",
        "Set a short deadline so the decision does not drag on unnecessarily.",
        "Choose one trigger for buying now and one trigger for waiting longer."
      ]
    },
    {
      title: "Recheck if this changes",
      tone: "watch",
      items: [
        "A real sale or release window becomes certain.",
        "The current item gets worse or becomes urgent.",
        "Your feature pull becomes stronger than pure value hunting."
      ]
    }
  ];
}


function buildDecisionEdges(v, result) {
  if (result.verdict === "BUY") {
    return [
      {
        title: "What keeps this as a buy-now call",
        label: "Current verdict stays strong",
        tone: "keep",
        intro: "Buying now stays stronger when waiting adds delay without real upside.",
        items: [
          v.urgency === "high" ? "The need is still urgent enough that waiting creates real friction." : "Delaying still has a practical cost for you.",
          "There is no obvious sale or product drop that meaningfully improves the deal soon.",
          "The current item keeps feeling old enough or weak enough that holding off is mostly a hassle."
        ]
      },
      {
        title: "What could flip it toward waiting",
        label: "Alternative outcome",
        tone: "flip",
        intro: "A buy-now verdict softens if a short delay is likely to create a noticeably better outcome.",
        items: [
          "A credible sale window or release cycle is close enough to matter.",
          "Your current item turns out to be usable for a bit longer than expected.",
          "The new features you want are tied to the next model rather than the current one."
        ]
      }
    ];
  }

  if (result.verdict === "WAIT") {
    return [
      {
        title: "What keeps this as a wait call",
        label: "Current verdict stays strong",
        tone: "keep",
        intro: "Waiting stays smart when the likely benefit of patience is larger than the short-term inconvenience.",
        items: [
          "Your current item is still usable enough for now.",
          v.event !== "none" ? "There is still a real upcoming event that could improve price or choice." : "There is still a decent chance a better buying window appears soon.",
          "The purchase is more discretionary than urgent."
        ]
      },
      {
        title: "What could flip it toward buying now",
        label: "Alternative outcome",
        tone: "flip",
        intro: "A wait verdict usually changes when the current item stops being good enough to bridge the gap.",
        items: [
          "The current item becomes unreliable or fails outright.",
          "The expected discount or new release benefit starts to look minor.",
          "Urgency rises enough that the delay now costs more than the expected savings."
        ]
      }
    ];
  }

  return [
    {
      title: "What would settle the call toward waiting",
      label: "Patience path",
      tone: "watch",
      intro: "Close calls lean toward waiting when near-term timing improves the deal.",
      items: [
        "A sale, release, or seasonal drop is close and credible.",
        "Your current item can comfortably bridge the gap.",
        "The purchase is nice to have rather than urgent."
      ]
    },
    {
      title: "What would settle the call toward buying now",
      label: "Immediate path",
      tone: "flip",
      intro: "Close calls lean toward buying now once the real-life cost of waiting becomes obvious.",
      items: [
        "The current item starts blocking daily life or work.",
        "The likely future discount looks smaller than the inconvenience of waiting.",
        "A strong current deal appears and removes the need to time the market."
      ]
    }
  ];
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
  result.signalBreakdown = [
    {
      label: "Urgency",
      detail: v.urgency === "now" ? "You need a solution now" : v.urgency === "soon" ? "You can wait a little" : "You can comfortably hold off",
      leanText: v.urgency === "now" ? "Pushes toward buying now" : "Supports waiting if the rest of the case is strong",
      tone: result.verdict === "BORDERLINE" ? "mixed" : (v.urgency === "now" ? (result.verdict === "BUY" ? "toward" : "away") : (result.verdict === "WAIT" ? "toward" : "away")),
      strength: v.urgency === "now" ? 94 : v.urgency === "soon" ? 60 : 34
    },
    {
      label: "Current condition",
      detail: v.condition === "major" ? "Major issues already affecting use" : v.condition === "minor" ? "Minor issues only" : "Still working fine",
      leanText: v.condition === "major" ? "Pushes toward buying now" : v.condition === "working" ? "Supports waiting" : "Adds some buy-now pressure",
      tone: result.verdict === "BORDERLINE" ? "mixed" : (v.condition === "working" ? (result.verdict === "WAIT" ? "toward" : "away") : (result.verdict === "BUY" ? "toward" : "away")),
      strength: v.condition === "major" ? 90 : v.condition === "minor" ? 58 : 28
    },
    {
      label: "Timing window",
      detail: v.event === "none" ? "No clear sale or release window" : v.event === "black-friday" ? "Black Friday or a major sale is close" : v.event === "release" ? "A new model release is near" : "A seasonal sale is close",
      leanText: v.event === "none" ? "Does not add much waiting upside" : "Gives waiting a concrete upside",
      tone: result.verdict === "BORDERLINE" ? "mixed" : (v.event === "none" ? (result.verdict === "BUY" ? "toward" : "away") : (result.verdict === "WAIT" ? "toward" : "away")),
      strength: v.event === "none" ? 42 : 84
    },
    {
      label: "Age and feature pull",
      detail: `${v.age} years old with ${v.features} interest in new features`,
      leanText: (v.age >= 5 || v.features === "high") ? "Adds buy-now pressure" : "Makes waiting easier to justify",
      tone: result.verdict === "BORDERLINE" ? "mixed" : ((v.age >= 5 || v.features === "high") ? (result.verdict === "BUY" ? "toward" : "away") : (result.verdict === "WAIT" ? "toward" : "away")),
      strength: (v.age >= 5 && v.features === "high") ? 74 : (v.age >= 5 || v.features === "high") ? 58 : 36
    }
  ];
  result.actionWindow = getActionWindow(v, verdict);
  result.pressureLevel = getPressureLevel(v, score);
  result.practicalLean = getPracticalLean(verdict);
  result.actionPlan = buildActionPlan(v, result);
  result.decisionEdges = buildDecisionEdges(v, result);

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
    category: String(v.category || ""),
    age: Number(v.age),
    condition: String(v.condition || ""),
    urgency: String(v.urgency || ""),
    event: String(v.event || ""),
    features: String(v.features || "")
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
        `Category: ${labelize(v.category)}`,
        `Current item age: ${v.age} years`,
        `Condition: ${labelize(v.condition)}`,
        `Urgency: ${labelize(v.urgency)}`,
        `Timing event: ${labelize(v.event)}`
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
    "WorthItCheck — Buy or Wait",
    `Result: ${result.verdict} (${result.confidenceText})`,
    `Summary: ${result.summary}`,
    result.note ? `Timing note: ${result.note}` : "",
    `Inputs: ${labelize(v.category)}, ${v.age} years old, condition ${humanize(v.condition)}, urgency ${humanize(v.urgency)}, timing event ${humanize(v.event)}, feature pull ${humanize(v.features)}.`,
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
