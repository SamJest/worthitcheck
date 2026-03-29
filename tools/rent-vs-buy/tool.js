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
const endingEquityEl = document.querySelector("#rent-buy-ending-equity");
const realLifeEl = document.querySelector("#rent-buy-real-life");
const generatedExamplesEl = document.querySelector("#rent-buy-generated-examples");
const signalBreakdownEl = document.querySelector("#rent-buy-signal-breakdown");
const actionPlanEl = document.querySelector("#rent-buy-action-plan");
const decisionEdgesEl = document.querySelector("#rent-buy-decision-edges");
const snapshotEl = document.querySelector("#rent-buy-snapshot");
const copyLinkButton = document.querySelector("#rent-buy-copy-link");
const copySummaryButton = document.querySelector("#rent-buy-copy-summary");
const comparisonEl = document.querySelector("#rent-buy-comparison");
const saveCompareButton = document.querySelector("#rent-buy-save-compare");
const clearCompareButton = document.querySelector("#rent-buy-clear-compare");

let latestValues = null;
let latestResult = null;
const examplesToggle = document.querySelector("#examples-toggle");
const extraExamples = Array.from(document.querySelectorAll(".extra-example"));

const timers = [];
const steps = [
  "Estimating mortgage pressure and cash needed upfront...",
  "Projecting rent growth, upkeep, and exit costs...",
  "Checking whether buying reaches break-even in time..."
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
  saveStoredComparison,
  readStoredComparison,
  clearStoredComparison,
  renderComparisonPanel,
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
    rent: Number(data.get("rent")),
    price: Number(data.get("price")),
    ownership: Number(data.get("ownership")),
    years: Number(data.get("years")),
    stability: data.get("stability"),
    deposit: maybeNumber(data, "deposit"),
    mortgageRate: maybeNumber(data, "mortgageRate"),
    mortgageTerm: maybeNumber(data, "mortgageTerm"),
    buyFees: maybeNumber(data, "buyFees"),
    sellFees: maybeNumber(data, "sellFees"),
    annualUpkeep: maybeNumber(data, "annualUpkeep"),
    rentIncrease: maybeNumber(data, "rentIncrease"),
    homeGrowth: maybeNumber(data, "homeGrowth"),
    savingsReturn: maybeNumber(data, "savingsReturn")
  };
}

function validate(v) {
  if (!Number.isFinite(v.rent) || v.rent <= 0) return "Enter a valid monthly rent.";
  if (!Number.isFinite(v.price) || v.price <= 0) return "Enter a valid home price.";
  if (!Number.isFinite(v.ownership) || v.ownership < 0) return "Enter a valid monthly owner-extra cost.";
  if (!Number.isFinite(v.years) || v.years <= 0) return "Enter a valid time horizon.";

  if (v.deposit !== null && (v.deposit < 0 || v.deposit > v.price)) {
    return "Deposit must be between £0 and the home price.";
  }

  if (v.mortgageRate !== null && (v.mortgageRate < 0 || v.mortgageRate > 20)) {
    return "Mortgage rate should stay between 0% and 20%.";
  }

  if (v.mortgageTerm !== null && (v.mortgageTerm < 1 || v.mortgageTerm > 40)) {
    return "Mortgage term should stay between 1 and 40 years.";
  }

  if (v.buyFees !== null && v.buyFees < 0) return "Buy fees cannot be negative.";
  if (v.sellFees !== null && v.sellFees < 0) return "Sell fees cannot be negative.";
  if (v.annualUpkeep !== null && v.annualUpkeep < 0) return "Annual upkeep cannot be negative.";
  if (v.rentIncrease !== null && (v.rentIncrease < -5 || v.rentIncrease > 20)) {
    return "Rent increase should stay between -5% and 20%.";
  }
  if (v.homeGrowth !== null && (v.homeGrowth < -10 || v.homeGrowth > 15)) {
    return "Home value change should stay between -10% and 15%.";
  }
  if (v.savingsReturn !== null && (v.savingsReturn < 0 || v.savingsReturn > 15)) {
    return "Cash savings return should stay between 0% and 15%.";
  }

  return "";
}

