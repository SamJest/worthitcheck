
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
const depreciationGapEl = document.querySelector("#new-used-depreciation-gap");
const focusWindowEl = document.querySelector("#new-used-focus-window");
const financeNoteEl = document.querySelector("#new-used-finance-note");
const new3El = document.querySelector("#new-used-new-3yr");
const used3El = document.querySelector("#new-used-used-3yr");
const new5El = document.querySelector("#new-used-new-5yr");
const used5El = document.querySelector("#new-used-used-5yr");
const financeInterestEl = document.querySelector("#new-used-finance-interest");
const realLifeEl = document.querySelector("#new-used-real-life");
const generatedExamplesEl = document.querySelector("#new-used-generated-examples");
const signalBreakdownEl = document.querySelector("#new-used-signal-breakdown");
const actionPlanEl = document.querySelector("#new-used-action-plan");
const decisionEdgesEl = document.querySelector("#new-used-decision-edges");
const snapshotEl = document.querySelector("#new-used-snapshot");
const copyLinkButton = document.querySelector("#new-used-copy-link");
const copySummaryButton = document.querySelector("#new-used-copy-summary");
const comparisonEl = document.querySelector("#new-used-comparison");
const saveCompareButton = document.querySelector("#new-used-save-compare");
const clearCompareButton = document.querySelector("#new-used-clear-compare");

let latestValues = null;
let latestResult = null;
const examplesToggle = document.querySelector("#examples-toggle");
const extraExamples = Array.from(document.querySelectorAll(".extra-example"));

const timers = [];
const steps = [
  "Estimating 3-year and 5-year ownership costs...",
  "Projecting depreciation and finance drag...",
  "Blending warranty certainty with used-car risk...",
  "Finalizing recommendation..."
];

const {
  applyFormValues,
  bindCopyStateLinkButton,
  bindCopySummaryButton,
  bindExampleReplay,
  clearTimers,
  createShareUrl,
  initializeExamplesToggle,
  readShareState,
  renderActionPlan,
  renderDecisionEdges,
  renderDecisionSnapshot,
  renderExampleScenarios,
  renderSignalBreakdown,
  revealResultCard,
  runAnalysis,
  runDecisionEngine,
  setLoading,
  trackEvent,
  writeShareState
} = window.WorthItCheckTooling;

