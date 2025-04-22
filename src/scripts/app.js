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
let missedQuestion = [];
let missedQuestionNotes = [];

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
    document.getElementById("noteContent").innerHTML = '';
    document.getElementById("noteTags").value = '';
}

// ---------------------------- CRUD ----------------------------
async function saveNote() {
    const title = document.getElementById("noteTitle").value.trim();
    const content = document.getElementById("noteContent").innerHTML.trim();
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

    const subjectDropdown = document.getElementById("subjectFilter");
    subjectDropdown.innerHTML = `<option value="all">All</option>`;
    const allTags = new Set();
    notes.forEach(n => (n.tags || []).forEach(tag => allTags.add(tag)));
    allTags.forEach(tag => {
        const opt = document.createElement("option");
        opt.value = tag;
        opt.textContent = tag;
        subjectDropdown.appendChild(opt);
    });

    const selectedTag = subjectDropdown.value;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Group notes by first tag
    const grouped = {};
    notes
        .filter(note => {
            if (selectedTag === "all") return true;
            return (note.tags || []).includes(selectedTag);
        })
        .forEach(note => {
            const subject = (note.tags && note.tags[0]) || "Uncategorized";
            if (!grouped[subject]) grouped[subject] = [];
            grouped[subject].push(note);
        });


    Object.entries(grouped).forEach(([subject, notesInGroup]) => {
        const section = document.createElement("div");
        section.className = "subject-group";

        const header = document.createElement("h3");
        header.className = "subject-header";
        header.innerHTML = `${subject} <span style="float:right;">▼</span>`;
        header.onclick = () => {
            deck.classList.toggle("collapsed");
        };

        const deck = document.createElement("div");
        deck.className = "note-deck";

        notesInGroup.forEach(note => {
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
                    deleteNote(note.id);
                    return;
                }
                document.getElementById("viewTitle").innerText = note.title || "Untitled Note";
                document.getElementById("viewContent").innerHTML = note.content;
                document.getElementById("viewTags").innerText = "Tags: " + (note.tags || []).join(", ");
                viewModal.style.display = "flex";
            };

            deck.appendChild(card);

            const reviewDate = new Date(note.next_review);
            const reviewDay = new Date(reviewDate.getFullYear(), reviewDate.getMonth(), reviewDate.getDate());
            if (reviewDay.getTime() === today.getTime()) {
                const li = document.createElement("li");
                li.innerText = note.title || 'Untitled Note';
                li.onclick = async () => {
                    document.getElementById("viewTitle").innerText = note.title;
                    document.getElementById("viewContent").innerHTML = note.content;
                    document.getElementById("viewTags").innerText = "Tags: " + (note.tags || "none");
                    viewModal.style.display = "flex";

                    //  After viewing, bump the review forward by 1 day
                    await fetch("/.netlify/functions/update-review", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: note.id, correct: true })
                    });


                    li.remove();


                    if (reviewList.children.length === 0) {
                        document.getElementById("reviewToggle").style.display = "none";
                        document.getElementById("reviewPanel").classList.add("hidden");
                    }
                };
                reviewList.appendChild(li);
            }
        });

        section.appendChild(header);
        section.appendChild(deck);
        container.appendChild(section);
    });

    const reviewBtn = document.getElementById("reviewToggle");
    const reviewPanel = document.getElementById("reviewPanel");

    if (reviewList.children.length === 0) {
        reviewBtn.style.display = "none";
        reviewPanel.classList.add("hidden");
    } else {
        reviewBtn.style.display = "block";
    }

    if (reviewList.children.length > 0) {
        reviewBtn.classList.add("glow-alert");
    } else {
        reviewBtn.classList.remove("glow-alert");
    }
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
    window.fullQuizRaw = quiz;



    if (error || !quiz) {
        console.error("⚠️ AI Quiz Error:", error || "No quiz returned");
        quizContainer.innerHTML = `<p class="error">❌ Failed to generate quiz. Please try again later.</p>`;
        return;
    }

    currentQuizQuestions = quiz.split(/\n(?=\d+\.)/).map(q => q.trim()).filter(q => q.includes("**Answer:**"));
    currentQuestionIndex = 0;
    incorrectTags.clear();
    missedQuestionNotes = [];

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
            const tag = document.getElementById("tagSelector").value;
            quizContainer.innerHTML += `<p style="color: orange;">🔁 Focus review on tag: <strong>${tag}</strong></p><ul>`;

            const uniqueMissedTitles = Array.from(new Set(missedQuestionNotes));
            uniqueMissedTitles.forEach(title => {
                quizContainer.innerHTML += `<li style="color: #ddd;">${title}</li>`;
            });


            quizContainer.innerHTML += `</ul>`;
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
        .replace(/\*\*/g, "")
        .replace(/([a-dA-D]\))/g, "\n$1")
        .trim();

    const reason = answerSection.includes("**Why:**")
        ? answerSection.split("**Why:**")[1].trim()
        : "N/A";

    const correctAnswerRaw = answerSection.split("**Why:**")[0].trim();
    const correctLetterMatch = correctAnswerRaw.match(/^([a-dA-D])/);
    const correctLetter = correctLetterMatch ? correctLetterMatch[1].toLowerCase() : null;

    const correctTextMatch = correctAnswerRaw.match(/`([^`]+)`/g);
    const correctAnswerText = correctTextMatch
        ? correctTextMatch.map(t => t.replace(/[`']/g, "").trim()).join(" ").toLowerCase()
        : "";

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
            <input type="radio" name="choice" value="${letter.toLowerCase()}" data-text="${stripSymbols(text)}">
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

        const userLetter = selected.value;
        const userText = selected.dataset.text.toLowerCase();

        const letterMatches = correctLetter && userLetter === correctLetter;
        const textMatches = correctAnswerText && normalizeWords(userText) === normalizeWords(correctAnswerText);
        const isCorrect = letterMatches || textMatches;

        // Extract title of the note from the raw quiz question
        let noteTitle = "Unknown Note";
        const lines = raw.split("\n");
        for (let line of lines) {
            const match = line.match(/^Note:\s*(.+)/i);
            if (match) {
                noteTitle = match[1].trim();
                break;
            }
        }

        // Try to find matching note
        const matchedNote = window.cachedNotes?.find(n =>
            n.title.toLowerCase() === noteTitle.toLowerCase()
        ) || window.cachedNotes?.find(n =>
            noteTitle.toLowerCase().includes(n.title.toLowerCase())
        );

        if (matchedNote) {
            noteTitle = matchedNote.title;
        }

        if (isCorrect) {
            score++;
            feedback.innerHTML = `<p style="color: lime;">✅ Correct!</p>`;
        } else {
            const noteMatch = correctAnswerRaw.match(/\[Note:\s*(.+?)\]/);
            let noteTitle = noteMatch ? noteMatch[1].trim() : "Unknown Note";

            const matchedNote = window.cachedNotes?.find(n =>
                n.title.toLowerCase() === noteTitle.toLowerCase()
            ) || window.cachedNotes?.find(n =>
                noteTitle.toLowerCase().includes(n.title.toLowerCase())
            );

            if (matchedNote) {
                noteTitle = matchedNote.title;
            }

            if (!reviewQueue.includes(noteTitle)) {
                reviewQueue.push(noteTitle);
                missedQuestionNotes.push(noteTitle); // <-- add to review summary
                addNoteToReview(noteTitle);
            }

            feedback.innerHTML = `
                <p style="color: red;">❌ Incorrect.</p>
                <p><strong style="color: #00ffff;">Correct Answer:</strong> ${correctAnswerRaw}</p>
                <p><strong style="color: #00ffff;">Why:</strong> ${reason}</p>
            `;
        }

        // Send review update to backend
        if (matchedNote?.id) {
            fetch("/.netlify/functions/update-review", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: matchedNote.id,
                    correct: isCorrect
                })
            });
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

