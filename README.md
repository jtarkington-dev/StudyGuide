# 📘 StudyGuide

**StudyGuide** is a smart personal learning system that helps you take notes, track what needs to be reviewed, and automatically generate quizzes using AI based on your study tags.


---

## Features

- Create and save structured notes with titles, content, and tags
- Track notes that are due for review using spaced repetition
- "Review Now" box shows you what’s due without digging
- AI-powered quiz generator by topic or tag using OpenRouter + DeepSeek



---

##  How It Works

- Notes are stored in Supabase with a `next_review` date
- When viewing your notes, StudyGuide shows which ones are due
- You can start a quiz by choosing a tag — AI generates the questions



---

## Tech Stack

- **HTML, CSS, JavaScript (Vanilla)**  
- **Supabase** (for note storage + metadata)  
- **OpenRouter + DeepSeek** (for quiz generation AI)  
- **Netlify Functions** (secure backend logic + environment variables)  
- **Netlify Hosting** (global deployment + continuous integration from GitHub)

---

## 🛡️ Security

All sensitive credentials are stored in Netlify’s environment variables.

This includes:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `OPENROUTER_API_KEY`

They are accessed only by serverless backend functions and are never exposed to users.

---

##  Demo Version

A public **demo version** will be deployed separately for portfolio showcasing.  
It includes mock data and does **not** use real keys or AI — just shows off the UI and features.

---

##  TODO / Upcoming Features

- ✅ Filter notes by tag
- ✅ Adaptive quiz logic based on weak areas
- ✅ AI-generated tags + manual tag support
- 🔜 Advanced quiz scoring & analytics

---

## 👨‍💻 Developer

**Jeremy Tarkington**  
🔗 [Portfolio Website](https://jtarkington.dev)  
🐙 [GitHub](https://github.com/jtarkington-dev)

---