function maybeNumber(data, name) {
  const raw = data.get(name);
  if (raw === null || raw === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function shareValue(value) {
  return value === null || value === undefined ? "" : String(value);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function gbp(value) {
  const rounded = Math.round(Number(value) || 0);
  return rounded.toLocaleString("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0
  });
}

function percent(value) {
  return `${Math.round((Number(value) || 0) * 100)}%`;
}

function maybeRounded(value) {
  return Number.isFinite(value) ? Math.round(value * 10) / 10 : value;
}

function labelize(value) {
  const text = String(value || "").replace(/-/g, " ").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

function values() {
  const data = new FormData(form);
  return {
    years: Number(data.get("years")),
    mileage: Number(data.get("mileage")),
    budget: data.get("budget"),
    warranty: data.get("warranty"),
    features: data.get("features"),
    risk: data.get("risk"),
    inspection: data.get("inspection"),
    newPrice: maybeNumber(data, "newPrice"),
    usedPrice: maybeNumber(data, "usedPrice"),
    usedAge: maybeNumber(data, "usedAge"),
    deposit: maybeNumber(data, "deposit"),
    apr: maybeNumber(data, "apr"),
    financeTermYears: maybeNumber(data, "financeTermYears"),
    newAnnualInsurance: maybeNumber(data, "newAnnualInsurance"),
    usedAnnualInsurance: maybeNumber(data, "usedAnnualInsurance"),
    newAnnualTax: maybeNumber(data, "newAnnualTax"),
    usedAnnualTax: maybeNumber(data, "usedAnnualTax"),
    newAnnualMaintenance: maybeNumber(data, "newAnnualMaintenance"),
    usedAnnualMaintenance: maybeNumber(data, "usedAnnualMaintenance")
  };
}

function validate(v) {
  if (!Number.isFinite(v.years) || v.years <= 0) return "Enter a valid ownership timeline in years.";
  if (!Number.isFinite(v.mileage) || v.mileage <= 0) return "Enter a valid annual mileage estimate.";
  if (v.mileage > 60000) return "That mileage looks unusually high. Check the number and try again.";
  if (v.newPrice !== null && v.newPrice < 5000) return "New-car price looks too low. Check the amount and try again.";
  if (v.usedPrice !== null && v.usedPrice < 2000) return "Used-car price looks too low. Check the amount and try again.";
  if (v.newPrice !== null && v.usedPrice !== null && v.usedPrice >= v.newPrice) return "Used-car price should usually be lower than new-car price in this comparison.";
  if (v.usedAge !== null && (v.usedAge < 0.5 || v.usedAge > 12)) return "Used-car age should stay between 0.5 and 12 years.";
  if (v.apr !== null && (v.apr < 0 || v.apr > 25)) return "APR should stay between 0% and 25%.";
  if (v.financeTermYears !== null && (v.financeTermYears < 1 || v.financeTermYears > 8)) return "Finance term should stay between 1 and 8 years.";
  return "";
}

function getBaseNewPrice(v) {
  let price = 28500;
  if (v.features === "high") price += 2500;
  else if (v.features === "medium") price += 1200;
  if (v.warranty === "high") price += 1200;
  if (v.mileage >= 18000) price += 2500;
  else if (v.mileage >= 13000) price += 1200;
  if (v.budget === "high") price -= 2000;
  else if (v.budget === "low") price += 1200;
  return clamp(price, 22000, 42000);
}

function getDefaults(v) {
  const newPrice = getBaseNewPrice(v);
  const usedAge = v.inspection === "yes" ? 4 : (v.risk === "high" ? 4.5 : 3.5);
  const usedFactor = usedAge >= 5 ? 0.56 : usedAge >= 3 ? 0.66 : 0.76;
  const usedPrice = Math.round(newPrice * usedFactor / 100) * 100;
  const deposit = Math.round(newPrice * 0.1 / 100) * 100;
  const mileageBand = v.mileage >= 18000 ? 1.2 : v.mileage >= 13000 ? 1.08 : v.mileage <= 9000 ? 0.92 : 1;
  const newAnnualInsurance = Math.round((920 * mileageBand + (v.features === "high" ? 80 : 0)) / 10) * 10;
  const usedAnnualInsurance = Math.round((840 * mileageBand + (usedAge >= 5 ? 70 : 20)) / 10) * 10;
  const newAnnualTax = 240;
  const usedAnnualTax = usedAge >= 5 ? 360 : 300;
  const newAnnualMaintenance = Math.round((380 + (v.mileage >= 18000 ? 110 : v.mileage >= 13000 ? 60 : 0)) / 10) * 10;
  const usedAnnualMaintenance = Math.round((780 + usedAge * 55 + (v.mileage >= 18000 ? 180 : v.mileage >= 13000 ? 90 : 0)) / 10) * 10;

  return {
    newPrice,
    usedPrice,
    usedAge,
    deposit,
    apr: 6.6,
    financeTermYears: 4,
    newAnnualInsurance,
    usedAnnualInsurance,
    newAnnualTax,
    usedAnnualTax,
    newAnnualMaintenance,
    usedAnnualMaintenance
  };
}

function normalize(v) {
  const defaults = getDefaults(v);
  const normalized = {
    years: v.years,
    mileage: v.mileage,
    budget: v.budget,
    warranty: v.warranty,
    features: v.features,
    risk: v.risk,
    inspection: v.inspection,
    newPrice: v.newPrice === null ? defaults.newPrice : v.newPrice,
    usedPrice: v.usedPrice === null ? defaults.usedPrice : v.usedPrice,
    usedAge: v.usedAge === null ? defaults.usedAge : v.usedAge,
    deposit: v.deposit === null ? defaults.deposit : v.deposit,
    apr: v.apr === null ? defaults.apr : v.apr,
    financeTermYears: v.financeTermYears === null ? defaults.financeTermYears : v.financeTermYears,
    newAnnualInsurance: v.newAnnualInsurance === null ? defaults.newAnnualInsurance : v.newAnnualInsurance,
    usedAnnualInsurance: v.usedAnnualInsurance === null ? defaults.usedAnnualInsurance : v.usedAnnualInsurance,
    newAnnualTax: v.newAnnualTax === null ? defaults.newAnnualTax : v.newAnnualTax,
    usedAnnualTax: v.usedAnnualTax === null ? defaults.usedAnnualTax : v.usedAnnualTax,
    newAnnualMaintenance: v.newAnnualMaintenance === null ? defaults.newAnnualMaintenance : v.newAnnualMaintenance,
    usedAnnualMaintenance: v.usedAnnualMaintenance === null ? defaults.usedAnnualMaintenance : v.usedAnnualMaintenance
  };

  normalized.assumptionMode = [
    v.newPrice === null ? "new price defaulted" : "",
    v.usedPrice === null ? "used price defaulted" : "",
    v.usedAge === null ? "used age defaulted" : "",
    v.deposit === null ? "deposit defaulted" : "",
    v.apr === null ? "APR defaulted" : "",
    v.newAnnualInsurance === null ? "new-car insurance defaulted" : "",
    v.usedAnnualInsurance === null ? "used-car insurance defaulted" : "",
    v.newAnnualMaintenance === null ? "new-car maintenance defaulted" : "",
    v.usedAnnualMaintenance === null ? "used-car maintenance defaulted" : ""
  ].filter(Boolean);

  return normalized;
}

function amortizedPayment(principal, annualRate, years) {
  if (principal <= 0) return 0;
  const months = Math.max(1, Math.round(years * 12));
  const monthlyRate = annualRate / 100 / 12;

  if (monthlyRate === 0) {
    return principal / months;
  }

  return principal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months));
}

function remainingBalance(principal, annualRate, years, paymentsMade) {
  if (principal <= 0) return 0;

  const months = Math.max(1, Math.round(years * 12));
  const paid = Math.min(Math.max(paymentsMade, 0), months);
  const monthlyRate = annualRate / 100 / 12;

  if (paid >= months) return 0;
  if (monthlyRate === 0) {
    return principal * Math.max(0, 1 - paid / months);
  }

  const payment = amortizedPayment(principal, annualRate, years);
  return Math.max(
    0,
    principal * Math.pow(1 + monthlyRate, paid) -
      payment * ((Math.pow(1 + monthlyRate, paid) - 1) / monthlyRate)
  );
}

function depreciationRates(v) {
  const mileagePenalty = v.mileage >= 18000 ? 0.03 : v.mileage >= 13000 ? 0.015 : v.mileage <= 9000 ? -0.01 : 0;
  const newAnnual = clamp(0.145 + mileagePenalty + (v.features === "high" ? 0.01 : 0), 0.11, 0.2);
  const usedAnnual = clamp(0.1 + mileagePenalty / 1.5 + (v.usedAge >= 5 ? 0.015 : 0), 0.07, 0.16);
  return { newAnnual, usedAnnual };
}

function residualValue(price, annualRate, years, floorFactor) {
  const value = price * Math.pow(1 - annualRate, years);
  return Math.max(price * floorFactor, value);
}

function optionModel(price, depositInput, apr, financeTermYears, annualInsurance, annualTax, annualMaintenance, endValue, years) {
  const deposit = clamp(depositInput, 0, price);
  const loanAmount = Math.max(price - deposit, 0);
  const financePayment = amortizedPayment(loanAmount, apr, financeTermYears);
  const paymentsMade = Math.min(Math.round(years * 12), Math.round(financeTermYears * 12));
  const financePaidTotal = financePayment * paymentsMade;
  const remaining = remainingBalance(loanAmount, apr, financeTermYears, paymentsMade);
  const principalPaid = Math.max(0, loanAmount - remaining);
  const financeInterest = Math.max(0, financePaidTotal - principalPaid);
  const runningTotal = (annualInsurance + annualTax + annualMaintenance) * years;
  const endEquity = Math.max(0, endValue - remaining);
  const depreciation = Math.max(0, price - endValue);

  return {
    years,
    deposit,
    loanAmount,
    financePayment,
    financePaidTotal,
    financeInterest,
    runningTotal,
    depreciation,
    endValue,
    endEquity,
    netCost: deposit + financePaidTotal + runningTotal - endEquity
  };
}

function buildCostModel(v) {
  const normalized = normalize(v);
  const rates = depreciationRates(normalized);

  const new3End = residualValue(normalized.newPrice, rates.newAnnual, 3, 0.42);
  const new5End = residualValue(normalized.newPrice, rates.newAnnual + 0.01, 5, 0.28);
  const used3End = residualValue(normalized.usedPrice, rates.usedAnnual, 3, 0.28);
  const used5End = residualValue(normalized.usedPrice, rates.usedAnnual + 0.005, 5, 0.16);

  const new3 = optionModel(
    normalized.newPrice,
    normalized.deposit,
    normalized.apr,
    normalized.financeTermYears,
    normalized.newAnnualInsurance,
    normalized.newAnnualTax,
    normalized.newAnnualMaintenance,
    new3End,
    3
  );

  const used3 = optionModel(
    normalized.usedPrice,
    Math.min(normalized.deposit, normalized.usedPrice),
    normalized.apr + 0.6,
    normalized.financeTermYears,
    normalized.usedAnnualInsurance,
    normalized.usedAnnualTax,
    normalized.usedAnnualMaintenance,
    used3End,
    3
  );

  const new5 = optionModel(
    normalized.newPrice,
    normalized.deposit,
    normalized.apr,
    normalized.financeTermYears,
    normalized.newAnnualInsurance,
    normalized.newAnnualTax,
    normalized.newAnnualMaintenance,
    new5End,
    5
  );

  const used5 = optionModel(
    normalized.usedPrice,
    Math.min(normalized.deposit, normalized.usedPrice),
    normalized.apr + 0.6,
    normalized.financeTermYears,
    normalized.usedAnnualInsurance,
    normalized.usedAnnualTax,
    normalized.usedAnnualMaintenance,
    used5End,
    5
  );

  const focusYears = normalized.years <= 4 ? 3 : 5;
  const focus = focusYears === 3 ? { newCost: new3, usedCost: used3 } : { newCost: new5, usedCost: used5 };
  const annualRunningGap = (normalized.usedAnnualInsurance + normalized.usedAnnualTax + normalized.usedAnnualMaintenance) -
    (normalized.newAnnualInsurance + normalized.newAnnualTax + normalized.newAnnualMaintenance);

  return {
    input: normalized,
    rates,
    new3,
    used3,
    new5,
    used5,
    focusYears,
    focus,
    annualRunningGap,
    newVsUsedFinanceDrag: new3.financeInterest - used3.financeInterest,
    newDepreciationGap: (focusYears === 3 ? new3.depreciation - used3.depreciation : new5.depreciation - used5.depreciation)
  };
}

function getBudgetPressure(v, result) {
  if (v.budget === "high" && result.model.focus.usedCost.netCost + 1200 < result.model.focus.newCost.netCost) return "Strong used-cost pull";
  if (v.budget === "low" && result.verdict === "NEW") return "Budget leaves room";
  return "Moderate";
}

function getCertaintyNeed(v, verdict) {
  if (verdict === "NEW" && (v.warranty === "high" || v.risk === "low")) return "New-car certainty matters";
  if (verdict === "USED" && v.inspection === "yes") return "Used risk is manageable";
  return "Mixed";
}

function getPracticalLean(verdict) {
  if (verdict === "NEW") return "Lower surprise risk";
  if (verdict === "USED") return "Lower total spend";
  return "Depends on shortlist quality";
}

function buildActionPlan(v, result) {
  if (result.verdict === "NEW") {
    return [
      {
        title: "Do this next",
        tone: "primary",
        items: [
          "Get one real finance quote and one nearly-new quote so you can see whether new is still winning once the exact used alternative is known.",
          "Keep extras, paint protection, and dealer add-ons under control so the new-car premium stays justified.",
          "Focus on models with strong long-term reliability so the certainty you are paying for is real, not just newer metal."
        ]
      },
      {
        title: "Recheck if this changes",
        tone: "watch",
        items: [
          "A clean nearly-new or ex-demo car appears with a meaningful discount.",
          "Insurance or finance for the new car comes in much higher than expected.",
          "Your budget tightens enough that lower total spend matters more than cleaner warranty cover."
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
          "Only compare used cars with full service history and a realistic inspection path, because the cheaper option only wins if the car is genuinely sound.",
          "Keep a repair buffer aside so the lower purchase price stays a real saving.",
          "Run the cost view again with the exact used-car quote and insurance group once you have a real shortlist."
        ]
      },
      {
        title: "Recheck if this changes",
        tone: "watch",
        items: [
          "The used-car discount versus new is smaller than expected.",
          "You find that insurance, maintenance, or finance wipes out a lot of the used saving.",
          "You become much less comfortable with uncertainty after seeing weak condition or patchy history."
        ]
      }
    ];
  }

  return [
    {
      title: "Do this next",
      tone: "primary",
      items: [
        "Compare one new quote, one nearly-new quote, and one older used quote using the same deposit and finance term.",
        "Use service history, warranty cover, and your real insurance quotes as the tie-breakers.",
        "Treat the cleaner 5-year story and the cleaner 3-year story as separate decisions if you might change cars early."
      ]
    },
    {
      title: "Recheck if this changes",
      tone: "watch",
      items: [
        "The used car turns out to be cleaner and better documented than expected.",
        "The new-car deal includes unusually strong finance or warranty support.",
        "Your ownership timeline changes enough that the 3-year and 5-year views stop pointing the same way."
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
        intro: "New stays stronger when the used saving is not big enough to compensate for extra risk and running-cost uncertainty.",
        items: [
          "You still value warranty cover and low surprise risk more than chasing the cheapest upfront deal.",
          `The ${result.model.focusYears}-year view is not showing enough used-car savings to outweigh the cleaner ownership experience.`,
          "You expect to keep the car long enough for certainty and retained value to matter."
        ]
      },
      {
        title: "What could flip it toward used",
        label: "Alternative outcome",
        tone: "flip",
        intro: "The case for new weakens when a trustworthy used option creates a clearly better total-cost story.",
        items: [
          "A well-documented used car appears with a much larger discount than the tool assumed.",
          "Used-car insurance and maintenance look better than expected.",
          "The new-car finance deal or depreciation outlook turns out materially worse than your current assumptions."
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
        intro: "Used stays stronger when lower total spend survives inspection, running costs, and realistic ownership assumptions.",
        items: [
          `The ${result.model.focusYears}-year view still shows a meaningful saving for used.`,
          "You remain comfortable checking service history, condition, and inspection quality properly.",
          "Warranty certainty still matters less than keeping the overall spend under control."
        ]
      },
      {
        title: "What could flip it toward new",
        label: "Alternative outcome",
        tone: "flip",
        intro: "A used verdict can change when the discount is not large enough or the quality of the actual car looks weak.",
        items: [
          "The used cars you find have weak history, patchy condition, or high maintenance risk.",
          "New-car incentives, finance, or warranty cover improve enough to narrow the real cost gap.",
          "You decide lower surprise risk matters more than squeezing out the last bit of value."
        ]
      }
    ];
  }

  return [
    {
      title: "What would settle the call toward used",
      label: "Value path",
      tone: "watch",
      intro: "Close calls lean toward used when the discount stays meaningful after running costs and inspection quality are checked.",
      items: [
        "A clean used option appears with strong history and a real discount versus new.",
        "Insurance and maintenance quotes do not erase the value gap.",
        "You remain comfortable with some uncertainty in exchange for lower total spend."
      ]
    },
    {
      title: "What would settle the call toward new",
      label: "Certainty path",
      tone: "flip",
      intro: "Close calls lean toward new when warranty cover and predictability start mattering more than the headline saving.",
      items: [
        "The used shortlist looks weaker or riskier than expected.",
        "A new-car deal narrows the gap enough to make certainty worth paying for.",
        "You realise you want a cleaner ownership experience more than the cheapest path."
      ]
    }
  ];
}

function evaluateScenario(rawValues, options) {
  const includeExamples = !options || options.includeExamples !== false;
  const v = normalize(rawValues);
  const model = buildCostModel(v);

  let score = 0;
  const reasons = [];
  let note = "";

  const focusNew = model.focus.newCost.netCost;
  const focusUsed = model.focus.usedCost.netCost;
  const focusDelta = focusUsed - focusNew;
  const focusPercent = Math.abs(focusDelta) / Math.max(1, (focusNew + focusUsed) / 2);

  if (focusDelta >= 1800 || focusPercent >= 0.1) {
    score += 4;
    reasons.push(`On the main ${model.focusYears}-year cost lens, the new-car route is estimated to be about ${gbp(Math.abs(focusDelta))} cheaper once depreciation, finance, insurance, tax, and maintenance are blended together.`);
  } else if (focusDelta <= -1800 || focusPercent >= 0.1) {
    score -= 4;
    reasons.push(`On the main ${model.focusYears}-year cost lens, the used-car route is estimated to be about ${gbp(Math.abs(focusDelta))} cheaper once depreciation, finance, insurance, tax, and maintenance are blended together.`);
  } else {
    reasons.push(`On the main ${model.focusYears}-year cost lens, the estimated cost gap stays tight at around ${gbp(Math.abs(focusDelta))}, so the softer signals still matter.`);
  }

  const threeYearDelta = model.used3.netCost - model.new3.netCost;
  const fiveYearDelta = model.used5.netCost - model.new5.netCost;
  if (threeYearDelta > 1200 && fiveYearDelta > 1200) {
    score += 2;
    reasons.push("Both the 3-year and 5-year ownership views lean toward new, which makes the cost case more resilient.");
  } else if (threeYearDelta < -1200 && fiveYearDelta < -1200) {
    score -= 2;
    reasons.push("Both the 3-year and 5-year ownership views lean toward used, which makes the value case harder to ignore.");
  } else {
    reasons.push("The 3-year and 5-year views do not point equally hard in one direction, which is why timeline still matters here.");
  }

  if (v.budget === "high") {
    score -= 3;
    reasons.push("Keeping the overall spend down matters a lot to you, which naturally strengthens the case for used when the numbers allow it.");
  } else if (v.budget === "medium") {
    score -= 1;
    reasons.push("Budget pressure still adds some weight toward used value.");
  } else {
    score += 1;
    reasons.push("Lighter budget pressure gives new-car certainty more room to justify itself.");
  }

  if (v.warranty === "high") {
    score += 4;
    reasons.push("Strong warranty and reliability certainty is still one of the biggest reasons people pay up for new.");
  } else if (v.warranty === "medium") {
    score += 2;
    reasons.push("Warranty and peace of mind matter enough to give new some real pull.");
  } else {
    score -= 1;
    reasons.push("If warranty certainty is not a major priority, used becomes easier to defend.");
  }

  if (v.features === "high") {
    score += 2;
    reasons.push("A strong desire for the latest safety and tech features adds support for buying new.");
  } else if (v.features === "medium") {
    score += 1;
    reasons.push("Some interest in newer features adds a little support for new.");
  }

  if (v.risk === "high") {
    score -= 3;
    reasons.push("Comfort with used-car maintenance and history risk makes used much easier to justify.");
  } else if (v.risk === "medium") {
    score -= 1;
    reasons.push("Moderate comfort with used-car risk adds some support for used.");
  } else {
    score += 3;
    reasons.push("Low tolerance for used-car risk makes new the cleaner fit.");
  }

  if (v.years <= 3) {
    score -= 2;
    reasons.push("A shorter ownership timeline often supports used because paying the new-car premium is harder to recover quickly.");
  } else if (v.years >= 6) {
    score += 2;
    reasons.push("A longer ownership plan gives new more time to justify itself through certainty and retained value.");
  }

  if (v.mileage >= 18000) {
    score += 2;
    reasons.push("High annual mileage increases the value of reliability certainty and usually makes new easier to defend.");
  } else if (v.mileage <= 9000) {
    score -= 1;
    reasons.push("Lower annual mileage makes it easier to justify a used car because you may not need maximum long-term certainty.");
  }

  if (v.inspection === "yes") {
    score -= 2;
    reasons.push("Access to a trusted mechanic or inspection lowers some of the risk that usually pushes buyers toward new.");
  } else {
    score += 1;
    reasons.push("Without a trusted inspection path, new gains extra safety value.");
  }

  if (model.annualRunningGap >= 350) {
    score -= 1;
    reasons.push(`The used-car running-cost assumptions are about ${gbp(model.annualRunningGap)} per year heavier than new, which means the sticker-price saving has to work harder.`);
  } else if (model.annualRunningGap <= 100) {
    score -= 1;
    reasons.push("The running-cost gap between new and used does not look severe enough on its own to kill the value case for used.");
  }

  if (v.warranty === "high" && v.risk === "low" && focusDelta > -1000) {
    score += 2;
    note = "Strong new fit: the cost gap is not big enough to outweigh how much certainty and lower surprise risk matter to you.";
  } else if (v.budget === "high" && v.risk !== "low" && focusDelta < 0) {
    score -= 2;
    note = "Strong used fit: value matters and the cost model still leaves used ahead enough to justify dealing with a bit more uncertainty.";
  }

  let verdictOverride = "";
  if (v.budget === "high" && v.years <= 3 && v.risk !== "low" && focusDelta < 0) verdictOverride = "USED";
  if (v.warranty === "high" && v.risk === "low" && v.years >= 5 && focusDelta > -1200) verdictOverride = "NEW";

  const result = runDecisionEngine({
    score,
    maxScore: 18,
    closeness: Math.min(Math.abs(score) / 18, 1),
    thresholds: { positive: 4, negative: -4 },
    verdicts: { positive: "NEW", negative: "USED", neutral: "BORDERLINE" },
    verdictOverride,
    reasons,
    realLife: [
      focusDelta < 0
        ? `On the main ${model.focusYears}-year lens, used is estimated to save about ${gbp(Math.abs(focusDelta))} overall, which is why value keeps showing up so strongly.`
        : `On the main ${model.focusYears}-year lens, new is estimated to save about ${gbp(Math.abs(focusDelta))} overall once running costs and retained value are blended in.`,
      model.newVsUsedFinanceDrag > 0
        ? `The finance side on new is carrying around ${gbp(model.newVsUsedFinanceDrag)} more interest drag than the used example in the shorter view, so new has to earn that back elsewhere.`
        : "The finance gap is not especially punishing for new, which makes warranty certainty easier to justify.",
      model.newDepreciationGap > 0
        ? `New is estimated to lose about ${gbp(model.newDepreciationGap)} more to depreciation over the main lens, which is one of the biggest reasons used can still win.`
        : "The depreciation difference is not wildly one-sided, which is why certainty and condition risk still matter on this call.",
      v.inspection === "yes"
        ? "Having an inspection path makes a used shortlist much safer than it would be for a buyer going in blind."
        : "Without inspection backup, the quality of the actual used car matters more than the headline price."
    ],
    summaryByVerdict: {
      NEW: "Buying new looks stronger because the ownership-cost gap is not large enough to beat warranty certainty, lower surprise risk, and the cleaner long-term ownership story.",
      USED: "Buying used looks stronger because lower total spend is still surviving depreciation, finance drag, insurance, tax, and maintenance assumptions.",
      BORDERLINE: "This is a close call: the cost model is not one-sided enough to remove the real tradeoff between used-car value and new-car certainty."
    },
    explanationByVerdict: {
      NEW: "The strongest new-car cases usually combine higher certainty needs, lower tolerance for used-car risk, and a cost gap that is not big enough to compensate for the extra uncertainty of used. That is the shape your answers are taking.",
      USED: "The strongest used-car cases usually combine stronger budget pressure, a meaningful cost gap, and enough comfort with inspection and maintenance risk to make the savings worth it. That is the pattern your answers are moving toward.",
      BORDERLINE: "Your inputs split the decision. The used-car value story is real, but so is the appeal of warranty certainty and a cleaner starting point. On borderline cases, the quality of the exact used option often decides the answer."
    }
  });

  result.note = note;
  result.model = model;
  result.financeNote = v.assumptionMode.length
    ? `WorthItCheck used default assumptions for: ${v.assumptionMode.slice(0, 4).join(", ")}${v.assumptionMode.length > 4 ? " and more." : "."}`
    : "This result is using the exact shortlist assumptions you entered.";

  result.signalBreakdown = [
    {
      label: `${model.focusYears}-year ownership cost lens`,
      detail: focusDelta < 0 ? `Used looks about ${gbp(Math.abs(focusDelta))} cheaper overall` : `New looks about ${gbp(Math.abs(focusDelta))} cheaper overall`,
      leanText: focusDelta < 0 ? "Pushes toward used value" : "Pushes toward buying new",
      tone: result.verdict === "BORDERLINE" ? "mixed" : (focusDelta < 0 ? (result.verdict === "USED" ? "toward" : "away") : (result.verdict === "NEW" ? "toward" : "away")),
      strength: clamp(Math.round((Math.abs(focusDelta) / Math.max(1, Math.min(focusNew, focusUsed))) * 220), 32, 92)
    },
    {
      label: "Warranty and risk comfort",
      detail: `${labelize(v.warranty)} warranty importance with ${labelize(v.risk)} comfort around used-car risk`,
      leanText: v.warranty === "high" || v.risk === "low" ? "Supports new-car certainty" : "Leaves more room for used",
      tone: result.verdict === "BORDERLINE" ? "mixed" : ((v.warranty === "high" || v.risk === "low") ? (result.verdict === "NEW" ? "toward" : "away") : (result.verdict === "USED" ? "toward" : "away")),
      strength: v.warranty === "high" || v.risk === "low" ? 86 : v.risk === "high" ? 78 : 58
    },
    {
      label: "Timeline and mileage",
      detail: `${v.years} year plan with ${v.mileage.toLocaleString()} miles per year`,
      leanText: v.years >= 6 || v.mileage >= 18000 ? "Helps new make more sense" : "Keeps used more viable",
      tone: result.verdict === "BORDERLINE" ? "mixed" : ((v.years >= 6 || v.mileage >= 18000) ? (result.verdict === "NEW" ? "toward" : "away") : (result.verdict === "USED" ? "toward" : "away")),
      strength: v.years >= 6 || v.mileage >= 18000 ? 74 : 54
    },
    {
      label: "Inspection and used-car quality control",
      detail: v.inspection === "yes" ? "Trusted inspection path available" : "No inspection backup",
      leanText: v.inspection === "yes" ? "Makes used more defensible" : "Gives new more safety value",
      tone: result.verdict === "BORDERLINE" ? "mixed" : (v.inspection === "yes" ? (result.verdict === "USED" ? "toward" : "away") : (result.verdict === "NEW" ? "toward" : "away")),
      strength: v.inspection === "yes" ? 72 : 79
    }
  ];

  result.budgetPressure = getBudgetPressure(v, result);
  result.certaintyNeed = getCertaintyNeed(v, result.verdict);
  result.practicalLean = getPracticalLean(result.verdict);
  result.actionPlan = buildActionPlan(v, result);
  result.decisionEdges = buildDecisionEdges(v, result);

  if (includeExamples) {
    const scenarios = [
      {
        title: "Shorter ownership with tighter budget",
        input: { ...rawValues, years: Math.min(v.years, 3), budget: "high", risk: "medium" }
      },
      {
        title: "Longer ownership with high certainty needs",
        input: { ...rawValues, years: Math.max(v.years, 7), warranty: "high", risk: "low" }
      },
      {
        title: "Used car with inspection backup and stronger discount",
        input: {
          ...rawValues,
          inspection: "yes",
          budget: "high",
          usedPrice: rawValues.usedPrice !== null && rawValues.usedPrice !== undefined && rawValues.usedPrice !== "" ? Math.max(2000, Number(rawValues.usedPrice) - 2000) : null
        }
      }
    ];

    result.examples = scenarios.map((scenario) => {
      const scenarioResult = evaluateScenario(scenario.input, { includeExamples: false });
      return {
        title: scenario.title,
        meta: [
          `${scenario.input.years} years`,
          `${scenarioResult.model.focusYears}-year cost lens`,
          scenario.input.inspection === "yes" ? "Inspection available" : "No inspection backup"
        ],
        verdict: scenarioResult.verdict,
        input: buildSharedState(scenario.input),
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
    inspection: String(v.inspection || ""),
    newPrice: shareValue(v.newPrice),
    usedPrice: shareValue(v.usedPrice),
    usedAge: shareValue(v.usedAge),
    deposit: shareValue(v.deposit),
    apr: shareValue(v.apr),
    financeTermYears: shareValue(v.financeTermYears),
    newAnnualInsurance: shareValue(v.newAnnualInsurance),
    usedAnnualInsurance: shareValue(v.usedAnnualInsurance),
    newAnnualTax: shareValue(v.newAnnualTax),
    usedAnnualTax: shareValue(v.usedAnnualTax),
    newAnnualMaintenance: shareValue(v.newAnnualMaintenance),
    usedAnnualMaintenance: shareValue(v.usedAnnualMaintenance)
  };
}

function buildSnapshot(v, result) {
  const focusNew = result.model.focus.newCost.netCost;
  const focusUsed = result.model.focus.usedCost.netCost;
  const cheaper = focusUsed < focusNew ? "Used" : "New";
  const difference = Math.abs(focusUsed - focusNew);

  return [
    {
      label: "Recommendation",
      emphasis: `${result.verdict} · ${result.confidenceText}`,
      body: result.summary,
      tone: "highlight"
    },
    {
      label: `${result.model.focusYears}-year cost lens`,
      items: [
        `New: ${gbp(focusNew)}`,
        `Used: ${gbp(focusUsed)}`,
        `${cheaper} cheaper by about ${gbp(difference)}`
      ]
    },
    {
      label: "Inputs used",
      items: [
        `Ownership timeline: ${v.years} years`,
        `Annual mileage: ${v.mileage.toLocaleString()} miles`,
        `Budget pressure: ${labelize(v.budget)}`,
        `Warranty importance: ${labelize(v.warranty)}`,
        `Inspection path: ${v.inspection === "yes" ? "Yes" : "No"}`
      ]
    }
  ];
}

function buildCopySummary(v, result) {
  const focusNew = result.model.focus.newCost.netCost;
  const focusUsed = result.model.focus.usedCost.netCost;
  const nextMove = result.actionPlan && result.actionPlan[0] && result.actionPlan[0].items
    ? result.actionPlan[0].items.slice(0, 2)
    : [];

  return [
    "WorthItCheck — New or Used Car",
    `Result: ${result.verdict} (${result.confidenceText})`,
    `Summary: ${result.summary}`,
    `3-year view: new ${gbp(result.model.new3.netCost)} vs used ${gbp(result.model.used3.netCost)}`,
    `5-year view: new ${gbp(result.model.new5.netCost)} vs used ${gbp(result.model.used5.netCost)}`,
    `Main cost lens used: ${result.model.focusYears} years (new ${gbp(focusNew)} vs used ${gbp(focusUsed)})`,
    result.note ? `Note: ${result.note}` : "",
    nextMove.length ? `Next: ${nextMove.join(" ")}` : ""
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
    emptyText: 'The compare view helps you test whether depreciation, finance drag, or warranty comfort is doing most of the work.'
  });

  if (clearCompareButton) {
    clearCompareButton.disabled = !savedPayload;
  }
}


function runScenario(v, meta) {
  const error = validate(v);
  if (error) {
    message.textContent = error;
    results.hidden = true;
    card.hidden = true;
    thinking.hidden = true;
    return;
  }

  clearTimers(timers);
  message.textContent = "";
  latestValues = null;
  latestResult = null;

  runAnalysis({
    results,
    thinking,
    thinkingText,
    card,
    steps,
    totalDuration: 1700,
    onComplete() {
      const result = decide(v);
      render(result, v);
      setLoading(button, false);
      trackEvent(TOOL_NAME, "tool_result", {
        verdict: result.verdict,
        confidence: result.confidenceScore,
        origin: meta && meta.kind ? meta.kind : "manual"
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
  depreciationGapEl.textContent = gbp(Math.abs(result.model.newDepreciationGap));
  focusWindowEl.textContent = `${result.model.focusYears}-year lens`;
  financeNoteEl.textContent = result.financeNote;
  new3El.textContent = gbp(result.model.new3.netCost);
  used3El.textContent = gbp(result.model.used3.netCost);
  new5El.textContent = gbp(result.model.new5.netCost);
  used5El.textContent = gbp(result.model.used5.netCost);
  financeInterestEl.textContent = gbp(Math.max(0, result.model.new3.financeInterest - result.model.used3.financeInterest));

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
    const nextValues = values();
    runScenario(nextValues, {
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
  applyFormValues(form, sharedState);
  const nextValues = values();
  if (!validate(nextValues)) {
    runScenario(nextValues, { kind: "shared-link" });
  }
}
