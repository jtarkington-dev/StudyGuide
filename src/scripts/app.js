const modal = document.getElementById("noteModal");
const viewModal = document.getElementById("viewModal");
const notesContainer = document.getElementById("notesContainer");
const quizDisplay = document.getElementById("quizDisplay");
const quizContainer = document.getElementById("quizContainer");

let currentQuizQuestions = [];
let currentQuestionIndex = 0;
let incorrectTags = new Set();
let score = 0;
let totalQuestions = 0;
let reviewQueue = [];

// ---------------------------- UI Event Listeners ----------------------------
document.getElementById("newNoteBtn").onclick = () => {
    modal.style.display = "flex";
};

document.getElementById("saveBtn").onclick = saveNote;
document.getElementById("viewCloseBtn").onclick = closeViewModal;
document.getElementById("createCloseBtn").onclick = closeModal;
document.getElementById("startQuizBtn").onclick = prepareTagSelection;
document.getElementById("cancelQuizBtn").onclick = () => {
    document.getElementById("quizTagModal").style.display = "none";
};
document.getElementById("launchQuizBtn").onclick = launchQuiz;

// ---------------------------- Modals ----------------------------
function closeModal() {
    modal.style.display = "none";
    clearForm();
}

function closeViewModal() {
    viewModal.style.display = "none";
}

function clearForm() {
    document.getElementById("noteTitle").value = '';
    document.getElementById("noteContent").value = '';
    document.getElementById("noteTags").value = '';
}

// ---------------------------- CRUD ----------------------------
async function saveNote() {
    const title = document.getElementById("noteTitle").value.trim();
    const content = document.getElementById("noteContent").value.trim();
    const tags = document.getElementById("noteTags").value.trim().split(',').map(t => t.trim());
    if (!title || !content) return;

    const res = await fetch("/.netlify/functions/save-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, tags })
    });

    const result = await res.json();
    if (result.error) {
        alert("Error saving note: " + result.error);
    } else {
        loadNotes();
        closeModal();
    }
}

async function deleteNote(id) {
    const res = await fetch("/.netlify/functions/delete-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
    });

    const result = await res.json();
    if (result.success) {
        loadNotes();
    } else {
        alert("Failed to delete note.");
    }
}

// ---------------------------- Load Notes & Review Logic ----------------------------
async function loadNotes() {
    const res = await fetch("/.netlify/functions/get-notes");
    const { notes, error } = await res.json();

    const container = document.getElementById("notesContainer");
    const reviewList = document.getElementById("reviewList");
    container.innerHTML = "";
    reviewList.innerHTML = "";

    if (error || !notes || notes.length === 0) {
        container.innerHTML = "<p>No notes found.</p>";
        return;
    }

    const now = new Date();
    notes.forEach(note => {
        const card = document.createElement("div");
        card.className = "note-card";
        card.innerHTML = `
            <div class="note-title">${note.title || 'Untitled Note'}</div>
            <div class="note-tags">${note.tags.join(", ")}</div>
            <div class="note-preview">${note.content.slice(0, 120)}...</div>
            <button class="delete-btn">🗑️</button>
        `;

        card.onclick = (e) => {
            if (e.target.classList.contains("delete-btn")) {
                e.stopPropagation();
                console.log("🧼 Deleting ID from frontend:", note.id);
                deleteNote(note.id);
                return;
            }
            document.getElementById("viewTitle").innerText = note.title || "Untitled Note";
            document.getElementById("viewContent").innerText = note.content;
            document.getElementById("viewTags").innerText = "Tags: " + (note.tags || "none");
            viewModal.style.display = "flex";
        };

        container.appendChild(card);

        const created = new Date(note.created_at);
        const reviewDue = new Date(note.next_review);
        const isOld = (now - created) / (1000 * 60 * 60 * 24) >= 1;

        if (reviewDue <= now || isOld) {
            const li = document.createElement("li");
            li.innerText = note.title || 'Untitled Note';
            li.onclick = () => {
                document.getElementById("viewTitle").innerText = note.title;
                document.getElementById("viewContent").innerText = note.content;
                document.getElementById("viewTags").innerText = "Tags: " + (note.tags || "none");
                viewModal.style.display = "flex";
            };
            reviewList.appendChild(li);
        }
    });
}

// ---------------------------- Quiz Handling ----------------------------
async function prepareTagSelection() {
    const modal = document.getElementById("quizTagModal");
    const selector = document.getElementById("tagSelector");
    selector.innerHTML = "";

    const res = await fetch("/.netlify/functions/get-tags");
    const { tags, error } = await res.json();

    const tagSet = new Set();
    if (!error && tags) {
        tags.forEach(n => n.tags.forEach(t => tagSet.add(t)));
    }

    tagSet.size === 0
        ? selector.innerHTML = '<option disabled>No tags found</option>'
        : tagSet.forEach(tag => {
            const opt = document.createElement("option");
            opt.value = tag;
            opt.innerText = tag;
            selector.appendChild(opt);
        });

    modal.style.display = "flex";
}

