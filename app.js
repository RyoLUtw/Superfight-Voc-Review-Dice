const CARD_TYPES = [
  { key: "target", label: "Target Word" },
  { key: "character", label: "Character" },
  { key: "positive", label: "Positive Attribute" },
  { key: "negative", label: "Negative Attribute" },
];

const STEP_META = [
  {
    title: "Input target words",
    description:
      "Add the vocabulary that will drive the review game. Each word becomes one row in the card table.",
    settings: [],
  },
  {
    title: "Complete card table",
    description:
      "Create matching English and Chinese cards for target words, characters, positive attributes, and negative attributes.",
    settings: [],
  },
  {
    title: "Create fighter",
    description:
      "Set how many cards appear in each draw hand. Pick one card per type to build your fighter.",
    settings: [
      {
        key: "handSize",
        label: "Cards to draw per type",
        type: "number",
        min: 1,
        max: 12,
        defaultValue: 3,
      },
    ],
  },
  {
    title: "Analyse opponent",
    description:
      "Translate card content to earn dice, then score the advantage explanation from 1 to 3 dice.",
    settings: [
      {
        key: "translationDirection",
        label: "Translation direction",
        type: "select",
        options: [
          ["enToZh", "English to Chinese"],
          ["zhToEn", "Chinese to English"],
        ],
        defaultValue: "enToZh",
      },
    ],
  },
  {
    title: "Fight opponent",
    description:
      "Roll earned dice. A total of 11 or more defeats the opponent. Missing points can be compensated with extra vocabulary translations.",
    settings: [
      {
        key: "timedCompensation",
        label: "Timed compensation",
        type: "select",
        options: [
          ["untimed", "Untimed"],
          ["timed", "Timed"],
        ],
        defaultValue: "untimed",
      },
      {
        key: "timerSeconds",
        label: "Timer seconds",
        type: "number",
        min: 10,
        max: 600,
        defaultValue: 60,
      },
    ],
  },
];

const state = {
  step: 0,
  targetWords: [],
  cards: [],
  player: null,
  opponents: [],
  opponentIndex: 0,
  hands: {},
  picks: {},
  translationSuccess: {},
  advantageDice: 0,
  earnedDice: 0,
  rollTotal: null,
  missingPoints: 0,
  compensationTimer: null,
  remainingSeconds: 0,
};

const preferences = loadPreferences();

const els = {
  stepTabs: [...document.querySelectorAll(".step-tab")],
  panels: [...document.querySelectorAll(".step-panel")],
  stepKicker: document.querySelector("#stepKicker"),
  stepTitle: document.querySelector("#stepTitle"),
  opponentProgress: document.querySelector("#opponentProgress"),
  targetWords: document.querySelector("#targetWords"),
  generateTable: document.querySelector("#generateTable"),
  sampleWords: document.querySelector("#sampleWords"),
  cardTableBody: document.querySelector("#cardTable tbody"),
  clearTable: document.querySelector("#clearTable"),
  saveCards: document.querySelector("#saveCards"),
  fighterPicker: document.querySelector("#fighterPicker"),
  reshuffleHands: document.querySelector("#reshuffleHands"),
  confirmFighter: document.querySelector("#confirmFighter"),
  playerFighter: document.querySelector("#playerFighter"),
  opponentFighter: document.querySelector("#opponentFighter"),
  opponentName: document.querySelector("#opponentName"),
  translationModeLabel: document.querySelector("#translationModeLabel"),
  translationChecks: document.querySelector("#translationChecks"),
  earnedDice: document.querySelector("#earnedDice"),
  advantageDice: document.querySelector("#advantageDice"),
  goFight: document.querySelector("#goFight"),
  fightDiceCount: document.querySelector("#fightDiceCount"),
  rollTotal: document.querySelector("#rollTotal"),
  diceResults: document.querySelector("#diceResults"),
  compensationArea: document.querySelector("#compensationArea"),
  missingPointsText: document.querySelector("#missingPointsText"),
  timerDisplay: document.querySelector("#timerDisplay"),
  compensationTasks: document.querySelector("#compensationTasks"),
  rollDice: document.querySelector("#rollDice"),
  finishOpponent: document.querySelector("#finishOpponent"),
  stepModal: document.querySelector("#stepModal"),
  modalStep: document.querySelector("#modalStep"),
  modalTitle: document.querySelector("#modalTitle"),
  modalDescription: document.querySelector("#modalDescription"),
  modalSettings: document.querySelector("#modalSettings"),
  openStepHelp: document.querySelector("#openStepHelp"),
  closeModal: document.querySelector("#closeModal"),
};