function withDefaults(v) {
  const price = Math.max(0, Number(v.price) || 0);
  const defaults = {
    deposit: Math.round(price * 0.1),
    mortgageRate: 4.8,
    mortgageTerm: 25,
    buyFees: Math.max(2500, Math.round(price * 0.02)),
    sellFees: Math.max(2500, Math.round(price * 0.015)),
    annualUpkeep: Math.max(1200, Math.round(price * 0.0075)),
    rentIncrease: 3,
    homeGrowth: 2,
    savingsReturn: 4
  };

  const normalized = {
    ...v,
    deposit: v.deposit === null ? defaults.deposit : v.deposit,
    mortgageRate: v.mortgageRate === null ? defaults.mortgageRate : v.mortgageRate,
    mortgageTerm: v.mortgageTerm === null ? defaults.mortgageTerm : v.mortgageTerm,
    buyFees: v.buyFees === null ? defaults.buyFees : v.buyFees,
    sellFees: v.sellFees === null ? defaults.sellFees : v.sellFees,
    annualUpkeep: v.annualUpkeep === null ? defaults.annualUpkeep : v.annualUpkeep,
    rentIncrease: v.rentIncrease === null ? defaults.rentIncrease : v.rentIncrease,
    homeGrowth: v.homeGrowth === null ? defaults.homeGrowth : v.homeGrowth,
    savingsReturn: v.savingsReturn === null ? defaults.savingsReturn : v.savingsReturn
  };

  normalized.assumptionMode = [
    v.deposit === null ? "deposit defaulted" : "",
    v.mortgageRate === null ? "rate defaulted" : "",
    v.buyFees === null ? "fees defaulted" : "",
    v.annualUpkeep === null ? "upkeep defaulted" : "",
    v.rentIncrease === null ? "rent growth defaulted" : "",
    v.homeGrowth === null ? "home growth defaulted" : "",
    v.savingsReturn === null ? "cash return defaulted" : ""
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
    return principal * Math.max(0, 1 - (paid / months));
  }

  const payment = amortizedPayment(principal, annualRate, years);
  return Math.max(
    0,
    principal * Math.pow(1 + monthlyRate, paid) -
      payment * ((Math.pow(1 + monthlyRate, paid) - 1) / monthlyRate)
  );
}

function compoundedMonthlyTotal(monthlyAmount, annualPercent, months) {
  const totalMonths = Math.max(1, months);
  const monthlyGrowth = Math.pow(1 + annualPercent / 100, 1 / 12) - 1;
  let total = 0;

  for (let month = 0; month < totalMonths; month += 1) {
    total += monthlyAmount * Math.pow(1 + monthlyGrowth, month);
  }

  return total;
}

function calculateHousingModel(v, yearsOverride) {
  const years = yearsOverride !== undefined ? yearsOverride : v.years;
  const months = Math.max(1, Math.round(years * 12));
  const deposit = Math.min(v.deposit, v.price);
  const loanAmount = Math.max(v.price - deposit, 0);
  const mortgagePayment = amortizedPayment(loanAmount, v.mortgageRate, v.mortgageTerm);
  const paymentsMade = Math.min(months, Math.round(v.mortgageTerm * 12));
  const mortgagePaidTotal = mortgagePayment * paymentsMade;
  const balanceLeft = remainingBalance(loanAmount, v.mortgageRate, v.mortgageTerm, paymentsMade);
  const totalRent = compoundedMonthlyTotal(v.rent, v.rentIncrease, months);
  const monthlyOwnerExtras = v.ownership * months;
  const annualUpkeepTotal = v.annualUpkeep * years;
  const homeValueEnd = v.price * Math.pow(1 + (v.homeGrowth / 100), years);
  const endingEquity = Math.max(0, homeValueEnd - balanceLeft - v.sellFees);
  const opportunityCost = (deposit + v.buyFees) * (Math.pow(1 + (v.savingsReturn / 100), years) - 1);
  const upfrontCash = deposit + v.buyFees;
  const netBuyCost = upfrontCash + mortgagePaidTotal + monthlyOwnerExtras + annualUpkeepTotal + opportunityCost - endingEquity;
  const rentMonthlyAverage = totalRent / months;
  const buyMonthlyAverage = netBuyCost / months;
  const monthlyEdge = Math.abs(rentMonthlyAverage - buyMonthlyAverage);

  return {
    years,
    months,
    deposit,
    loanAmount,
    mortgagePayment,
    mortgagePaidTotal,
    balanceLeft,
    totalRent,
    monthlyOwnerExtras,
    annualUpkeepTotal,
    homeValueEnd,
    endingEquity,
    opportunityCost,
    upfrontCash,
    netBuyCost,
    rentMonthlyAverage,
    buyMonthlyAverage,
    monthlyEdge,
    monthlyCashOut: mortgagePayment + v.ownership + (v.annualUpkeep / 12)
  };
}