async function launchQuiz() {
    const tag = document.getElementById("tagSelector").value;
    const noteRes = await fetch("/.netlify/functions/get-notes");
    const { notes } = await noteRes.json();

    window.cachedNotes = notes;

    const quizRes = await fetch("/.netlify/functions/ai-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes, tag })
    });

    const { quiz, error } = await quizRes.json();
    if (error) {
        quizContainer.innerHTML = `<p class="error">${error}</p>`;
        return;
    }

    currentQuizQuestions = quiz.split(/\n(?=\d+\.)/).map(q => q.trim()).filter(q => q.includes("**Answer:**"));
    currentQuestionIndex = 0;
    incorrectTags.clear();

    quizContainer.innerHTML = "";
    quizDisplay.style.display = "block";
    document.getElementById("quizTagModal").style.display = "none";
    showNextQuestion();
}

function showNextQuestion() {
    quizContainer.innerHTML = "";

    if (currentQuestionIndex >= currentQuizQuestions.length) {
        quizContainer.innerHTML = `<h2 style="color: #00ffff;">✅ Quiz Complete!</h2>`;
        quizContainer.innerHTML += `<p style="color: white;">Score: ${score} / ${currentQuizQuestions.length}</p>`;

        if (score < currentQuizQuestions.length) {
            quizContainer.innerHTML += `<p style="color: orange;">🔁 Focus review on tags: ${Array.from(incorrectTags).join(", ")}</p>`;
        } else {
            quizContainer.innerHTML += `<p style="color: lime;">🎉 Perfect! You're killing it.</p>`;
        }
        return;
    }

    const raw = currentQuizQuestions[currentQuestionIndex];
    const [questionBlock, answerSection] = raw.split("**Answer:**");

    if (!questionBlock || !answerSection) {
        quizContainer.innerHTML = `<p style="color: red;">⚠️ Error parsing quiz format.</p>`;
        return;
    }

    const formattedQuestion = questionBlock
        .replace(/\*\*/g, "") // remove bold
        .replace(/([a-dA-D]\))/g, "\n$1") // force each option to a new line
        .trim();

    const correctAnswerRaw = answerSection.split("**Why:**")[0].trim();
    const reason = answerSection.includes("**Why:**")
        ? answerSection.split("**Why:**")[1].trim()
        : "N/A";

    const correctLetter = correctAnswerRaw.toLowerCase().charAt(0);

    const questionEl = document.createElement("pre");
    questionEl.style.color = "#00ffff";
    questionEl.style.fontSize = "1.1rem";
    questionEl.style.marginBottom = "1rem";
    questionEl.style.whiteSpace = "pre-wrap";
    questionEl.textContent = formattedQuestion;

    const form = document.createElement("form");
    form.style.marginBottom = "1rem";
    form.style.color = "white";

    const choices = [...formattedQuestion.matchAll(/([a-d])\)\s(.+)/gi)];
    choices.forEach(([_, letter, text]) => {
        const label = document.createElement("label");
        label.style.display = "block";
        label.style.margin = "0.5rem 0";
        label.innerHTML = `
            <input type="radio" name="choice" value="${letter.toLowerCase()}">
            <strong>${letter.toUpperCase()})</strong> ${text}
        `;
        form.appendChild(label);
    });

    const feedback = document.createElement("div");
    feedback.style.marginTop = "1rem";
    feedback.style.color = "white";

    const submitBtn = document.createElement("button");
    submitBtn.textContent = "Submit";
    submitBtn.type = "submit";
    submitBtn.style.marginTop = "1rem";
    form.appendChild(submitBtn);

    form.onsubmit = (e) => {
        e.preventDefault();
        const selected = form.querySelector("input[name='choice']:checked");
        if (!selected) {
            feedback.innerHTML = `<p style="color: orange;">⚠️ Select an answer first.</p>`;
            return;
        }

        const user = selected.value.toLowerCase();
        const isCorrect = user === correctLetter;

        feedback.innerHTML = isCorrect
            ? `<p style="color: lime;">✅ Correct!</p>`
            : `
                <p style="color: red;">❌ Incorrect.</p>
                <p><strong style="color: #00ffff;">Correct Answer:</strong> ${correctAnswerRaw}</p>
                <p><strong style="color: #00ffff;">Why:</strong> ${reason}</p>
            `;

        if (isCorrect) {
            score++;
        } else {
            incorrectTags.add(document.getElementById("tagSelector").value);
        }

        submitBtn.remove();
        const nextBtn = document.createElement("button");
        nextBtn.textContent = "Next";
        nextBtn.onclick = (e) => {
            e.preventDefault();
            currentQuestionIndex++;
            showNextQuestion();
        };
        form.appendChild(nextBtn);
    };

    quizContainer.appendChild(questionEl);
    quizContainer.appendChild(form);
    quizContainer.appendChild(feedback);
}

function addNoteToReview(noteTitle) {
    const reviewList = document.getElementById("reviewList");
    const existing = [...reviewList.querySelectorAll("li")].some(li => li.innerText === noteTitle);
    if (!existing) {
        const li = document.createElement("li");
        li.innerText = noteTitle;
        li.onclick = () => {
            const note = window.cachedNotes?.find(n => n.title === noteTitle);
            if (note) {
                document.getElementById("viewTitle").innerText = note.title;
                document.getElementById("viewContent").innerText = note.content;
                document.getElementById("viewTags").innerText = "Tags: " + (note.tags || []).join(", ");
                viewModal.style.display = "flex";
            }
        };
        reviewList.appendChild(li);
    }
}

// ---------------------------- Init ----------------------------
window.onload = loadNotes;