function loadPreferences() {
  try {
    return JSON.parse(localStorage.getItem("superfightVocPrefs")) || {};
  } catch {
    return {};
  }
}

function savePreferences() {
  localStorage.setItem("superfightVocPrefs", JSON.stringify(preferences));
}

function pref(stepIndex, key) {
  const setting = STEP_META[stepIndex].settings.find((item) => item.key === key);
  return preferences[stepIndex]?.[key] ?? setting?.defaultValue;
}

function setStep(stepIndex, showModal = true) {
  state.step = stepIndex;
  els.panels.forEach((panel, index) => panel.classList.toggle("active", index === stepIndex));
  els.stepTabs.forEach((tab, index) => {
    tab.classList.toggle("active", index === stepIndex);
    tab.disabled = !canVisitStep(index);
  });
  els.stepKicker.textContent = `Step ${stepIndex + 1}`;
  els.stepTitle.textContent = STEP_META[stepIndex].title;
  updateOpponentProgress();
  if (showModal) openStepModal(stepIndex);
}

function canVisitStep(index) {
  if (index === 0) return true;
  if (index === 1) return state.targetWords.length > 0;
  if (index === 2) return state.cards.length > 0;
  if (index === 3) return Boolean(state.player) && state.opponents.length > 0;
  if (index === 4) return Boolean(state.player) && state.opponents.length > 0;
  return false;
}

function openStepModal(stepIndex) {
  const meta = STEP_META[stepIndex];
  els.modalStep.textContent = `Step ${stepIndex + 1}`;
  els.modalTitle.textContent = meta.title;
  els.modalDescription.textContent = meta.description;
  els.modalSettings.innerHTML = "";

  if (!meta.settings.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "No preferences are needed for this step.";
    els.modalSettings.append(empty);
  }

  meta.settings.forEach((setting) => {
    const row = document.createElement("div");
    row.className = "setting-row";
    const label = document.createElement("label");
    label.htmlFor = `setting-${setting.key}`;
    label.textContent = setting.label;
    let input;

    if (setting.type === "select") {
      input = document.createElement("select");
      setting.options.forEach(([value, text]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = text;
        input.append(option);
      });
    } else {
      input = document.createElement("input");
      input.type = setting.type;
      input.min = setting.min;
      input.max = setting.max;
    }

    input.id = `setting-${setting.key}`;
    input.dataset.settingKey = setting.key;
    input.value = pref(stepIndex, setting.key);
    row.append(label, input);
    els.modalSettings.append(row);
  });

  if (typeof els.stepModal.showModal === "function") {
    els.stepModal.showModal();
  }
}

function parseWords(raw) {
  return raw
    .split(/[\n,]+/)
    .map((word) => word.trim())
    .filter(Boolean);
}

function generateTable() {
  const words = [...new Set(parseWords(els.targetWords.value))];
  if (!words.length) {
    alert("Enter at least one target word.");
    return;
  }

  state.targetWords = words;
  state.cards = [];
  state.player = null;
  state.opponents = [];
  state.opponentIndex = 0;
  renderCardTable();
  setStep(1);
}

function renderCardTable() {
  els.cardTableBody.innerHTML = "";
  state.targetWords.forEach((word, index) => {
    const row = document.createElement("tr");
    const fields = [
      ["targetEn", word, true],
      ["targetZh", "", false],
      ["characterEn", "", false],
      ["characterZh", "", false],
      ["positiveEn", "", false],
      ["positiveZh", "", false],
      ["negativeEn", "", false],
      ["negativeZh", "", false],
    ];

    fields.forEach(([key, value, readonly]) => {
      const cell = document.createElement("td");
      const input = document.createElement("input");
      input.value = value;
      input.dataset.row = index;
      input.dataset.key = key;
      input.readOnly = readonly;
      input.placeholder = readonly ? "" : "Fill in";
      cell.append(input);
      row.append(cell);
    });
    els.cardTableBody.append(row);
  });
}

