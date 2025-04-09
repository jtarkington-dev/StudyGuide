const modal = document.getElementById("noteModal");
const viewModal = document.getElementById("viewModal");
const notesContainer = document.getElementById("notesContainer");

document.getElementById("newNoteBtn").onclick = () => {
    modal.style.display = "flex";
};

document.getElementById("saveBtn").onclick = saveNote;

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
      `;
        card.onclick = () => {
            document.getElementById("viewTitle").innerText = note.title || "Untitled Note";
            document.getElementById("viewContent").innerText = note.content;
            document.getElementById("viewTags").innerText = "Tags: " + (note.tags || "none");
            viewModal.style.display = "flex";
        };
        container.appendChild(card);

        const reviewDue = new Date(note.next_review);
        if (reviewDue <= now) {
            const li = document.createElement("li");
            li.innerText = note.title || 'Untitled Note';
            li.onclick = () => {
                document.getElementById("viewTitle").innerText = note.title || "Untitled Note";
                document.getElementById("viewContent").innerText = note.content;
                document.getElementById("viewTags").innerText = "Tags: " + (note.tags || "none");
                viewModal.style.display = "flex";
            };
            reviewList.appendChild(li);
        }
    });
}

document.getElementById("startQuizBtn").onclick = async () => {
    const modal = document.getElementById("quizTagModal");
    const selector = document.getElementById("tagSelector");
    selector.innerHTML = "";

    const { data: notes, error } = await supabase.from('notes').select('tags');

    const tagSet = new Set();
    if (!error && notes) {
        notes.forEach(n => n.tags.forEach(t => tagSet.add(t)));
    }

    if (tagSet.size === 0) {
        selector.innerHTML = '<option disabled>No tags found</option>';
    } else {
        tagSet.forEach(tag => {
            const opt = document.createElement("option");
            opt.value = tag;
            opt.innerText = tag;
            selector.appendChild(opt);
        });
    }

    modal.style.display = "flex";
};

document.getElementById("cancelQuizBtn").onclick = () => {
    document.getElementById("quizTagModal").style.display = "none";
};



window.onload = loadNotes;

document.getElementById("viewCloseBtn").addEventListener("click", closeViewModal);
document.getElementById("createCloseBtn").addEventListener("click", closeModal);
