// Kintamieji
let reactionStartTime;
let reactionTimerInterval;
let quizTimeLeft;
let quizTimerInterval;
let bossTimeLeft;
let bossTimerInterval;
let currentQuestionIndex = 0;
let bestReactionTime = localStorage.getItem('bestReactionTime') || Infinity;

// Elementai
const screens = {
    start: document.getElementById('start-screen'),
    reaction: document.getElementById('reaction-screen'),
    quiz: document.getElementById('quiz-screen'),
    boss: document.getElementById('boss-screen'),
    announcer: document.getElementById('announcer-screen'),
    victory: document.getElementById('victory-screen')
};

const movingTarget = document.getElementById('moving-target');
const reactionTimerDisplay = document.getElementById('reaction-timer');
const quizTimerDisplay = document.getElementById('quiz-timer-display');
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const announcerImg = document.getElementById('announcer-img');
const announcerText = document.getElementById('announcer-text');

function showScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');
}

// --- GARSO PRANEŠĖJAS ---
function speak(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // Sustabdo ankstesnį kalbėjimą
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'lt-LT'; 
        utterance.rate = 1.1;
        utterance.pitch = 0.8; // Žemesnis, "retro" balsas
        window.speechSynthesis.speak(utterance);
    }
}

// Pranešėjo ekrano iškvietimas
function triggerAnnouncer(type, message) {
    if (type === 'fail') {
        announcerImg.src = 'fail.png';
        announcerText.innerText = "NEPAVYKO!";
        announcerText.className = "neon-text-pink";
        speak("Nepavyko. Bandyk dar kartą!");
    } else if (type === 'success') {
        announcerImg.src = 'success.png';
        announcerText.innerText = "NAUJAS REKORDAS!";
        announcerText.className = "neon-text";
        speak("Nuostabu! Naujas rekordas!");
    }
    showScreen('announcer');
}

// --- 1 FASE: REAKCIJOS ŽAIDIMAS ---
function startReactionGame() {
    showScreen('reaction');
    moveTargetRandomly();
    
    reactionStartTime = Date.now();
    reactionTimerInterval = setInterval(() => {
        let timePassed = (Date.now() - reactionStartTime) / 1000;
        reactionTimerDisplay.innerText = `Laikas: ${timePassed.toFixed(2)}s`;
    }, 50);

    window.targetMovementInterval = setInterval(moveTargetRandomly, 800);
}

function moveTargetRandomly() {
    const maxX = window.innerWidth - movingTarget.clientWidth - 20;
    const maxY = window.innerHeight - movingTarget.clientHeight - 20;
    movingTarget.style.left = `${Math.max(20, Math.floor(Math.random() * maxX))}px`;
    movingTarget.style.top = `${Math.max(20, Math.floor(Math.random() * maxY))}px`;
}

function hitTarget() {
    clearInterval(reactionTimerInterval);
    clearInterval(window.targetMovementInterval);
    
    let reactionTime = (Date.now() - reactionStartTime) / 1000;
    
    // Laiko skaičiavimas viktorinai (Kuo greičiau, tuo daugiau laiko)
    let timeForQuiz = Math.max(5, 20 - Math.floor(reactionTime));
    
    // Rekordo tikrinimas
    if (reactionTime < bestReactionTime || reactionTime < 1.0) {
        bestReactionTime = reactionTime;
        localStorage.setItem('bestReactionTime', bestReactionTime);
        triggerAnnouncer('success');
        // Po 2.5s tęsiame žaidimą
        setTimeout(() => startQuiz(timeForQuiz), 2500);
    } else {
        // Jei ne rekordas, tiesiog tęsiame
        setTimeout(() => startQuiz(timeForQuiz), 500);
    }
}

// --- 2 FASE: VIKTORINA ---
function startQuiz(timeForQuiz) {
    showScreen('quiz');
    quizTimeLeft = timeForQuiz;
    currentQuestionIndex = 0;
    loadQuestion();
    
    quizTimerDisplay.innerText = `Likęs laikas: ${quizTimeLeft}s`;
    quizTimerInterval = setInterval(() => {
        quizTimeLeft--;
        quizTimerDisplay.innerText = `Likęs laikas: ${quizTimeLeft}s`;
        
        if (quizTimeLeft <= 0) {
            clearInterval(quizTimerInterval);
            triggerAnnouncer('fail');
        }
    }, 1000);
}

function loadQuestion() {
    // Jei klausimai baigėsi - kviečiame BOSĄ
    if (currentQuestionIndex >= quizQuestions.length) {
        clearInterval(quizTimerInterval);
        startBossFight();
        return;
    }

    const currentQ = quizQuestions[currentQuestionIndex];
    questionText.innerText = currentQ.question;
    optionsContainer.innerHTML = ''; 

    currentQ.options.forEach((option, index) => {
        const btn = document.createElement('button');
        btn.classList.add('option-btn');
        btn.innerText = option;
        btn.onclick = () => checkAnswer(index, currentQ.answer);
        optionsContainer.appendChild(btn);
    });
}

function checkAnswer(selectedIndex, correctIndex) {
    if (selectedIndex === correctIndex) {
        speak("Teisingai");
        currentQuestionIndex++;
        loadQuestion();
    } else {
        clearInterval(quizTimerInterval);
        triggerAnnouncer('fail');
    }
}

// --- 3 FASE: FINAL BOSS ---
function startBossFight() {
    showScreen('boss');
    speak("Dėmesio. Finalinis bosas!");
    
    bossTimeLeft = 5;
    document.getElementById('boss-timer').innerText = bossTimeLeft;
    
    // Boso klausimas (galite įkelti ir į questions.js, bet palikau hardcoded, kad būtų unikalus)
    const bossQuestion = "Kas laimėjo paskutinį NBA čempionų titulą?";
    const bossOptions = ["Boston Celtics", "LA Lakers", "Golden State Warriors", "Denver Nuggets"];
    const bossCorrect = 0; // Celtics
    
    const bossOptionsContainer = document.getElementById('boss-options');
    bossOptionsContainer.innerHTML = '';
    
    bossOptions.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.classList.add('option-btn');
        btn.innerText = opt;
        btn.onclick = () => {
            if (idx === bossCorrect) {
                winGame();
            } else {
                clearInterval(bossTimerInterval);
                triggerAnnouncer('fail');
            }
        };
        bossOptionsContainer.appendChild(btn);
    });

    bossTimerInterval = setInterval(() => {
        bossTimeLeft--;
        document.getElementById('boss-timer').innerText = bossTimeLeft;
        if (bossTimeLeft <= 0) {
            clearInterval(bossTimerInterval);
            triggerAnnouncer('fail');
        }
    }, 1000);
}

// --- 4 FASE: PERGALĖ ---
function winGame() {
    clearInterval(bossTimerInterval);
    showScreen('victory');
    
    // Grojame MP3 failą
    const audio = document.getElementById('victory-audio');
    audio.volume = 0.8;
    audio.play().catch(e => console.log("Audio autoplay užblokuotas, reikia paspaudimo", e));
    
    // Pranešėjas
    speak("Nepakartojama! Tu laimėjai! Tu esi legendinis MVP!");
}
