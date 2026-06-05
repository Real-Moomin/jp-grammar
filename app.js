const categoryLabels = {
  all: "전체 문제",
  grammar: "문법",
  vocabulary: "어휘",
  reading: "발음"
};

const dbName = "n1-practice-site";
const dbVersion = 1;
const storeName = "progress";
const progressKey = "main";
const questions = Array.isArray(window.N1_QUESTIONS) ? window.N1_QUESTIONS : [];

let activeCategory = "all";
let searchTerm = "";
let dbPromise = null;
let progress = { answers: {}, revealed: {} };

const questionListEl = document.getElementById("questionList");
const viewTitleEl = document.getElementById("viewTitle");
const searchInputEl = document.getElementById("searchInput");
const resetBtn = document.getElementById("resetBtn");
const answeredCountEl = document.getElementById("answeredCount");
const correctCountEl = document.getElementById("correctCount");
const accuracyRateEl = document.getElementById("accuracyRate");

function getDefaultProgress() {
  return { answers: {}, revealed: {} };
}

function openProgressDb() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB is not available in this browser."));
      return;
    }

    const request = window.indexedDB.open(dbName, dbVersion);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

async function readProgress() {
  try {
    const db = await openProgressDb();
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.get(progressKey);

      request.onsuccess = () => {
        const saved = request.result?.value || getDefaultProgress();
        resolve({
          answers: saved.answers || {},
          revealed: saved.revealed || {}
        });
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn("Progress could not be loaded from IndexedDB.", error);
    return getDefaultProgress();
  }
}

async function saveProgress() {
  try {
    const db = await openProgressDb();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.put({ id: progressKey, value: progress, updatedAt: Date.now() });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn("Progress could not be saved to IndexedDB.", error);
  }
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function getFilteredQuestions() {
  const query = normalize(searchTerm);
  return questions.filter((question) => {
    const categoryMatches = activeCategory === "all" || question.category === activeCategory;
    if (!categoryMatches) return false;
    if (!query) return true;

    const haystack = [
      question.typeLabel,
      question.subType,
      question.title,
      question.prompt,
      question.explanation,
      ...(question.choiceExplanations || []),
      ...question.choices
    ].join(" ");

    return normalize(haystack).includes(query);
  });
}

function answerQuestion(questionId, answerNumber) {
  progress.answers[questionId] = answerNumber;
  progress.revealed[questionId] = true;
  saveProgress();
  render();
}

function toggleSolution(questionId) {
  progress.revealed[questionId] = !progress.revealed[questionId];
  saveProgress();
  render();
}

function resetProgress() {
  progress = getDefaultProgress();
  saveProgress();
  render();
}

function getStats() {
  const answered = questions.filter((question) => progress.answers[question.id]);
  const correct = answered.filter((question) => progress.answers[question.id] === question.answer);
  const accuracy = answered.length ? Math.round((correct.length / answered.length) * 100) : 0;
  return { answered: answered.length, correct: correct.length, accuracy };
}

function renderStats() {
  const stats = getStats();
  answeredCountEl.textContent = stats.answered;
  correctCountEl.textContent = stats.correct;
  accuracyRateEl.textContent = `${stats.accuracy}%`;
}

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ja-JP";
  utterance.rate = 0.86;
  window.speechSynthesis.speak(utterance);
}

function createChoiceButton(question, choice, index) {
  const answerNumber = index + 1;
  const selected = progress.answers[question.id] === answerNumber;
  const revealed = Boolean(progress.revealed[question.id]);
  const button = document.createElement("button");

  button.type = "button";
  button.className = "choice-btn";
  button.textContent = `${answerNumber}. ${choice}`;

  if (selected) button.classList.add("selected");
  if (revealed && answerNumber === question.answer) button.classList.add("correct");
  if (revealed && selected && answerNumber !== question.answer) button.classList.add("incorrect");

  button.addEventListener("click", () => answerQuestion(question.id, answerNumber));
  return button;
}

function renderQuestion(question, index) {
  const card = document.createElement("article");
  card.className = "question-card";

  const head = document.createElement("div");
  head.className = "question-head";

  const copy = document.createElement("div");
  const tags = document.createElement("div");
  tags.className = "tag-row";
  tags.innerHTML = `
    <span class="tag primary">${question.typeLabel}</span>
    ${question.subType ? `<span class="tag">${question.subType}</span>` : ""}
    <span class="tag">N1</span>
    <span class="tag">#${String(index + 1).padStart(2, "0")}</span>
  `;

  const title = document.createElement("h3");
  title.textContent = question.title;

  copy.appendChild(tags);
  copy.appendChild(title);
  head.appendChild(copy);

  if (question.speakText) {
    const speakButton = document.createElement("button");
    speakButton.type = "button";
    speakButton.className = "speak-btn";
    speakButton.title = "일본어 문장 듣기";
    speakButton.setAttribute("aria-label", "일본어 문장 듣기");
    speakButton.textContent = "▶";
    speakButton.addEventListener("click", () => speak(question.speakText));
    head.appendChild(speakButton);
  }

  const prompt = document.createElement("p");
  prompt.className = "prompt";
  prompt.textContent = question.prompt;

  const choices = document.createElement("ol");
  choices.className = "choices";
  question.choices.forEach((choice, choiceIndex) => {
    const item = document.createElement("li");
    item.appendChild(createChoiceButton(question, choice, choiceIndex));
    choices.appendChild(item);
  });

  const solution = document.createElement("div");
  solution.className = `solution ${progress.revealed[question.id] ? "open" : ""}`;
  const selected = progress.answers[question.id];
  const selectedText = selected ? `${selected}. ${question.choices[selected - 1]}` : "미선택";
  solution.innerHTML = `
    <p class="solution-title">정답: ${question.answer}. ${question.choices[question.answer - 1]} / 선택: ${selectedText}</p>
    <p>${question.explanation}</p>
  `;

  if (Array.isArray(question.choiceExplanations) && question.choiceExplanations.length) {
    const detailTitle = document.createElement("p");
    detailTitle.className = "choice-explanation-title";
    detailTitle.textContent = "선택지별 해설";
    solution.appendChild(detailTitle);

    const detailList = document.createElement("ol");
    detailList.className = "choice-explanations";
    question.choiceExplanations.forEach((text) => {
      const item = document.createElement("li");
      item.textContent = text;
      detailList.appendChild(item);
    });
    solution.appendChild(detailList);
  }

  const revealButton = document.createElement("button");
  revealButton.type = "button";
  revealButton.className = "ghost-btn reveal-btn";
  revealButton.textContent = progress.revealed[question.id] ? "해설 닫기" : "해설 보기";
  revealButton.addEventListener("click", () => toggleSolution(question.id));

  card.appendChild(head);
  card.appendChild(prompt);
  card.appendChild(choices);
  card.appendChild(solution);
  card.appendChild(revealButton);

  return card;
}

function renderQuestions() {
  const filtered = getFilteredQuestions();
  questionListEl.innerHTML = "";
  viewTitleEl.textContent = `${categoryLabels[activeCategory]} (${filtered.length})`;

  if (!filtered.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "조건에 맞는 문제가 없습니다.";
    questionListEl.appendChild(empty);
    return;
  }

  filtered.forEach((question, index) => {
    questionListEl.appendChild(renderQuestion(question, index));
  });
}

function renderCategoryButtons() {
  document.querySelectorAll(".category-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.category === activeCategory);
  });
}

function render() {
  renderCategoryButtons();
  renderStats();
  renderQuestions();
}

document.querySelectorAll(".category-btn").forEach((button) => {
  button.addEventListener("click", () => {
    activeCategory = button.dataset.category;
    render();
  });
});

searchInputEl.addEventListener("input", (event) => {
  searchTerm = event.target.value;
  render();
});

resetBtn.addEventListener("click", resetProgress);

async function initialize() {
  progress = await readProgress();
  render();
}

initialize();
