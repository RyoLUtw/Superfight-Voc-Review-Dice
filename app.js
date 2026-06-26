const ALL_CARD_TYPES = [
  { key: "target", label: "Target Word" },
  { key: "character", label: "Character" },
  { key: "positive", label: "Positive Attribute" },
  { key: "negative", label: "Negative Attribute" },
];

const FIGHTER_CARD_TYPES = ALL_CARD_TYPES.filter(({ key }) => key !== "target");

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
      "Set how many cards appear in each draw hand. Pick one character, one positive attribute, and one negative attribute to build your fighter.",
    settings: [
      {
        key: "handSize",
        label: "Cards to draw per type",
        type: "number",
        min: 1,
        max: 12,
        defaultValue: 3,
      },
      {
        key: "cardContentLanguage",
        label: "Card content language",
        type: "select",
        options: [
          ["en", "English"],
          ["zh", "Chinese"],
        ],
        defaultValue: "en",
      },
    ],
  },
  {
    title: "Analyse opponent",
    description:
      "Translate card content to earn dice, then add one extra die for a successful advantage explanation.",
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
      "Roll earned dice. Meet or beat the roll target to defeat the opponent. Missing points can be compensated with extra vocabulary translations.",
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
      {
        key: "rollTarget",
        label: "Roll target",
        type: "range",
        min: 9,
        max: 20,
        defaultValue: 11,
      },
    ],
  },
];