function collectCards() {
  const rows = [];
  for (let index = 0; index < state.targetWords.length; index += 1) {
    const read = (key) =>
      els.cardTableBody.querySelector(`input[data-row="${index}"][data-key="${key}"]`).value.trim();
    const row = {
      id: `row-${index}`,
      target: { en: state.targetWords[index], zh: read("targetZh") },
      character: { en: read("characterEn"), zh: read("characterZh") },
      positive: { en: read("positiveEn"), zh: read("positiveZh") },
      negative: { en: read("negativeEn"), zh: read("negativeZh") },
    };
    rows.push(row);
  }

  const missing = rows.some((row) =>
    CARD_TYPES.some(({ key }) => !row[key].en || !row[key].zh),
  );
  if (missing) {
    alert("Please fill every English and Chinese card field before continuing.");
    return;
  }

  state.cards = rows;
  drawHands();
  setStep(2);
}

function drawHands() {
  const handSize = clamp(Number(pref(2, "handSize")) || 3, 1, state.cards.length);
  state.hands = {};
  state.picks = {};

  CARD_TYPES.forEach(({ key }) => {
    state.hands[key] = shuffle(state.cards).slice(0, handSize).map((row) => ({
      rowId: row.id,
      ...row[key],
    }));
    state.picks[key] = state.hands[key][0]?.rowId;
  });
  renderFighterPicker();
}

function renderFighterPicker() {
  els.fighterPicker.innerHTML = "";
  CARD_TYPES.forEach(({ key, label }) => {
    const column = document.createElement("div");
    column.className = "pick-column";
    const title = document.createElement("h4");
    title.textContent = label;
    column.append(title);

    state.hands[key].forEach((card) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `choice ${state.picks[key] === card.rowId ? "selected" : ""}`;
      button.innerHTML = `<span>${escapeHtml(card.en)}</span><small>${escapeHtml(card.zh)}</small>`;
      button.addEventListener("click", () => {
        state.picks[key] = card.rowId;
        renderFighterPicker();
      });
      column.append(button);
    });
    els.fighterPicker.append(column);
  });
}

function confirmFighter() {
  state.player = buildFighterFromPicks("Your Fighter", state.picks);
  const pools = {};

  CARD_TYPES.forEach(({ key }) => {
    pools[key] = shuffle(
      state.cards
        .filter((row) => row.id !== state.picks[key])
        .map((row) => ({ rowId: row.id, ...row[key] })),
    );
  });

  const opponentCount = Math.max(0, state.targetWords.length - 1);
  const possibleOpponentCount = Math.min(opponentCount, ...CARD_TYPES.map(({ key }) => pools[key].length));

  if (possibleOpponentCount < opponentCount) {
    alert(
      `Only ${possibleOpponentCount} complete non-repeating opponents can be made from the remaining cards.`,
    );
  }

  state.opponents = Array.from({ length: possibleOpponentCount }, (_, index) => {
    const fighter = { name: `Opponent ${index + 1}`, cards: {} };
    CARD_TYPES.forEach(({ key }) => {
      fighter.cards[key] = pools[key].pop();
    });
    return fighter;
  });

  if (!state.opponents.length) {
    alert("There are not enough remaining cards to create opponents.");
    return;
  }

  state.opponentIndex = 0;
  startOpponent();
  setStep(3);
}

function buildFighterFromPicks(name, picks) {
  const fighter = { name, cards: {} };
  CARD_TYPES.forEach(({ key }) => {
    const row = state.cards.find((item) => item.id === picks[key]);
    fighter.cards[key] = { rowId: row.id, ...row[key] };
  });
  return fighter;
}

function startOpponent() {
  state.translationSuccess = {};
  state.advantageDice = 0;
  state.earnedDice = 0;
  state.rollTotal = null;
  state.missingPoints = 0;
  clearInterval(state.compensationTimer);
  renderBattle();
  renderTranslationChecks();
  resetFightPanel();
}

function renderBattle() {
  renderFighterCards(els.playerFighter, state.player);
  renderFighterCards(els.opponentFighter, currentOpponent());
  els.opponentName.textContent = currentOpponent()?.name || "Opponent";
  updateOpponentProgress();
}

