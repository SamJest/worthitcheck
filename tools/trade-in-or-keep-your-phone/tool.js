const TOOL_NAME = "trade_in_or_keep_your_phone";

const form = document.querySelector("#trade-phone-form");
const button = document.querySelector("#trade-phone-submit");
const message = document.querySelector("#trade-phone-message");
const results = document.querySelector("#trade-phone-results");
const thinking = document.querySelector("#trade-phone-thinking");
const thinkingText = document.querySelector("#trade-phone-thinking-text");
const card = document.querySelector("#trade-phone-card");
const verdictEl = document.querySelector("#trade-phone-verdict");
const confidenceEl = document.querySelector("#trade-phone-confidence");
const summaryEl = document.querySelector("#trade-phone-summary");
const reasonsEl = document.querySelector("#trade-phone-reasons");
const explainerEl = document.querySelector("#trade-phone-explainer");
const noteEl = document.querySelector("#trade-phone-note");
const valueWindowEl = document.querySelector("#trade-phone-value-window");
const holdWindowEl = document.querySelector("#trade-phone-hold-window");
const practicalLeanEl = document.querySelector("#trade-phone-practical-lean");
const realLifeEl = document.querySelector("#trade-phone-real-life");
const generatedExamplesEl = document.querySelector("#trade-phone-generated-examples");
const signalBreakdownEl = document.querySelector("#trade-phone-signal-breakdown");
const actionPlanEl = document.querySelector("#trade-phone-action-plan");
const decisionEdgesEl = document.querySelector("#trade-phone-decision-edges");
const snapshotEl = document.querySelector("#trade-phone-snapshot");
const copyLinkButton = document.querySelector("#trade-phone-copy-link");
const copySummaryButton = document.querySelector("#trade-phone-copy-summary");

let latestValues = null;
let latestResult = null;
const examplesToggle = document.querySelector("#examples-toggle");
const extraExamples = Array.from(document.querySelectorAll(".extra-example"));

