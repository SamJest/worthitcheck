const TOOL_NAME = "rent_vs_buy";

const form = document.querySelector("#rent-buy-form");
const button = document.querySelector("#rent-buy-submit");
const message = document.querySelector("#rent-buy-message");
const results = document.querySelector("#rent-buy-results");
const thinking = document.querySelector("#rent-buy-thinking");
const thinkingText = document.querySelector("#rent-buy-thinking-text");
const card = document.querySelector("#rent-buy-card");
const verdictEl = document.querySelector("#rent-buy-verdict");
const confidenceEl = document.querySelector("#rent-buy-confidence");
const summaryEl = document.querySelector("#rent-buy-summary");
const rentTotalEl = document.querySelector("#rent-total");
const buyTotalEl = document.querySelector("#buy-total");
const reasonsEl = document.querySelector("#rent-buy-reasons");
const explainerEl = document.querySelector("#rent-buy-explainer");
const monthlyDifferenceEl = document.querySelector("#rent-buy-monthly-difference");
const breakEvenEl = document.querySelector("#rent-buy-break-even");
const practicalLeanEl = document.querySelector("#rent-buy-practical-lean");
const realLifeEl = document.querySelector("#rent-buy-real-life");
const generatedExamplesEl = document.querySelector("#rent-buy-generated-examples");
const signalBreakdownEl = document.querySelector("#rent-buy-signal-breakdown");
const actionPlanEl = document.querySelector("#rent-buy-action-plan");
const decisionEdgesEl = document.querySelector("#rent-buy-decision-edges");
const snapshotEl = document.querySelector("#rent-buy-snapshot");
const copyLinkButton = document.querySelector("#rent-buy-copy-link");
const copySummaryButton = document.querySelector("#rent-buy-copy-summary");

let latestValues = null;
let latestResult = null;
const examplesToggle = document.querySelector("#examples-toggle");
const extraExamples = Array.from(document.querySelectorAll(".extra-example"));

const timers = [];
const steps = [
  "Calculating long-term costs...",
  "Comparing rent vs ownership...",
  "Evaluating your timeline..."
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

function gbp(value, options) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: options && options.precise ? 2 : 0
  }).format(value);
}

function values() {
  const data = new FormData(form);
  return {
    rent: Number(data.get("rent")),
    price: Number(data.get("price")),
    ownership: Number(data.get("ownership")),
    years: Number(data.get("years")),
    stability: data.get("stability")
  };
}

function validate(v) {
  if (!Number.isFinite(v.rent) || v.rent <= 0) return "Enter a valid monthly rent.";
  if (!Number.isFinite(v.price) || v.price <= 0) return "Enter a valid purchase price.";
  if (!Number.isFinite(v.ownership) || v.ownership < 0) return "Enter a valid monthly ownership cost.";
  if (!Number.isFinite(v.years) || v.years <= 0) return "Enter a valid time horizon.";
  return "";
}

function getBreakEvenYears(v) {
  const monthlySaving = v.rent - v.ownership;
  if (monthlySaving <= 0) return null;
  return v.price / (monthlySaving * 12);
}

function buildPracticalLean(verdict) {
  if (verdict === "BUY") return "Ownership builds value";
  if (verdict === "RENT") return "Flexibility stays valuable";
  return "Choice stays close";
}


function buildActionPlan(v, result) {
  const breakEvenText = result.details.breakEvenYears
    ? `${result.details.breakEvenYears.toFixed(1)} years`
    : "not reached within your current assumptions";

  if (result.verdict === "BUY") {
    return [
      {
        title: "Do this next",
        tone: "primary",
        items: [
          `Only buy if you genuinely expect to keep using it beyond roughly ${breakEvenText}.`,
          "Add maintenance, insurance, and any finance cost before you commit to ownership.",
          "Protect a cash buffer so the upfront buy cost does not create strain elsewhere."
        ]
      },
      {
        title: "Recheck if this changes",
        tone: "watch",
        items: [
          "Your timeline shortens or becomes less certain.",
          "Ownership costs rise enough to erase the monthly saving.",
          "A cheaper rent option appears without locking you in."
        ]
      }
    ];
  }

  if (result.verdict === "RENT") {
    return [
      {
        title: "Do this next",
        tone: "primary",
        items: [
          "Keep the flexibility and avoid tying up cash in ownership too early.",
          "Revisit the decision only if your plans become more stable or much longer-term.",
          "Use the monthly gap to set a clear point where buying would finally beat renting."
        ]
      },
      {
        title: "Recheck if this changes",
        tone: "watch",
        items: [
          "You expect to keep using it far longer than first planned.",
          "Purchase price falls or ownership costs improve materially.",
          "Rent cost rises enough that the flexibility premium stops feeling worth it."
        ]
      }
    ];
  }

  return [
    {
      title: "Do this next",
      tone: "primary",
      items: [
        "Test the same decision at a shorter and longer timeline before choosing.",
        "Treat flexibility and cash flow as the tie-breaker if the totals stay close.",
        "Do not force a buy decision when the break-even point is still uncertain."
      ]
    },
    {
      title: "Recheck if this changes",
      tone: "watch",
      items: [
        "Your years of use become much clearer.",
        "The monthly cost gap widens enough to stop being a close call.",
        "The upfront price or financing assumption changes materially."
      ]
    }
  ];
}