function getBreakEvenYears(v) {
  const limit = Math.min(35, Math.max(v.mortgageTerm, v.years + 10, 5));

  for (let years = 1; years <= limit; years += 0.5) {
    const model = calculateHousingModel(v, years);
    if (model.netBuyCost <= model.totalRent) {
      return years;
    }
  }

  return null;
}

function humanize(value) {
  return String(value || "").replace(/-/g, " ");
}

function labelize(value) {
  const text = humanize(value).trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

function buildAssumptionSummary(v) {
  const lines = [
    `Deposit ${gbp(v.deposit)} · Mortgage ${v.mortgageRate.toFixed(1)}% over ${v.mortgageTerm} years`,
    `Buy fees ${gbp(v.buyFees)} · Sell fees ${gbp(v.sellFees)} · Annual upkeep ${gbp(v.annualUpkeep)}`,
    `Rent growth ${v.rentIncrease.toFixed(1)}% · Home value change ${v.homeGrowth.toFixed(1)}% · Cash return ${v.savingsReturn.toFixed(1)}%`
  ];

  if (v.assumptionMode.length) {
    lines.push(`Defaults used: ${v.assumptionMode.join(", ")}.`);
  }

  return lines;
}

function buildActionPlan(v, result) {
  const breakEvenText = result.details.breakEvenYears
    ? `${result.details.breakEvenYears.toFixed(1)} years`
    : "not reached under the current assumptions";

  if (result.verdict === "BUY") {
    return [
      {
        title: "Do this next",
        tone: "primary",
        items: [
          `Get a real mortgage quote and confirm the buy still works if the break-even stays around ${breakEvenText}.`,
          `Make sure the upfront cash of ${gbp(result.details.upfrontCash)} does not damage your emergency buffer.`,
          "Stress-test the result with slightly higher upkeep and slightly lower house-price growth before you commit."
        ]
      },
      {
        title: "Recheck if this changes",
        tone: "watch",
        items: [
          "You may move sooner than planned or the timeline becomes less stable.",
          "Rates, fees, or service charges rise enough to push the monthly cash flow higher.",
          "Local sale friction means the real exit cost will be higher than expected."
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
          "Keep renting for now and use the time to build a stronger deposit or wait for a better buying setup.",
          "Test the tool again with the real mortgage quote you could get today rather than an assumed rate.",
          "Use the monthly flexibility to decide what timeline would make buying genuinely defensible."
        ]
      },
      {
        title: "Recheck if this changes",
        tone: "watch",
        items: [
          "You become confident you will stay several years longer than first planned.",
          "You can put down a stronger deposit or secure a lower mortgage rate.",
          "Rents are likely to rise faster than you first assumed."
        ]
      }
    ];
  }

  return [
    {
      title: "Do this next",
      tone: "primary",
      items: [
        "Run the tool again with your real quotes for rates, fees, and upkeep before treating this as a decision.",
        "Use the what-if scenarios to test a shorter stay, faster rent growth, and a lower rate.",
        "Let monthly cash flow and flexibility break the tie if the net totals stay close."
      ]
    },
    {
      title: "Recheck if this changes",
      tone: "watch",
      items: [
        "Your stay becomes much clearer one way or the other.",
        "The break-even point moves meaningfully closer or further away.",
        "The upfront cash or mortgage payment changes enough to affect your comfort."
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
        intro: "Buying stays stronger when the timeline is long enough and the financing remains manageable.",
        items: [
          `You still expect to stay around ${v.years} years or longer.`,
          `Monthly buy-side cash flow stays near ${gbp(result.details.monthlyCashOut)} rather than jumping materially higher.`,
          "Upkeep, fees, and the eventual sale do not turn out worse than assumed."
        ]
      },
      {
        title: "What could flip it toward renting",
        label: "Alternative outcome",
        tone: "flip",
        intro: "The buy verdict weakens if friction rises or the stay shortens.",
        items: [
          "A higher real mortgage rate pushes the payment up beyond what you can comfortably carry.",
          "You sell sooner than planned and do not recover the entry and exit costs.",
          "House prices or resale demand soften enough to shrink the equity you recover."
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
        intro: "Renting stays stronger when flexibility is genuinely valuable and buying still needs too much time to pay back.",
        items: [
          `The break-even point stays beyond your current ${v.years}-year horizon.`,
          `The upfront cash of ${gbp(result.details.upfrontCash)} still feels too costly to lock away now.`,
          "Monthly buy-side cash flow remains meaningfully higher than your current rent."
        ]
      },
      {
        title: "What could flip it toward buying",
        label: "Alternative outcome",
        tone: "flip",
        intro: "The rent verdict changes when the stay lengthens and the financing improves enough to recover the friction.",
        items: [
          "You know you will stay several years longer than first planned.",
          "You secure a better rate or bring a stronger deposit to reduce mortgage pressure.",
          "Rents rise faster while ownership costs stay relatively contained."
        ]
      }
    ];
  }

  return [
    {
      title: "What would settle the call toward renting",
      label: "Flexibility path",
      tone: "watch",
      intro: "Close calls lean toward renting when the stay and financing still feel uncertain.",
      items: [
        "Your likely stay remains unclear or shorter than the break-even point.",
        "The upfront cash still feels too painful to justify for a close result.",
        "The real monthly cash flow of owning would be tight compared with renting."
      ]
    },
    {
      title: "What would settle the call toward buying",
      label: "Long-run path",
      tone: "flip",
      intro: "Close calls lean toward buying when the stay is real and the friction gets easier to recover.",
      items: [
        "You expect to stay well beyond the current horizon.",
        "A stronger deposit or better rate moves the buy-side cash flow into a comfortable range.",
        "Rent growth keeps eating away at the value of waiting."
      ]
    }
  ];
}

function evaluateScenario(input, options) {
  const includeExamples = !options || options.includeExamples !== false;
  const v = withDefaults(input);
  const model = calculateHousingModel(v);
  const breakEvenYears = getBreakEvenYears(v);
  const diff = model.totalRent - model.netBuyCost;
  const separation = Math.abs(diff) / Math.max(Math.abs(model.totalRent), Math.abs(model.netBuyCost), 1);
  const depositRatio = v.price > 0 ? v.deposit / v.price : 0;
  let score = 0;
  const reasons = [];

  if (diff > 0) {
    score += separation > 0.12 ? 3 : separation > 0.04 ? 2 : 1;
    reasons.push(`Under these assumptions, renting costs about ${gbp(model.totalRent)} while buying comes out near ${gbp(model.netBuyCost)} over ${v.years} years.`);
  } else {
    score -= separation > 0.12 ? 3 : separation > 0.04 ? 2 : 1;
    reasons.push(`Under these assumptions, buying comes out near ${gbp(model.netBuyCost)} while renting costs about ${gbp(model.totalRent)} over ${v.years} years.`);
  }

  if (breakEvenYears && breakEvenYears <= v.years) {
    score += 2;
    reasons.push(`The model reaches break-even after about ${breakEvenYears.toFixed(1)} years, which fits inside your planned stay.`);
  } else {
    score -= 1;
    reasons.push("The current assumptions do not recover the buying friction quickly enough to make the break-even comfortable.");
  }

  if (v.stability === "long") {
    score += 1;
    reasons.push("Your long-term stability makes it easier to justify carrying the upfront friction of buying.");
  } else if (v.stability === "short") {
    score -= 1;
    reasons.push("Short-term or uncertain plans make renting's flexibility materially more valuable.");
  }

  if (v.years < 4) {
    score -= 2;
    reasons.push("A shorter stay gives buying less time to recover fees, upkeep, and sale friction.");
  } else if (v.years >= 7) {
    score += 1;
    reasons.push("A longer stay gives the ownership side much more time to outgrow its upfront friction.");
  }

  if (depositRatio >= 0.15) {
    score += 1;
    reasons.push("A stronger deposit reduces mortgage pressure and makes the buy case easier to defend.");
  } else if (depositRatio < 0.08 && model.loanAmount > 0) {
    score -= 1;
    reasons.push("A thinner deposit leaves less room for rates, fees, and early-selling risk.");
  }

  if (model.monthlyCashOut > v.rent * 1.25) {
    score -= 1;
    reasons.push(`Estimated buy-side cash flow is around ${gbp(model.monthlyCashOut)} per month, which is materially above the current rent.`);
  } else if (model.monthlyCashOut < v.rent * 0.95) {
    score += 1;
    reasons.push(`Estimated buy-side cash flow sits around ${gbp(model.monthlyCashOut)} per month, which keeps ownership pressure relatively controlled.`);
  }

  if (v.rentIncrease >= 4 && v.years >= 5) {
    score += 1;
    reasons.push("Faster rent growth improves the long-run case for buying if the stay is real.");
  }

  if (v.homeGrowth < 0) {
    score -= 1;
    reasons.push("A softer home-value outlook reduces the equity recovery you can count on when you sell.");
  }

  let verdictOverride = "";
  if (v.years <= 3 && v.stability === "short" && (!breakEvenYears || breakEvenYears > v.years)) {
    verdictOverride = "RENT";
  }
  if (v.years >= 8 && v.stability === "long" && diff > 0 && separation > 0.08) {
    verdictOverride = "BUY";
  }

  const realLife = [
    `Estimated mortgage payment: ${gbp(model.mortgagePayment)} a month on a ${gbp(model.loanAmount)} loan after a ${gbp(model.deposit)} deposit.`,
    `Estimated upfront cash needed: ${gbp(model.upfrontCash)} including deposit and buy fees.`,
    `Estimated ending equity after sale costs: ${gbp(model.endingEquity)} if the home value changes by ${v.homeGrowth.toFixed(1)}% a year.`,
    `Opportunity cost included: ${gbp(model.opportunityCost)} for cash that could have stayed earning about ${v.savingsReturn.toFixed(1)}% a year.`,
    breakEvenYears
      ? `At these assumptions, buying starts to make sense after roughly ${breakEvenYears.toFixed(1)} years.`
      : "At these assumptions, buying does not clearly reach break-even inside the period this tool checks."
  ];

  const result = runDecisionEngine({
    score,
    maxScore: 9,
    closeness: separation,
    thresholds: { positive: 2, negative: -2 },
    verdicts: { positive: "BUY", negative: "RENT", neutral: "BORDERLINE" },
    verdictOverride,
    reasons,
    realLife,
    summaryByVerdict: {
      BUY: `Using the current UK-style assumptions, buying looks stronger than renting over ${v.years} years.`,
      RENT: `Using the current UK-style assumptions, renting still looks safer or cheaper than buying over ${v.years} years.`,
      BORDERLINE: `With the current UK-style assumptions, renting and buying stay close enough over ${v.years} years that the call is still finely balanced.`
    },
    explanationByVerdict: {
      BUY: "Buying is stronger here because the stay is long enough, the friction is recoverable, and the buy-side cash flow remains manageable under the current assumptions.",
      RENT: "Renting is stronger here because the buying friction still needs too much time to recover, the stay is too short or uncertain, or the buy-side cash flow is still too heavy.",
      BORDERLINE: "This is a close call because the net totals are not far apart. Small shifts in rates, fees, upkeep, rent growth, or the true move-out date could flip it."
    },
    details: {
      ...model,
      breakEvenYears
    }
  });

  result.actionPlan = buildActionPlan(v, result);
  result.decisionEdges = buildDecisionEdges(v, result);
  result.signalBreakdown = [
    {
      label: "Net cost gap",
      detail: diff >= 0 ? `${gbp(diff)} better than renting over ${v.years} years` : `${gbp(Math.abs(diff))} better than buying over ${v.years} years`,
      leanText: diff >= 0 ? "Leans toward buying" : "Leans toward renting",
      tone: result.verdict === "BORDERLINE" ? "mixed" : (diff >= 0 ? (result.verdict === "BUY" ? "toward" : "away") : (result.verdict === "RENT" ? "toward" : "away")),
      strength: Math.min(92, Math.max(34, Math.round(separation * 100) + 28))
    },
    {
      label: "Break-even timing",
      detail: breakEvenYears ? `Around ${breakEvenYears.toFixed(1)} years` : "Not clearly reached",
      leanText: breakEvenYears && breakEvenYears <= v.years ? "Fits your horizon" : "Still outside your horizon",
      tone: result.verdict === "BORDERLINE" ? "mixed" : ((breakEvenYears && breakEvenYears <= v.years) ? (result.verdict === "BUY" ? "toward" : "away") : (result.verdict === "RENT" ? "toward" : "away")),
      strength: breakEvenYears && breakEvenYears <= v.years ? 82 : 54
    },
    {
      label: "Upfront cash",
      detail: `${gbp(model.upfrontCash)} needed before monthly payments`,
      leanText: depositRatio >= 0.15 ? "Healthy deposit" : depositRatio < 0.08 ? "Thin deposit" : "Manageable but material",
      tone: result.verdict === "BORDERLINE" ? "mixed" : (depositRatio >= 0.15 ? (result.verdict === "BUY" ? "toward" : "away") : depositRatio < 0.08 ? (result.verdict === "RENT" ? "toward" : "away") : "mixed"),
      strength: depositRatio >= 0.15 ? 72 : depositRatio < 0.08 ? 74 : 52
    },
    {
      label: "Monthly pressure",
      detail: `${gbp(model.monthlyCashOut)} estimated buy-side monthly outflow`,
      leanText: model.monthlyCashOut <= v.rent ? "Cash flow favours buying" : model.monthlyCashOut > v.rent * 1.25 ? "Cash flow favours renting" : "Cash flow stays fairly close",
      tone: result.verdict === "BORDERLINE" ? "mixed" : (model.monthlyCashOut <= v.rent ? (result.verdict === "BUY" ? "toward" : "away") : model.monthlyCashOut > v.rent * 1.25 ? (result.verdict === "RENT" ? "toward" : "away") : "mixed"),
      strength: model.monthlyCashOut <= v.rent ? 76 : model.monthlyCashOut > v.rent * 1.25 ? 80 : 56
    }
  ];

  if (includeExamples) {
    const scenarios = [
      {
        title: "Stay 3 years longer",
        input: {
          ...v,
          years: Number((v.years + 3).toFixed(1)),
          stability: "long"
        }
      },
      {
        title: "Rates fall by 1 point",
        input: {
          ...v,
          mortgageRate: Math.max(0, Number((v.mortgageRate - 1).toFixed(1)))
        }
      },
      {
        title: "Rents rise faster",
        input: {
          ...v,
          rentIncrease: Number((v.rentIncrease + 2).toFixed(1))
        }
      }
    ];

    result.examples = scenarios.map((scenario) => {
      const scenarioResult = evaluateScenario(scenario.input, { includeExamples: false });
      return {
        title: scenario.title,
        meta: [
          `${scenario.input.years} year horizon`,
          `${scenario.input.mortgageRate.toFixed(1)}% mortgage`,
          `${scenario.input.rentIncrease.toFixed(1)}% rent growth`
        ],
        verdict: scenarioResult.verdict,
        input: scenario.input,
        description: scenarioResult.summary
      };
    });
  } else {
    result.examples = [];
  }

  result.normalizedValues = v;
  result.assumptionSummary = buildAssumptionSummary(v);
  return result;
}

function decide(v) {
  return evaluateScenario(v, { includeExamples: true });
}

function buildSharedState(v) {
  const normalized = withDefaults(v);
  return {
    rent: Number(normalized.rent),
    price: Number(normalized.price),
    ownership: Number(normalized.ownership),
    years: Number(normalized.years),
    stability: String(normalized.stability || ""),
    deposit: Number(normalized.deposit),
    mortgageRate: Number(normalized.mortgageRate),
    mortgageTerm: Number(normalized.mortgageTerm),
    buyFees: Number(normalized.buyFees),
    sellFees: Number(normalized.sellFees),
    annualUpkeep: Number(normalized.annualUpkeep),
    rentIncrease: Number(normalized.rentIncrease),
    homeGrowth: Number(normalized.homeGrowth),
    savingsReturn: Number(normalized.savingsReturn)
  };
}

function buildSnapshot(v, result) {
  const breakEvenText = result.details.breakEvenYears
    ? `${result.details.breakEvenYears.toFixed(1)} years`
    : "Not clearly reached";

  return [
    {
      label: "Recommendation",
      emphasis: `${result.verdict} · ${result.confidenceText}`,
      body: result.summary,
      tone: "highlight"
    },
    {
      label: "Outcome snapshot",
      items: [
        `Rent cost: ${gbp(result.details.totalRent)}`,
        `Net buy cost: ${gbp(result.details.netBuyCost)}`,
        `Monthly buy-side outflow: ${gbp(result.details.monthlyCashOut)}`,
        `Ending equity: ${gbp(result.details.endingEquity)}`,
        `Break-even: ${breakEvenText}`
      ]
    },
    {
      label: "Assumptions used",
      items: result.assumptionSummary
    }
  ];
}

function buildCopySummary(v, result) {
  const nextMove = result.actionPlan && result.actionPlan[0] && result.actionPlan[0].items
    ? result.actionPlan[0].items.slice(0, 2)
    : [];
  const breakEvenText = result.details.breakEvenYears
    ? `${result.details.breakEvenYears.toFixed(1)} years`
    : "Not clearly reached";

  return [
    "WorthItCheck — Rent vs Buy UK",
    `Result: ${result.verdict} (${result.confidenceText})`,
    `Summary: ${result.summary}`,
    `Base inputs: rent ${gbp(v.rent)}/month, home price ${gbp(v.price)}, owner extras ${gbp(v.ownership)}/month, ${v.years}-year horizon, stability ${labelize(v.stability)}.`,
    `Assumptions: deposit ${gbp(v.deposit)}, mortgage ${v.mortgageRate.toFixed(1)}% over ${v.mortgageTerm} years, buy fees ${gbp(v.buyFees)}, sell fees ${gbp(v.sellFees)}, annual upkeep ${gbp(v.annualUpkeep)}, rent growth ${v.rentIncrease.toFixed(1)}%, home value change ${v.homeGrowth.toFixed(1)}%, cash return ${v.savingsReturn.toFixed(1)}%.`,
    `Break-even: ${breakEvenText}`,
    `Projected totals: rent ${gbp(result.details.totalRent)}, net buy cost ${gbp(result.details.netBuyCost)}, ending equity ${gbp(result.details.endingEquity)}.`,
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
    emptyText: 'The compare view helps you test whether timeline, rates, fees, or rent growth actually flips the recommendation.'
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
  const normalized = withDefaults(v);

  message.textContent = isSharedLink
    ? "Loaded a shared setup."
    : normalized.assumptionMode.length
      ? `Using default assumptions for ${normalized.assumptionMode.join(", ")}.`
      : "";

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
      render(result, result.normalizedValues);
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
  buyTotalEl.textContent = gbp(result.details.netBuyCost);
  monthlyDifferenceEl.textContent = gbp(result.details.monthlyEdge);
  breakEvenEl.textContent = result.details.breakEvenYears
    ? `${result.details.breakEvenYears.toFixed(1)} years`
    : "Not reached";
  endingEquityEl.textContent = gbp(result.details.endingEquity);
  reasonsEl.innerHTML = result.reasons.map((reason) => `<li>${reason}</li>`).join("");
  realLifeEl.innerHTML = result.realLife.map((item) => `<li>${item}</li>`).join("");
  explainerEl.innerHTML = `
    <p>${result.explanation}</p>
    <p>Monthly buy-side cash flow is estimated at <strong>${gbp(result.details.monthlyCashOut)}</strong>, with <strong>${gbp(result.details.upfrontCash)}</strong> needed upfront and an estimated <strong>${gbp(result.details.endingEquity)}</strong> recovered after sale costs if the home-value assumption holds.</p>
    <p>${result.assumptionSummary.join(" ")}</p>
  `;
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
  const nextValues = buildSharedState(sharedState);
  applyFormValues(form, nextValues);
  if (!validate(nextValues)) {
    runScenario(nextValues, { kind: "shared-link" });
  }
}