function stripSymbols(text) {
    return text.replace(/[`'"‘’“”]/g, "").trim().toLowerCase();
}

function normalizeWords(text) {
    return stripSymbols(text).split(/\s+/).sort().join(" ");
}

function normalizeText(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, "").split("").sort().join("");
}

function addNoteToReview(noteTitle) {
    const reviewList = document.getElementById("reviewList");
    const exists = [...reviewList.querySelectorAll("li")].some(li => li.innerText === noteTitle);
    if (!exists) {
        const li = document.createElement("li");
        li.innerText = noteTitle;
        li.onclick = () => {
            const note = window.cachedNotes?.find(n => n.title === noteTitle);
            if (note) {
                document.getElementById("viewTitle").innerText = note.title;
                document.getElementById("viewContent").innerHTML = note.content;
                document.getElementById("viewTags").innerText = "Tags: " + (note.tags || []).join(", ");
                viewModal.style.display = "flex";
            }
        };
        reviewList.appendChild(li);
    }

    const btn = document.getElementById("reviewToggle");
    const panel = document.getElementById("reviewPanel");
    if (reviewList.children.length > 0) {
        btn.style.display = "block";
    } else {
        btn.style.display = "none";
        panel.classList.add("hidden");
    }
}


// ---------------------------- Init ----------------------------
window.onload = loadNotes;

document.getElementById("subjectFilter").onchange = loadNotes;
document.getElementById("reviewToggle").onclick = () => {
    document.getElementById("reviewPanel").classList.toggle("hidden");
    document.getElementById("subjectFilter").onchange = loadNotes;

};