function buildDecisionEdges(v, result) {
  if (result.verdict === "BUY") {
    return [
      {
        title: "What keeps this as a buy call",
        label: "Current verdict stays strong",
        tone: "keep",
        intro: "Buying stays stronger when the timeline is long enough for ownership to pay back the setup cost.",
        items: [
          `You still expect to keep using it for around ${v.years} years or longer.`,
          "Your situation stays stable enough that flexibility is not the main priority.",
          "Ownership costs stay close to what you planned rather than rising unexpectedly."
        ]
      },
      {
        title: "What could flip it toward renting",
        label: "Alternative outcome",
        tone: "flip",
        intro: "A buy verdict weakens when the timeline shortens or flexibility becomes more valuable.",
        items: [
          "You may move, switch plans, or stop using it sooner than expected.",
          "Maintenance, insurance, or other ownership costs come in higher than expected.",
          "The practical value of staying flexible starts to matter more than long-run cost."
        ]
      }
    ];
  }

  if (result.verdict === "RENT") {
    return [
      {
        title: "What keeps this as a rent call",
        label: "Current verdict stays strong",
        tone: "keep",
        intro: "Renting stays stronger when you are buying flexibility instead of forcing a long commitment.",
        items: [
          `Your usable timeline stays close to ${v.years} years or shorter.`,
          v.stability === "short" ? "Your plans remain changeable enough that flexibility has real value." : "You still value flexibility enough to pay for it.",
          "Ownership would still bring enough extra cost or friction to outweigh the upside."
        ]
      },
      {
        title: "What could flip it toward buying",
        label: "Alternative outcome",
        tone: "flip",
        intro: "A rent verdict changes when the timeline becomes more stable and long-term.",
        items: [
          "You realise you will almost certainly keep using it for longer than planned.",
          "Rent keeps rising while buying costs stay predictable.",
          "The convenience cost of renting starts to feel larger than the commitment of owning."
        ]
      }
    ];
  }

  return [
    {
      title: "What would settle the call toward renting",
      label: "Flexibility path",
      tone: "watch",
      intro: "Close calls lean toward renting when certainty stays weak.",
      items: [
        "Your timeline still feels hard to predict.",
        "Owning would add more admin, maintenance, or commitment than you want.",
        "The cost gap stays narrow enough that flexibility matters more."
      ]
    },
    {
      title: "What would settle the call toward buying",
      label: "Long-run path",
      tone: "flip",
      intro: "Close calls lean toward buying when you know the long-run use case is real.",
      items: [
        "You become more certain you will keep using it well beyond the current timeline.",
        "Owning becomes clearly cheaper month after month.",
        "Stability improves enough that the long-term commitment feels safe."
      ]
    }
  ];
}