const SAMPLE_ROWS = {
  brave: {
    target: { zh: "\u52c7\u6562\u7684" },
    character: { en: "a knight with a cracked shield", zh: "\u62ff\u8457\u88c2\u958b\u76fe\u724c\u7684\u9a0e\u58eb" },
    positive: { en: "can inspire allies with one speech", zh: "\u80fd\u7528\u4e00\u5834\u6f14\u8aaa\u9f13\u821e\u968a\u53cb" },
    negative: { en: "is afraid of loud noises", zh: "\u5bb3\u6015\u5f88\u5927\u7684\u8072\u97f3" },
  },
  invisible: {
    target: { zh: "\u96b1\u5f62\u7684" },
    character: { en: "an invisible chef", zh: "\u4e00\u4f4d\u96b1\u5f62\u5eda\u5e2b" },
    positive: { en: "can sneak past any guard", zh: "\u53ef\u4ee5\u5077\u5077\u901a\u904e\u4efb\u4f55\u5b88\u885b" },
    negative: { en: "leaves flour footprints everywhere", zh: "\u5230\u8655\u7559\u4e0b\u9eb5\u7c89\u8173\u5370" },
  },
  gravity: {
    target: { zh: "\u91cd\u529b" },
    character: { en: "a scientist carrying a moon rock", zh: "\u62ff\u8457\u6708\u7403\u77f3\u982d\u7684\u79d1\u5b78\u5bb6" },
    positive: { en: "can change gravity for ten seconds", zh: "\u53ef\u4ee5\u6539\u8b8a\u91cd\u529b\u5341\u79d2\u9418" },
    negative: { en: "floats away when surprised", zh: "\u53d7\u5230\u9a5a\u5687\u6642\u6703\u98c4\u8d70" },
  },
  strategy: {
    target: { zh: "\u7b56\u7565" },
    character: { en: "a chess coach in battle armor", zh: "\u7a7f\u8457\u6230\u7532\u7684\u897f\u6d0b\u68cb\u6559\u7df4" },
    positive: { en: "predicts an enemy's next move", zh: "\u80fd\u9810\u6e2c\u6575\u4eba\u7684\u4e0b\u4e00\u6b65" },
    negative: { en: "overthinks simple problems", zh: "\u6703\u628a\u7c21\u55ae\u554f\u984c\u60f3\u5f97\u592a\u8907\u96dc" },
  },
  weakness: {
    target: { zh: "\u5f31\u9ede" },
    character: { en: "a detective with a giant notebook", zh: "\u62ff\u8457\u5de8\u5927\u7b46\u8a18\u672c\u7684\u5075\u63a2" },
    positive: { en: "finds a hidden weakness quickly", zh: "\u80fd\u5feb\u901f\u627e\u51fa\u96b1\u85cf\u5f31\u9ede" },
    negative: { en: "announces every plan out loud", zh: "\u6703\u5927\u8072\u8aaa\u51fa\u6bcf\u500b\u8a08\u756b" },
  },
};
const state = {
  step: 0,
  targetWords: [],
  cards: [],
  player: null,
  opponents: [],
  opponentIndex: 0,
  hands: {},
  picks: {},
  fighterTranslationCorrect: {},
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
  fillSampleTable: document.querySelector("#fillSampleTable"),
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
  earnedDice: document.querySelector("#earnedDice"),
  advantageDice: document.querySelector("#advantageDice"),
  goFight: document.querySelector("#goFight"),
  fightDiceCount: document.querySelector("#fightDiceCount"),
  rollTotal: document.querySelector("#rollTotal"),
  rollTargetDisplay: document.querySelector("#rollTargetDisplay"),
  diceResults: document.querySelector("#diceResults"),
  compensationArea: document.querySelector("#compensationArea"),
  missingPointsText: document.querySelector("#missingPointsText"),
  timerDisplay: document.querySelector("#timerDisplay"),
  compensationTasks: document.querySelector("#compensationTasks"),
  rollDice: document.querySelector("#rollDice"),
  finishOpponent: document.querySelector("#finishOpponent"),
  defeatModal: document.querySelector("#defeatModal"),
  defeatTitle: document.querySelector("#defeatTitle"),
  defeatMessage: document.querySelector("#defeatMessage"),
  compensationModal: document.querySelector("#compensationModal"),
  compensationModalMessage: document.querySelector("#compensationModalMessage"),
  startCompensation: document.querySelector("#startCompensation"),
  fighterTranslationModal: document.querySelector("#fighterTranslationModal"),
  fighterTranslationCards: document.querySelector("#fighterTranslationCards"),
  continueAfterFighterTranslation: document.querySelector("#continueAfterFighterTranslation"),
  stepModal: document.querySelector("#stepModal"),
  modalStep: document.querySelector("#modalStep"),
  modalTitle: document.querySelector("#modalTitle"),
  modalDescription: document.querySelector("#modalDescription"),
  modalSettings: document.querySelector("#modalSettings"),
  saveModalPreferences: document.querySelector("#saveModalPreferences"),
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
  updateRollTargetDisplay();
  updateOpponentProgress();
  if (showModal) {
    if (stepIndex === 3 && pref(2, "cardContentLanguage") === "zh" && hasUnsuccessfulFighterTranslations()) {
      showFighterTranslationModal();
    } else {
      openStepModal(stepIndex);
    }
  }
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
  els.saveModalPreferences.classList.toggle("hidden", !meta.settings.length);

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
    if (setting.type === "range") {
      const valueLabel = document.createElement("span");
      valueLabel.className = "range-value";
      valueLabel.textContent = input.value;
      input.addEventListener("input", () => {
        valueLabel.textContent = input.value;
      });
      const rangeWrap = document.createElement("div");
      rangeWrap.className = "range-wrap";
      rangeWrap.append(input, valueLabel);
      row.append(label, rangeWrap);
    } else {
      row.append(label, input);
    }
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
    ALL_CARD_TYPES.some(({ key }) => !row[key].en || !row[key].zh),
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

  FIGHTER_CARD_TYPES.forEach(({ key }) => {
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
  const language = pref(2, "cardContentLanguage");
  FIGHTER_CARD_TYPES.forEach(({ key, label }) => {
    const column = document.createElement("div");
    column.className = "pick-column";
    const title = document.createElement("h4");
    title.textContent = label;
    column.append(title);

    state.hands[key].forEach((card) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `choice ${state.picks[key] === card.rowId ? "selected" : ""}`;
      button.innerHTML = `<span>${escapeHtml(language === "zh" ? card.zh : card.en)}</span>`;
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
  syncFighterTranslationState();
  const pools = {};

  FIGHTER_CARD_TYPES.forEach(({ key }) => {
    pools[key] = shuffle(
      state.cards
        .filter((row) => row.id !== state.picks[key])
        .map((row) => ({ rowId: row.id, ...row[key] })),
    );
  });

  const opponentCount = Math.max(0, state.targetWords.length - 1);
  const possibleOpponentCount = Math.min(opponentCount, ...FIGHTER_CARD_TYPES.map(({ key }) => pools[key].length));

  if (possibleOpponentCount < opponentCount) {
    alert(
      `Only ${possibleOpponentCount} complete non-repeating opponents can be made from the remaining cards.`,
    );
  }

  state.opponents = Array.from({ length: possibleOpponentCount }, (_, index) => {
    const fighter = { name: `Opponent ${index + 1}`, cards: {} };
    FIGHTER_CARD_TYPES.forEach(({ key }) => {
      fighter.cards[key] = pools[key].pop();
    });
    return fighter;
  });

  if (!state.opponents.length) {
    alert("There are not enough remaining cards to create opponents.");
    return;
  }

  state.opponentIndex = 0;
  if (pref(2, "cardContentLanguage") === "zh" && hasUnsuccessfulFighterTranslations()) {
    showFighterTranslationModal();
  } else {
    continueAfterFighterTranslation();
  }
}

function syncFighterTranslationState() {
  const next = {};
  FIGHTER_CARD_TYPES.forEach(({ key }) => {
    const card = state.player.cards[key];
    const id = fighterTranslationId(key, card);
    next[id] = Boolean(state.fighterTranslationCorrect[id]);
  });
  state.fighterTranslationCorrect = next;
}

function buildFighterFromPicks(name, picks) {
  const fighter = { name, cards: {} };
  FIGHTER_CARD_TYPES.forEach(({ key }) => {
    const row = state.cards.find((item) => item.id === picks[key]);
    fighter.cards[key] = { rowId: row.id, ...row[key] };
  });
  return fighter;
}

function showFighterTranslationModal() {
  els.fighterTranslationCards.innerHTML = "";

  FIGHTER_CARD_TYPES.forEach(({ key, label }) => {
    const card = state.player.cards[key];
    const id = fighterTranslationId(key, card);
    const item = document.createElement("div");
    item.className = "card-item review-card";
    item.innerHTML = `
      <div>
        <small>${label}</small>
        <strong>${escapeHtml(card.zh)}</strong>
      </div>
      <div class="answer-key hidden">
        <small>English answer</small>
        <span>${escapeHtml(card.en)}</span>
      </div>
      <div class="review-actions">
        <button class="ghost reveal-answer" type="button">Reveal answer</button>
        <label class="success-toggle">
          <span>Translated successfully</span>
          <input type="checkbox" ${state.fighterTranslationCorrect[id] ? "checked" : ""}>
        </label>
      </div>
    `;
    const answerKey = item.querySelector(".answer-key");
    const reveal = item.querySelector(".reveal-answer");
    reveal.addEventListener("click", () => {
      const hidden = answerKey.classList.toggle("hidden");
      reveal.textContent = hidden ? "Reveal answer" : "Hide answer";
    });
    item.querySelector("input").addEventListener("change", (event) => {
      state.fighterTranslationCorrect[id] = event.target.checked;
    });
    els.fighterTranslationCards.append(item);
  });

  if (typeof els.fighterTranslationModal.showModal === "function") {
    els.fighterTranslationModal.showModal();
  }
}

function continueAfterFighterTranslation() {
  if (els.fighterTranslationModal.open) {
    els.fighterTranslationModal.close();
  }
  if (state.step === 3 && hasUnsuccessfulFighterTranslations()) {
    showFighterTranslationModal();
    return;
  }
  startOpponent();
  setStep(3);
}

function hasUnsuccessfulFighterTranslations() {
  if (!state.player) return false;
  return FIGHTER_CARD_TYPES.some(({ key }) => {
    const card = state.player.cards[key];
    return !state.fighterTranslationCorrect[fighterTranslationId(key, card)];
  });
}

function fighterTranslationId(key, card) {
  return `${key}-${card.rowId}`;
}

function startOpponent() {
  state.translationSuccess = {};
  state.advantageDice = 0;
  state.earnedDice = 0;
  state.rollTotal = null;
  state.missingPoints = 0;
  clearInterval(state.compensationTimer);
  renderBattle();
  resetFightPanel();
}

function renderBattle() {
  renderFighterCards(els.playerFighter, state.player, "Your");
  renderFighterCards(els.opponentFighter, currentOpponent(), "Opponent");
  els.opponentName.textContent = currentOpponent()?.name || "Opponent";
  renderTranslationGuidance();
  updateEarnedDice();
  updateOpponentProgress();
}

function renderFighterCards(container, fighter, owner) {
  container.innerHTML = "";
  if (!fighter) return;
  const direction = pref(3, "translationDirection");
  FIGHTER_CARD_TYPES.forEach(({ key, label }) => {
    const card = fighter.cards[key];
    const checkId = `${owner}-${key}`;
    const prompt = direction === "enToZh" ? card.en : card.zh;
    const answer = direction === "enToZh" ? card.zh : card.en;
    const item = document.createElement("div");
    item.className = "card-item review-card";
    item.innerHTML = `
      <div>
        <small>${label}</small>
        <strong>${escapeHtml(prompt)}</strong>
      </div>
      <div class="answer-key hidden" id="answer-${escapeHtml(checkId)}">
        <small>Answer key</small>
        <span>${escapeHtml(answer)}</span>
      </div>
      <div class="review-actions">
        <button class="ghost reveal-answer" type="button">Reveal answer</button>
        <label class="success-toggle">
          <span>Translated successfully</span>
          <input type="checkbox" ${state.translationSuccess[checkId] ? "checked" : ""}>
        </label>
      </div>
    `;
    const answerKey = item.querySelector(".answer-key");
    const reveal = item.querySelector(".reveal-answer");
    reveal.addEventListener("click", () => {
      const hidden = answerKey.classList.toggle("hidden");
      reveal.textContent = hidden ? "Reveal answer" : "Hide answer";
    });
    item.querySelector("input").addEventListener("change", (event) => {
      state.translationSuccess[checkId] = event.target.checked;
      updateEarnedDice();
    });
    container.append(item);
  });
}

function renderTranslationGuidance() {
  const direction = pref(3, "translationDirection");
  els.translationModeLabel.textContent =
    direction === "enToZh"
      ? "Translate English cards into Chinese. Each success adds one die."
      : "Translate Chinese cards into English. Each success adds one die.";
}

function updateEarnedDice() {
  const translationDice = Object.values(state.translationSuccess).filter(Boolean).length;
  state.advantageDice = els.advantageDice.checked ? 1 : 0;
  state.earnedDice = translationDice + state.advantageDice;
  els.earnedDice.textContent = state.earnedDice;
  els.fightDiceCount.textContent = state.earnedDice;
}

function resetFightPanel() {
  updateEarnedDice();
  els.rollTotal.textContent = "Not rolled";
  els.diceResults.innerHTML = "";
  els.compensationArea.classList.add("hidden");
  els.compensationTasks.innerHTML = "";
  els.rollDice.disabled = false;
  updateRollTargetDisplay();
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
    els.diceResults.append(renderDie(roll));
  });

  const rollTarget = Number(pref(4, "rollTarget")) || 11;
  state.missingPoints = Math.max(0, rollTarget - state.rollTotal);
  if (state.missingPoints === 0) {
    els.compensationArea.classList.add("hidden");
    showDefeatModal("Initial roll victory", `You rolled ${state.rollTotal}, meeting the ${rollTarget}+ target.`);
  } else {
    renderCompensation();
    showCompensationModal();
  }
}

function renderDie(value) {
  const die = document.createElement("div");
  die.className = `die die-${value}`;
  die.setAttribute("aria-label", `Rolled ${value}`);
  die.dataset.value = value;

  for (let index = 0; index < value; index += 1) {
    const pip = document.createElement("span");
    pip.className = "pip";
    die.append(pip);
  }

  return die;
}

function renderCompensation() {
  els.compensationArea.classList.remove("hidden");
  els.missingPointsText.textContent = `You need ${state.missingPoints} more point${state.missingPoints === 1 ? "" : "s"}. Complete that many extra target vocabulary translations.`;
  els.compensationTasks.innerHTML = "";

  const tasks = drawCompensationTasks(state.missingPoints);
  const direction = pref(3, "translationDirection");
  tasks.forEach((row, index) => {
    const id = `comp-${index}`;
    const prompt = direction === "enToZh" ? row.target.en : row.target.zh;
    const answer = direction === "enToZh" ? row.target.zh : row.target.en;
    const item = document.createElement("div");
    item.className = "check-item compensation-card";
    item.innerHTML = `
      <div class="compensation-content">
        <span><strong>${escapeHtml(prompt)}</strong></span>
        <div class="answer-key hidden">
          <small>Answer key</small>
          <span>${escapeHtml(answer)}</span>
        </div>
      </div>
      <div class="review-actions">
        <button class="ghost reveal-answer" type="button">Reveal answer</button>
        <label class="success-toggle">
          <span>Translated successfully</span>
          <input type="checkbox" id="${id}">
        </label>
      </div>
    `;
    const answerKey = item.querySelector(".answer-key");
    const reveal = item.querySelector(".reveal-answer");
    reveal.addEventListener("click", () => {
      const hidden = answerKey.classList.toggle("hidden");
      reveal.textContent = hidden ? "Reveal answer" : "Hide answer";
    });
    item.querySelector("input").addEventListener("change", updateCompensationComplete);
    els.compensationTasks.append(item);
  });

  updateCompensationComplete();
}

function showCompensationModal() {
  const rollTarget = Number(pref(4, "rollTarget")) || 11;
  els.compensationModalMessage.textContent = `You rolled ${state.rollTotal}. The target is ${rollTarget}+, so you are missing ${state.missingPoints} point${state.missingPoints === 1 ? "" : "s"}. Translate ${state.missingPoints} target word${state.missingPoints === 1 ? "" : "s"} successfully to compensate.`;
  if (typeof els.compensationModal.showModal === "function") {
    els.compensationModal.showModal();
  }
}

function beginCompensation() {
  if (els.compensationModal.open) {
    els.compensationModal.close();
  }
  els.compensationArea.scrollIntoView({ behavior: "smooth", block: "start" });
  startCompensationTimer();
}

function drawCompensationTasks(count) {
  const tasks = [];
  let pool = [];
  let lastId = null;

  while (tasks.length < count) {
    if (!pool.length) {
      pool = shuffle(state.cards);
      if (pool.length > 1 && pool[0].id === lastId) {
        const swapIndex = pool.findIndex((row) => row.id !== lastId);
        [pool[0], pool[swapIndex]] = [pool[swapIndex], pool[0]];
      }
    }

    const next = pool.shift();
    tasks.push(next);
    lastId = next.id;
  }

  return tasks;
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
  if (checks.length && checks.every((input) => input.checked)) {
    showDefeatModal(
      "Compensation complete",
      `You translated ${checks.length} extra target word${checks.length === 1 ? "" : "s"} and defeated ${currentOpponent().name}.`,
    );
  }
}

function finishOpponent() {
  clearInterval(state.compensationTimer);
  if (els.defeatModal.open) {
    els.defeatModal.close();
  }
  if (state.opponentIndex < state.opponents.length - 1) {
    state.opponentIndex += 1;
    startOpponent();
    setStep(3);
    return;
  }

  alert("All opponents defeated. Vocabulary review complete.");
  updateOpponentProgress(true);
  els.rollDice.disabled = true;
}

function showDefeatModal(title, message) {
  clearInterval(state.compensationTimer);
  els.defeatTitle.textContent = title;
  els.defeatMessage.textContent = message;
  els.finishOpponent.textContent =
    state.opponentIndex < state.opponents.length - 1 ? "Next opponent" : "Finish game";
  if (typeof els.defeatModal.showModal === "function" && !els.defeatModal.open) {
    els.defeatModal.showModal();
  }
}

function updateRollTargetDisplay() {
  els.rollTargetDisplay.textContent = `${pref(4, "rollTarget")}+`;
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
    if (setting?.type === "number" || setting?.type === "range") {
      value = clamp(Number(value) || setting.defaultValue, setting.min, setting.max);
    }
    stepPrefs[input.dataset.settingKey] = value;
  });
  preferences[state.step] = stepPrefs;
  savePreferences();
  els.stepModal.close();

  if (state.step === 2 && state.cards.length) drawHands();
  if (state.step === 3 && state.player) renderBattle();
  if (state.step === 4) resetFightPanel();
}

function fillSampleTable() {
  if (!state.targetWords.length) {
    alert("Generate the target word table first.");
    return;
  }

  state.targetWords.forEach((word, index) => {
    const sample = SAMPLE_ROWS[word.toLowerCase()] || {
      target: { zh: `${word} translation` },
      character: { en: `a fighter who studies ${word}`, zh: `studies ${word}` },
      positive: { en: `uses ${word} creatively`, zh: `uses ${word} creatively` },
      negative: { en: `gets distracted by ${word}`, zh: `distracted by ${word}` },
    };
    setTableValue(index, "targetZh", sample.target.zh);
    setTableValue(index, "characterEn", sample.character.en);
    setTableValue(index, "characterZh", sample.character.zh);
    setTableValue(index, "positiveEn", sample.positive.en);
    setTableValue(index, "positiveZh", sample.positive.zh);
    setTableValue(index, "negativeEn", sample.negative.en);
    setTableValue(index, "negativeZh", sample.negative.zh);
  });
}

function setTableValue(row, key, value) {
  const input = els.cardTableBody.querySelector(`input[data-row="${row}"][data-key="${key}"]`);
  if (input) input.value = value;
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
els.fillSampleTable.addEventListener("click", fillSampleTable);
els.clearTable.addEventListener("click", clearEditableTable);
els.saveCards.addEventListener("click", collectCards);
els.reshuffleHands.addEventListener("click", drawHands);
els.confirmFighter.addEventListener("click", confirmFighter);
els.continueAfterFighterTranslation.addEventListener("click", continueAfterFighterTranslation);
els.advantageDice.addEventListener("change", updateEarnedDice);
els.goFight.addEventListener("click", () => {
  updateEarnedDice();
  setStep(4);
});
els.rollDice.addEventListener("click", rollFightDice);
els.startCompensation.addEventListener("click", beginCompensation);
els.finishOpponent.addEventListener("click", finishOpponent);
els.openStepHelp.addEventListener("click", () => openStepModal(state.step));
els.closeModal.addEventListener("click", () => els.stepModal.close());
els.stepModal.addEventListener("submit", saveModalPreferences);
els.stepTabs.forEach((tab) => {
  tab.addEventListener("click", () => setStep(Number(tab.dataset.step)));
});

setStep(0, true);