const timers = [];
const steps = [
  "Checking phone age and value...",
  "Reviewing battery and performance...",
  "Comparing trade-in timing vs remaining life...",
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

function currency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

function values() {
  const data = new FormData(form);
  return {
    age: Number(data.get("age")),
    tradeValue: Number(data.get("tradeValue")),
    performance: data.get("performance"),
    battery: data.get("battery"),
    features: data.get("features"),
    holdMonths: Number(data.get("holdMonths"))
  };
}

function validate(v) {
  if (!Number.isFinite(v.age) || v.age < 0) return "Enter a valid phone age in years.";
  if (!Number.isFinite(v.tradeValue) || v.tradeValue < 0) return "Enter a valid trade-in estimate.";
  if (!Number.isFinite(v.holdMonths) || v.holdMonths <= 0) return "Enter how many more months you expect to keep it.";
  return "";
}

function getPracticalLean(verdict) {
  if (verdict === "TRADE IN") return "Lock in value now";
  if (verdict === "KEEP") return "Use the remaining life";
  return "Tolerance for rough edges decides";
}


function buildActionPlan(v, result) {
  const monthlyValueAtRisk = currency(v.tradeValue / Math.max(v.holdMonths, 1));

  if (result.verdict === "TRADE IN") {
    return [
      {
        title: "Do this next",
        tone: "primary",
        items: [
          "Get live trade-in quotes now and compare them before the phone ages further.",
          "Back up, erase, and check direct-sale value while the current trade-in number is still viable.",
          `Treat about ${monthlyValueAtRisk} per month as the value you risk by waiting.`
        ]
      },
      {
        title: "Recheck if this changes",
        tone: "watch",
        items: [
          "A cheap battery or repair fix would make keeping it comfortable again.",
          "Trade-in offers improve unexpectedly because of a promotion.",
          "You decide you can happily keep the phone much longer than planned."
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
          "Keep the phone and keep extracting value from it while it still feels stable.",
          "Protect condition now with battery care, storage cleanup, and a proper case if needed.",
          `Review the trade-in decision again before another ${Math.min(v.holdMonths, 6)} months passes.`
        ]
      },
      {
        title: "Recheck if this changes",
        tone: "watch",
        items: [
          "Battery or performance drops from manageable to annoying.",
          "A trade-in promotion briefly lifts the current value.",
          "New features start mattering enough to make changing phone worthwhile."
        ]
      }
    ];
  }

  return [
    {
      title: "Do this next",
      tone: "primary",
      items: [
        "Set a minimum trade-in value you would be happy to lock in and wait until that line is crossed.",
        "Do not act yet unless the phone becomes noticeably worse or the trade-in quote improves.",
        "Compare the trade-in case with the cost of simply keeping it for one more short stretch."
      ]
    },
    {
      title: "Recheck if this changes",
      tone: "watch",
      items: [
        "Trade-in value falls faster than expected.",
        "The phone becomes rough enough that extra months of use stop feeling worthwhile.",
        "You shorten your planned hold window and want a replacement sooner."
      ]
    }
  ];
}


function buildDecisionEdges(v, result) {
  if (result.verdict === "TRADE IN") {
    return [
      {
        title: "What keeps this as a trade-in call",
        label: "Current verdict stays strong",
        tone: "keep",
        intro: "Trading in stays smart when you are protecting value before the phone feels much worse.",
        items: [
          `You still have meaningful trade-in value to lock in now (${currency(v.tradeValue)} today).`,
          v.battery === "poor" ? "Battery decline keeps making the phone less appealing to keep." : "Battery or performance is already soft enough that waiting brings little upside.",
          `You were already prepared to move on within about ${Math.max(6, v.holdMonths)} months.`
        ]
      },
      {
        title: "What could flip it toward keeping",
        label: "Alternative outcome",
        tone: "flip",
        intro: "The case for trading in weakens if the phone still has a comfortable runway left.",
        items: [
          "A cheap battery replacement or tune-up removes the main frustration.",
          "Trade-in offers stay stronger than expected for a few more months.",
          "You decide the next upgrade is not valuable enough to justify giving up a still-usable phone now."
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
        intro: "Keeping stays sensible while the phone still delivers useful life without giving up too much value.",
        items: [
          "Performance remains good enough that the phone still feels reliable.",
          v.battery === "good" ? "Battery health stays solid enough that you do not need to think about it." : "Battery decline stays manageable rather than becoming frustrating.",
          `You are happy to keep using it for roughly the next ${Math.max(6, v.holdMonths)} months.`
        ]
      },
      {
        title: "What could flip it toward trading in",
        label: "Alternative outcome",
        tone: "flip",
        intro: "A keep verdict can turn quickly once value starts dropping faster than usefulness.",
        items: [
          "Trade-in value falls sharply while the phone also feels worse to use.",
          "Battery or performance moves from acceptable to clearly annoying.",
          "A compelling upgrade arrives and the extra features start to matter in real use."
        ]
      }
    ];
  }

  return [
    {
      title: "What would settle the call toward keeping",
      label: "Lower-pressure path",
      tone: "watch",
      intro: "Borderline phone decisions lean toward keeping when value erosion stays mild.",
      items: [
        "Trade-in offers remain stable for a little longer.",
        "Battery and performance stay usable enough for daily tasks.",
        "You are comfortable delaying the next upgrade cycle."
      ]
    },
    {
      title: "What would settle the call toward trading in",
      label: "Higher-pressure path",
      tone: "flip",
      intro: "Close calls lean toward trading in when the value window starts closing faster than the phone improves your life.",
      items: [
        "Trade-in value drops again over the next few months.",
        "Battery or performance creates more daily friction.",
        "You already know you want the next phone and are mostly waiting for the right moment."
      ]
    }
  ];
}

function evaluateScenario(v, options) {
  const includeExamples = !options || options.includeExamples !== false;
  let score = 0;
  const reasons = [];
  let note = "";

  if (v.age >= 4) {
    score += 4;
    reasons.push("An older phone is more exposed to declining trade-in value and everyday wear, which supports acting sooner.");
  } else if (v.age >= 3) {
    score += 2;
    reasons.push("Your phone is getting old enough that timing the trade-in starts to matter more.");
  } else if (v.age <= 2) {
    score -= 2;
    reasons.push("A relatively recent phone is often still worth keeping if it remains solid in daily use.");
  }

  if (v.performance === "rough") {
    score += 4;
    reasons.push("Rough performance is a strong signal that the remaining value of keeping the phone is shrinking.");
  } else if (v.performance === "slowing") {
    score += 2;
    reasons.push("Performance is slipping enough to add real pressure toward trading in.");
  } else {
    score -= 2;
    reasons.push("If performance is still fast, keeping the phone becomes easier to justify.");
  }

  if (v.battery === "poor") {
    score += 4;
    reasons.push("Poor battery or reliability makes the phone harder to keep comfortably for much longer.");
  } else if (v.battery === "declining") {
    score += 2;
    reasons.push("Battery decline adds trade-in pressure because the phone may lose usefulness faster from here.");
  } else {
    score -= 1;
    reasons.push("If battery health is still good, keeping the phone has more of a practical case.");
  }

  if (v.tradeValue >= 350) {
    score += 3;
    reasons.push("A relatively strong trade-in offer makes acting now more attractive before value falls further.");
  } else if (v.tradeValue >= 200) {
    score += 1;
    reasons.push("There is still enough trade-in value on the table to make the timing decision matter.");
  } else if (v.tradeValue <= 120) {
    score -= 2;
    reasons.push("If the trade-in value is already weak, keeping the phone often becomes easier to justify.");
  }

  if (v.features === "high") {
    score += 2;
    reasons.push("A strong desire for new features adds some pull toward trading in now.");
  } else if (v.features === "low") {
    score -= 1;
    reasons.push("If new features do not matter much, there is less pressure to give up a usable phone.");
  }

  if (v.holdMonths >= 18) {
    score -= 2;
    reasons.push("If you expect to keep the phone for a long stretch and it is still workable, keeping gets more value from it.");
  } else if (v.holdMonths <= 6) {
    score += 2;
    reasons.push("If you likely will not keep it much longer anyway, capturing value now becomes more attractive.");
  }

  if (v.age >= 4 && v.battery === "poor" && v.tradeValue >= 200) {
    score += 3;
    note = "Strong trade-in fit: the phone is aging, the battery is slipping, and the current value is still meaningful enough to preserve.";
  }

  if (v.age <= 2 && v.performance === "fast" && v.battery === "good" && v.features === "low") {
    score -= 3;
    note = "Strong keep fit: the phone is still recent, stable, and not being pushed out by a strong upgrade need.";
  }

  const result = runDecisionEngine({
    score,
    maxScore: 14,
    closeness: Math.min(Math.abs(score) / 14, 1),
    thresholds: { positive: 4, negative: -3 },
    verdicts: { positive: "TRADE IN", negative: "KEEP", neutral: "BORDERLINE" },
    reasons,
    realLife: [
      v.tradeValue > 0
        ? `The current trade-in estimate works out to about ${currency(v.tradeValue / Math.max(v.holdMonths, 1))} of value potentially at risk each month you keep it.`
        : "Because the current trade-in estimate is already minimal, there is less financial urgency to act right now.",
      v.performance === "rough" || v.battery === "poor"
        ? "In real life, the phone is already costly in daily friction, so preserving some trade-in value matters more."
        : "In real life, the phone still sounds usable enough that you can continue extracting value if the rough edges are manageable.",
      v.holdMonths <= 6
        ? "A short remaining hold window makes acting now easier to justify because you are not giving up much extra use."
        : "A longer planned hold window gives you more time to squeeze value out of the phone if it is still stable enough.",
      v.features === "high"
        ? "Because new features matter to you, trading in now buys more than money alone."
        : "Because features are not a major pull, this decision is mainly about preserving value versus using what you already own."
    ],
    summaryByVerdict: {
      "TRADE IN": "Trading in looks stronger because the phone's remaining everyday value is falling while the current trade-in value is still worth preserving.",
      KEEP: "Keeping the phone looks stronger because it still has enough everyday value that trading it in now would likely be giving up useful life too early.",
      BORDERLINE: "This is a close call: the phone still has usable life left, but the current trade-in value is strong enough that acting now can still be defended."
    },
    explanationByVerdict: {
      "TRADE IN": "The strongest trade-in cases usually combine age, battery or performance decline, and enough current value that waiting feels more expensive than it first appears. Those are the signals doing the most work here.",
      KEEP: "The strongest keep cases usually combine a relatively stable phone, weaker trade-in value, and low pressure to upgrade. That means the everyday value of keeping it still outweighs the money you would lock in now.",
      BORDERLINE: "Your inputs split the decision. Some signals support locking in value now, while others support squeezing more life out of the device. This is the kind of case where convenience and tolerance for rough edges can reasonably decide it."
    }
  });

  result.note = note;
  result.signalBreakdown = [
    {
      label: "Phone age",
      detail: `${v.age} years old`,
      leanText: v.age >= 4 ? "Age pushes toward trading in" : v.age <= 2 ? "Recent age supports keeping" : "Age adds moderate timing pressure",
      tone: result.verdict === "BORDERLINE" ? "mixed" : (v.age <= 2 ? (result.verdict === "KEEP" ? "toward" : "away") : (result.verdict === "TRADE IN" ? "toward" : "away")),
      strength: v.age >= 4 ? 82 : v.age <= 2 ? 34 : 56
    },
    {
      label: "Current trade-in value",
      detail: currency(v.tradeValue),
      leanText: v.tradeValue >= 350 ? "Strong value makes acting now more attractive" : v.tradeValue <= 120 ? "Lower value makes keeping easier to defend" : "Trade-in value still matters",
      tone: result.verdict === "BORDERLINE" ? "mixed" : (v.tradeValue <= 120 ? (result.verdict === "KEEP" ? "toward" : "away") : (result.verdict === "TRADE IN" ? "toward" : "away")),
      strength: v.tradeValue >= 350 ? 84 : v.tradeValue <= 120 ? 38 : 60
    },
    {
      label: "Performance and battery",
      detail: `${v.performance} performance with ${v.battery} battery / reliability`,
      leanText: (v.performance === "rough" || v.battery === "poor") ? "Everyday friction pushes toward trading in" : "Stable daily use supports keeping",
      tone: result.verdict === "BORDERLINE" ? "mixed" : ((v.performance === "rough" || v.battery === "poor") ? (result.verdict === "TRADE IN" ? "toward" : "away") : (result.verdict === "KEEP" ? "toward" : "away")),
      strength: (v.performance === "rough" || v.battery === "poor") ? 90 : 42
    },
    {
      label: "Planned hold window",
      detail: `${v.holdMonths} more months`,
      leanText: v.holdMonths <= 6 ? "Short hold window favors trading in" : v.holdMonths >= 18 ? "Longer hold window supports keeping" : "Hold window is not decisive alone",
      tone: result.verdict === "BORDERLINE" ? "mixed" : (v.holdMonths >= 18 ? (result.verdict === "KEEP" ? "toward" : "away") : v.holdMonths <= 6 ? (result.verdict === "TRADE IN" ? "toward" : "away") : "mixed"),
      strength: v.holdMonths <= 6 ? 74 : v.holdMonths >= 18 ? 70 : 48
    }
  ];
  result.valueWindow = currency(v.tradeValue / Math.max(v.holdMonths, 1));
  result.holdWindow = `${v.holdMonths} months`;
  result.practicalLean = getPracticalLean(result.verdict);
  result.actionPlan = buildActionPlan(v, result);
  result.decisionEdges = buildDecisionEdges(v, result);

  if (includeExamples) {
    const scenarios = [
      {
        title: "If trade-in value is still strong",
        input: { ...v, tradeValue: Math.max(v.tradeValue, 350), holdMonths: Math.min(v.holdMonths, 6) }
      },
      {
        title: "If the phone stays mostly stable",
        input: { ...v, performance: "fast", battery: "good", holdMonths: Math.max(v.holdMonths, 18) }
      },
      {
        title: "If battery and performance get worse",
        input: { ...v, performance: "rough", battery: "poor", age: Math.max(v.age, 4) }
      }
    ];

    result.examples = scenarios.map((scenario) => {
      const scenarioResult = evaluateScenario(scenario.input, { includeExamples: false });
      return {
        title: scenario.title,
        meta: [
          `${scenario.input.age} years`,
          currency(scenario.input.tradeValue),
          `${scenario.input.holdMonths} more months`
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
    age: Number(v.age),
    tradeValue: Number(v.tradeValue),
    performance: String(v.performance || ""),
    battery: String(v.battery || ""),
    features: String(v.features || ""),
    holdMonths: Number(v.holdMonths)
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
        `Phone age: ${v.age} years`,
        `Trade-in estimate: ${currency(v.tradeValue)}`,
        `Performance: ${labelize(v.performance)}`,
        `Battery health: ${labelize(v.battery)}`,
        `Planned hold time: ${v.holdMonths} months`
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
    "WorthItCheck — Trade In or Keep Your Phone",
    `Result: ${result.verdict} (${result.confidenceText})`,
    `Summary: ${result.summary}`,
    result.note ? `Timing note: ${result.note}` : "",
    `Inputs: ${v.age}-year-old phone, trade-in value ${currency(v.tradeValue)}, performance ${humanize(v.performance)}, battery ${humanize(v.battery)}, feature pull ${humanize(v.features)}, planned hold ${v.holdMonths} months.`,
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
    result.verdict === "KEEP"
      ? "verdict-repair"
      : result.verdict === "TRADE IN"
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
  valueWindowEl.textContent = result.valueWindow;
  holdWindowEl.textContent = result.holdWindow;
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
