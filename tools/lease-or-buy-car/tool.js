const TOOL_NAME = "lease_or_buy_car";

const form = document.querySelector("#lease-buy-form");
const button = document.querySelector("#lease-buy-submit");
const message = document.querySelector("#lease-buy-message");
const results = document.querySelector("#lease-buy-results");
const thinking = document.querySelector("#lease-buy-thinking");
const thinkingText = document.querySelector("#lease-buy-thinking-text");
const card = document.querySelector("#lease-buy-card");
const verdictEl = document.querySelector("#lease-buy-verdict");
const confidenceEl = document.querySelector("#lease-buy-confidence");
const summaryEl = document.querySelector("#lease-buy-summary");
const reasonsEl = document.querySelector("#lease-buy-reasons");
const explainerEl = document.querySelector("#lease-buy-explainer");
const noteEl = document.querySelector("#lease-buy-note");
const timelineFitEl = document.querySelector("#lease-buy-timeline-fit");
const mileageFitEl = document.querySelector("#lease-buy-mileage-fit");
const practicalLeanEl = document.querySelector("#lease-buy-practical-lean");
const realLifeEl = document.querySelector("#lease-buy-real-life");
const generatedExamplesEl = document.querySelector("#lease-buy-generated-examples");
const signalBreakdownEl = document.querySelector("#lease-buy-signal-breakdown");
const actionPlanEl = document.querySelector("#lease-buy-action-plan");
const decisionEdgesEl = document.querySelector("#lease-buy-decision-edges");
const snapshotEl = document.querySelector("#lease-buy-snapshot");
const copyLinkButton = document.querySelector("#lease-buy-copy-link");
const copySummaryButton = document.querySelector("#lease-buy-copy-summary");

let latestValues = null;
let latestResult = null;
const examplesToggle = document.querySelector("#examples-toggle");
const extraExamples = Array.from(document.querySelectorAll(".extra-example"));

const timers = [];
const steps = [
  "Checking ownership timeline...",
  "Reviewing mileage pressure...",
  "Comparing payment vs ownership goals...",
  "Finalizing lease vs buy recommendation..."
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
    payment: data.get("payment"),
    ownership: data.get("ownership"),
    newCar: data.get("newCar"),
    restrictions: data.get("restrictions"),
    change: data.get("change")
  };
}

function validate(v) {
  if (!Number.isFinite(v.years) || v.years <= 0) return "Enter a valid ownership timeline in years.";
  if (!Number.isFinite(v.mileage) || v.mileage <= 0) return "Enter a valid annual mileage estimate.";
  if (v.mileage > 60000) return "That mileage looks unusually high. Check the number and try again.";
  return "";
}

function getTimelineFit(v, verdict) {
  if (verdict === "LEASE" && v.years <= 3) return "Short-term lease fit";
  if (verdict === "BUY" && v.years >= 6) return "Long-term buy fit";
  return "Mid-range timeline";
}

function getMileageFit(v, verdict) {
  if (verdict === "LEASE" && v.mileage <= 12000) return "Lease-friendly";
  if (verdict === "BUY" && v.mileage >= 15000) return "Buy-friendly";
  return "Manageable either way";
}

function getPracticalLean(verdict) {
  if (verdict === "LEASE") return "Flexibility and lower payment";
  if (verdict === "BUY") return "Ownership and long-term value";
  return "Lifestyle tie-breaker";
}


