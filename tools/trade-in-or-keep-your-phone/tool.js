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
const comparisonEl = document.querySelector("#trade-phone-comparison");
const saveCompareButton = document.querySelector("#trade-phone-save-compare");
const clearCompareButton = document.querySelector("#trade-phone-clear-compare");

let latestValues = null;
let latestResult = null;
const examplesToggle = document.querySelector("#examples-toggle");
const extraExamples = Array.from(document.querySelectorAll(".extra-example"));

const timers = [];
const steps = [
  "Checking trade-in, private-sale, and recycler routes...",
  "Reviewing battery, performance, and hold window...",
  "Estimating how much cash-out value is at risk if you wait...",
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
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0
  }).format(Math.max(0, Number(value) || 0));
}

function optionalNumber(value) {
  return value === "" || value === null ? null : Number(value);
}

function values() {
  const data = new FormData(form);
  return {
    age: Number(data.get("age")),
    tradeValue: Number(data.get("tradeValue")),
    performance: data.get("performance"),
    battery: data.get("battery"),
    features: data.get("features"),
    holdMonths: Number(data.get("holdMonths")),
    privateValue: optionalNumber(data.get("privateValue")),
    recyclerValue: optionalNumber(data.get("recyclerValue")),
    fixCost: optionalNumber(data.get("fixCost")),
    replacementCost: optionalNumber(data.get("replacementCost")),
    saleEffort: data.get("saleEffort") || "medium"
  };
}

