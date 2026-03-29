(function () {
  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    }[char]));
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


  function renderSignalBreakdown(container, signals) {
    if (!container) return;

    const items = Array.isArray(signals) ? signals.slice(0, 4) : [];
    if (!items.length) {
      container.innerHTML = "";
      return;
    }

    container.innerHTML = items
      .map((item) => {
        const strength = clamp(Number(item.strength) || 0, 0, 100);
        const tone = ["toward", "away", "mixed"].includes(item.tone) ? item.tone : "mixed";
        const label = escapeHtml(item.label || "Decision signal");
        const leanText = escapeHtml(item.leanText || "Mixed signal");
        const detail = escapeHtml(item.detail || "");

        return `
          <article class="signal-card signal-card--${tone}">
            <div class="signal-card__topline">
              <strong>${label}</strong>
              <span>${leanText}</span>
            </div>
            <div class="signal-meter" aria-hidden="true">
              <span style="width:${strength}%"></span>
            </div>
            <p class="signal-card__detail">${detail}</p>
          </article>
        `;
      })
      .join("");
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

  function renderExampleScenarios(container, scenarios, options) {
    if (!container) return;

    const settings = {
      buttonText: "",
      ...options
    };
    const items = Array.isArray(scenarios) ? scenarios.slice(0, 3) : [];
    container.innerHTML = items
      .map((scenario, index) => {
        const meta = Array.isArray(scenario.meta)
          ? `<div class="example-meta">${scenario.meta
              .filter(Boolean)
              .map((item) => `<span>${escapeHtml(item)}</span>`)
              .join("")}</div>`
          : "";

        const description = scenario.description
          ? `<p>${escapeHtml(scenario.description)}</p>`
          : "";
        const action = settings.buttonText
          ? `<button type="button" class="example-replay-button" data-example-index="${index}">${escapeHtml(settings.buttonText)}</button>`
          : "";

        return `
          <article class="example-card example-card-generated">
            <div class="example-body">
              <h4>${escapeHtml(scenario.title || "Example scenario")}</h4>
              ${meta}
              <div class="example-result">${escapeHtml(scenario.verdict || "")}</div>
              ${description}
              ${action}
            </div>
          </article>
        `;
      })
      .join("");
  }

  function bindExampleReplay(container, scenarios, onSelect) {
    if (!container || typeof onSelect !== "function") return;

    const items = Array.isArray(scenarios) ? scenarios.slice(0, 3) : [];
    container.querySelectorAll("[data-example-index]").forEach((button) => {
      button.addEventListener("click", () => {
        const index = Number(button.getAttribute("data-example-index"));
        const scenario = items[index];
        if (!scenario) return;
        onSelect(scenario, index);
      });
    });
  }

  function applyFormValues(form, nextValues) {
    if (!form || !nextValues) return;

    Object.entries(nextValues).forEach(([name, value]) => {
      const field = form.elements.namedItem(name);
      if (!field) return;

      if (typeof RadioNodeList !== "undefined" && field instanceof RadioNodeList) {
        Array.from(field).forEach((item) => {
          item.checked = item.value === String(value);
        });
        return;
      }

      if (field.length && typeof field !== "string" && field[0] && field[0].type === "radio") {
        Array.from(field).forEach((item) => {
          item.checked = item.value === String(value);
        });
        return;
      }

      if (field.type === "checkbox") {
        field.checked = Boolean(value);
        return;
      }

      field.value = value;
    });
  }



  function renderDecisionSnapshot(container, sections) {
    if (!container) return;

    const items = Array.isArray(sections) ? sections.filter(Boolean).slice(0, 3) : [];
    if (!items.length) {
      container.innerHTML = "";
      return;
    }

    container.innerHTML = items
      .map((section) => {
        const tone = section.tone === "highlight" ? " snapshot-card--highlight" : "";
        const label = escapeHtml(section.label || "Summary");
        const emphasis = section.emphasis
          ? `<p class="snapshot-emphasis">${escapeHtml(section.emphasis)}</p>`
          : "";
        const body = section.body
          ? `<p class="snapshot-body">${escapeHtml(section.body)}</p>`
          : "";
        const bullets = normalizeBullets(section.items, 4);
        const list = bullets.length
          ? `<ul class="snapshot-list">${bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
          : "";

        return `
          <article class="snapshot-card${tone}">
            <span class="snapshot-label">${label}</span>
            ${emphasis}
            ${body}
            ${list}
          </article>
        `;
      })
      .join("");
  }

  function copyTextToClipboard(text) {
    const content = String(text || "").trim();
    if (!content) return Promise.reject(new Error("No content to copy."));

    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(content);
    }

    return new Promise((resolve, reject) => {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = content;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        const successful = document.execCommand("copy");
        document.body.removeChild(textarea);
        if (!successful) throw new Error("Copy command failed.");
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }


  function encodeShareState(state) {
    try {
      const json = JSON.stringify(state || {});
      return btoa(unescape(encodeURIComponent(json)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
    } catch (error) {
      return "";
    }
  }

  function decodeShareState(value) {
    const input = String(value || "").trim();
    if (!input) return null;

    try {
      const normalized = input
        .replace(/-/g, "+")
        .replace(/_/g, "/");
      const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
      const json = decodeURIComponent(escape(atob(padded)));
      const parsed = JSON.parse(json);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  function createShareUrl(state) {
    const url = new URL(window.location.href);
    if (!state || typeof state !== "object") {
      url.searchParams.delete("state");
      return url.toString();
    }

    const encoded = encodeShareState(state);
    if (!encoded) {
      url.searchParams.delete("state");
      return url.toString();
    }

    url.searchParams.set("state", encoded);
    return url.toString();
  }

  function writeShareState(state) {
    const url = createShareUrl(state);
    try {
      window.history.replaceState(window.history.state, "", url);
    } catch (error) {
      // Ignore history errors and keep the current page usable.
    }
    return url;
  }

  function readShareState() {
    try {
      const url = new URL(window.location.href);
      return decodeShareState(url.searchParams.get("state"));
    } catch (error) {
      return null;
    }
  }

  function bindCopyStateLinkButton(button, getUrl, options) {
    if (!button || typeof getUrl !== "function") return;

    const settings = {
      idleText: button.textContent.trim() || "Copy exact result link",
      successText: "Link copied",
      errorText: "Copy failed",
      resetDelay: 1800,
      onStatusChange: null,
      ...options
    };

    let resetTimer = null;

    button.addEventListener("click", async () => {
      const url = getUrl();
      if (!String(url || "").trim()) return;

      button.disabled = true;
      try {
        await copyTextToClipboard(url);
        button.textContent = settings.successText;
        button.classList.add("is-success");
        button.classList.remove("is-error");
        if (typeof settings.onStatusChange === "function") settings.onStatusChange("success");
      } catch (error) {
        button.textContent = settings.errorText;
        button.classList.add("is-error");
        button.classList.remove("is-success");
        if (typeof settings.onStatusChange === "function") settings.onStatusChange("error");
      }

      window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(() => {
        button.disabled = false;
        button.textContent = settings.idleText;
        button.classList.remove("is-success", "is-error");
      }, settings.resetDelay);
    });
  }

  function bindCopySummaryButton(button, getText, options) {
    if (!button || typeof getText !== "function") return;

    const settings = {
      idleText: button.textContent.trim() || "Copy summary",
      successText: "Copied",
      errorText: "Copy failed",
      resetDelay: 1800,
      onStatusChange: null,
      ...options
    };

    let resetTimer = null;

    button.addEventListener("click", async () => {
      const text = getText();
      if (!String(text || "").trim()) return;

      button.disabled = true;
      try {
        await copyTextToClipboard(text);
        button.textContent = settings.successText;
        button.classList.add("is-success");
        button.classList.remove("is-error");
        if (typeof settings.onStatusChange === "function") settings.onStatusChange("success");
      } catch (error) {
        button.textContent = settings.errorText;
        button.classList.add("is-error");
        button.classList.remove("is-success");
        if (typeof settings.onStatusChange === "function") settings.onStatusChange("error");
      }

      window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(() => {
        button.disabled = false;
        button.textContent = settings.idleText;
        button.classList.remove("is-success", "is-error");
      }, settings.resetDelay);
    });
  }


  function renderActionPlan(container, sections) {
    if (!container) return;

    const items = Array.isArray(sections) ? sections.filter(Boolean).slice(0, 2) : [];
    if (!items.length) {
      container.innerHTML = "";
      return;
    }

    container.innerHTML = items
      .map((section) => {
        const tone = ["primary", "watch"].includes(section.tone) ? section.tone : "watch";
        const title = escapeHtml(section.title || "Next step");
        const bullets = normalizeBullets(section.items, 4);

        if (!bullets.length) return "";

        return `
          <article class="action-card action-card--${tone}">
            <h4>${title}</h4>
            <ul class="action-list">
              ${bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
            </ul>
          </article>
        `;
      })
      .join("");
  }


  function renderDecisionEdges(container, sections) {
    if (!container) return;

    const items = Array.isArray(sections) ? sections.filter(Boolean).slice(0, 3) : [];
    if (!items.length) {
      container.innerHTML = "";
      return;
    }

    container.innerHTML = items
      .map((section) => {
        const tone = ["keep", "flip", "watch"].includes(section.tone) ? section.tone : "watch";
        const title = escapeHtml(section.title || "Decision edge");
        const label = section.label
          ? `<span>${escapeHtml(section.label)}</span>`
          : "";
        const intro = section.intro
          ? `<p class="decision-edge__intro">${escapeHtml(section.intro)}</p>`
          : "";
        const bullets = normalizeBullets(section.items, 4);

        if (!bullets.length) return "";

        return `
          <article class="decision-edge decision-edge--${tone}">
            <div class="decision-edge__topline">
              <strong>${title}</strong>
              ${label}
            </div>
            ${intro}
            <ul class="action-list">
              ${bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
            </ul>
          </article>
        `;
      })
      .join("");
  }


  window.WorthItCheckTooling = {
    createShareUrl,
    clearTimers,
    applyFormValues,
    bindExampleReplay,
    initializeExamplesToggle,
    readShareState,
    normalizeBullets,
    revealResultCard,
    bindCopyStateLinkButton,
    bindCopySummaryButton,
    renderDecisionSnapshot,
    renderDecisionEdges,
    renderActionPlan,
    renderExampleScenarios,
    renderSignalBreakdown,
    runDecisionEngine,
    runAnalysis,
    writeShareState,
    setLoading,
    trackEvent
  };
})();
