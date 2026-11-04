"use strict";
(() => {
  const catalogUrl = "/api/catalog";
  const state = {category: "tops", fit: "regular", unit: "cm", products: [], lastResult: null};
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const form = $("#fit-form");
  const select = $("#product-select");
  const errorBox = $("#form-error");
  const submitButton = $("#submit-fit");
  const metrics = ["chest_cm", "waist_cm", "hip_cm", "inseam_cm"];
  const relevant = {
    tops: ["chest_cm", "waist_cm"],
    bottoms: ["waist_cm", "hip_cm", "inseam_cm"],
    dresses: ["chest_cm", "waist_cm", "hip_cm"]
  };
  const toCm = (number) => state.unit === "in" ? number * 2.54 : number;
  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = !message;
  }
  function activateButtonGroup(selector, attribute, value) {
    $$(selector + " button").forEach(button => {
      const active = button.dataset[attribute] === value;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }
  function updateRelevantFields() {
    $$("[data-field]").forEach(field => {
      const active = relevant[state.category].includes(field.dataset.field);
      field.classList.toggle("disabled-field", !active);
      field.querySelector("input").disabled = !active;
    });
  }
  function populateProducts() {
    const products = state.products.filter(product => product.category === state.category);
    select.replaceChildren();
    for (const product of products) {
      const option = document.createElement("option");
      option.value = product.id;
      option.textContent = product.name + " · " + product.type;
      select.append(option);
    }
    if (!products.length) {
      const fallback = document.createElement("option");
      fallback.textContent = "Catalog unavailable";
      select.append(fallback);
    }
    submitButton.disabled = !products.length;
  }
  function setCategory(category) {
    state.category = category;
    activateButtonGroup("#category-tabs", "category", category);
    updateRelevantFields();
    populateProducts();
    resetResult();
    showError("");
  }
  function resetResult() {
    state.lastResult = null;
    $("#result-empty").hidden = false;
    $("#result-output").hidden = true;
    $("#engine-status").lastChild.textContent = " Ready";
  }
  function displayResult(result) {
    state.lastResult = result;
    $("#result-empty").hidden = true;
    $("#result-output").hidden = false;
    $("#engine-status").lastChild.textContent = " Calculated";
    $("#recommended-size").textContent = result.recommended_size;
    $("#confidence").textContent = result.confidence.toUpperCase() + " COVERAGE";
    $("#fit-score").textContent = result.fit_score.toFixed(1) + " / 100";
    $("#score-fill").style.width = result.fit_score + "%";
    $("#coverage").textContent = result.coverage_percent + "% measurement coverage";
    const list = $("#explanations");
    list.replaceChildren();
    for (const sentence of result.explanation) {
      const li = document.createElement("li");
      li.textContent = sentence;
      list.append(li);
    }
    const alternatives = $("#alternatives");
    alternatives.replaceChildren();
    for (const alternative of result.alternatives) {
      const box = document.createElement("div");
      box.className = "alt-size";
      box.textContent = alternative.size + " ";
      const small = document.createElement("span");
      small.textContent = alternative.fit_score.toFixed(1) + " / 100";
      box.append(small);
      alternatives.append(box);
    }
    $("#result-card").scrollIntoView({block: "nearest", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth"});
  }
  function dataFromInputs() {
    const measurements = {};
    for (const metric of relevant[state.category]) {
      const value = form.elements[metric].value.trim();
      if (value !== "") {
        const numeric = Number(value);
        if (!Number.isFinite(numeric) || numeric <= 0) {
          throw new Error("Enter a valid, positive number for each measurement.");
        }
        measurements[metric] = Math.round(toCm(numeric) * 10) / 10;
      }
    }
    if (!Object.keys(measurements).length) throw new Error("Enter at least one relevant body measurement.");
    return measurements;
  }
  function formatAPIError(body) {
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail)) return body.detail.map(part => (part.loc || []).slice(-1).join("") + ": " + part.msg).slice(0, 3).join(" • ");
    return "Unable to calculate. Please check your inputs and try again.";
  }
  async function loadCatalog() {
    try {
      const response = await fetch(catalogUrl, {headers: {"Accept": "application/json"}});
      if (!response.ok) throw new Error("Catalog service is unavailable.");
      const data = await response.json();
      if (!data.sample_data || !Array.isArray(data.products)) throw new Error("Unexpected catalog response.");
      state.products = data.products;
      populateProducts();
    } catch (error) {
      showError(error.message || "Could not load the sample catalog. Please reload.");
      submitButton.disabled = true;
      populateProducts();
    }
  }
  $$("[data-category]").forEach(button => button.addEventListener("click", () => setCategory(button.dataset.category)));
  $$("[data-fit]").forEach(button => button.addEventListener("click", () => {
    state.fit = button.dataset.fit;
    activateButtonGroup("#fit-tabs", "fit", state.fit);
    resetResult();
  }));
  $$("[data-unit]").forEach(button => button.addEventListener("click", () => {
    if (button.dataset.unit === state.unit) return;
    const newUnit = button.dataset.unit;
    metrics.forEach(metric => {
      const input = form.elements[metric];
      if (!input.value) return;
      const original = Number(input.value);
      if (Number.isFinite(original)) input.value = (newUnit === "in" ? original / 2.54 : original * 2.54).toFixed(1);
    });
    state.unit = newUnit;
    activateButtonGroup(".unit-switch", "unit", newUnit);
    $$(".unit-label").forEach(label => label.textContent = newUnit);
    resetResult();
  }));
  $("#try-example").addEventListener("click", () => {
    const sample = {chest_cm: 96, waist_cm: 81, hip_cm: 100, inseam_cm: 78};
    metrics.forEach(metric => {
      form.elements[metric].value = (state.unit === "in" ? sample[metric] / 2.54 : sample[metric]).toFixed(1);
    });
    showError("");
    resetResult();
  });
  form.addEventListener("reset", () => {
    setTimeout(() => {showError(""); resetResult();}, 0);
  });
  form.addEventListener("input", () => {showError(""); resetResult();});
  select.addEventListener("change", resetResult);
  form.addEventListener("submit", async event => {
    event.preventDefault();
    showError("");
    try {
      const measurements = dataFromInputs();
      const product_id = select.value;
      if (!product_id) throw new Error("Please select a garment.");
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      submitButton.disabled = true;
      submitButton.firstChild.textContent = "Calculating… ";
      try {
        const response = await fetch("/api/recommend", {
          method: "POST", signal: controller.signal,
          headers: {"Content-Type": "application/json", "Accept": "application/json"},
          body: JSON.stringify({category: state.category, fit: state.fit, product_id, measurements})
        });
        const data = await response.json();
        if (!response.ok) throw new Error(formatAPIError(data));
        displayResult(data);
      } finally {
        clearTimeout(timeout);
        submitButton.disabled = false;
        submitButton.firstChild.textContent = "Calculate my fit ";
      }
    } catch (error) {
      showError(error.name === "AbortError" ? "The request timed out. Please try again." : error.message || "Unable to complete recommendation.");
    }
  });
  async function copy(text, button) {
    try {
      await navigator.clipboard.writeText(text);
      const original = button.textContent;
      button.textContent = "Copied ✓";
      setTimeout(() => {button.textContent = original;}, 1700);
    } catch (_) {
      button.textContent = "Copy unavailable";
    }
  }
  $("#copy-result").addEventListener("click", event => {
    const r = state.lastResult;
    if (!r) return;
    copy("Universal Fashion Size — " + r.product + "\nRecommended: " + r.recommended_size +
         "\nFit score: " + r.fit_score + "/100\nCoverage: " + r.coverage_percent +
         "%\n" + r.explanation.join("\n") + "\n" + r.disclaimer, event.currentTarget);
  });
  $("#copy-api").addEventListener("click", event => copy($("#api-sample").textContent, event.currentTarget));
  updateRelevantFields();
  loadCatalog();
})();