function renderFighterCards(container, fighter) {
  container.innerHTML = "";
  if (!fighter) return;
  CARD_TYPES.forEach(({ key, label }) => {
    const card = fighter.cards[key];
    const item = document.createElement("div");
    item.className = "card-item";
    item.innerHTML = `<small>${label}</small><strong>${escapeHtml(card.en)}</strong><span>${escapeHtml(card.zh)}</span>`;
    container.append(item);
  });
}

function renderTranslationChecks() {
  const direction = pref(3, "translationDirection");
  els.translationModeLabel.textContent =
    direction === "enToZh"
      ? "Translate English cards into Chinese. Each success adds one die."
      : "Translate Chinese cards into English. Each success adds one die.";
  els.translationChecks.innerHTML = "";

  const cardsToCheck = [
    ...cardsForChecks(state.player, "Your"),
    ...cardsForChecks(currentOpponent(), "Opponent"),
  ];

  cardsToCheck.forEach((item, index) => {
    const id = `check-${index}`;
    const row = document.createElement("label");
    row.className = "check-item";
    const prompt = direction === "enToZh" ? item.card.en : item.card.zh;
    const answer = direction === "enToZh" ? item.card.zh : item.card.en;
    row.innerHTML = `<span><strong>${escapeHtml(item.owner)} ${escapeHtml(item.label)}</strong><br>${escapeHtml(prompt)} <small>(${escapeHtml(answer)})</small></span>`;
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = id;
    checkbox.checked = Boolean(state.translationSuccess[id]);
    checkbox.addEventListener("change", () => {
      state.translationSuccess[id] = checkbox.checked;
      updateEarnedDice();
    });
    row.append(checkbox);
    els.translationChecks.append(row);
  });
  updateEarnedDice();
}

function cardsForChecks(fighter, owner) {
  return CARD_TYPES.map(({ key, label }) => ({
    owner,
    label,
    card: fighter.cards[key],
  }));
}

function updateEarnedDice() {
  const translationDice = Object.values(state.translationSuccess).filter(Boolean).length;
  state.advantageDice = Number(els.advantageDice.value) || 0;
  state.earnedDice = translationDice + state.advantageDice;
  els.earnedDice.textContent = state.earnedDice;
  els.fightDiceCount.textContent = state.earnedDice;
}

function resetFightPanel() {
  els.advantageDice.value = "0";
  els.fightDiceCount.textContent = "0";
  els.rollTotal.textContent = "Not rolled";
  els.diceResults.innerHTML = "";
  els.compensationArea.classList.add("hidden");
  els.compensationTasks.innerHTML = "";
  els.finishOpponent.disabled = true;
  els.rollDice.disabled = false;
  els.timerDisplay.textContent = pref(4, "timedCompensation") === "timed" ? `${pref(4, "timerSeconds")}s` : "Untimed";
}

function rollFightDice() {
  updateEarnedDice();
  if (state.earnedDice <= 0) {
    alert("Earn at least one die before rolling.");
    return;
  }

  const rolls = Array.from({ length: state.earnedDice }, () => randomInt(1, 6));
  state.rollTotal = rolls.reduce((sum, roll) => sum + roll, 0);
  els.rollTotal.textContent = state.rollTotal;
  els.diceResults.innerHTML = "";
  rolls.forEach((roll) => {
    const die = document.createElement("div");
    die.className = "die";
    die.textContent = roll;
    els.diceResults.append(die);
  });

  state.missingPoints = Math.max(0, 11 - state.rollTotal);
  if (state.missingPoints === 0) {
    els.compensationArea.classList.add("hidden");
    els.finishOpponent.disabled = false;
  } else {
    renderCompensation();
  }
}

function renderCompensation() {
  els.compensationArea.classList.remove("hidden");
  els.missingPointsText.textContent = `You need ${state.missingPoints} more point${state.missingPoints === 1 ? "" : "s"}. Complete that many extra target vocabulary translations.`;
  els.compensationTasks.innerHTML = "";

  const tasks = Array.from({ length: state.missingPoints }, (_, index) => {
    const shuffled = shuffle(state.cards);
    return shuffled[index % shuffled.length];
  });
  tasks.forEach((row, index) => {
    const id = `comp-${index}`;
    const label = document.createElement("label");
    label.className = "check-item";
    label.innerHTML = `<span><strong>${escapeHtml(row.target.en)}</strong><br><small>${escapeHtml(row.target.zh)}</small></span>`;
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = id;
    checkbox.addEventListener("change", updateCompensationComplete);
    label.append(checkbox);
    els.compensationTasks.append(label);
  });

  startCompensationTimer();
  updateCompensationComplete();
}

