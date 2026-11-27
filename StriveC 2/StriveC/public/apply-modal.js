/**
 * StriveCode Interactive Apply Now Modal (apply-modal.js)
 * - Injects accessible modal into the page
 * - Event delegation for all Apply Now & Career application triggers
 * - Context-aware pre-selection for Courses & Careers
 * - Cascading dependent dropdown (Program/Role depends on Category)
 * - Inline validation with gentle shake animations
 * - Focus trapping & scroll locking with zero layout shift
 * - Smooth cubic-bezier(0.22, 1, 0.36, 1) transitions
 * - Pluggable submitApplication(data) endpoint handler
 */

(function () {
  'use strict';

  // 1. PROGRAM / ROLE MAPPING BY CATEGORY
  const PROGRAM_DATA = {
    "Engineering Course": [
      "Full-Stack Web & Microservices",
      "Enterprise Java & Distributed Systems",
      "Applied AI/ML & Agentic Systems",
      "Data Engineering & Lakehouse",
      "Cloud Infrastructure, DevOps & Kubernetes",
      "Cybersecurity, AppSec & Ethical Hacking"
    ],
    "Career Opportunity": [
      "Senior Full-Stack Engineer",
      "Mobile Application Developer",
      "Backend & ERP Systems Architect",
      "AI & Automation Engineer",
      "Cloud & DevOps Engineer",
      "UI/UX Product Designer"
    ],
    "1-on-1 Mentorship": [
      "Academic Guidance",
      "Corporate Transition",
      "Research Advisory"
    ],
    "Enterprise Project Inquiry": [
      "Custom Software",
      "ERP & CRM",
      "Web & Mobile App",
      "AI & Automation"
    ]
  };

  let modalEl = null;
  let formEl = null;
  let formWrapper = null;
  let successWrapper = null;
  let categorySelect = null;
  let programSelect = null;
  let submitBtn = null;
  let lastActiveTrigger = null;
  let isSubmitting = false;

  // 2. MODAL HTML TEMPLATE
  function buildModalHTML() {
    return `
      <div class="sc-apply-backdrop" id="sc-apply-modal" role="dialog" aria-modal="true" aria-labelledby="sc-apply-title" aria-hidden="true">
        <div class="sc-apply-container">
          <div class="sc-apply-card" id="sc-apply-card">
            <button type="button" class="sc-apply-close-btn" id="sc-apply-close" aria-label="Close modal">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            <!-- Form Body -->
            <div class="sc-apply-body" id="sc-apply-form-wrapper">
              <div class="sc-apply-header">
                <span class="sc-apply-badge">APPLY TO STRIVECODE</span>
                <h2 class="sc-apply-title" id="sc-apply-title">Start Your Journey With Us</h2>
                <p class="sc-apply-subtitle">Fill in your details below. Our admissions and engineering team will review your profile and reach out within 24 hours.</p>
              </div>

              <form class="sc-apply-form" id="sc-apply-form" novalidate>
                <div class="sc-apply-grid">
                  <!-- 1. Full Name * -->
                  <div class="sc-apply-field sc-apply-stagger" data-field="name">
                    <label class="sc-apply-label" for="sc-apply-name">Full Name <span class="sc-apply-required">*</span></label>
                    <input type="text" class="sc-apply-input" id="sc-apply-name" name="name" placeholder="John Doe" required autocomplete="name">
                    <span class="sc-apply-error" id="sc-apply-name-error"></span>
                  </div>

                  <!-- 2. Email Address * -->
                  <div class="sc-apply-field sc-apply-stagger" data-field="email">
                    <label class="sc-apply-label" for="sc-apply-email">Email Address <span class="sc-apply-required">*</span></label>
                    <input type="email" class="sc-apply-input" id="sc-apply-email" name="email" placeholder="john@example.com" required autocomplete="email">
                    <span class="sc-apply-error" id="sc-apply-email-error"></span>
                  </div>

                  <!-- 3. Phone Number * -->
                  <div class="sc-apply-field sc-apply-stagger" data-field="phone">
                    <label class="sc-apply-label" for="sc-apply-phone">Phone Number <span class="sc-apply-required">*</span></label>
                    <div class="sc-apply-phone-wrap" id="sc-apply-phone-wrap">
                      <span class="sc-apply-phone-prefix">+91</span>
                      <input type="tel" class="sc-apply-input sc-apply-phone-input" id="sc-apply-phone" name="phone" placeholder="98765 43210" maxlength="10" required autocomplete="tel-national">
                    </div>
                    <span class="sc-apply-error" id="sc-apply-phone-error"></span>
                  </div>

                  <!-- 4. I'm Applying For * -->
                  <div class="sc-apply-field sc-apply-stagger" data-field="category">
                    <label class="sc-apply-label" for="sc-apply-category">I'm Applying For <span class="sc-apply-required">*</span></label>
                    <select class="sc-apply-select" id="sc-apply-category" name="category" required>
                      <option value="" disabled selected>Select application type...</option>
                      <option value="Engineering Course">Engineering Course</option>
                      <option value="Career Opportunity">Career Opportunity</option>
                      <option value="1-on-1 Mentorship">1-on-1 Mentorship</option>
                      <option value="Enterprise Project Inquiry">Enterprise Project Inquiry</option>
                    </select>
                    <span class="sc-apply-error" id="sc-apply-category-error"></span>
                  </div>

                  <!-- 5. Program or Role * (Dependent on field 4) -->
                  <div class="sc-apply-field sc-apply-stagger" data-field="program">
                    <label class="sc-apply-label" for="sc-apply-program">Program or Role <span class="sc-apply-required">*</span></label>
                    <select class="sc-apply-select" id="sc-apply-program" name="program" required>
                      <option value="" disabled selected>Select program or role...</option>
                    </select>
                    <span class="sc-apply-error" id="sc-apply-program-error"></span>
                  </div>

                  <!-- 6. Current Status * -->
                  <div class="sc-apply-field sc-apply-stagger" data-field="status">
                    <label class="sc-apply-label" for="sc-apply-status">Current Status <span class="sc-apply-required">*</span></label>
                    <select class="sc-apply-select" id="sc-apply-status" name="status" required>
                      <option value="" disabled selected>Select your current status...</option>
                      <option value="Student">Student</option>
                      <option value="Working Professional">Working Professional</option>
                      <option value="Fresher">Fresher</option>
                      <option value="Career Switcher">Career Switcher</option>
                    </select>
                    <span class="sc-apply-error" id="sc-apply-status-error"></span>
                  </div>

                  <!-- 7. College / Company Name -->
                  <div class="sc-apply-field sc-apply-stagger" data-field="organization">
                    <label class="sc-apply-label" for="sc-apply-org">College / Company Name</label>
                    <input type="text" class="sc-apply-input" id="sc-apply-org" name="organization" placeholder="e.g. Stanford University / Tech Corp">
                    <span class="sc-apply-error" id="sc-apply-org-error"></span>
                  </div>

                  <!-- 8. Experience Level -->
                  <div class="sc-apply-field sc-apply-stagger" data-field="experience">
                    <label class="sc-apply-label" for="sc-apply-experience">Experience Level</label>
                    <select class="sc-apply-select" id="sc-apply-experience" name="experience">
                      <option value="" disabled selected>Select experience level...</option>
                      <option value="Beginner">Beginner (0-1 yrs)</option>
                      <option value="Intermediate">Intermediate (1-3 yrs)</option>
                      <option value="Advanced">Advanced (3+ yrs)</option>
                    </select>
                    <span class="sc-apply-error" id="sc-apply-experience-error"></span>
                  </div>

                  <!-- 9. City / Location -->
                  <div class="sc-apply-field sc-apply-stagger" data-field="location">
                    <label class="sc-apply-label" for="sc-apply-location">City / Location</label>
                    <input type="text" class="sc-apply-input" id="sc-apply-location" name="location" placeholder="e.g. Bengaluru, India">
                    <span class="sc-apply-error" id="sc-apply-location-error"></span>
                  </div>

                  <!-- 10. LinkedIn / GitHub / Portfolio Link -->
                  <div class="sc-apply-field sc-apply-stagger" data-field="portfolio">
                    <label class="sc-apply-label" for="sc-apply-portfolio">LinkedIn / GitHub / Portfolio Link <span class="sc-apply-optional">(Optional)</span></label>
                    <input type="url" class="sc-apply-input" id="sc-apply-portfolio" name="portfolio" placeholder="https://linkedin.com/in/... or github.com/...">
                    <span class="sc-apply-error" id="sc-apply-portfolio-error"></span>
                  </div>

                  <!-- 11. Preferred Start Timeline -->
                  <div class="sc-apply-field sc-apply-col-span-2 sc-apply-stagger" data-field="timeline">
                    <label class="sc-apply-label" for="sc-apply-timeline">Preferred Start Timeline</label>
                    <select class="sc-apply-select" id="sc-apply-timeline" name="timeline">
                      <option value="" disabled selected>Select start timeline...</option>
                      <option value="Immediately">Immediately</option>
                      <option value="Within 1 month">Within 1 month</option>
                      <option value="Within 3 months">Within 3 months</option>
                      <option value="Just exploring">Just exploring</option>
                    </select>
                    <span class="sc-apply-error" id="sc-apply-timeline-error"></span>
                  </div>

                  <!-- 12. Message (textarea) -->
                  <div class="sc-apply-field sc-apply-col-span-2 sc-apply-stagger" data-field="message">
                    <label class="sc-apply-label" for="sc-apply-message">Message / Tell us about your goals <span class="sc-apply-optional">(Optional)</span></label>
                    <textarea class="sc-apply-textarea" id="sc-apply-message" name="message" rows="3" placeholder="Share your background, what you hope to achieve, or any specific questions..."></textarea>
                    <span class="sc-apply-error" id="sc-apply-message-error"></span>
                  </div>

                  <!-- 13. Checkbox Agreement * -->
                  <div class="sc-apply-field sc-apply-col-span-2 sc-apply-checkbox-wrap sc-apply-stagger" data-field="agree">
                    <label class="sc-apply-checkbox-label">
                      <input type="checkbox" class="sc-apply-checkbox" id="sc-apply-agree" name="agree" required>
                      <span class="sc-apply-checkbox-custom"></span>
                      <span class="sc-apply-checkbox-text">I agree to be contacted by the StriveCode team regarding my application and programs <span class="sc-apply-required">*</span></span>
                    </label>
                    <span class="sc-apply-error" id="sc-apply-agree-error"></span>
                  </div>
                </div>

                <!-- Submit / Cancel Actions -->
                <div class="sc-apply-actions sc-apply-stagger">
                  <button type="submit" class="sc-apply-submit-btn" id="sc-apply-submit">
                    <span class="sc-apply-btn-text">Submit Application →</span>
                    <span class="sc-apply-spinner" aria-hidden="true"></span>
                  </button>
                  <button type="button" class="sc-apply-cancel-btn" id="sc-apply-cancel">Cancel</button>
                </div>

                <div class="sc-apply-footer-note sc-apply-stagger">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  <span>Our team responds within 24 hours.</span>
                </div>
              </form>
            </div>

            <!-- Success State -->
            <div class="sc-apply-success" id="sc-apply-success" style="display: none;" aria-live="polite">
              <div class="sc-apply-success-icon-wrap">
                <svg class="sc-apply-checkmark-svg" viewBox="0 0 52 52">
                  <circle class="sc-apply-checkmark-circle" cx="26" cy="26" r="24" fill="none"/>
                  <path class="sc-apply-checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                </svg>
              </div>
              <h3 class="sc-apply-success-title">Application Received!</h3>
              <p class="sc-apply-success-desc">Thank you for applying to StriveCode. Our team will review your application and contact you within 24 hours.</p>
              <button type="button" class="sc-apply-success-close-btn" id="sc-apply-success-close">Close</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // 3. INITIALIZE MODAL DOM
  function initModal() {
    let existingModal = document.getElementById('sc-apply-modal');
    if (!existingModal) {
      const div = document.createElement('div');
      div.innerHTML = buildModalHTML().trim();
      document.body.appendChild(div.firstElementChild);
      existingModal = document.getElementById('sc-apply-modal');
    }

    modalEl = document.getElementById('sc-apply-modal');
    formEl = document.getElementById('sc-apply-form');
    formWrapper = document.getElementById('sc-apply-form-wrapper');
    successWrapper = document.getElementById('sc-apply-success');
    categorySelect = document.getElementById('sc-apply-category');
    programSelect = document.getElementById('sc-apply-program');
    submitBtn = document.getElementById('sc-apply-submit');

    // Attach listeners
    document.getElementById('sc-apply-close').addEventListener('click', closeModal);
    document.getElementById('sc-apply-cancel').addEventListener('click', closeModal);
    document.getElementById('sc-apply-success-close').addEventListener('click', closeModal);

    // Click outside card (on backdrop)
    modalEl.addEventListener('click', function (e) {
      if (e.target === modalEl) {
        closeModal();
      }
    });

    // Esc key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modalEl.classList.contains('sc-apply-open')) {
        closeModal();
      }
    });

    // Category change -> update Program dropdown
    categorySelect.addEventListener('change', function () {
      updateProgramOptions(categorySelect.value);
    });

    // Form submit
    formEl.addEventListener('submit', handleFormSubmit);

    // Live validation on blur
    setupRealtimeValidation();

    // Trap focus inside modal
    setupFocusTrap();
  }

  // 4. POPULATE & ANIMATE DEPENDENT DROPDOWN
  function updateProgramOptions(category, selectedProgram) {
    if (!programSelect) return;

    programSelect.classList.add('sc-apply-select-fading');

    setTimeout(() => {
      programSelect.innerHTML = '<option value="" disabled selected>Select program or role...</option>';
      const options = PROGRAM_DATA[category] || [];

      options.forEach(opt => {
        const optionEl = document.createElement('option');
        optionEl.value = opt;
        optionEl.textContent = opt;
        if (selectedProgram && opt.toLowerCase() === selectedProgram.toLowerCase()) {
          optionEl.selected = true;
        }
        programSelect.appendChild(optionEl);
      });

      // If only one option was requested and matches, select it
      if (selectedProgram) {
        programSelect.value = selectedProgram;
      }

      programSelect.classList.remove('sc-apply-select-fading');
      clearFieldError('program');
    }, 180);
  }

  // 5. VALIDATION LOGIC
  function validateField(fieldId, value, isChecked) {
    switch (fieldId) {
      case 'name':
        if (!value || value.trim().length < 2) return "Please enter your full name.";
        return "";
      case 'email':
        if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
          return "Please enter a valid email address.";
        }
        return "";
      case 'phone':
        const cleanPhone = (value || '').replace(/\D/g, '');
        if (cleanPhone.length !== 10) {
          return "Please enter a valid 10-digit mobile number.";
        }
        return "";
      case 'category':
        if (!value) return "Please select what you are applying for.";
        return "";
      case 'program':
        if (!value) return "Please select a specific program or role.";
        return "";
      case 'status':
        if (!value) return "Please select your current status.";
        return "";
      case 'agree':
        if (!isChecked) return "Please accept the agreement to continue.";
        return "";
      case 'portfolio':
        if (value && value.trim().length > 0 && !/^https?:\/\/.+/i.test(value.trim())) {
          return "Please enter a valid URL starting with http:// or https://";
        }
        return "";
      default:
        return "";
    }
  }

  function setFieldError(fieldId, errorMsg) {
    const errorEl = document.getElementById(`sc-apply-${fieldId}-error`);
    const fieldContainer = formEl.querySelector(`[data-field="${fieldId}"]`);

    if (errorEl && errorMsg) {
      errorEl.textContent = errorMsg;
      errorEl.classList.add('sc-apply-error-visible');
    }
    if (fieldContainer) {
      fieldContainer.classList.add('sc-apply-field-invalid');
      // Gentle shake
      fieldContainer.classList.remove('sc-apply-field-shake');
      void fieldContainer.offsetWidth; // trigger reflow
      fieldContainer.classList.add('sc-apply-field-shake');
    }
  }

  function clearFieldError(fieldId) {
    const errorEl = document.getElementById(`sc-apply-${fieldId}-error`);
    const fieldContainer = formEl.querySelector(`[data-field="${fieldId}"]`);

    if (errorEl) {
      errorEl.textContent = '';
      errorEl.classList.remove('sc-apply-error-visible');
    }
    if (fieldContainer) {
      fieldContainer.classList.remove('sc-apply-field-invalid');
      fieldContainer.classList.remove('sc-apply-field-shake');
    }
  }

  function setupRealtimeValidation() {
    const inputs = formEl.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      const fieldContainer = input.closest('[data-field]');
      if (!fieldContainer) return;
      const fieldId = fieldContainer.getAttribute('data-field');

      input.addEventListener('blur', () => {
        const isChecked = input.type === 'checkbox' ? input.checked : false;
        const err = validateField(fieldId, input.value, isChecked);
        if (err) {
          setFieldError(fieldId, err);
        } else {
          clearFieldError(fieldId);
        }
      });

      input.addEventListener('input', () => {
        const isChecked = input.type === 'checkbox' ? input.checked : false;
        const err = validateField(fieldId, input.value, isChecked);
        if (!err) {
          clearFieldError(fieldId);
        }
      });
    });
  }

  // 6. SCROLL LOCK WITH NO LAYOUT SHIFT
  let originalPaddingRight = '';

  function lockScroll() {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    originalPaddingRight = document.body.style.paddingRight || '';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.documentElement.classList.add('sc-apply-scroll-locked');
    document.body.classList.add('sc-apply-scroll-locked');
  }

  function unlockScroll() {
    document.documentElement.classList.remove('sc-apply-scroll-locked');
    document.body.classList.remove('sc-apply-scroll-locked');
    document.body.style.paddingRight = originalPaddingRight;
  }

  // 7. FOCUS TRAP
  function setupFocusTrap() {
    modalEl.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;

      const focusables = modalEl.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
  }

  // 8. OPEN & CLOSE MODAL
  function openModal(options = {}) {
    initModal();

    lastActiveTrigger = options.trigger || document.activeElement;

    // Reset view to form
    formWrapper.style.display = 'block';
    successWrapper.style.display = 'none';
    formEl.reset();

    // Clear previous errors
    formEl.querySelectorAll('.sc-apply-error').forEach(el => {
      el.textContent = '';
      el.classList.remove('sc-apply-error-visible');
    });
    formEl.querySelectorAll('.sc-apply-field-invalid').forEach(el => {
      el.classList.remove('sc-apply-field-invalid', 'sc-apply-field-shake');
    });

    // Handle pre-selection if passed
    const defaultCategory = options.category || "Engineering Course";
    categorySelect.value = defaultCategory;
    updateProgramOptions(defaultCategory, options.program);

    lockScroll();

    // Trigger open transition
    modalEl.classList.remove('sc-apply-closing');
    modalEl.classList.add('sc-apply-open');
    modalEl.setAttribute('aria-hidden', 'false');

    // Trigger staggered field animation
    const staggers = modalEl.querySelectorAll('.sc-apply-stagger');
    staggers.forEach((el, idx) => {
      el.style.transitionDelay = `${idx * 45}ms`;
    });

    // Focus first input
    setTimeout(() => {
      const firstInput = document.getElementById('sc-apply-name');
      if (firstInput) firstInput.focus();
    }, 250);
  }

  function closeModal() {
    if (!modalEl || !modalEl.classList.contains('sc-apply-open')) return;

    modalEl.classList.add('sc-apply-closing');

    setTimeout(() => {
      modalEl.classList.remove('sc-apply-open', 'sc-apply-closing');
      modalEl.setAttribute('aria-hidden', 'true');
      unlockScroll();

      // Return focus to triggering button
      if (lastActiveTrigger && typeof lastActiveTrigger.focus === 'function') {
        lastActiveTrigger.focus();
      }
    }, 350);
  }

  // 9. FORM SUBMISSION
  async function handleFormSubmit(e) {
    e.preventDefault();
    if (isSubmitting) return;

    // Validate all required fields
    const formData = {
      name: document.getElementById('sc-apply-name').value,
      email: document.getElementById('sc-apply-email').value,
      phone: document.getElementById('sc-apply-phone').value,
      category: categorySelect.value,
      program: programSelect.value,
      status: document.getElementById('sc-apply-status').value,
      organization: document.getElementById('sc-apply-org').value,
      experience: document.getElementById('sc-apply-experience').value,
      location: document.getElementById('sc-apply-location').value,
      portfolio: document.getElementById('sc-apply-portfolio').value,
      timeline: document.getElementById('sc-apply-timeline').value,
      message: document.getElementById('sc-apply-message').value,
      agree: document.getElementById('sc-apply-agree').checked
    };

    let hasError = false;
    let firstErrorField = null;

    const fieldsToValidate = ['name', 'email', 'phone', 'category', 'program', 'status', 'portfolio', 'agree'];
    fieldsToValidate.forEach(fieldId => {
      const err = validateField(fieldId, formData[fieldId], fieldId === 'agree' ? formData.agree : false);
      if (err) {
        setFieldError(fieldId, err);
        hasError = true;
        if (!firstErrorField) {
          firstErrorField = document.getElementById(`sc-apply-${fieldId}`);
        }
      } else {
        clearFieldError(fieldId);
      }
    });

    if (hasError) {
      if (firstErrorField) firstErrorField.focus();
      return;
    }

    // Set loading state
    isSubmitting = true;
    submitBtn.disabled = true;
    submitBtn.classList.add('sc-apply-submitting');

    try {
      await submitApplication(formData);

      // On successful submit: fade out form, show success state
      formWrapper.style.transition = 'opacity 0.3s ease';
      formWrapper.style.opacity = '0';

      setTimeout(() => {
        formWrapper.style.display = 'none';
        formWrapper.style.opacity = '1';

        successWrapper.style.display = 'flex';
        successWrapper.style.opacity = '0';
        successWrapper.style.transition = 'opacity 0.4s ease';

        setTimeout(() => {
          successWrapper.style.opacity = '1';
          const successCloseBtn = document.getElementById('sc-apply-success-close');
          if (successCloseBtn) successCloseBtn.focus();
        }, 30);
      }, 300);
    } catch (err) {
      alert("There was an issue submitting your application. Please try again or email hr@strive-code.com directly.");
    } finally {
      isSubmitting = false;
      submitBtn.disabled = false;
      submitBtn.classList.remove('sc-apply-submitting');
    }
  }

  /* =========================================================================
   * 10. PLUGGABLE BACKEND / ENDPOINT HANDLER
   * =========================================================================
   * Replace the body of this function with your Formspree, Google Sheets,
   * Firebase, or custom backend endpoint.
   *
   * Example: Formspree endpoint:
   * -------------------------------------------------------------------------
   * const res = await fetch("https://formspree.io/f/YOUR_FORM_ID", {
   *   method: "POST",
   *   headers: { "Content-Type": "application/json", "Accept": "application/json" },
   *   body: JSON.stringify(data)
   * });
   * if (!res.ok) throw new Error("Submission failed");
   * return true;
   *
   * Example: Google Sheets Apps Script Webhook:
   * -------------------------------------------------------------------------
   * const res = await fetch("https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec", {
   *   method: "POST",
   *   mode: "no-cors",
   *   headers: { "Content-Type": "application/json" },
   *   body: JSON.stringify(data)
   * });
   * return true;
   * ========================================================================= */
  async function submitApplication(data) {
    // Fallback: Mailto trigger
    const subject = encodeURIComponent(`New Application: ${data.name} - ${data.program || data.category}`);
    const body = encodeURIComponent(
      `Full Name: ${data.name}\n` +
      `Email: ${data.email}\n` +
      `Phone: +91 ${data.phone}\n` +
      `Category: ${data.category}\n` +
      `Program / Role: ${data.program}\n` +
      `Current Status: ${data.status}\n` +
      `College / Company: ${data.organization || 'N/A'}\n` +
      `Experience Level: ${data.experience || 'N/A'}\n` +
      `City / Location: ${data.location || 'N/A'}\n` +
      `Portfolio / Profile: ${data.portfolio || 'N/A'}\n` +
      `Preferred Start: ${data.timeline || 'N/A'}\n` +
      `Message: ${data.message || 'N/A'}\n`
    );

    /* =========================================================================
       PLACEHOLDER: Future Backend API Integration
       When ready to connect backend, replace the mailto fallback block below with:
       // const response = await fetch('/api/apply', {
       //   method: 'POST',
       //   headers: { 'Content-Type': 'application/json' },
       //   body: JSON.stringify(data)
       // });
       ========================================================================= */

    // Realistic network simulation delay (800ms) for high-end UI feel
    await new Promise(resolve => setTimeout(resolve, 800));

    // Trigger mailto fallback link silently
    const mailtoUrl = `mailto:hr@strive-code.com?subject=${subject}&body=${body}`;
    const tempA = document.createElement('a');
    tempA.href = mailtoUrl;
    tempA.style.display = 'none';
    document.body.appendChild(tempA);
    tempA.click();
    setTimeout(() => {
      if (tempA.parentNode) tempA.parentNode.removeChild(tempA);
    }, 100);

    return true;
  }

  // 11. EVENT DELEGATION: ATTACH TO ALL APPLY TRIGGERS
  document.addEventListener('DOMContentLoaded', function () {
    initModal();

    document.addEventListener('click', function (e) {
      // Find matching button or link
      const trigger = e.target.closest(
        'a[href*="Contact.html"], a[href*="/contact"], a[href="#career-consultation"], a[href="#apply"], .apple-nav-btn, .apply-now-btn, .apply-cta-btn, .apply-btn-pill, [data-apply-modal], button, a'
      );

      if (!trigger) return;

      const text = (trigger.textContent || '').trim();
      const isApplyBtn =
        /apply\s*now/i.test(text) ||
        /submit\s*application/i.test(text) ||
        trigger.hasAttribute('data-apply-modal');

      if (!isApplyBtn) return;

      e.preventDefault();
      e.stopPropagation();

      let detectedCategory = "Engineering Course";
      let detectedProgram = "";

      // Check context: 1. Course Cards (Courses.html)
      const courseCard = trigger.closest('.program-card, [data-category], .card, div');
      if (courseCard) {
        const heading = courseCard.querySelector('h3, h4, .text-headline-md, [class*="headline"]');
        if (heading) {
          const hText = heading.textContent.trim().toLowerCase();
          for (const prog of PROGRAM_DATA["Engineering Course"]) {
            const pText = prog.toLowerCase();
            // Match key phrases
            const words = pText.split(/[\s,&/]+/);
            if (words.some(w => w.length > 4 && hText.includes(w))) {
              detectedCategory = "Engineering Course";
              detectedProgram = prog;
              break;
            }
          }
        }
      }

      // Check context: 2. Careers Role Cards (Careers.html)
      const roleCard = trigger.closest('#roles-grid > div, .grid > div, div');
      if (roleCard && !detectedProgram) {
        const heading = roleCard.querySelector('h3, h4');
        if (heading) {
          const hText = heading.textContent.trim().toLowerCase();
          for (const role of PROGRAM_DATA["Career Opportunity"]) {
            const rText = role.toLowerCase();
            const words = rText.split(/[\s,&/]+/);
            if (words.some(w => w.length > 4 && hText.includes(w))) {
              detectedCategory = "Career Opportunity";
              detectedProgram = role;
              break;
            }
          }
        }
      }

      // Fallback program if none matched
      if (!detectedProgram && PROGRAM_DATA[detectedCategory]) {
        detectedProgram = PROGRAM_DATA[detectedCategory][0];
      }

      openModal({
        trigger: trigger,
        category: detectedCategory,
        program: detectedProgram
      });
    });
  });

  // Expose global methods for programmatic invocation if desired
  window.StriveCodeApplyModal = {
    open: openModal,
    close: closeModal,
    submitApplication: submitApplication
  };
})();