function buildActionPlan(v, result) {
  if (result.verdict === "LEASE") {
    return [
      {
        title: "Do this next",
        tone: "primary",
        items: [
          "Compare real lease totals, not just the headline monthly payment.",
          "Check mileage caps and end-of-term fees before you commit.",
          "Prioritise offers that fit your shorter timeline or need for flexibility."
        ]
      },
      {
        title: "Recheck if this changes",
        tone: "watch",
        items: [
          "You expect to keep the car much longer than planned.",
          "Annual mileage rises enough to make lease limits uncomfortable.",
          "Owning starts to matter more than switching cars easily."
        ]
      }
    ];
  }

  if (result.verdict === "BUY") {
    return [
      {
        title: "Do this next",
        tone: "primary",
        items: [
          "Run the full 4-to-6 year ownership cost before choosing finance.",
          "Compare finance rate, depreciation, and insurance together instead of separately.",
          "Choose a car you would still be happy to keep if your plans stay stable."
        ]
      },
      {
        title: "Recheck if this changes",
        tone: "watch",
        items: [
          "Your timeline shortens or life changes make flexibility more valuable.",
          "Mileage falls enough that lease restrictions stop mattering.",
          "A lease offer becomes unusually strong once all fees are included."
        ]
      }
    ];
  }

  return [
    {
      title: "Do this next",
      tone: "primary",
      items: [
        "Price one good lease and one good buy option over the same timeline.",
        "Use expected mileage and how long you keep cars as the tie-breaker, not just monthly payment.",
        "Avoid deciding until you compare the end-of-term cost, not just the start."
      ]
    },
    {
      title: "Recheck if this changes",
      tone: "watch",
      items: [
        "Your expected mileage moves sharply up or down.",
        "Your timeline becomes clearly short-term or clearly long-term.",
        "You become much more price-sensitive or much more ownership-focused."
      ]
    }
  ];
}


function buildDecisionEdges(v, result) {
  if (result.verdict === "LEASE") {
    return [
      {
        title: "What keeps this as a lease call",
        label: "Current verdict stays strong",
        tone: "keep",
        intro: "Leasing stays stronger when you value lower commitment and a newer-car cycle more than ownership.",
        items: [
          v.years <= 3 ? "Your timeline stays relatively short." : "You still do not plan to keep the car for a very long stretch.",
          v.mileage < 15000 ? "Annual mileage stays comfortably manageable for lease limits." : "Mileage does not rise enough to punish a lease badly.",
          "Ownership flexibility and avoiding long-run repair risk stay important to you."
        ]
      },
      {
        title: "What could flip it toward buying",
        label: "Alternative outcome",
        tone: "flip",
        intro: "A lease verdict weakens when you start acting more like a long-term owner.",
        items: [
          "You expect to keep the car longer than planned.",
          "Mileage rises enough that lease restrictions start to bite.",
          "Ownership starts to matter more than having a newer car every few years."
        ]
      }
    ];
  }

  if (result.verdict === "BUY") {
    return [
      {
        title: "What keeps this as a buy call",
        label: "Current verdict stays strong",
        tone: "keep",
        intro: "Buying stays stronger when you behave like a long-term owner rather than a short-cycle user.",
        items: [
          `You still expect to keep the car for roughly ${v.years} years or longer.`,
          v.mileage >= 15000 ? "Mileage stays high enough that lease limits would keep costing you." : "Mileage flexibility still matters more than a fresh lease cycle.",
          "Building ownership value matters more than having the newest car regularly."
        ]
      },
      {
        title: "What could flip it toward leasing",
        label: "Alternative outcome",
        tone: "flip",
        intro: "A buy verdict softens when shorter-term convenience becomes the priority.",
        items: [
          "Your timeline shortens and long-term ownership no longer fits.",
          "A lower monthly payment becomes more important than ownership equity.",
          "You want a newer car cycle and care less about restrictions or resale."
        ]
      }
    ];
  }

  return [
    {
      title: "What would settle the call toward leasing",
      label: "Short-cycle path",
      tone: "watch",
      intro: "Close calls lean toward leasing when you want predictable short-term driving and low commitment.",
      items: [
        "Your timeline stays short.",
        "Mileage remains moderate enough for lease limits.",
        "You care more about a newer car and simpler monthly planning than ownership."
      ]
    },
    {
      title: "What would settle the call toward buying",
      label: "Long-run path",
      tone: "flip",
      intro: "Close calls lean toward buying when the car becomes a long-run asset instead of a short-cycle choice.",
      items: [
        "You plan to keep it longer than first expected.",
        "Mileage or usage would make lease restrictions frustrating.",
        "Ownership value becomes more important than a shorter commitment."
      ]
    }
  ];
}

