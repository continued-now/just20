const TARGET_REPS = 20;

const state = {
  reps: 0,
  xp: 150,
  modeLabel: "Perfect time",
  mode: "perfect",
  name: "Alex",
  streak: 7,
};

const repButton = document.querySelector("#repButton");
const repButtonNumber = document.querySelector("#repButtonNumber");
const repTrackFill = document.querySelector("#repTrackFill");
const repDots = document.querySelector("#repDots");
const resetRepGame = document.querySelector("#resetRepGame");
const phoneRepCount = document.querySelector("#phoneRepCount");
const phoneProgress = document.querySelector("#phoneProgress");
const phoneXp = document.querySelector("#phoneXp");
const petFace = document.querySelector("#petFace");
const petStatus = document.querySelector("#petStatus");
const windowPill = document.querySelector("#windowPill");
const xpValue = document.querySelector("#xpValue");
const xpFill = document.querySelector("#xpFill");
const xpModeLabel = document.querySelector("#xpModeLabel");
const proofMode = document.querySelector("#proofMode");
const proofReps = document.querySelector("#proofReps");
const proofName = document.querySelector("#proofName");
const proofStreak = document.querySelector("#proofStreak");
const proofXp = document.querySelector("#proofXp");
const proofCaption = document.querySelector("#proofCaption");
const nameInput = document.querySelector("#nameInput");
const streakInput = document.querySelector("#streakInput");
const modeButtons = document.querySelectorAll(".mode");
const calibrateButton = document.querySelector("#calibrateButton");
const demoSkeleton = document.querySelector("#demoSkeleton");
const calibrationTitle = document.querySelector("#calibrationTitle");
const calibrationText = document.querySelector("#calibrationText");
const waitlistForm = document.querySelector("#waitlistForm");
const emailInput = document.querySelector("#emailInput");
const formStatus = document.querySelector("#formStatus");

function buildDots() {
  if (!repDots) return;
  repDots.innerHTML = "";
  for (let i = 0; i < TARGET_REPS; i += 1) {
    const dot = document.createElement("span");
    repDots.appendChild(dot);
  }
}

function petCopy() {
  if (state.reps >= TARGET_REPS) return "Streak fed. Tiny creature thriving.";
  if (state.reps >= 15) return "It can smell victory. Do not stop now.";
  if (state.reps >= 8) return "Halfway-ish. The pet is emotionally invested.";
  if (state.mode === "panic") return "Twelve reminders later. The pet has notes.";
  if (state.mode === "late") return "A little late, but still redeemable.";
  return "Waiting politely. For now.";
}

function proofLine() {
  if (state.reps >= TARGET_REPS) {
    return `${state.name} locked Day ${state.streak}. Your move.`;
  }

  const remaining = TARGET_REPS - state.reps;
  return `${remaining} more rep${remaining === 1 ? "" : "s"} until your proof card unlocks.`;
}

function render() {
  const progress = Math.min(100, (state.reps / TARGET_REPS) * 100);
  const displayReps = `${state.reps} / ${TARGET_REPS}`;
  const xpWidth = Math.max(18, (state.xp / 150) * 100);

  if (repButtonNumber) repButtonNumber.textContent = String(state.reps);
  if (repTrackFill) repTrackFill.style.width = `${progress}%`;
  if (phoneProgress) phoneProgress.style.width = `${progress}%`;
  if (phoneRepCount) phoneRepCount.textContent = displayReps;
  if (phoneXp) phoneXp.textContent = state.reps >= TARGET_REPS ? `+${state.xp} XP locked` : `+${state.xp} XP if completed`;
  if (petStatus) petStatus.textContent = petCopy();
  if (windowPill) windowPill.textContent = state.modeLabel;
  if (xpValue) xpValue.textContent = `${state.xp} XP`;
  if (xpModeLabel) xpModeLabel.textContent = state.modeLabel;
  if (xpFill) xpFill.style.width = `${xpWidth}%`;
  if (proofMode) proofMode.textContent = state.modeLabel;
  if (proofReps) proofReps.textContent = String(state.reps);
  if (proofName) proofName.textContent = state.name;
  if (proofStreak) proofStreak.textContent = `Day ${state.streak} locked`;
  if (proofXp) proofXp.textContent = `+${state.xp} XP`;
  if (proofCaption) proofCaption.textContent = proofLine();

  repDots?.querySelectorAll("span").forEach((dot, index) => {
    dot.classList.toggle("done", index < state.reps);
  });

  if (repButton) {
    repButton.classList.toggle("complete", state.reps >= TARGET_REPS);
  }

  if (petFace) {
    petFace.classList.toggle("happy", state.reps >= TARGET_REPS);
    petFace.classList.toggle("panic", state.mode === "panic" && state.reps < TARGET_REPS);
  }
}

function addRep() {
  if (state.reps >= TARGET_REPS) return;
  state.reps += 1;
  repButton?.classList.remove("bump");
  window.requestAnimationFrame(() => {
    repButton?.classList.add("bump");
  });
  render();
}

function resetReps() {
  state.reps = 0;
  repButton?.classList.remove("bump", "complete");
  render();
}

repButton?.addEventListener("click", addRep);
resetRepGame?.addEventListener("click", resetReps);

window.addEventListener("keydown", (event) => {
  if (event.code !== "Space") return;
  const active = document.activeElement;
  if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return;
  event.preventDefault();
  addRep();
});

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.mode = button.dataset.mode || "perfect";
    state.xp = Number(button.dataset.xp || 150);
    state.modeLabel = button.dataset.label || "Perfect time";

    modeButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    render();
  });
});

nameInput?.addEventListener("input", () => {
  state.name = nameInput.value.trim() || "Someone";
  render();
});

streakInput?.addEventListener("input", () => {
  const value = Number(streakInput.value || 1);
  state.streak = Math.max(1, Math.min(999, value));
  render();
});

calibrateButton?.addEventListener("click", () => {
  const calibrated = !demoSkeleton?.classList.contains("off");
  demoSkeleton?.classList.toggle("off", calibrated);

  if (calibrated) {
    if (calibrationTitle) calibrationTitle.textContent = "Camera is guessing";
    if (calibrationText) calibrationText.textContent = "Tap calibrate to help the camera find your body.";
    calibrateButton.textContent = "Calibrate";
  } else {
    if (calibrationTitle) calibrationTitle.textContent = "Tracking confidence 92%";
    if (calibrationText) calibrationText.textContent = "Body centered. Joints visible. The rep counter is ready to stop guessing.";
    calibrateButton.textContent = "Uncalibrate";
  }
});

waitlistForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = emailInput?.value.trim();
  if (!email) return;

  localStorage.setItem("just20Landing2Email", email);
  if (formStatus) formStatus.textContent = "Saved. Tiny streak gremlin approves.";
  waitlistForm.reset();
});

if (localStorage.getItem("just20Landing2Email") && formStatus) {
  formStatus.textContent = "You are already on the early squad list.";
}

buildDots();
render();