function validate(v) {
  if (!Number.isFinite(v.age) || v.age < 0) return "Enter a valid phone age in years.";
  if (!Number.isFinite(v.tradeValue) || v.tradeValue < 0) return "Enter a valid trade-in estimate.";
  if (!Number.isFinite(v.holdMonths) || v.holdMonths <= 0) return "Enter how many more months you expect to keep it.";
  for (const [key, label] of [["privateValue", "private-sale value"], ["recyclerValue", "recycler / instant-cash value"], ["fixCost", "likely repair cost"], ["replacementCost", "replacement cost"]]) {
    if (v[key] !== null && (!Number.isFinite(v[key]) || v[key] < 0)) return `Enter a valid ${label}.`;
  }
  return "";
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function roundMoney(value) {
  return Math.round((Number(value) || 0) / 5) * 5;
}

function labelize(value) {
  const text = String(value || "").replace(/-/g, " ").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

function buildRouteLabel(route) {
  if (route === "SELL PRIVATELY") return "Private sale";
  if (route === "TRADE IN") return "Trade-in";
  if (route === "RECYCLE NOW") return "Recycler / instant cash";
  if (route === "KEEP") return "Keep using it";
  return "Balanced";
}

function normalize(v) {
  const privateDefault = roundMoney(Math.max(v.tradeValue * 1.18, v.tradeValue + 60));
  const recyclerDefault = roundMoney(Math.max(0, Math.min(v.tradeValue - 40, v.tradeValue * 0.62)));
  return {
    ...v,
    privateValue: v.privateValue !== null ? v.privateValue : privateDefault,
    recyclerValue: v.recyclerValue !== null ? v.recyclerValue : recyclerDefault,
    fixCost: v.fixCost !== null ? v.fixCost : 0,
    replacementCost: v.replacementCost !== null ? v.replacementCost : 0,
    saleEffort: v.saleEffort || "medium"
  };
}

function buildRouteNumbers(v) {
  const effortPenalty = v.saleEffort === "low" ? 90 : v.saleEffort === "medium" ? 35 : 0;
  const conditionPenalty = (v.performance === "rough" ? 45 : v.performance === "slowing" ? 20 : 0) + (v.battery === "poor" ? 55 : v.battery === "declining" ? 20 : 0);
  const effectivePrivate = Math.max(0, v.privateValue - effortPenalty - Math.min(conditionPenalty, 110));
  const effectiveTrade = Math.max(0, v.tradeValue);
  const effectiveRecycler = Math.max(0, v.recyclerValue);

  const decayRate = clamp(
    0.022 + (v.age * 0.003) +
    (v.performance === "rough" ? 0.018 : v.performance === "slowing" ? 0.008 : 0) +
    (v.battery === "poor" ? 0.017 : v.battery === "declining" ? 0.008 : 0),
    0.02,
    0.08
  );

  const futureTrade = Math.max(0, effectiveTrade * Math.pow(1 - decayRate, v.holdMonths));
  const futurePrivate = Math.max(0, effectivePrivate * Math.pow(1 - (decayRate * 0.95), v.holdMonths));
  const futureRecycler = Math.max(0, effectiveRecycler * Math.pow(1 - (decayRate * 1.08), v.holdMonths));

  const routeNow = [
    { route: "SELL PRIVATELY", raw: v.privateValue, effective: effectivePrivate },
    { route: "TRADE IN", raw: v.tradeValue, effective: effectiveTrade },
    { route: "RECYCLE NOW", raw: v.recyclerValue, effective: effectiveRecycler }
  ].sort((a, b) => b.effective - a.effective);

  const routeFuture = [
    { route: "SELL PRIVATELY", effective: futurePrivate },
    { route: "TRADE IN", effective: futureTrade },
    { route: "RECYCLE NOW", effective: futureRecycler }
  ].sort((a, b) => b.effective - a.effective);

  return {
    effortPenalty,
    conditionPenalty,
    decayRate,
    effectivePrivate,
    effectiveTrade,
    effectiveRecycler,
    futureTrade,
    futurePrivate,
    futureRecycler,
    bestNow: routeNow[0],
    secondNow: routeNow[1],
    bestFuture: routeFuture[0],
    monthlyValueAtRisk: Math.max(0, (routeNow[0].effective - routeFuture[0].effective) / Math.max(v.holdMonths, 1))
  };
}

function buildSummaryAndExplanation(route, v, numbers) {
  if (route === "SELL PRIVATELY") {
    return {
      summary: "Selling privately looks strongest because the phone still has enough value that a direct sale gives you more upside than a simple trade-in, and waiting risks leaking too much of that value away.",
      explanation: "The strongest private-sale calls happen when there is still a meaningful resale premium over trade-in, the phone is saleable enough, and you are willing to put in the extra effort. That combination is doing the most work here.",
      note: `Best current cash-out route: a private sale at about ${currency(v.privateValue)} versus roughly ${currency(v.tradeValue)} on trade-in.`
    };
  }
  if (route === "TRADE IN") {
    return {
      summary: "Trading in looks strongest because the phone still has enough value to lock in now, but the extra upside from selling it yourself is not large enough to outweigh the simplicity of a cleaner trade-in route.",
      explanation: "The strongest trade-in calls usually combine a phone that is no longer ideal to keep, still has worthwhile trade-in value, and does not offer enough practical private-sale upside to justify the extra hassle. Those are the main signals here.",
      note: `Best practical route today looks like trading in at about ${currency(v.tradeValue)} while the phone still has usable value.`
    };
  }
  if (route === "RECYCLE NOW") {
    return {
      summary: "A recycler-style cash-out route looks strongest because the phone is losing comfort and value, and the clean, low-friction cash-out path now looks safer than waiting for a better number that may never arrive.",
      explanation: "Recycler-style outcomes become strongest when the phone is tired enough that private sale is less attractive, trade-in is weak, and a simple instant-cash route is the most realistic way to preserve something before the device gets worse.",
      note: `The simplest realistic exit route right now looks closer to about ${currency(v.recyclerValue)} from a recycler or instant-cash route.`
    };
  }
  if (route === "KEEP") {
    return {
      summary: "Keeping the phone looks stronger because the current cash-out routes are not compelling enough to justify giving up the useful life you still seem likely to get from it.",
      explanation: "The strongest keep calls usually combine a still-usable phone, weaker cash-out routes, and enough willingness to keep using it that acting now would feel early. That is what is supporting the keep side here.",
      note: numbers.monthlyValueAtRisk > 0 ? `You only appear to be risking about ${currency(numbers.monthlyValueAtRisk)} of cash-out value per month by keeping it for now.` : "There is not much immediate cash-out urgency in the current numbers."
    };
  }
  return {
    summary: "This is a close call: the phone still has enough useful life that keeping it can be defended, but the current cash-out options are good enough that acting now can also be justified.",
    explanation: "Your inputs split the decision. Some signals support keeping the device for more use, while others support capturing value now before the phone slides further. That is why this lands as borderline rather than a hard call.",
    note: `Best route today looks like ${buildRouteLabel(numbers.bestNow.route).toLowerCase()} at roughly ${currency(numbers.bestNow.raw)}, but the margin over waiting is not decisive.`
  };
}

function getPracticalLean(route) {
  if (route === "SELL PRIVATELY") return "Private sale";
  if (route === "TRADE IN") return "Trade-in";
  if (route === "RECYCLE NOW") return "Recycler";
  if (route === "KEEP") return "Keep using it";
  return "Balanced";
}

function buildActionPlan(v, result, numbers) {
  if (result.verdict === "SELL PRIVATELY") {
    return [
      {
        title: "Do this next",
        tone: "primary",
        items: [
          `List the phone while the direct-sale upside still looks worthwhile, because your best private-sale route is about ${currency(v.privateValue)} today.`,
          "Back up, erase, photograph condition clearly, and decide the lowest private-sale price you would actually accept before you list it.",
          "Keep trade-in as your fallback so you are not forced to wait too long if the phone does not sell quickly."
        ]
      },
      {
        title: "Recheck if this changes",
        tone: "watch",
        items: [
          "You decide the effort, fraud risk, or waiting time of a private sale is no longer worth it.",
          "Trade-in promotions jump enough to close the gap versus selling it yourself.",
          "Battery or performance gets worse, making a clean direct sale less attractive."
        ]
      }
    ];
  }

  if (result.verdict === "TRADE IN") {
    return [
      {
        title: "Do this next",
        tone: "primary",
        items: [
          `Get at least two live trade-in quotes now and lock in the cleanest one while the device still looks worth about ${currency(v.tradeValue)}.`,
          "Use private sale only as a benchmark, not a default, unless the real premium is clearly worth the extra hassle.",
          `Treat roughly ${currency(numbers.monthlyValueAtRisk)} per month as the cash-out value you may leak by waiting.`
        ]
      },
      {
        title: "Recheck if this changes",
        tone: "watch",
        items: [
          "A private-sale route proves much stronger than you expected after checking real listings.",
          "A cheap battery or repair fix removes the main daily friction and makes keeping easier to justify.",
          "The replacement phone you want becomes much more expensive than expected."
        ]
      }
    ];
  }

  if (result.verdict === "RECYCLE NOW") {
    return [
      {
        title: "Do this next",
        tone: "primary",
        items: [
          `Treat a recycler or instant-cash route as the cleanest exit path if you can still get around ${currency(v.recyclerValue)} without hassle.`,
          "Do not sink much time into chasing top-end resale if the phone is already rough, unreliable, or awkward to sell well.",
          "Back up and wipe the device sooner rather than later so you can cash out while the fallback route still exists."
        ]
      },
      {
        title: "Recheck if this changes",
        tone: "watch",
        items: [
          "A trade-in promotion appears that beats the recycler route cleanly.",
          "You discover the phone is in better condition than you thought and could sell directly for a useful premium.",
          "A cheap fix makes keeping it comfortable enough that urgency falls away."
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
          "Keep the phone and keep extracting value while the current sale routes still look too weak to justify moving now.",
          `Review the decision again before another ${Math.min(Math.max(v.holdMonths, 3), 6)} months passes or sooner if battery or performance drops sharply.`,
          v.fixCost > 0 ? `If you already expect about ${currency(v.fixCost)} of near-term repair cost, compare that directly against the value drop before spending it.` : "Use simple battery care and storage cleanup to slow the decline rather than replacing too early."
        ]
      },
      {
        title: "Recheck if this changes",
        tone: "watch",
        items: [
          "Trade-in or private-sale quotes improve enough to make the cash-out routes harder to ignore.",
          "Battery or performance moves from manageable to annoying in daily use.",
          "You shorten your planned hold window and want a new phone much sooner."
        ]
      }
    ];
  }

  return [
    {
      title: "Do this next",
      tone: "primary",
      items: [
        "Do not rush. The current inputs support both keeping it a bit longer and capturing value now.",
        `Use ${buildRouteLabel(numbers.bestNow.route).toLowerCase()} as your reference path, but only act if the live quote still feels strong enough.`,
        "Check one private-sale benchmark, one trade-in quote, and one recycler fallback before deciding."
      ]
    },
    {
      title: "Recheck if this changes",
      tone: "watch",
      items: [
        "The phone gets noticeably worse to use.",
        "The best cash-out quote falls again over the next few months.",
        "A new phone offer or promotion changes the real upgrade gap."
      ]
    }
  ];
}

function buildDecisionEdges(v, result, numbers) {
  if (["SELL PRIVATELY", "TRADE IN", "RECYCLE NOW"].includes(result.verdict)) {
    return [
      {
        title: "What keeps this as a sell-now call",
        label: "Current verdict stays strong",
        tone: "keep",
        intro: "Selling now stays strongest while the phone still has enough cash-out value that waiting feels expensive.",
        items: [
          `Your best route today still looks like ${buildRouteLabel(numbers.bestNow.route).toLowerCase()} at roughly ${currency(numbers.bestNow.raw)}.`,
          numbers.monthlyValueAtRisk >= 12 ? `You appear to be risking about ${currency(numbers.monthlyValueAtRisk)} of value each month by waiting.` : "The value window still looks open enough that acting now is defendable.",
          (v.performance === "rough" || v.battery === "poor") ? "Daily friction is already high enough that extracting more use does not look especially attractive." : "Keeping it longer does not obviously beat the value you can still lock in now."
        ]
      },
      {
        title: "What could flip it toward keeping",
        label: "Alternative outcome",
        tone: "flip",
        intro: "A sell-now verdict weakens if the phone still has comfortable runway left or the cash-out routes disappoint in practice.",
        items: [
          "A cheap battery or repair fix restores enough comfort that waiting becomes easier to justify.",
          "The real private-sale or trade-in route turns out weaker than expected after checking live quotes.",
          "You decide the replacement cost is too high to justify moving now."
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
        intro: "Keeping stays sensible while the phone remains usable and the cash-out routes stay underwhelming.",
        items: [
          "The phone still works well enough that extra months of use are genuinely valuable.",
          `The best current cash-out route is only about ${currency(numbers.bestNow.raw)}, which is not hard to walk away from if the device still feels fine.`,
          `You are comfortable holding it for around ${v.holdMonths} more months.`
        ]
      },
      {
        title: "What could flip it toward selling now",
        label: "Alternative outcome",
        tone: "flip",
        intro: "A keep verdict can turn quickly once convenience drops and resale value starts sliding faster than usefulness.",
        items: [
          "Battery or performance becomes noticeably worse in daily use.",
          "A private-sale or trade-in promotion increases the current cash-out value.",
          "Your planned hold window shortens and you know you want to replace it sooner."
        ]
      }
    ];
  }

  return [
    {
      title: "What would settle the call toward keeping",
      label: "Lower-pressure path",
      tone: "watch",
      intro: "Borderline phone decisions lean toward keeping when the device stays comfortable and the cash-out routes stay only mildly attractive.",
      items: [
        "Trade-in and private-sale quotes stay roughly where they are rather than collapsing.",
        "Battery and performance remain acceptable for your real daily use.",
        "The replacement phone you want still feels easy to postpone."
      ]
    },
    {
      title: "What would settle the call toward selling now",
      label: "Higher-pressure path",
      tone: "flip",
      intro: "Close calls lean toward selling now when the value window starts closing faster than the phone still helps you.",
      items: [
        "The best cash-out quote drops again over the next few months.",
        "Battery or performance becomes more frustrating than expected.",
        "A live trade-in or private-sale route looks stronger after you check real quotes."
      ]
    }
  ];
}

function evaluateScenario(rawValues, options) {
  const includeExamples = !options || options.includeExamples !== false;
  const v = normalize(rawValues);
  const numbers = buildRouteNumbers(v);
  let score = 0;
  const reasons = [];

  if (v.age >= 4) {
    score += 3;
    reasons.push("An older phone is more exposed to losing cash-out value quickly, which supports acting sooner.");
  } else if (v.age >= 3) {
    score += 2;
    reasons.push("Your phone is old enough that timing the resale route starts to matter more.");
  } else if (v.age <= 2) {
    score -= 2;
    reasons.push("A relatively recent phone is often still worth keeping if it remains solid in daily use.");
  }

  if (v.performance === "rough") {
    score += 4;
    reasons.push("Rough performance is a strong signal that the everyday value of keeping the phone is shrinking.");
  } else if (v.performance === "slowing") {
    score += 2;
    reasons.push("Performance is slipping enough to add real pressure toward cashing out sooner.");
  } else {
    score -= 2;
    reasons.push("If performance is still fast, keeping the phone becomes easier to justify.");
  }

  if (v.battery === "poor") {
    score += 4;
    reasons.push("Poor battery or reliability makes the phone harder to keep comfortably for much longer.");
  } else if (v.battery === "declining") {
    score += 2;
    reasons.push("Battery decline adds pressure because the device may lose usefulness faster from here.");
  } else {
    score -= 1;
    reasons.push("If battery health is still good, keeping the phone has more of a practical case.");
  }

  if (numbers.bestNow.raw >= 400) {
    score += 3;
    reasons.push("There is still a meaningful amount of cash-out value available now, which makes timing matter.");
  } else if (numbers.bestNow.raw >= 220) {
    score += 1;
    reasons.push("There is still enough value on the table that the timing question matters.");
  } else if (numbers.bestNow.raw <= 120) {
    score -= 2;
    reasons.push("If the best realistic cash-out route is already weak, keeping the phone becomes easier to defend.");
  }

  if (numbers.monthlyValueAtRisk >= 16) {
    score += 3;
    reasons.push(`You appear to be risking about ${currency(numbers.monthlyValueAtRisk)} per month in sale value if you wait.`);
  } else if (numbers.monthlyValueAtRisk >= 8) {
    score += 1;
    reasons.push(`You are still risking around ${currency(numbers.monthlyValueAtRisk)} per month by waiting, which is enough to matter.`);
  } else {
    score -= 1;
    reasons.push("The likely monthly value drop from waiting does not look especially severe right now.");
  }

  if (v.fixCost >= 120) {
    score += 2;
    reasons.push("A likely battery or repair spend soon makes keeping the phone harder to justify.");
  } else if (v.fixCost > 0) {
    score += 1;
    reasons.push("A small near-term fix cost adds some pressure toward moving on sooner.");
  }

  if (v.features === "high") {
    score += 2;
    reasons.push("A strong pull toward new features adds some pressure toward cashing out now.");
  } else if (v.features === "low") {
    score -= 1;
    reasons.push("If new features do not matter much, there is less pressure to give up a usable phone.");
  }

  if (v.holdMonths >= 18) {
    score -= 2;
    reasons.push("A longer planned hold window gives you more time to squeeze value out of the phone if it stays workable.");
  } else if (v.holdMonths <= 6) {
    score += 2;
    reasons.push("A short remaining hold window makes acting now easier to justify because you already expect to move on soon.");
  }

  if (v.replacementCost > 0) {
    const gap = Math.max(v.replacementCost - numbers.bestNow.raw, 0);
    if (gap >= 900) {
      score -= 2;
      reasons.push(`Replacing it still leaves roughly ${currency(gap)} to fund after the best current cash-out route, which softens the push to move now.`);
    } else if (gap <= 450) {
      score += 1;
      reasons.push("The replacement gap after cashing out now does not look especially punishing, so moving now is easier to defend.");
    }
  }

  if (numbers.bestNow.route === "SELL PRIVATELY" && v.saleEffort !== "low") {
    score += 1;
    reasons.push("There is enough direct-sale upside that selling it yourself is a realistic route rather than just a theoretical one.");
  }

  const engineResult = runDecisionEngine({
    score,
    maxScore: 22,
    closeness: Math.min(Math.abs(score) / 22, 1),
    thresholds: { positive: 5, negative: -3 },
    verdicts: { positive: "SELL NOW", negative: "KEEP", neutral: "BORDERLINE" },
    reasons,
    realLife: [
      `Best current route looks like ${buildRouteLabel(numbers.bestNow.route).toLowerCase()} at about ${currency(numbers.bestNow.raw)} today.`,
      `If you keep it for around ${v.holdMonths} more months, the best route may fall closer to about ${currency(numbers.bestFuture.effective)} on current assumptions.`,
      v.fixCost > 0 ? `A likely near-term fix of about ${currency(v.fixCost)} matters because it can wipe out part of the value you hoped to preserve.` : "Because there is no immediate fix cost entered, the result is focused more on value decay and daily friction.",
      v.replacementCost > 0 ? `Replacing it would still leave about ${currency(Math.max(v.replacementCost - numbers.bestNow.raw, 0))} to fund after the strongest current cash-out route.` : "Without a replacement budget entered, the result is focused more on resale timing than on the cost of the next phone."
    ],
    summaryByVerdict: {
      "SELL NOW": "Selling now looks stronger because the phone's remaining everyday value is falling while the current cash-out routes are still meaningful enough to preserve.",
      KEEP: "Keeping the phone looks stronger because it still has enough everyday value that cashing out now would likely be giving up useful life too early.",
      BORDERLINE: "This is a close call: the phone still has usable life left, but the current cash-out options are strong enough that acting now can still be defended."
    },
    explanationByVerdict: {
      "SELL NOW": "The strongest sell-now cases combine age, battery or performance decline, and enough current value that waiting feels more expensive than it first appears.",
      KEEP: "The strongest keep cases combine a relatively stable phone, weaker cash-out routes, and low pressure to upgrade.",
      BORDERLINE: "Your inputs split the decision. Some signals support keeping the phone, while others support capturing value now before the phone slips further."
    }
  });

  let verdict = engineResult.verdict;
  if (verdict === "SELL NOW") {
    if (numbers.bestNow.route === "SELL PRIVATELY" && v.saleEffort !== "low" && !(v.performance === "rough" && v.battery === "poor" && v.fixCost > 0)) {
      verdict = "SELL PRIVATELY";
    } else if (numbers.bestNow.route === "RECYCLE NOW" && (v.performance === "rough" || v.battery === "poor")) {
      verdict = "RECYCLE NOW";
    } else {
      verdict = "TRADE IN";
    }
  }

  const copy = buildSummaryAndExplanation(verdict, v, numbers);
  const result = {
    ...engineResult,
    verdict,
    summary: copy.summary,
    explanation: copy.explanation,
    note: copy.note
  };

  result.signalBreakdown = [
    {
      label: "Best route now",
      detail: `${buildRouteLabel(numbers.bestNow.route)} · ${currency(numbers.bestNow.raw)}`,
      leanText: numbers.bestNow.route === "SELL PRIVATELY" ? "Direct sale currently gives the best upside" : numbers.bestNow.route === "TRADE IN" ? "Trade-in currently looks like the cleanest value capture" : "Recycler fallback currently looks like the cleanest low-friction exit",
      tone: result.verdict === "BORDERLINE" ? "mixed" : (["SELL PRIVATELY", "TRADE IN", "RECYCLE NOW"].includes(result.verdict) ? "toward" : "away"),
      strength: clamp(Math.round((numbers.bestNow.raw / Math.max(v.tradeValue || 1, 1)) * 55), 40, 92)
    },
    {
      label: "Condition and usability",
      detail: `${labelize(v.performance)} performance · ${labelize(v.battery)} battery`,
      leanText: (v.performance === "rough" || v.battery === "poor") ? "Daily friction pushes toward cashing out" : "Stable daily use supports keeping",
      tone: result.verdict === "BORDERLINE" ? "mixed" : ((v.performance === "rough" || v.battery === "poor") ? (["SELL PRIVATELY", "TRADE IN", "RECYCLE NOW"].includes(result.verdict) ? "toward" : "away") : (result.verdict === "KEEP" ? "toward" : "away")),
      strength: (v.performance === "rough" || v.battery === "poor") ? 88 : (v.performance === "slowing" || v.battery === "declining") ? 64 : 40
    },
    {
      label: "Value decay if you wait",
      detail: `${currency(numbers.monthlyValueAtRisk)} per month at risk`,
      leanText: numbers.monthlyValueAtRisk >= 12 ? "Waiting could bleed value faster than it seems" : numbers.monthlyValueAtRisk <= 5 ? "Waiting is not destroying much value right now" : "Value is still slipping, but not dramatically",
      tone: result.verdict === "BORDERLINE" ? "mixed" : (numbers.monthlyValueAtRisk >= 12 ? (["SELL PRIVATELY", "TRADE IN", "RECYCLE NOW"].includes(result.verdict) ? "toward" : "away") : (result.verdict === "KEEP" ? "toward" : "mixed")),
      strength: numbers.monthlyValueAtRisk >= 16 ? 86 : numbers.monthlyValueAtRisk >= 8 ? 63 : 34
    },
    {
      label: "Replacement and effort pressure",
      detail: v.replacementCost > 0 ? `Next phone about ${currency(v.replacementCost)} · selling effort ${labelize(v.saleEffort)}` : `Selling effort ${labelize(v.saleEffort)}`,
      leanText: v.replacementCost >= 900 ? "A bigger replacement gap softens the push to move now" : v.saleEffort === "low" ? "Low willingness to sell privately makes simple routes more practical" : "Effort tolerance leaves more of the market open",
      tone: result.verdict === "BORDERLINE" ? "mixed" : ((v.replacementCost >= 900 || v.saleEffort === "low") ? (result.verdict === "KEEP" ? "toward" : "away") : (["SELL PRIVATELY", "TRADE IN", "RECYCLE NOW"].includes(result.verdict) ? "toward" : "away")),
      strength: v.replacementCost >= 900 ? 62 : v.saleEffort === "high" ? 58 : 46
    }
  ];

  result.valueWindow = currency(numbers.monthlyValueAtRisk);
  result.holdWindow = `${v.holdMonths} months`;
  result.practicalLean = getPracticalLean(result.verdict);
  result.actionPlan = buildActionPlan(v, result, numbers);
  result.decisionEdges = buildDecisionEdges(v, result, numbers);

  if (includeExamples) {
    const scenarios = [
      {
        title: "If private sale gives a real premium",
        input: { ...v, privateValue: Math.max(v.privateValue, v.tradeValue + 140), saleEffort: "high", holdMonths: Math.min(v.holdMonths, 4) }
      },
      {
        title: "If you keep it for another year",
        input: { ...v, holdMonths: Math.max(v.holdMonths, 12), performance: "fast", battery: "good" }
      },
      {
        title: "If battery gets worse and quotes fall",
        input: { ...v, battery: "poor", performance: "rough", tradeValue: Math.max(v.tradeValue - 90, 0), privateValue: Math.max(v.privateValue - 120, 0) }
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
    holdMonths: Number(v.holdMonths),
    privateValue: v.privateValue === null ? null : Number(v.privateValue),
    recyclerValue: v.recyclerValue === null ? null : Number(v.recyclerValue),
    fixCost: v.fixCost === null ? null : Number(v.fixCost),
    replacementCost: v.replacementCost === null ? null : Number(v.replacementCost),
    saleEffort: String(v.saleEffort || "medium")
  };
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
        `Private-sale estimate: ${v.privateValue !== null ? currency(v.privateValue) : "defaulted"}`,
        `Recycler route: ${v.recyclerValue !== null ? currency(v.recyclerValue) : "defaulted"}`,
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
    "WorthItCheck — Trade In, Sell, or Keep Your Phone",
    `Result: ${result.verdict} (${result.confidenceText})`,
    `Summary: ${result.summary}`,
    result.note ? `Timing note: ${result.note}` : "",
    `Inputs: ${v.age}-year-old phone, trade-in ${currency(v.tradeValue)}, performance ${labelize(v.performance).toLowerCase()}, battery ${labelize(v.battery).toLowerCase()}, feature pull ${labelize(v.features).toLowerCase()}, planned hold ${v.holdMonths} months, sale effort ${labelize(v.saleEffort).toLowerCase()}.`,
    v.privateValue !== null ? `Private-sale estimate: ${currency(v.privateValue)}.` : "",
    v.recyclerValue !== null ? `Recycler / instant-cash estimate: ${currency(v.recyclerValue)}.` : "",
    v.replacementCost !== null ? `Replacement phone cost: ${currency(v.replacementCost)}.` : "",
    "Key reasons:",
    ...result.reasons.slice(0, 3).map((item) => `- ${item}`),
    "Next step:",
    ...nextMove.map((item) => `- ${item}`)
  ].filter(Boolean).join("\n");
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
    emptyText: 'The compare view helps you see whether trade-in, private sale, or holding longer is really changing the outcome.'
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
      : result.verdict === "BORDERLINE"
        ? "verdict-borderline"
        : "verdict-replace"
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
  const nextValues = {
    ...sharedState,
    privateValue: sharedState.privateValue === null || sharedState.privateValue === undefined ? null : Number(sharedState.privateValue),
    recyclerValue: sharedState.recyclerValue === null || sharedState.recyclerValue === undefined ? null : Number(sharedState.recyclerValue),
    fixCost: sharedState.fixCost === null || sharedState.fixCost === undefined ? null : Number(sharedState.fixCost),
    replacementCost: sharedState.replacementCost === null || sharedState.replacementCost === undefined ? null : Number(sharedState.replacementCost)
  };
  applyFormValues(form, nextValues);
  if (!validate(nextValues)) {
    runScenario(nextValues, { kind: "shared-link" });
  }
}
