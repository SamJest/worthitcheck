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
const financeNoteEl = document.querySelector("#lease-buy-finance-note");
const leaseTotalEl = document.querySelector("#lease-buy-lease-total");
const buyTotalEl = document.querySelector("#lease-buy-buy-total");
const monthlyPaymentEl = document.querySelector("#lease-buy-monthly-payment");
const endEquityEl = document.querySelector("#lease-buy-end-equity");
const breakEvenEl = document.querySelector("#lease-buy-break-even");
const generatedExamplesEl = document.querySelector("#lease-buy-generated-examples");
const signalBreakdownEl = document.querySelector("#lease-buy-signal-breakdown");
const actionPlanEl = document.querySelector("#lease-buy-action-plan");
const decisionEdgesEl = document.querySelector("#lease-buy-decision-edges");
const snapshotEl = document.querySelector("#lease-buy-snapshot");
const copyLinkButton = document.querySelector("#lease-buy-copy-link");
const copySummaryButton = document.querySelector("#lease-buy-copy-summary");
const comparisonEl = document.querySelector("#lease-buy-comparison");
const saveCompareButton = document.querySelector("#lease-buy-save-compare");
const clearCompareButton = document.querySelector("#lease-buy-clear-compare");

let latestValues = null;
let latestResult = null;
const examplesToggle = document.querySelector("#examples-toggle");
const extraExamples = Array.from(document.querySelectorAll(".extra-example"));

const timers = [];
const steps = [
  "Checking lease quote pressure and mileage cap fit...",
  "Projecting finance, equity, and running-cost drag...",
  "Comparing whether the buy-side value lasts long enough..."
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

function gbp(value, options) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: options && options.precise ? 2 : 0
  }).format(value);
}

