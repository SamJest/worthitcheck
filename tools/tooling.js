(function () {
  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function normalizeBullets(items, limit) {
    return (items || [])
      .filter(Boolean)
      .map((item) => String(item).trim())
      .filter(Boolean)
      .filter((item, index, all) => all.indexOf(item) === index)
      .slice(0, limit ?? 5);
  }

  function runDecisionEngine(config) {
    const settings = {
      thresholds: { positive: 2, negative: -2, ...(config.thresholds || {}) },
      verdicts: {
        positive: "Worth it",
        negative: "Not worth it",
        neutral: "Depends",
        ...(config.verdicts || {})
      },
      maxScore:
        config.maxScore ??
        Math.max(
          Math.abs((config.thresholds && config.thresholds.positive) || 2),
          Math.abs((config.thresholds && config.thresholds.negative) || -2),
          1
        )
    };

    const score = Number(config.score) || 0;
    const closeness = clamp(Number(config.closeness) || 0, 0, 1);
    const strength = clamp(Math.abs(score) / Math.max(settings.maxScore, 1), 0, 1);

    let verdict = settings.verdicts.neutral;
    if (score >= settings.thresholds.positive) verdict = settings.verdicts.positive;
    if (score <= settings.thresholds.negative) verdict = settings.verdicts.negative;
    if (config.verdictOverride) verdict = config.verdictOverride;

    const confidenceScore = clamp(
      Math.round(52 + (strength * 26) + (closeness * 18)),
      0,
      100
    );

    const summaryByVerdict = config.summaryByVerdict || {};
    const explanationByVerdict = config.explanationByVerdict || {};

    return {
      verdict,
      confidenceScore,
      confidenceText: `${confidenceScore}% confidence`,
      score,
      reasons: normalizeBullets(config.reasons, config.reasonLimit || 5),
      realLife: normalizeBullets(config.realLife, config.realLifeLimit || 5),
      summary: summaryByVerdict[verdict] || config.summary || "",
      explanation: explanationByVerdict[verdict] || config.explanation || "",
      details: config.details || {}
    };
  }

  function clearTimers(timers) {
    while (timers.length) {
      window.clearTimeout(timers.pop());
    }
  }

  function setLoading(button, isLoading, options) {
    const settings = {
      idleText: "Analyze",
      loadingText: "Analyzing...",
      ...options
    };

    button.disabled = isLoading;
    button.classList.toggle("is-loading", isLoading);

    const label = button.querySelector(".button-label");
    if (label) {
      label.textContent = isLoading ? settings.loadingText : settings.idleText;
    }
  }

  function initializeExamplesToggle(toggle, extraExamples) {
    if (!toggle || !extraExamples.length) return;

    toggle.hidden = false;
    extraExamples.forEach((item) => item.classList.add("is-hidden"));

    toggle.addEventListener("click", () => {
      const isExpanded = toggle.getAttribute("aria-expanded") === "true";

      extraExamples.forEach((item) => {
        item.classList.toggle("is-hidden", isExpanded);
      });

      toggle.setAttribute("aria-expanded", String(!isExpanded));
      toggle.textContent = isExpanded ? "Show more examples" : "Show fewer examples";
    });
  }

  function revealResultCard(card, confidenceEl, timers, delay) {
    card.hidden = false;
    card.classList.remove("is-visible");
    confidenceEl.classList.remove("is-visible");

    window.requestAnimationFrame(() => {
      card.classList.add("is-visible");
    });

    timers.push(window.setTimeout(() => {
      confidenceEl.classList.add("is-visible");
    }, delay ?? 220));
  }

  function runAnalysis(options) {
    const {
      timers,
      results,
      thinking,
      thinkingText,
      card,
      steps,
      totalDuration,
      onComplete
    } = options;

    results.hidden = false;
    thinking.hidden = false;
    card.hidden = true;
    results.scrollIntoView({ behavior: "smooth", block: "start" });

    const stepDelay = Math.max(220, Math.floor(totalDuration / Math.max(steps.length, 1)));

    steps.forEach((step, index) => {
      timers.push(window.setTimeout(() => {
        thinkingText.textContent = step;
      }, stepDelay * index));
    });

    timers.push(window.setTimeout(() => {
      thinking.hidden = true;
      onComplete();
    }, totalDuration));
  }

  function trackEvent(toolName, eventName, details) {
    if (typeof window.gtag !== "function") return;

    window.gtag("event", eventName, {
      event_category: "tool_interaction",
      tool_name: toolName,
      ...details
    });
  }

  function renderExampleScenarios(container, scenarios) {
    if (!container) return;

    const items = Array.isArray(scenarios) ? scenarios.slice(0, 3) : [];
    container.innerHTML = items
      .map((scenario) => {
        const meta = Array.isArray(scenario.meta)
          ? `<div class="example-meta">${scenario.meta
              .filter(Boolean)
              .map((item) => `<span>${item}</span>`)
              .join("")}</div>`
          : "";

        const description = scenario.description
          ? `<p>${scenario.description}</p>`
          : "";

        return `
          <article class="example-card example-card-generated">
            <div class="example-body">
              <h4>${scenario.title || "Example scenario"}</h4>
              ${meta}
              <div class="example-result">${scenario.verdict || ""}</div>
              ${description}
            </div>
          </article>
        `;
      })
      .join("");
  }

  window.WorthItCheckTooling = {
    clearTimers,
    initializeExamplesToggle,
    normalizeBullets,
    revealResultCard,
    renderExampleScenarios,
    runDecisionEngine,
    runAnalysis,
    setLoading,
    trackEvent
  };
})();
