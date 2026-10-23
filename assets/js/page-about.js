// page-about.js — منطق وتفاعلات صفحة "عن يوزرسيف"

(function () {
  let WHATSAPP_PHONE = "201116891025";

  document.addEventListener("DOMContentLoaded", function () {
    setupInquiryForm();
    setupFaqAccordion();
  });

  // ---------- 1. إدارة نموذج الاستفسارات والربط بالواتساب ----------
  function setupInquiryForm() {
    let form = document.getElementById("inquiry-form");
    let feedback = document.getElementById("inquiry-feedback");
    let whatsappBtn = document.getElementById("inquiry-whatsapp-btn");

    if (!form) return;

    // زر الإرسال السريع عبر واتساب
    if (whatsappBtn) {
      whatsappBtn.addEventListener("click", function (e) {
        e.preventDefault();
        let name = (document.getElementById("inq-name")?.value || "").trim();
        let phone = (document.getElementById("inq-phone")?.value || "").trim();
        let topic = (document.getElementById("inq-topic")?.value || "").trim();
        let msg = (document.getElementById("inq-message")?.value || "").trim();

        let topicText = topic || "استفسار عام عن منتجات وخدمات يوزرسيف";
        let textParts = [
          "مرحباً استوديو يوزرسيف 👋",
          "عندي استفسار بخصوص: " + topicText,
        ];

        if (name) textParts.push("الاسم: " + name);
        if (phone) textParts.push("رقم التواصل: " + phone);
        if (msg) textParts.push("تفاصيل الاستفسار:\n" + msg);

        let encodedText = encodeURIComponent(textParts.join("\n"));
        let waUrl = "https://wa.me/" + WHATSAPP_PHONE + "?text=" + encodedText;
        window.open(waUrl, "_blank", "noopener,noreferrer");
      });
    }

    // إرسال النموذج الداخلي
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      let nameInput = document.getElementById("inq-name");
      let phoneInput = document.getElementById("inq-phone");
      let topicSelect = document.getElementById("inq-topic");
      let msgInput = document.getElementById("inq-message");

      let name = (nameInput?.value || "").trim();
      let phone = (phoneInput?.value || "").trim();
      let topic = (topicSelect?.value || "").trim();
      let msg = (msgInput?.value || "").trim();

      if (!name || !phone || !msg) {
        showFeedback("يرجى ملء الاسم ورقم الهاتف وتفاصيل الاستفسار أولاً.", "error");
        return;
      }

      let submitBtn = document.getElementById("inq-submit-btn");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "جارٍ إرسال الاستفسار...";
      }

      // محاكاة الإرسال وتأكيده للعميل
      setTimeout(function () {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "إرسال الاستفسار الآن";
        }

        showFeedback(
          "شكراً لك يا " + name + "، تم استلام استفسارك بنجاح! سيتواصل معك فريق استوديو يوزرسيف عبر الهاتف/الواتساب في أقرب وقت.",
          "success"
        );

        form.reset();
      }, 700);
    });

    function showFeedback(text, type) {
      if (!feedback) return;
      feedback.hidden = false;
      feedback.className = "inquiry-feedback is-" + type;
      feedback.innerHTML = (type === "success" ? "✓ " : "⚠ ") + text;
      feedback.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  // ---------- 2. الأكورديون للأسئلة الشائعة ----------
  function setupFaqAccordion() {
    let faqButtons = document.querySelectorAll(".about-faq-question");
    faqButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        let expanded = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", String(!expanded));
        let answer = btn.nextElementSibling;
        if (answer) {
          answer.hidden = expanded;
        }
      });
    });
  }
})();
