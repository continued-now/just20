const root = document.documentElement;
const glow = document.querySelector(".cursor-glow");

root.classList.add("js");

window.addEventListener("pointermove", (event) => {
  if (!glow) return;
  root.style.setProperty("--x", `${event.clientX}px`);
  root.style.setProperty("--y", `${event.clientY}px`);
});

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16 }
  );

  document.querySelectorAll(".reveal").forEach((element) => {
    revealObserver.observe(element);
  });
} else {
  document.querySelectorAll(".reveal").forEach((element) => {
    element.classList.add("visible");
  });
}

const xpButtons = document.querySelectorAll(".xp-buttons button");
const xpValue = document.querySelector("#xpValue");
const xpLabel = document.querySelector("#xpLabel");
const xpFill = document.querySelector("#xpFill");

xpButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const xp = Number(button.dataset.xp || 0);
    const label = button.dataset.label || "Reward";

    xpButtons.forEach((item) => {
      item.classList.remove("active");
      item.setAttribute("aria-pressed", "false");
    });
    button.classList.add("active");
    button.setAttribute("aria-pressed", "true");

    if (xpValue) xpValue.textContent = `${xp} XP`;
    if (xpLabel) xpLabel.textContent = label;
    if (xpFill) xpFill.style.width = `${Math.max(18, (xp / 150) * 100)}%`;
  });
});

const waitlistForm = document.querySelector("#waitlistForm");
const emailInput = document.querySelector("#emailInput");
const formStatus = document.querySelector("#formStatus");

waitlistForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const email = emailInput?.value.trim();
  if (!email) return;

  localStorage.setItem("just20LandingEmail", email);

  if (formStatus) {
    formStatus.textContent = "Locked in. Your spot is saved for the first Just 20 squad.";
  }

  waitlistForm.reset();
});

if (localStorage.getItem("just20LandingEmail") && formStatus) {
  formStatus.textContent = "You are already on the early squad list.";
}