function maybeNumber(data, name) {
  const raw = data.get(name);
  if (raw === null || raw === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function values() {
  const data = new FormData(form);
  return {
    price: Number(data.get("price")),
    years: Number(data.get("years")),
    mileage: Number(data.get("mileage")),
    payment: data.get("payment"),
    ownership: data.get("ownership"),
    newCar: data.get("newCar"),
    restrictions: data.get("restrictions"),
    change: data.get("change"),
    leaseMonthly: maybeNumber(data, "leaseMonthly"),
    leaseUpfront: maybeNumber(data, "leaseUpfront"),
    leaseTermMonths: maybeNumber(data, "leaseTermMonths"),
    leaseMileageCap: maybeNumber(data, "leaseMileageCap"),
    excessPencePerMile: maybeNumber(data, "excessPencePerMile"),
    deposit: maybeNumber(data, "deposit"),
    apr: maybeNumber(data, "apr"),
    financeTermYears: maybeNumber(data, "financeTermYears"),
    expectedValue: maybeNumber(data, "expectedValue"),
    annualInsurance: maybeNumber(data, "annualInsurance"),
    annualTax: maybeNumber(data, "annualTax"),
    annualMaintenance: maybeNumber(data, "annualMaintenance")
  };
}

function validate(v) {
  if (!Number.isFinite(v.price) || v.price < 1000) return "Enter a realistic car price.";
  if (!Number.isFinite(v.years) || v.years <= 0) return "Enter a valid ownership timeline in years.";
  if (!Number.isFinite(v.mileage) || v.mileage <= 0) return "Enter a valid annual mileage estimate.";
  if (v.mileage > 60000) return "That mileage looks unusually high. Check the number and try again.";

  if (v.leaseMonthly !== null && v.leaseMonthly < 0) return "Lease monthly cost cannot be negative.";
  if (v.leaseUpfront !== null && v.leaseUpfront < 0) return "Lease upfront cost cannot be negative.";
  if (v.leaseTermMonths !== null && (v.leaseTermMonths < 12 || v.leaseTermMonths > 60)) return "Lease term should stay between 12 and 60 months.";
  if (v.leaseMileageCap !== null && (v.leaseMileageCap < 4000 || v.leaseMileageCap > 30000)) return "Lease mileage cap should stay between 4,000 and 30,000 miles.";
  if (v.excessPencePerMile !== null && (v.excessPencePerMile < 0 || v.excessPencePerMile > 100)) return "Excess mileage charge should stay between 0p and 100p per mile.";
  if (v.deposit !== null && (v.deposit < 0 || v.deposit > v.price)) return "Deposit must stay between £0 and the car price.";
  if (v.apr !== null && (v.apr < 0 || v.apr > 25)) return "APR should stay between 0% and 25%.";
  if (v.financeTermYears !== null && (v.financeTermYears < 1 || v.financeTermYears > 8)) return "Finance term should stay between 1 and 8 years.";
  if (v.expectedValue !== null && (v.expectedValue < 0 || v.expectedValue > v.price)) return "Expected value at the end must stay between £0 and the original price.";
  if (v.annualInsurance !== null && v.annualInsurance < 0) return "Annual insurance cannot be negative.";
  if (v.annualTax !== null && v.annualTax < 0) return "Annual road tax cannot be negative.";
  if (v.annualMaintenance !== null && v.annualMaintenance < 0) return "Annual servicing and repairs cannot be negative.";

  return "";
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function estimateResidualValue(price, years, mileage) {
  const yearlyMileageFactor = clamp((mileage - 10000) / 10000, -0.3, 1.2);
  const depreciationRate = 0.18 + (Math.max(0, years - 1) * 0.02) + (Math.max(0, yearlyMileageFactor) * 0.025);
  const retained = Math.pow(1 - clamp(depreciationRate, 0.12, 0.35), Math.max(1, years));
  return Math.max(price * 0.18, Math.round(price * retained));
}

function estimateLeaseMonthly(price, years, mileage) {
  const baseRate = years <= 3 ? 0.0118 : years <= 4 ? 0.0112 : 0.0108;
  const mileageRate = Math.max(0, mileage - 10000) / 200000;
  return Math.round(price * (baseRate + mileageRate));
}

function withDefaults(v) {
  const residualDefault = estimateResidualValue(v.price, v.years, v.mileage);
  const leaseMonthlyDefault = estimateLeaseMonthly(v.price, v.years, v.mileage);
  const leaseTermDefault = clamp(Math.round(Math.max(24, Math.min(48, v.years * 12))), 24, 48);
  const capDefault = v.mileage <= 8000 ? 8000 : v.mileage <= 10000 ? 10000 : v.mileage <= 12000 ? 12000 : 15000;
  const defaults = {
    leaseMonthly: leaseMonthlyDefault,
    leaseUpfront: Math.round(leaseMonthlyDefault * 3),
    leaseTermMonths: leaseTermDefault,
    leaseMileageCap: capDefault,
    excessPencePerMile: 12,
    deposit: Math.round(v.price * 0.1),
    apr: 6.4,
    financeTermYears: clamp(v.years <= 3 ? 4 : v.years <= 5 ? 5 : 5, 3, 6),
    expectedValue: residualDefault,
    annualInsurance: Math.round(Math.max(700, v.price * 0.03)),
    annualTax: 220,
    annualMaintenance: Math.round(v.years <= 3 ? 550 : 750)
  };

  const normalized = {
    ...v,
    leaseMonthly: v.leaseMonthly === null ? defaults.leaseMonthly : v.leaseMonthly,
    leaseUpfront: v.leaseUpfront === null ? defaults.leaseUpfront : v.leaseUpfront,
    leaseTermMonths: v.leaseTermMonths === null ? defaults.leaseTermMonths : v.leaseTermMonths,
    leaseMileageCap: v.leaseMileageCap === null ? defaults.leaseMileageCap : v.leaseMileageCap,
    excessPencePerMile: v.excessPencePerMile === null ? defaults.excessPencePerMile : v.excessPencePerMile,
    deposit: v.deposit === null ? defaults.deposit : v.deposit,
    apr: v.apr === null ? defaults.apr : v.apr,
    financeTermYears: v.financeTermYears === null ? defaults.financeTermYears : v.financeTermYears,
    expectedValue: v.expectedValue === null ? defaults.expectedValue : v.expectedValue,
    annualInsurance: v.annualInsurance === null ? defaults.annualInsurance : v.annualInsurance,
    annualTax: v.annualTax === null ? defaults.annualTax : v.annualTax,
    annualMaintenance: v.annualMaintenance === null ? defaults.annualMaintenance : v.annualMaintenance
  };

  normalized.assumptionMode = [
    v.leaseMonthly === null ? "lease quote defaulted" : "",
    v.leaseUpfront === null ? "lease upfront defaulted" : "",
    v.leaseMileageCap === null ? "mileage cap defaulted" : "",
    v.deposit === null ? "deposit defaulted" : "",
    v.apr === null ? "APR defaulted" : "",
    v.expectedValue === null ? "residual value defaulted" : "",
    v.annualInsurance === null ? "insurance defaulted" : "",
    v.annualMaintenance === null ? "maintenance defaulted" : ""
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

function calculateCarModel(v, yearsOverride) {
  const years = yearsOverride !== undefined ? yearsOverride : v.years;
  const months = Math.max(1, Math.round(years * 12));
  const deposit = Math.min(v.deposit, v.price);
  const loanAmount = Math.max(v.price - deposit, 0);
  const financePayment = amortizedPayment(loanAmount, v.apr, v.financeTermYears);
  const financePaymentsMade = Math.min(months, Math.round(v.financeTermYears * 12));
  const financePaidTotal = financePayment * financePaymentsMade;
  const balanceLeft = remainingBalance(loanAmount, v.apr, v.financeTermYears, financePaymentsMade);
  const endValue = clamp(v.expectedValue, 0, v.price);
  const endEquity = Math.max(0, endValue - balanceLeft);

  const annualOwnerRunning = v.annualInsurance + v.annualTax + v.annualMaintenance;
  const ownerRunningTotal = annualOwnerRunning * years;
  const buyNetCost = deposit + financePaidTotal + ownerRunningTotal - endEquity;

  const cycles = Math.max(1, Math.ceil(months / v.leaseTermMonths));
  const leaseBase = (v.leaseMonthly * months) + (v.leaseUpfront * cycles);
  const annualExcessMiles = Math.max(0, v.mileage - v.leaseMileageCap);
  const totalExcessMiles = annualExcessMiles * years;
  const excessCharge = totalExcessMiles * (v.excessPencePerMile / 100);
  const leaseTotal = leaseBase + excessCharge;

  return {
    years,
    months,
    deposit,
    loanAmount,
    financePayment,
    financePaidTotal,
    balanceLeft,
    endValue,
    endEquity,
    ownerRunningTotal,
    buyNetCost,
    leaseTotal,
    cycles,
    annualExcessMiles,
    totalExcessMiles,
    excessCharge,
    monthlyBuyCash: financePayment + ((annualOwnerRunning) / 12)
  };
}

function findBreakEvenYear(v) {
  const limit = Math.min(8, Math.max(v.years + 2, 4));
  for (let step = 1; step <= limit * 2; step += 1) {
    const years = step / 2;
    const model = calculateCarModel(v, years);
    if (model.buyNetCost <= model.leaseTotal) {
      return years;
    }
  }
  return null;
}

function getTimelineFit(v, result) {
  if (result.verdict === "LEASE" && v.years <= 3) return "Short-cycle lease fit";
  if (result.verdict === "BUY" && v.years >= 5) return "Long-run buy fit";
  return "Mid-range timeline";
}

function getMileageFit(v, result) {
  if (result.model.annualExcessMiles > 0) return "Lease cap under pressure";
  if (result.verdict === "LEASE" && v.mileage <= v.leaseMileageCap) return "Lease-friendly mileage";
  if (result.verdict === "BUY" && v.mileage >= 15000) return "Buy-friendly mileage";
  return "Mileage manageable either way";
}

function getPracticalLean(result) {
  if (result.verdict === "LEASE") return "Flexibility and lower commitment";
  if (result.verdict === "BUY") return "Ownership value and retained equity";
  return "Quote quality decides it";
}

function buildActionPlan(v, result) {
  const breakEvenText = result.breakEvenText.toLowerCase();
  if (result.verdict === "LEASE") {
    return [
      {
        title: "Do this next",
        tone: "primary",
        items: [
          "Get the real lease quote in writing and check the total including the upfront rental, not just the monthly number.",
          result.model.annualExcessMiles > 0
            ? "Price the excess-mile outcome carefully, because your current mileage is already above the assumed cap."
            : "Confirm the mileage cap and damage clauses before treating the lease as the safer option.",
          "Compare at least one real finance quote anyway so you know how much flexibility is actually costing you."
        ]
      },
      {
        title: "Recheck if this changes",
        tone: "watch",
        items: [
          "Your timeline stretches beyond what you expect today.",
          "You can put down a stronger deposit or secure a meaningfully lower APR.",
          `The buy-side break-even moves closer than ${breakEvenText}.`
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
          "Check a real finance quote and make sure the monthly payment still feels acceptable once insurance, tax, and maintenance are included.",
          "Stress-test the assumed end value before relying on the equity upside.",
          "Compare one good lease anyway so you know whether the monthly comfort gap is still worth it."
        ]
      },
      {
        title: "Recheck if this changes",
        tone: "watch",
        items: [
          "Your annual mileage falls enough to make a lease cap easy to live with.",
          "The buy-side payment becomes uncomfortable even though the long-run cost looks better.",
          "The likely resale value looks weaker than assumed."
        ]
      }
    ];
  }

  return [
    {
      title: "Do this next",
      tone: "primary",
      items: [
        "Get one real lease quote and one real finance quote using the same car and the same likely timeline.",
        "Use mileage cap risk and realistic end value as the tie-breakers, not just the headline monthly number.",
        "Swap out the defaults with your real terms before treating this as a final decision."
      ]
    },
    {
      title: "Recheck if this changes",
      tone: "watch",
      items: [
        "One quote is materially stronger than the other once all costs are included.",
        "Your timeline moves clearly shorter or clearly longer.",
        "Mileage cap risk becomes obviously easy or obviously painful."
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
        intro: "Leasing stays stronger when you keep behaving like a shorter-cycle user rather than a long-term owner.",
        items: [
          v.years <= 3 ? "Your timeline stays relatively short." : "You still do not expect to keep the car for a long stretch.",
          result.model.annualExcessMiles > 0 ? "You secure a higher mileage allowance that stops penalties from getting worse." : "Mileage stays safely inside the likely lease cap.",
          "Flexibility and avoiding long-run ownership hassle remain more important than building equity."
        ]
      },
      {
        title: "What could flip it toward buying",
        label: "Alternative outcome",
        tone: "flip",
        intro: "A lease verdict weakens once the ownership value starts lasting long enough to matter.",
        items: [
          "You plan to keep the car longer than first expected.",
          "You can get a lower APR or put down a stronger deposit.",
          "The lease quote is not actually as sharp as it first looked once all contract costs are included."
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
        intro: "Buying stays stronger when retained value and ownership time outweigh the extra finance friction.",
        items: [
          `You still expect to keep the car for roughly ${v.years} years or longer.`,
          result.model.annualExcessMiles > 0 ? "Your mileage would keep pressing against lease limits." : "Your usage still looks more like ownership than short-cycle access.",
          "Keeping some equity at the end still matters more than having a cleaner short-term contract."
        ]
      },
      {
        title: "What could flip it toward leasing",
        label: "Alternative outcome",
        tone: "flip",
        intro: "A buy verdict softens when short-term flexibility and monthly comfort start to dominate.",
        items: [
          "Your timeline shortens and the long-run value no longer has time to show up.",
          "The lease quote becomes materially stronger than the assumed one here.",
          "The likely end value or resale outlook looks weaker than assumed."
        ]
      }
    ];
  }

  return [
    {
      title: "What would settle the call toward leasing",
      label: "Short-cycle path",
      tone: "watch",
      intro: "Close calls lean toward leasing when your use stays short-term and the quote remains genuinely competitive.",
      items: [
        "Your timeline stays short.",
        "Mileage cap risk looks manageable.",
        "The buy-side payment or deposit still feels heavier than the ownership upside is worth."
      ]
    },
    {
      title: "What would settle the call toward buying",
      label: "Long-run path",
      tone: "flip",
      intro: "Close calls lean toward buying when the car becomes a long-run asset instead of a short-cycle convenience decision.",
      items: [
        "You plan to keep it longer than first expected.",
        "The end value looks strong enough to preserve useful equity.",
        "The lease quote is not sharp enough to justify giving up ownership."
      ]
    }
  ];
}

function evaluateScenario(rawValues, options) {
  const includeExamples = !options || options.includeExamples !== false;
  const v = withDefaults(rawValues);
  const model = calculateCarModel(v);
  const costDelta = model.buyNetCost - model.leaseTotal; // positive => lease cheaper
  const breakEvenYears = findBreakEvenYear(v);
  const breakEvenText = breakEvenYears === null
    ? "No clear break-even in the checked range"
    : breakEvenYears <= 1
      ? "Inside year 1"
      : `Around year ${Number.isInteger(breakEvenYears) ? breakEvenYears : breakEvenYears.toFixed(1)}`;

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
    reasons.push("A long ownership timeline usually favours buying because the value has more time to outlast the finance pain.");
  }

  if (v.mileage < 10000) {
    score += 2;
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
    reasons.push("If lower monthly cost is not a priority, leasing loses one of its biggest lifestyle advantages.");
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

  if (model.annualExcessMiles > 0) {
    score -= clamp(model.annualExcessMiles / 3000, 1, 3);
    reasons.push(`Your mileage is around ${model.annualExcessMiles.toLocaleString()} miles a year above the assumed lease cap, which adds real penalty risk.`);
  } else {
    score += 1;
    reasons.push("Your mileage stays inside the assumed lease cap, which makes leasing easier to defend.");
  }

  if (costDelta >= 2500) {
    score += clamp(costDelta / 3000, 1, 4);
    reasons.push(`The modelled lease route looks about ${gbp(costDelta)} cheaper over your chosen horizon.`);
  } else if (costDelta <= -2500) {
    score -= clamp(Math.abs(costDelta) / 3000, 1, 4);
    reasons.push(`The modelled buy route looks about ${gbp(Math.abs(costDelta))} cheaper once retained equity is counted.`);
  } else {
    reasons.push("The modelled totals are fairly close, so quote quality and preferences still matter a lot.");
  }

  if (model.monthlyBuyCash > (v.leaseMonthly + 140)) {
    score += 2;
    reasons.push("The estimated buy-side monthly cash pressure is materially higher than the lease route.");
  } else if ((v.leaseMonthly - model.monthlyBuyCash) > 75) {
    score -= 1.5;
    reasons.push("The estimated monthly finance pressure is not as punishing as the lease route once the assumptions are applied.");
  }

  if (model.endEquity >= v.price * 0.2) {
    score -= 2;
    reasons.push("A meaningful slice of money is likely to come back through end equity or resale value if you buy.");
  } else if (model.endEquity <= v.price * 0.08) {
    score += 1;
    reasons.push("The end equity looks fairly thin, which makes the buy-side value less compelling.");
  }

  if (v.years <= 3 && v.payment === "high" && v.ownership !== "high" && costDelta > -1500) {
    score += 2;
    note = "Short-window lease fit: the timeline and monthly pressure still make flexibility easy to justify.";
  }

  if (v.years >= 5 && (model.endEquity > 0 || costDelta < 0)) {
    score -= 2;
    if (!note) note = "Longer-run ownership fit: the buy-side value has enough time to start showing up.";
  }

  let verdictOverride = "";
  if (v.mileage >= 20000 && v.years >= 4) verdictOverride = "BUY";
  if (v.years <= 2.5 && v.payment === "high" && v.ownership !== "high" && model.annualExcessMiles <= 0) verdictOverride = "LEASE";

  const result = runDecisionEngine({
    score,
    maxScore: 18,
    closeness: Math.min(Math.abs(score) / 18, 1),
    thresholds: { positive: 4, negative: -4 },
    verdicts: { positive: "LEASE", negative: "BUY", neutral: "BORDERLINE" },
    verdictOverride,
    reasons,
    realLife: [
      v.years <= 3
        ? "In real life, a shorter timeline makes paying for flexibility feel more reasonable than it would on a long ownership plan."
        : "In real life, a longer timeline gives buying more time to recover depreciation and finance friction.",
      model.annualExcessMiles > 0
        ? `Your current mileage would run roughly ${model.totalExcessMiles.toLocaleString()} excess miles over this horizon, so lease caps matter more than they first appear.`
        : "Your mileage looks easier to fit inside a typical lease structure, so cap pressure is less likely to dominate the decision.",
      model.endEquity > 0
        ? `The buy route could still leave about ${gbp(model.endEquity)} of end value or equity, which is why buying may look better than the monthly payment alone suggests.`
        : "The buy route does not look likely to leave much equity behind, so the ownership upside is weaker than usual.",
      v.change === "yes"
        ? "Because your needs may change, the value of flexibility deserves real weight even if buying looks fine on paper."
        : "Stable needs reduce the value of contract flexibility and make long-term ownership easier to defend."
    ],
    summaryByVerdict: {
      LEASE: "Leasing looks stronger because your timeline, monthly comfort, or quote profile put more value on flexibility and lower commitment than on long-term ownership value.",
      BUY: "Buying looks stronger because the ownership window, mileage, or retained value make lease limits and short-cycle convenience less attractive.",
      BORDERLINE: "This is a close call. The lifestyle signals and the modelled numbers are not pointing cleanly in one direction, so the real quote quality matters a lot."
    },
    explanationByVerdict: {
      LEASE: "The strongest lease cases usually combine a shorter timeline, manageable cap risk, and a real reason to prioritise flexibility or lower monthly cost. That is the pattern your answers are moving toward.",
      BUY: "The strongest buy cases usually combine longer ownership, higher mileage, or enough retained value to justify the extra finance friction. Those signals are doing more work in your answers.",
      BORDERLINE: "Your inputs split the decision. Some signals support leasing for flexibility, while others support buying for ownership value. This is the kind of case where small quote differences can legitimately flip the answer."
    }
  });

  result.note = note;
  result.model = model;
  result.breakEvenYears = breakEvenYears;
  result.breakEvenText = breakEvenText;
  result.financeNote = v.assumptionMode.length
    ? `Using some default assumptions: ${v.assumptionMode.join(", ")}. Replace them with real quotes if this is a close call.`
    : "Using your own quote inputs rather than the built-in defaults.";
  result.signalBreakdown = [
    {
      label: "Ownership timeline",
      detail: `${v.years} year plan`,
      leanText: v.years <= 3 ? "Shorter timeline pushes toward leasing" : v.years >= 5 ? "Longer timeline pushes toward buying" : "Timeline is still mixed",
      tone: result.verdict === "BORDERLINE" ? "mixed" : (v.years <= 3 ? (result.verdict === "LEASE" ? "toward" : "away") : v.years >= 5 ? (result.verdict === "BUY" ? "toward" : "away") : "mixed"),
      strength: v.years <= 3 ? 84 : v.years >= 5 ? 82 : 54
    },
    {
      label: "Mileage cap pressure",
      detail: model.annualExcessMiles > 0 ? `${model.annualExcessMiles.toLocaleString()} excess miles/year` : `${v.mileage.toLocaleString()} miles inside cap`,
      leanText: model.annualExcessMiles > 0 ? "Mileage pressure pushes toward buying" : "Mileage is lease-manageable",
      tone: result.verdict === "BORDERLINE" ? "mixed" : (model.annualExcessMiles > 0 ? (result.verdict === "BUY" ? "toward" : "away") : (result.verdict === "LEASE" ? "toward" : "away")),
      strength: model.annualExcessMiles > 0 ? 86 : 72
    },
    {
      label: "Monthly cash pressure",
      detail: `${gbp(v.leaseMonthly)} lease vs ${gbp(model.monthlyBuyCash)} buy-side carry`,
      leanText: model.monthlyBuyCash > v.leaseMonthly ? "Leasing eases monthly pressure" : "Buying is not as painful monthly as it first looks",
      tone: result.verdict === "BORDERLINE" ? "mixed" : (model.monthlyBuyCash > v.leaseMonthly ? (result.verdict === "LEASE" ? "toward" : "away") : (result.verdict === "BUY" ? "toward" : "away")),
      strength: Math.min(88, 40 + Math.round(Math.abs(model.monthlyBuyCash - v.leaseMonthly) / 8))
    },
    {
      label: "Equity and end value",
      detail: `${gbp(model.endEquity)} estimated end equity`,
      leanText: model.endEquity >= v.price * 0.2 ? "Meaningful ownership value remains" : model.endEquity <= v.price * 0.08 ? "Thin equity weakens buying" : "Some value remains, but not overwhelmingly",
      tone: result.verdict === "BORDERLINE" ? "mixed" : (model.endEquity >= v.price * 0.2 ? (result.verdict === "BUY" ? "toward" : "away") : model.endEquity <= v.price * 0.08 ? (result.verdict === "LEASE" ? "toward" : "away") : "mixed"),
      strength: model.endEquity >= v.price * 0.2 ? 80 : model.endEquity <= v.price * 0.08 ? 62 : 50
    }
  ];
  result.timelineFit = getTimelineFit(v, result);
  result.mileageFit = getMileageFit(v, result);
  result.practicalLean = getPracticalLean(result);
  result.actionPlan = buildActionPlan(v, result);
  result.decisionEdges = buildDecisionEdges(v, result);

  if (includeExamples) {
    const scenarios = [
      {
        title: "Shorter stay with manageable cap",
        input: { ...v, years: Math.max(2, Math.min(v.years, 3)), mileage: Math.min(v.mileage, v.leaseMileageCap || 10000), payment: "high", ownership: "low" }
      },
      {
        title: "Longer keeper with stronger equity",
        input: { ...v, years: Math.max(v.years, 6), expectedValue: Math.max(v.expectedValue, Math.round(v.price * 0.42)), ownership: "high" }
      },
      {
        title: "Mileage pushes against the cap",
        input: { ...v, mileage: Math.max(v.mileage, (v.leaseMileageCap || 10000) + 4000), restrictions: "low" }
      }
    ];

    result.examples = scenarios.map((scenario) => {
      const scenarioResult = evaluateScenario(scenario.input, { includeExamples: false });
      return {
        title: scenario.title,
        meta: [
          `${scenario.input.years} years`,
          `${scenario.input.mileage.toLocaleString()} miles/year`,
          scenarioResult.model.annualExcessMiles > 0 ? "Cap pressure" : "Cap manageable"
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

function shareValue(value) {
  return value === null || value === undefined || value === "" ? "" : Number(value);
}

function buildSharedState(v) {
  return {
    price: Number(v.price),
    years: Number(v.years),
    mileage: Number(v.mileage),
    payment: String(v.payment || ""),
    ownership: String(v.ownership || ""),
    newCar: String(v.newCar || ""),
    restrictions: String(v.restrictions || ""),
    change: String(v.change || ""),
    leaseMonthly: shareValue(v.leaseMonthly),
    leaseUpfront: shareValue(v.leaseUpfront),
    leaseTermMonths: shareValue(v.leaseTermMonths),
    leaseMileageCap: shareValue(v.leaseMileageCap),
    excessPencePerMile: shareValue(v.excessPencePerMile),
    deposit: shareValue(v.deposit),
    apr: shareValue(v.apr),
    financeTermYears: shareValue(v.financeTermYears),
    expectedValue: shareValue(v.expectedValue),
    annualInsurance: shareValue(v.annualInsurance),
    annualTax: shareValue(v.annualTax),
    annualMaintenance: shareValue(v.annualMaintenance)
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
      label: "Cost view used",
      items: [
        `Lease total: ${gbp(result.model.leaseTotal)} over ${v.years} years`,
        `Buy net cost: ${gbp(result.model.buyNetCost)} after estimated end equity of ${gbp(result.model.endEquity)}`,
        `Buy-side monthly carry: ${gbp(result.model.monthlyBuyCash)}`
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
    "WorthItCheck — Lease or Buy Car UK",
    `Result: ${result.verdict} (${result.confidenceText})`,
    `Summary: ${result.summary}`,
    result.note ? `Note: ${result.note}` : "",
    `Inputs: car price ${gbp(v.price)}, ${v.years}-year timeline, ${v.mileage.toLocaleString()} miles/year, payment sensitivity ${humanize(v.payment)}, ownership priority ${humanize(v.ownership)}.`,
    `Estimated lease cost: ${gbp(result.model.leaseTotal)} | Estimated buy net cost: ${gbp(result.model.buyNetCost)} | End equity: ${gbp(result.model.endEquity)} | Break-even: ${result.breakEvenText}.`,
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
    emptyText: 'The compare view helps you test whether mileage, APR, term, or residual value really changes the lease-versus-buy call.'
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
  financeNoteEl.textContent = result.financeNote;
  leaseTotalEl.textContent = gbp(result.model.leaseTotal);
  buyTotalEl.textContent = gbp(result.model.buyNetCost);
  monthlyPaymentEl.textContent = gbp(result.model.financePayment);
  endEquityEl.textContent = gbp(result.model.endEquity);
  breakEvenEl.textContent = result.breakEvenText;
  timelineFitEl.textContent = result.timelineFit;
  mileageFitEl.textContent = result.mileageFit;
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
  const nextValues = sharedState;
  applyFormValues(form, nextValues);
  if (!validate(nextValues)) {
    runScenario(nextValues, { kind: "shared-link" });
  }
}