function startCompensationTimer() {
  clearInterval(state.compensationTimer);
  if (pref(4, "timedCompensation") !== "timed") {
    els.timerDisplay.textContent = "Untimed";
    return;
  }

  state.remainingSeconds = Number(pref(4, "timerSeconds")) || 60;
  els.timerDisplay.textContent = `${state.remainingSeconds}s`;
  state.compensationTimer = setInterval(() => {
    state.remainingSeconds -= 1;
    els.timerDisplay.textContent = `${state.remainingSeconds}s`;
    if (state.remainingSeconds <= 0) {
      clearInterval(state.compensationTimer);
      els.timerDisplay.textContent = "Time up";
      [...els.compensationTasks.querySelectorAll("input")].forEach((input) => {
        input.disabled = true;
      });
    }
  }, 1000);
}

function updateCompensationComplete() {
  const checks = [...els.compensationTasks.querySelectorAll("input")];
  els.finishOpponent.disabled = !checks.every((input) => input.checked);
}

function finishOpponent() {
  clearInterval(state.compensationTimer);
  if (state.opponentIndex < state.opponents.length - 1) {
    state.opponentIndex += 1;
    startOpponent();
    setStep(3);
    return;
  }

  alert("All opponents defeated. Vocabulary review complete.");
  updateOpponentProgress(true);
  els.finishOpponent.disabled = true;
  els.rollDice.disabled = true;
}

function currentOpponent() {
  return state.opponents[state.opponentIndex];
}

function updateOpponentProgress(done = false) {
  if (done) {
    els.opponentProgress.textContent = "All defeated";
    return;
  }
  if (!state.opponents.length) {
    els.opponentProgress.textContent = "Not started";
    return;
  }
  els.opponentProgress.textContent = `${state.opponentIndex + 1} of ${state.opponents.length}`;
}

function saveModalPreferences(event) {
  event.preventDefault();
  const stepPrefs = preferences[state.step] || {};
  els.modalSettings.querySelectorAll("[data-setting-key]").forEach((input) => {
    const setting = STEP_META[state.step].settings.find((item) => item.key === input.dataset.settingKey);
    let value = input.value;
    if (setting?.type === "number") {
      value = clamp(Number(value) || setting.defaultValue, setting.min, setting.max);
    }
    stepPrefs[input.dataset.settingKey] = value;
  });
  preferences[state.step] = stepPrefs;
  savePreferences();
  els.stepModal.close();

  if (state.step === 2 && state.cards.length) drawHands();
  if (state.step === 3 && state.player) renderTranslationChecks();
  if (state.step === 4) resetFightPanel();
}

function clearEditableTable() {
  els.cardTableBody.querySelectorAll("input:not([readonly])").forEach((input) => {
    input.value = "";
  });
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index);
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

els.generateTable.addEventListener("click", generateTable);
els.sampleWords.addEventListener("click", () => {
  els.targetWords.value = "brave\ninvisible\ngravity\nstrategy\nweakness";
});
els.clearTable.addEventListener("click", clearEditableTable);
els.saveCards.addEventListener("click", collectCards);
els.reshuffleHands.addEventListener("click", drawHands);
els.confirmFighter.addEventListener("click", confirmFighter);
els.advantageDice.addEventListener("change", updateEarnedDice);
els.goFight.addEventListener("click", () => setStep(4));
els.rollDice.addEventListener("click", rollFightDice);
els.finishOpponent.addEventListener("click", finishOpponent);
els.openStepHelp.addEventListener("click", () => openStepModal(state.step));
els.closeModal.addEventListener("click", () => els.stepModal.close());
els.stepModal.addEventListener("submit", saveModalPreferences);
els.stepTabs.forEach((tab) => {
  tab.addEventListener("click", () => setStep(Number(tab.dataset.step)));
});

setStep(0, true);