function evaluateScenario(v, options) {
  const includeExamples = !options || options.includeExamples !== false;
  let score = 0;
  const reasons = [];
  let note = "";

  if (v.years <= 3) {
    score += 4;
    reasons.push("A shorter ownership timeline is one of the strongest signals toward leasing.");
  } else if (v.years <= 4.5) {
    score += 1;
    reasons.push("A mid-length timeline still leaves some room for leasing to make sense.");
  } else if (v.years <= 6) {
    score -= 2;
    reasons.push("Once you plan to keep the car for many years, buying starts to look stronger.");
  } else {
    score -= 4;
    reasons.push("A long ownership timeline usually favors buying because you can spread value over more years.");
  }

  if (v.mileage < 10000) {
    score += 3;
    reasons.push("Lower annual mileage fits leasing better because mileage limits are less likely to become a problem.");
  } else if (v.mileage <= 14000) {
    score += 1;
    reasons.push("Your mileage is still manageable for many lease setups.");
  } else if (v.mileage <= 18000) {
    score -= 2;
    reasons.push("Higher mileage makes lease limits harder to live with and pushes the decision toward buying.");
  } else {
    score -= 4;
    reasons.push("Very high mileage is a strong reason to buy rather than lease.");
  }

  if (v.payment === "high") {
    score += 3;
    reasons.push("Keeping monthly payments lower matters to you, which supports leasing.");
  } else if (v.payment === "medium") {
    score += 1;
    reasons.push("Monthly payment pressure adds some pull toward leasing.");
  } else {
    score -= 1;
    reasons.push("If lower monthly cost is not a priority, leasing loses one of its biggest advantages.");
  }

  if (v.ownership === "high") {
    score -= 4;
    reasons.push("Strong long-term ownership preference is one of the clearest reasons to buy.");
  } else if (v.ownership === "medium") {
    score -= 2;
    reasons.push("Wanting long-term ownership adds real weight toward buying.");
  } else {
    score += 1;
    reasons.push("If ownership itself does not matter much, leasing becomes easier to justify.");
  }

  if (v.newCar === "high") {
    score += 3;
    reasons.push("Wanting a newer car every few years is a classic lease-friendly signal.");
  } else if (v.newCar === "medium") {
    score += 1;
    reasons.push("Some preference for newer cars nudges the decision toward leasing.");
  }

  if (v.restrictions === "low") {
    score -= 3;
    reasons.push("Low tolerance for mileage or wear rules makes leasing harder to live with.");
  } else if (v.restrictions === "medium") {
    score -= 1;
    reasons.push("Some discomfort with lease restrictions lightly supports buying.");
  } else {
    score += 1;
    reasons.push("If you can comfortably live with lease rules, leasing becomes easier to defend.");
  }

  if (v.change === "yes") {
    score += 2;
    reasons.push("Changing needs in the next few years make flexibility more valuable, which supports leasing.");
  } else {
    score -= 1;
    reasons.push("Stable needs make long-term ownership easier to justify.");
  }

  if (v.years >= 6 && v.mileage >= 15000) {
    score -= 4;
    reasons.push("Long timeline plus high mileage strongly reinforces the case for buying.");
  }

  if (v.years <= 3 && v.mileage <= 12000 && (v.payment === "high" || v.newCar === "high")) {
    score += 3;
    note = "Strong lease fit: short timeline, manageable mileage, and a clear reason to value flexibility.";
  }

  if (v.ownership === "high" && v.restrictions === "low") {
    score -= 2;
    reasons.push("Wanting ownership and disliking restrictions together makes buying a much cleaner fit.");
  }

  if (v.newCar === "high" && v.ownership === "low" && v.years <= 4) {
    score += 2;
    reasons.push("Wanting newer cars without strong ownership attachment is a strong lease pattern.");
  }

  let verdictOverride = "";
  if (v.mileage >= 20000 && v.years >= 5) verdictOverride = "BUY";
  if (v.years <= 2.5 && v.payment === "high" && v.ownership !== "high") verdictOverride = "LEASE";

  const result = runDecisionEngine({
    score,
    maxScore: 14,
    closeness: Math.min(Math.abs(score) / 14, 1),
    thresholds: { positive: 4, negative: -4 },
    verdicts: { positive: "LEASE", negative: "BUY", neutral: "BORDERLINE" },
    verdictOverride,
    reasons,
    realLife: [
      v.years <= 3
        ? "In real life, a shorter timeline makes paying for flexibility feel more reasonable than it would on a long ownership plan."
        : "In real life, a longer timeline gives buying more room to pay off after the first few expensive years.",
      v.mileage <= 12000
        ? "Your mileage looks easier to fit inside common lease structures, so lease limits are less likely to punish you."
        : "Your mileage makes lease penalties or limit anxiety more relevant, which strengthens the case for buying.",
      v.ownership === "high"
        ? "Because ownership matters to you, the practical downside of handing the car back later is much bigger."
        : "Because ownership is not a major goal, flexibility and payment structure matter more than building long-term equity.",
      v.change === "yes"
        ? "Changing needs soon makes it more valuable to avoid getting locked into the wrong long-term fit."
        : "Stable needs reduce the value of short-cycle flexibility and make buying easier to justify."
    ],
    summaryByVerdict: {
      LEASE: "Leasing looks stronger because your timeline and priorities put more value on flexibility and lower monthly pressure than on long-term ownership.",
      BUY: "Buying looks stronger because mileage, ownership goals, or long-term use make lease limits and short-cycle value less attractive.",
      BORDERLINE: "This is a close call: your timeline and lifestyle leave enough room for either option to make sense depending on how much you value ownership versus flexibility."
    },
    explanationByVerdict: {
      LEASE: "The strongest lease cases usually combine a shorter timeline, manageable mileage, and a real reason to prefer lower monthly payments or newer vehicles. That is the pattern your answers are moving toward.",
      BUY: "The strongest buy cases usually combine higher mileage, longer ownership plans, stronger ownership goals, or dislike of lease restrictions. Those signals are doing more work in your answers.",
      BORDERLINE: "Your inputs split the decision. Some signals support leasing for flexibility, while others support buying for long-term value. This is exactly the kind of case where personal preference can reasonably break the tie."
    }
  });

  result.note = note;
  result.signalBreakdown = [
    {
      label: "Ownership timeline",
      detail: `${v.years} year plan`,
      leanText: v.years <= 3 ? "Shorter timeline pushes toward leasing" : v.years >= 6 ? "Longer timeline pushes toward buying" : "Timeline is not one-sided",
      tone: result.verdict === "BORDERLINE" ? "mixed" : (v.years <= 3 ? (result.verdict === "LEASE" ? "toward" : "away") : v.years >= 6 ? (result.verdict === "BUY" ? "toward" : "away") : "mixed"),
      strength: v.years <= 3 ? 88 : v.years >= 6 ? 84 : 52
    },
    {
      label: "Annual mileage",
      detail: `${v.mileage.toLocaleString()} miles per year`,
      leanText: v.mileage <= 12000 ? "Mileage fits leasing better" : v.mileage >= 15000 ? "Mileage pushes toward buying" : "Mileage could work either way",
      tone: result.verdict === "BORDERLINE" ? "mixed" : (v.mileage <= 12000 ? (result.verdict === "LEASE" ? "toward" : "away") : v.mileage >= 15000 ? (result.verdict === "BUY" ? "toward" : "away") : "mixed"),
      strength: v.mileage <= 12000 ? 78 : v.mileage >= 15000 ? 86 : 54
    },
    {
      label: "Monthly payment pressure",
      detail: v.payment === "high" ? "Lower monthly cost matters a lot" : v.payment === "medium" ? "Some payment pressure" : "Payment size is less important",
      leanText: v.payment === "high" ? "Supports leasing" : v.payment === "low" ? "Makes buying easier to defend" : "Adds only light lease pressure",
      tone: result.verdict === "BORDERLINE" ? "mixed" : (v.payment === "low" ? (result.verdict === "BUY" ? "toward" : "away") : (result.verdict === "LEASE" ? "toward" : "away")),
      strength: v.payment === "high" ? 82 : v.payment === "medium" ? 60 : 34
    },
    {
      label: "Ownership versus flexibility",
      detail: `${v.ownership} ownership pull, ${v.newCar} new-car preference, ${v.change === "yes" ? "changing needs likely" : "needs look stable"}`,
      leanText: (v.ownership === "high" || v.restrictions === "low") ? "Pushes toward buying" : "Flexibility still has real value",
      tone: result.verdict === "BORDERLINE" ? "mixed" : ((v.ownership === "high" || v.restrictions === "low") ? (result.verdict === "BUY" ? "toward" : "away") : (result.verdict === "LEASE" ? "toward" : "away")),
      strength: (v.ownership === "high" || v.restrictions === "low") ? 82 : 66
    }
  ];
  result.timelineFit = getTimelineFit(v, result.verdict);
  result.mileageFit = getMileageFit(v, result.verdict);
  result.practicalLean = getPracticalLean(result.verdict);
  result.actionPlan = buildActionPlan(v, result);
  result.decisionEdges = buildDecisionEdges(v, result);

  if (includeExamples) {
    const scenarios = [
      {
        title: "Short timeline, lower mileage",
        input: { ...v, years: Math.max(2, Math.min(v.years, 3)), mileage: Math.min(v.mileage, 11000), payment: "high" }
      },
      {
        title: "Long timeline, higher mileage",
        input: { ...v, years: Math.max(v.years, 6), mileage: Math.max(v.mileage, 17000), ownership: "high" }
      },
      {
        title: "Needs may change soon",
        input: { ...v, change: "yes", ownership: "low", newCar: "high" }
      }
    ];

    result.examples = scenarios.map((scenario) => {
      const scenarioResult = evaluateScenario(scenario.input, { includeExamples: false });
      return {
        title: scenario.title,
        meta: [
          `${scenario.input.years} years`,
          `${scenario.input.mileage.toLocaleString()} miles/year`,
          scenario.input.ownership === "high" ? "Ownership matters" : "Flexibility matters"
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
    payment: String(v.payment || ""),
    ownership: String(v.ownership || ""),
    newCar: String(v.newCar || ""),
    restrictions: String(v.restrictions || ""),
    change: String(v.change || "")
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
        `Payment sensitivity: ${labelize(v.payment)}`,
        `Ownership priority: ${labelize(v.ownership)}`,
        `Model switching preference: ${labelize(v.change)}`
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
    "WorthItCheck — Lease or Buy Car",
    `Result: ${result.verdict} (${result.confidenceText})`,
    `Summary: ${result.summary}`,
    result.note ? `Note: ${result.note}` : "",
    `Inputs: ${v.years}-year timeline, ${v.mileage.toLocaleString()} miles/year, payment sensitivity ${humanize(v.payment)}, ownership priority ${humanize(v.ownership)}, restrictions tolerance ${humanize(v.restrictions)}.`,
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
    result.verdict === "LEASE"
      ? "verdict-repair"
      : result.verdict === "BUY"
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
  timelineFitEl.textContent = result.timelineFit;
  mileageFitEl.textContent = result.mileageFit;
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
