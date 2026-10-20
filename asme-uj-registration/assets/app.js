(() => {
  const menu = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".nav-links");
  if (menu && nav) {
    menu.addEventListener("click", () => {
      const open = menu.getAttribute("aria-expanded") !== "true";
      menu.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("nav-open", open);
    });
    nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => {
      menu.setAttribute("aria-expanded", "false");
      nav.classList.remove("nav-open");
    }));
  }

  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); }
    }), { threshold: 0.08 });
    revealEls.forEach(el => observer.observe(el));
  } else revealEls.forEach(el => el.classList.add("is-visible"));

  const form = document.getElementById("registration-form");
  if (!form) return;

  const requiredIds = ["fullName", "email", "phone", "major", "experience"];
  const status = document.getElementById("form-status");
  const submitButton = document.getElementById("submit-button");
  const count = document.getElementById("form-count");
  const iframe = document.getElementById("submission-frame");
  const startTime = Date.now();
  let pending = false;
  let activeNonce = "";
  let submittedAt = 0;
  let iframeArmed = false;

  const endpointConfigured = () => {
    const url = window.ASME_CONFIG && window.ASME_CONFIG.APPS_SCRIPT_URL;
    return typeof url === "string" && /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec(?:\?.*)?$/.test(url);
  };
  const value = name => (form.elements[name]?.value || "").trim();
  const chosen = name => form.querySelector(`input[name="${name}"]:checked`)?.value || "";
  const setError = (name, message) => {
    const el = document.getElementById(`error-${name}`);
    if (el) el.textContent = message;
    const input = form.elements[name];
    if (input && input.type !== "radio") {
      input.setAttribute("aria-invalid", message ? "true" : "false");
      if (message) input.setAttribute("aria-describedby", `error-${name}`);
      else input.removeAttribute("aria-describedby");
    }
  };
  const updateCount = () => {
    let complete = 0;
    requiredIds.forEach(id => { if (value(id)) complete++; });
    if (chosen("team")) complete++;
    if (chosen("year")) complete++;
    count.textContent = `${complete} / 7 REQUIRED COMPLETE`;
  };
  const validate = () => {
    let first = null, valid = true;
    const checks = {
      fullName: value("fullName") ? "" : "Please enter your full name.",
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value("email")) ? "" : "Enter a valid email address.",
      phone: /^[+()\d\s.-]{7,25}$/.test(value("phone")) && (value("phone").match(/\d/g) || []).length >= 7 ? "" : "Enter a valid phone number, including at least 7 digits.",
      major: value("major") ? "" : "Please enter your university major.",
      experience: value("experience") ? "" : "Please share your experience, or write “None”.",
      team: ["Social Media", "Event Team", "Not Sure"].includes(chosen("team")) ? "" : "Please choose a team preference.",
      year: ["1st", "2nd", "3rd", "4th", "5th", "Other"].includes(chosen("year")) ? "" : "Please select your current year of study."
    };
    Object.entries(checks).forEach(([name, error]) => {
      setError(name, error);
      if (error) {
        valid = false;
        const el = name === "team" || name === "year" ? form.querySelector(`input[name="${name}"]`) : form.elements[name];
        if (!first) first = el;
      }
    });
    if (!valid && first) {
      first.focus({ preventScroll: true });
      first.closest(".field, .choice-field")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return valid;
  };

  form.addEventListener("input", updateCount);
  form.addEventListener("change", updateCount);
  form.addEventListener("input", e => {
    const el = e.target;
    if (el.name && document.getElementById(`error-${el.name}`)) setError(el.name, "");
  });
  updateCount();

  const showStatus = (kind, message) => {
    status.className = `form-status ${kind}`;
    status.textContent = message;
    status.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };
  const restoreButton = () => {
    pending = false;
    submitButton.disabled = false;
    submitButton.innerHTML = 'Submit application <span>↗</span>';
  };

  window.addEventListener("message", event => {
    const data = event.data;
    if (!pending || !data || data.type !== "ASME_SUBMISSION_RESULT" || data.nonce !== activeNonce) return;
    if (data.status === "success") {
      showStatus("success", "Application submitted successfully. Thank you for your interest in joining the ASME Student Section at the University of Jordan.");
      form.reset();
      updateCount();
      form.querySelectorAll(".error").forEach(el => el.textContent = "");
      restoreButton();
      form.querySelectorAll("input, textarea, button").forEach(el => { if (el.id !== "website" && el.id !== "nonce") el.disabled = false; });
      form.querySelectorAll(".field, .choice-field").forEach(el => el.classList.remove("submitted-lock"));
    } else {
      showStatus("error", data.message || "We could not confirm your application. Your answers are still here. Please try again.");
      restoreButton();
    }
    pending = false;
  });

  form.addEventListener("submit", e => {
    e.preventDefault();
    status.textContent = "";
    status.className = "form-status";
    if (pending) return;
    if (!validate()) return;
    if (form.elements.website.value) return;
    if (!endpointConfigured()) {
      showStatus("error", "Registration is not connected yet. The website owner must add the deployed Apps Script /exec URL in assets/config.js. No application has been submitted.");
      return;
    }
    if (Date.now() - startTime < 2500) {
      showStatus("error", "Please take a moment to review your application, then submit again.");
      return;
    }

    activeNonce = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    form.elements.nonce.value = activeNonce;
    pending = true;
    iframeArmed = true;
    submittedAt = Date.now();
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="spinner"></span> Submitting application...';
    showStatus("loading", "Sending your application securely to the registration sheet...");
    form.action = window.ASME_CONFIG.APPS_SCRIPT_URL;
    form.method = "POST";
    form.target = "submission-frame";
    form.enctype = "application/x-www-form-urlencoded";
    form.submit();

    // The backend response posts a nonce-matched message from the iframe.
    // If no response arrives, never claim success.
    window.setTimeout(() => {
      if (pending && iframeArmed && Date.now() - submittedAt >= 18000) {
        showStatus("error", "We could not confirm the submission. Your answers remain in the form. Check your connection and try again. If this repeats, contact the ASME UJ team.");
        restoreButton();
        pending = false;
      }
    }, 18100);
  });
})();