function evaluateScenario(v, options) {
  const includeExamples = !options || options.includeExamples !== false;
  const totalRent = v.rent * 12 * v.years;
  const totalOwnership = v.price + (v.ownership * 12 * v.years);
  const diff = totalRent - totalOwnership;
  const closeness = Math.abs(diff) / Math.max(totalRent, totalOwnership, 1);
  const breakEvenYears = getBreakEvenYears(v);
  const monthlyGap = Math.abs(v.rent - v.ownership);
  let score = 0;
  const reasons = [];

  if (v.years <= 2 && v.stability === "short") {
    score -= 4;
    reasons.push("A short timeline makes the upfront buy cost harder to justify.");
  }

  if (diff > 0) {
    score += diff / Math.max(totalRent, 1) > 0.12 ? 3 : 1;
    reasons.push(`Over ${v.years} years, owning costs ${gbp(totalOwnership)} versus ${gbp(totalRent)} renting.`);
  } else {
    score -= Math.abs(diff) / Math.max(totalOwnership, 1) > 0.12 ? 3 : 1;
    reasons.push(`Over ${v.years} years, renting costs ${gbp(totalRent)} versus ${gbp(totalOwnership)} owning.`);
  }

  if (v.stability === "long") {
    score += 1;
    reasons.push("Long-term stability makes buying easier to justify.");
  } else if (v.stability === "short") {
    score -= 1;
    reasons.push("Short-term plans favor flexibility, which supports renting.");
  }

  if (v.years < 3) {
    score -= 1;
  } else if (v.years >= 6) {
    score += 1;
    reasons.push("A longer horizon gives ownership more time to beat rent on total cost.");
  }

  const realLife = [
    `The cost gap works out to about ${gbp(monthlyGap)} per month between renting and owning before the purchase price is recovered.`,
    breakEvenYears
      ? `At this spread, buying starts to make sense after roughly ${breakEvenYears.toFixed(1)} years.`
      : "Owning does not currently recover the upfront price through monthly savings alone.",
    diff > 0
      ? `If your timeline holds, buying could save about ${gbp(diff)} across the full period.`
      : `If your timeline stays uncertain, renting avoids tying up ${gbp(v.price)} upfront for a weaker payoff.`,
    v.stability === "long"
      ? "Because your plans look stable, the practical downside of owning is lower than it would be in a short stay."
      : "Because your plans are less stable, flexibility carries real value beyond the headline totals."
  ];

  let verdictOverride = "";
  if (v.years <= 2 && v.stability === "short") {
    verdictOverride = "RENT";
  }

  const result = runDecisionEngine({
    score,
    maxScore: 7,
    closeness,
    thresholds: { positive: 2, negative: -2 },
    verdicts: { positive: "BUY", negative: "RENT", neutral: "BORDERLINE" },
    verdictOverride,
    reasons,
    realLife,
    summaryByVerdict: {
      BUY: `Over ${v.years} years, owning looks cheaper than renting.`,
      RENT: `Over ${v.years} years, renting looks safer or cheaper than buying.`,
      BORDERLINE: `Over ${v.years} years, renting and buying come out close enough that the decision is not one-sided.`
    },
    explanationByVerdict: {
      BUY: "Buying is stronger here because the longer timeline gives ownership cost enough room to beat renting, and the trade-off is easier to recover in real life.",
      RENT: "Renting is stronger here because the timeline is short, the upfront cost is hard to recover, or ownership stays more expensive once flexibility is included.",
      BORDERLINE: "The totals are close enough that flexibility, certainty, and personal preference matter alongside the numbers."
    },
    details: {
      totalRent,
      totalOwnership,
      monthlyGap,
      breakEvenYears
    }
  });

  result.practicalLean = buildPracticalLean(result.verdict);
  result.actionPlan = buildActionPlan(v, result);
  result.decisionEdges = buildDecisionEdges(v, result);
  result.signalBreakdown = [
    {
      label: "Total cost gap",
      detail: diff >= 0 ? `${gbp(diff)} cheaper to own over ${v.years} years` : `${gbp(Math.abs(diff))} cheaper to rent over ${v.years} years`,
      leanText: diff >= 0 ? "Pushes toward buying" : "Pushes toward renting",
      tone: result.verdict === "BORDERLINE" ? "mixed" : (diff >= 0 ? (result.verdict === "BUY" ? "toward" : "away") : (result.verdict === "RENT" ? "toward" : "away")),
      strength: Math.min(92, Math.max(34, Math.round(closeness * 100) + 28))
    },
    {
      label: "Time horizon",
      detail: `${v.years} year plan`,
      leanText: v.years >= 6 ? "Longer horizon helps buying" : v.years <= 2 ? "Shorter horizon helps renting" : "Timeline is more balanced",
      tone: result.verdict === "BORDERLINE" ? "mixed" : (v.years >= 6 ? (result.verdict === "BUY" ? "toward" : "away") : v.years <= 2 ? (result.verdict === "RENT" ? "toward" : "away") : "mixed"),
      strength: v.years >= 6 ? 76 : v.years <= 2 ? 84 : 52
    },
    {
      label: "Stability",
      detail: v.stability === "long" ? "Your plans look long-term and stable" : v.stability === "medium" ? "Your plans are fairly stable" : "Your plans look shorter or less fixed",
      leanText: v.stability === "long" ? "Supports buying" : v.stability === "short" ? "Supports renting" : "Stability is not decisive",
      tone: result.verdict === "BORDERLINE" ? "mixed" : (v.stability === "long" ? (result.verdict === "BUY" ? "toward" : "away") : v.stability === "short" ? (result.verdict === "RENT" ? "toward" : "away") : "mixed"),
      strength: v.stability === "long" ? 70 : v.stability === "short" ? 78 : 50
    },
    {
      label: "Break-even timing",
      detail: breakEvenYears ? `Buying recovers the upfront cost after about ${breakEvenYears.toFixed(1)} years` : "Buying does not recover the upfront price through monthly savings alone",
      leanText: breakEvenYears && breakEvenYears <= v.years ? "Break-even supports buying" : "Break-even does not clearly favor buying",
      tone: result.verdict === "BORDERLINE" ? "mixed" : ((breakEvenYears && breakEvenYears <= v.years) ? (result.verdict === "BUY" ? "toward" : "away") : (result.verdict === "RENT" ? "toward" : "away")),
      strength: (breakEvenYears && breakEvenYears <= v.years) ? 72 : 58
    }
  ];

  if (includeExamples) {
    const scenarios = [
      {
        title: "Shorter stay",
        input: {
          ...v,
          years: Math.max(1, Number((v.years - 1).toFixed(1))),
          stability: "short"
        }
      },
      {
        title: "Longer stable stay",
        input: {
          ...v,
          years: Number((v.years + 2).toFixed(1)),
          stability: "long"
        }
      },
      {
        title: "Higher ownership costs",
        input: {
          ...v,
          ownership: Math.round(v.ownership * 1.2)
        }
      }
    ];

    result.examples = scenarios.map((scenario) => {
      const scenarioResult = evaluateScenario(scenario.input, { includeExamples: false });
      return {
        title: scenario.title,
        meta: [
          `${scenario.input.years} year horizon`,
          scenario.input.stability === "long" ? "Long-term plan" : "Short-term plan",
          `${gbp(scenario.input.rent)}/mo rent`
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
    rent: Number(v.rent),
    price: Number(v.price),
    ownership: Number(v.ownership),
    years: Number(v.years),
    stability: String(v.stability || "")
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
  const breakEvenText = result.details.breakEvenYears
    ? `${result.details.breakEvenYears.toFixed(1)} years`
    : "Not reached";

  return [
    {
      label: "Recommendation",
      emphasis: `${result.verdict} · ${result.confidenceText}`,
      body: result.summary,
      tone: "highlight"
    },
    {
      label: "Cost snapshot",
      items: [
        `Monthly rent: ${gbp(v.rent)}`,
        `Buy price: ${gbp(v.price)}`,
        `Monthly ownership cost: ${gbp(v.ownership)}`,
        `Time horizon: ${v.years} years`,
        `Break-even: ${breakEvenText}`
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
  const breakEvenText = result.details.breakEvenYears
    ? `${result.details.breakEvenYears.toFixed(1)} years`
    : "Not reached within current assumptions";

  return [
    "WorthItCheck — Rent vs Buy",
    `Result: ${result.verdict} (${result.confidenceText})`,
    `Summary: ${result.summary}`,
    `Inputs: rent ${gbp(v.rent)}/month, buy price ${gbp(v.price)}, ownership ${gbp(v.ownership)}/month, ${v.years}-year horizon, stability ${humanize(v.stability)}.`,
    `Break-even: ${breakEvenText}`,
    `Projected totals: rent ${gbp(result.details.totalRent)}, buy ${gbp(result.details.totalOwnership)}.`,
    "Key reasons:",
    ...result.reasons.slice(0, 3).map((item) => `- ${item}`),
    "Next step:",
    ...nextMove.map((item) => `- ${item}`)
  ].join("\n");
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
      ? "verdict-repair"
      : result.verdict === "RENT"
        ? "verdict-replace"
        : "verdict-borderline"
  );
  confidenceEl.textContent = result.confidenceText;
  confidenceEl.className = "confidence-pill";
  summaryEl.textContent = result.summary;
  rentTotalEl.textContent = gbp(result.details.totalRent);
  buyTotalEl.textContent = gbp(result.details.totalOwnership);
  monthlyDifferenceEl.textContent = gbp(result.details.monthlyGap);
  breakEvenEl.textContent = result.details.breakEvenYears
    ? `${result.details.breakEvenYears.toFixed(1)} years`
    : "Not reached";
  practicalLeanEl.textContent = result.practicalLean;
  reasonsEl.innerHTML = result.reasons.map((reason) => `<li>${reason}</li>`).join("");
  realLifeEl.innerHTML = result.realLife.map((item) => `<li>${item}</li>`).join("");
  explainerEl.innerHTML = `<p>${result.explanation}</p>`;
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
