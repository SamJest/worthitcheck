(function () {
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

  window.WorthItCheckTooling = {
    clearTimers,
    initializeExamplesToggle,
    revealResultCard,
    runAnalysis,
    setLoading,
    trackEvent
  };
})();
