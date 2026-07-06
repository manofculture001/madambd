/**
 * THE ULTIMATE PROTOCOL — SYSTEM ENGINE INITIALIZATION
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const bdayCanvas = document.getElementById('birthdayCanvas');
const bdayCtx = bdayCanvas.getContext('2d');

const WIDTH = 400;
const HEIGHT = 650;
canvas.width = WIDTH;
canvas.height = HEIGHT;

const GAME_STATES = { COUNTDOWN: 0, ENTRANCE: 1, MENU: 2, PLAYING: 3, GAMEOVER: 4 };
let currentState = GAME_STATES.COUNTDOWN;

// --- OPTIMIZED HIGH-SPEED PHYSICS MATRIX ---
let difficultyLevel = 2; 
const difficultySettings = {
   1: { speed: 2.5, spawnRate: 120, gap: 190, gravity: 0.32, jump: -6.2,  oscAmp: 0 },   
    2: { speed: 3.2, spawnRate: 100, gap: 170, gravity: 0.42, jump: -7.5,  oscAmp: 0 },   
    3: { speed: 3.3, spawnRate: 90,  gap: 155, gravity: 0.45, jump: -7.8,  oscAmp: 40 },
};

let score = 0;
let highScore = parseInt(localStorage.getItem('stickman_high_score')) || 0;
let currentRoundLetterUnlocked = false; 

// Trackers
let jetpackFlameParticles = [];
let celebrationParticles = [];
let ambientFloatingComments = [];
let currentObstacles = [];
let obstacleTimer = 0;
let globalCommentTimer = 0; 
let targetNotificationTimeout = null;
let bgTargetDisplayTimeout = null;
let activeLetterRevealTimeout = null;

// Audio components
let audioCtx = null;
let activeMusicInterval = null;
let birthdayMelodyTimeout = null;
let currentMusicSequenceStep = 0;
let isBdayMusicPlaying = false;
let celebrationAnimationId = null;
let candleIsBlownOut = false;

const sarcasticPool = [
    "heh, my bro plays better", "Ksto chudel dekhya, saato lagdirah", 
    "itni gori kaise, powder ka dabba khatam kiya hei kya", "A rock has faster reflexes.", 
    "yeti rmro snga books padhey, top hniskthyo", "Is this your absolute best?", 
    "", "", 
    "", ""
];

const premiumColors = ['#ffd700', '#ffb6c1', '#f5f5dc', '#ffffff', '#e0e0e0'];

// Stickman structural metrics - Scaled up base values to match snappier engine
const stickman = {
    x: -50, y: HEIGHT - 140, targetX: WIDTH / 2, radius: 12,
    vy: 0, gravity: 0.62, jumpStrength: -9.2, width: 30, height: 75, hasJetpack: false
};

const DOM = {
    countdown: document.getElementById('countdown-screen'),
    speechBubbleContainer: document.getElementById('speech-bubble-container'),
    speechBubble: document.getElementById('speech-bubble'),
    liveHeader: document.getElementById('live-header'),
    scoreDisplay: document.getElementById('score-display'),
    highscoreDisplay: document.getElementById('highscore-display'),
    menuModal: document.getElementById('menu-modal'),
    menuTitle: document.getElementById('menu-title'),
    menuDesc: document.getElementById('menu-desc'),
    menuBtn: document.getElementById('menu-btn'),
    menuLetterBtn: document.getElementById('menu-letter-btn'),
    letterScreen: document.getElementById('letter-screen'),
    closeLetterBtn: document.getElementById('close-letter-btn'),
    verifyStage: document.getElementById('verify-stage'),
    unfoldedStage: document.getElementById('unfolded-stage'),
    identityInput: document.getElementById('identity-input'),
    submitIdentityBtn: document.getElementById('submit-identity-btn'),
    verifyError: document.getElementById('verify-error'),
    letterTextContainer: document.getElementById('letter-text-container'),
    unlockBgNotif: document.getElementById('unlock-bg-notif'),
    targetGoalHud: document.getElementById('target-goal-hud'),
    flame: document.querySelector('.flame-element'),
    flameHint: document.querySelector('.flame-hint'),
    diffSelect: document.getElementById('difficulty-select')
};

DOM.highscoreDisplay.innerText = highScore;

const initAudio = () => {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
};

const playTone = (freq, duration, type = 'sine', gainStart = 0.1) => {
    if (!audioCtx || audioCtx.state === 'suspended') return;
    try {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(gainStart, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration);
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch(e) {}
};

const playMusicBoxNote = (freq, duration) => {
    if (!audioCtx || audioCtx.state === 'suspended') return;
    try {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration * 1.5);
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration * 1.5);
    } catch(e) {}
};

const startGameMusicLoop = () => {
    stopMusicLoops();
    currentMusicSequenceStep = 0;
    const progression = [146.83, 164.81, 130.81, 110.00];
    activeMusicInterval = setInterval(() => {
        if (currentState === GAME_STATES.PLAYING) {
            const baseNote = progression[Math.floor(currentMusicSequenceStep / 2) % progression.length];
            const note = (currentMusicSequenceStep % 2 === 0) ? baseNote : baseNote * 1.5;
            playTone(note, 0.22, 'triangle', 0.04);
            currentMusicSequenceStep++;
        }
    }, 280);
};

const playBirthdayCelebrationMusic = () => {
    stopMusicLoops();
    isBdayMusicPlaying = true;
    const melody = [
        261.63, 261.63, 293.66, 261.63, 349.23, 329.63,
        261.63, 261.63, 293.66, 261.63, 392.00, 349.23
    ];
    const rhythm = [400, 200, 600, 600, 600, 1000, 400, 200, 600, 600, 600, 1000];
    let noteIdx = 0;
    
    const scheduleNextNote = () => {
        if (!isBdayMusicPlaying) return;
        playMusicBoxNote(melody[noteIdx], rhythm[noteIdx] / 1000 - 0.04);
        birthdayMelodyTimeout = setTimeout(() => {
            noteIdx = (noteIdx + 1) % melody.length;
            scheduleNextNote();
        }, rhythm[noteIdx]);
    };
    scheduleNextNote();
};

const stopMusicLoops = () => {
    isBdayMusicPlaying = false;
    if (activeMusicInterval) { clearInterval(activeMusicInterval); activeMusicInterval = null; }
    if (birthdayMelodyTimeout) { clearTimeout(birthdayMelodyTimeout); birthdayMelodyTimeout = null; }
};

const initSequence = () => {
    let count = 3;
    const timer = setInterval(() => {
        count--;
        if (count > 0) { DOM.countdown.innerText = count; } else {
            clearInterval(timer); DOM.countdown.style.opacity = '0';
            setTimeout(() => { DOM.countdown.classList.add('hidden'); currentState = GAME_STATES.ENTRANCE; }, 500);
        }
    }, 1000);
};

const showDialogue = (text, delay = 0) => {
    DOM.speechBubble.classList.remove('visible');
    setTimeout(() => { DOM.speechBubble.innerText = text; DOM.speechBubble.classList.add('visible'); }, delay);
};

const triggerMenuModal = (title, desc, btnText, showLetterOption) => {
    DOM.menuTitle.innerText = title; 
    DOM.menuDesc.innerText = desc; 
    DOM.menuBtn.innerText = btnText;
    DOM.menuModal.classList.remove('hidden'); 
    DOM.menuLetterBtn.classList.toggle('hidden', !showLetterOption);
};

class Obstacle {
    constructor(x) {
        const settings = difficultySettings[difficultyLevel];
        this.x = x; 
        this.width = 60; 
        this.gap = settings.gap;
        this.speed = settings.speed;
        this.oscAmp = settings.oscAmp;
        this.oscSpeed = 0.035; // Accelerated oscillation speed
        this.seedValue = Math.random() * Math.PI * 2; 
        
        this.baseCenterY = Math.floor(Math.random() * (HEIGHT - this.gap - 180)) + 90 + this.gap / 2;
        this.centerY = this.baseCenterY;
        
        this.calculateHeights();
        this.passed = false;
    }
    
    calculateHeights() {
        this.topHeight = this.centerY - this.gap / 2;
        this.bottomHeight = HEIGHT - (this.centerY + this.gap / 2);
    }

    update() { 
        this.x -= this.speed; 
        if (this.oscAmp > 0) {
            this.centerY = this.baseCenterY + Math.sin(obstacleTimer * this.oscSpeed + this.seedValue) * this.oscAmp;
            this.calculateHeights();
        }
    }

    draw() {
        ctx.save();
        ctx.fillStyle = '#050505';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        
        ctx.fillRect(this.x, 0, this.width, this.topHeight);
        ctx.strokeRect(this.x, -2, this.width, this.topHeight + 2);
        
        ctx.fillRect(this.x, HEIGHT - this.bottomHeight, this.width, this.bottomHeight);
        ctx.strokeRect(this.x, HEIGHT - this.bottomHeight, this.width, this.bottomHeight + 2);
        ctx.restore();
    }

    collidesWith(p) {
        const r = p.radius - 2;
        if (p.x + r > this.x && p.x - r < this.x + this.width) {
            if (p.y - r < this.topHeight || p.y + r > HEIGHT - this.bottomHeight) {
                return true;
            }
        }
        return false;
    }
}

const spawnFloatingComment = (isCrashEvent = false, crashX = 0, crashY = 0) => {
    const textStr = sarcasticPool[Math.floor(Math.random() * sarcasticPool.length)];
    if (isCrashEvent) {
        ambientFloatingComments.push({
            text: textStr, x: Math.max(40, Math.min(WIDTH - 240, crashX - 40)), y: crashY - 25,
            alpha: 1, maxLife: 240, isCrash: true, vy: -0.15
        });
    } else {
        ambientFloatingComments.push({
            text: textStr, x: Math.random() * (WIDTH - 180) + 20, y: HEIGHT - 20,
            alpha: 0, maxLife: 260, isCrash: false, vy: -0.55, waveOffset: Math.random() * 100
        });
    }
};

const processFloatingComments = () => {
    for (let i = ambientFloatingComments.length - 1; i >= 0; i--) {
        let c = ambientFloatingComments[i];
        c.maxLife--; c.y += c.vy;
        
        if (!c.isCrash) {
            c.x += Math.sin(c.maxLife * 0.02 + c.waveOffset) * 0.2;
            if (c.maxLife > 210) c.alpha += 0.04;
            if (c.maxLife <= 40) c.alpha -= 0.02;
        } else {
            if (c.maxLife <= 30) c.alpha -= 0.04;
        }

        if (c.maxLife <= 0 || c.alpha <= 0) { ambientFloatingComments.splice(i, 1); continue; }

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(c.alpha, 1));
        if (c.isCrash) {
            ctx.font = 'bold 15px monospace'; ctx.fillStyle = '#ff4466';
            ctx.fillText(`[×] ${c.text}`, c.x, c.y);
        } else {
            ctx.font = '700 13px monospace'; ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.fillText(c.text, c.x, c.y);
        }
        ctx.restore();
    }
};

const drawStickman = (x, y, stateModifiers) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.fillStyle = '#050505';
    
    ctx.beginPath(); ctx.arc(0, -20, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, 20); ctx.stroke();

    ctx.beginPath();
    if (stateModifiers.hasJetpack && currentState === GAME_STATES.PLAYING) {
        ctx.moveTo(0, -5); ctx.lineTo(12, 2); ctx.lineTo(-2, 8);
    } else {
        ctx.moveTo(0, -5); ctx.lineTo(-10, 8);
        ctx.moveTo(0, -5); ctx.lineTo(10, 8);
    }
    ctx.stroke();

    ctx.beginPath();
    if (stateModifiers.hasJetpack && currentState === GAME_STATES.PLAYING) {
        let swing = Math.sin(Date.now() * 0.12) * 4;
        ctx.moveTo(0, 20); ctx.lineTo(-6 + swing, 38); ctx.lineTo(-4 + swing, 52);
        ctx.moveTo(0, 20); ctx.lineTo(6 - swing, 36); ctx.lineTo(8 - swing, 50);
    } else if (currentState === GAME_STATES.ENTRANCE) {
        let step = Math.sin(Date.now() * 0.015) * 14;
        ctx.moveTo(0, 20); ctx.lineTo(-step, 38); ctx.lineTo(-step * 1.2, 54);
        ctx.moveTo(0, 20); ctx.lineTo(step, 38); ctx.lineTo(step * 1.2, 54);
    } else {
        ctx.moveTo(0, 20); ctx.lineTo(-8, 38); ctx.lineTo(-10, 55);
        ctx.moveTo(0, 20); ctx.lineTo(8, 38); ctx.lineTo(10, 55);
    }
    ctx.stroke();

    if (stateModifiers.hasJetpack) {
        ctx.fillStyle = '#333333'; ctx.strokeStyle = '#666666'; ctx.lineWidth = 1.5;
        ctx.fillRect(-16, -5, 8, 22); ctx.strokeRect(-16, -5, 8, 22);
    }
    ctx.restore();
};

const spawnFlameParticles = (x, y) => {
    for(let i=0; i<3; i++) {
        jetpackFlameParticles.push({
            x: x - 12, y: y + 5, vx: -Math.random() * 2 - 1, vy: Math.random() * 2 + 1, radius: Math.random() * 4 + 2, alpha: 1, color: Math.random() > 0.4 ? '#ff3333' : '#ff9900'
        });
    }
};

const processParticles = () => {
    for (let i = jetpackFlameParticles.length - 1; i >= 0; i--) {
        let p = jetpackFlameParticles[i]; p.x += p.vx; p.y += p.vy; p.alpha -= 0.04;
        if (p.alpha <= 0) { jetpackFlameParticles.splice(i, 1); } else {
            ctx.save(); ctx.globalAlpha = p.alpha; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        }
    }
};

const initCelebrationFX = () => {
    celebrationParticles = [];
    for(let i=0; i<65; i++) {
        celebrationParticles.push({
            type: 'confetti', x: Math.random() * bdayCanvas.width, y: Math.random() * -bdayCanvas.height, 
            vx: Math.random() * 1.4 - 0.7, vy: Math.random() * 2 + 1.2, w: Math.random() * 5 + 3, h: Math.random() * 8 + 5, 
            color: premiumColors[Math.floor(Math.random() * premiumColors.length)], rotation: Math.random() * Math.PI, rSpeed: Math.random() * 0.04 - 0.02
        });
    }
};

const processCelebrationFX = () => {
    bdayCtx.clearRect(0, 0, bdayCanvas.width, bdayCanvas.height);
    celebrationParticles.forEach(p => {
        p.y += p.vy; p.x += p.vx; p.rotation += p.rSpeed; if (p.y > bdayCanvas.height) p.y = -20;
        bdayCtx.save(); bdayCtx.translate(p.x, p.y); bdayCtx.rotate(p.rotation); bdayCtx.fillStyle = p.color; bdayCtx.fillRect(-p.w/2, -p.h/2, p.w, p.h); bdayCtx.restore();
    });
    if (!DOM.letterScreen.classList.contains('hidden')) {
        celebrationAnimationId = requestAnimationFrame(processCelebrationFX);
    }
};

const resetGameData = () => {
    score = 0; DOM.scoreDisplay.innerText = score; currentObstacles = []; ambientFloatingComments = []; obstacleTimer = 0; globalCommentTimer = 0;
    currentRoundLetterUnlocked = false; 
    
    if (targetNotificationTimeout) { clearTimeout(targetNotificationTimeout); targetNotificationTimeout = null; }
    if (bgTargetDisplayTimeout) { clearTimeout(bgTargetDisplayTimeout); bgTargetDisplayTimeout = null; }
    
    DOM.unlockBgNotif.classList.add('hidden');
    DOM.unlockBgNotif.style.opacity = '1';
    
    const config = difficultySettings[difficultyLevel];
    stickman.gravity = config.gravity;
    stickman.jumpStrength = config.jump;
    
    stickman.y = HEIGHT / 2; stickman.vy = 0; 
    DOM.speechBubbleContainer.style.top = `${stickman.y - 75}px`;
    DOM.speechBubble.classList.remove('visible');
};

const masterLoop = () => {
    ctx.save();
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    
    switch(currentState) {
        case GAME_STATES.COUNTDOWN: drawStickman(stickman.x, stickman.y, { hasJetpack: false }); break;
        case GAME_STATES.ENTRANCE:
            if (stickman.x < stickman.targetX) { 
                stickman.x += 2.5; 
            } else {
                currentState = GAME_STATES.MENU;
                DOM.speechBubbleContainer.style.top = `${stickman.y - 75}px`;
                showDialogue("Oh look, you actually loaded the link. Give me a second...", 100);
                setTimeout(() => {
                    stickman.hasJetpack = true; showDialogue("Gravity engine adjusted. Hit 10 points to reveal reality.", 1500);
                    setTimeout(() => {
                        triggerMenuModal("SYSTEM INITIALIZED", "Control parameters scale directly with real-time hardware tracking.", "Launch Jetpack", currentRoundLetterUnlocked);
                    }, 1400);
                }, 1200);
            }
            drawStickman(stickman.x, stickman.y, { hasJetpack: false });
            break;
        case GAME_STATES.MENU: drawStickman(stickman.x, stickman.y, { hasJetpack: stickman.hasJetpack }); break;
        case GAME_STATES.PLAYING:
            const settings = difficultySettings[difficultyLevel];
            stickman.vy += stickman.gravity; stickman.y += stickman.vy;
            
            DOM.speechBubbleContainer.style.top = `${stickman.y - 75}px`;

            if (stickman.y > HEIGHT - 55 || stickman.y < 20) { handleCrash(); break; }

            obstacleTimer++;
            globalCommentTimer++;
            
            if (obstacleTimer % settings.spawnRate === 0) { currentObstacles.push(new Obstacle(WIDTH)); }
            if (globalCommentTimer % 110 === 0) { spawnFloatingComment(); }

            let localCollisionDetected = false;
            for (let i = currentObstacles.length - 1; i >= 0; i--) {
                let obs = currentObstacles[i]; obs.update(); obs.draw();
                if (obs.collidesWith(stickman)) { handleCrash(); localCollisionDetected = true; break; }
                if (!obs.passed && obs.x + obs.width < stickman.x) {
                    obs.passed = true; score++; DOM.scoreDisplay.innerText = score;
                    if (score === 10) {
                        currentRoundLetterUnlocked = true;
                        DOM.unlockBgNotif.classList.remove('hidden');
                        playTone(523.25, 0.3, 'sine', 0.15);
                        
                        targetNotificationTimeout = setTimeout(() => {
                            DOM.unlockBgNotif.style.opacity = '0';
                            setTimeout(() => {
                                DOM.unlockBgNotif.classList.add('hidden');
                                DOM.unlockBgNotif.style.opacity = '1';
                            }, 400);
                        }, 2500);
                    }
                    if (score > highScore) { highScore = score; localStorage.setItem('stickman_high_score', highScore); DOM.highscoreDisplay.innerText = highScore; }
                }
                if (obs.x + obs.width < 0) currentObstacles.splice(i, 1);
            }
            
            if (localCollisionDetected) break;

            processFloatingComments(); 
            processParticles(); 
            drawStickman(stickman.x, stickman.y, { hasJetpack: true });
            break;
        case GAME_STATES.GAMEOVER: 
            currentObstacles.forEach(obs => obs.draw()); 
            processFloatingComments();
            drawStickman(stickman.x, stickman.y, { hasJetpack: true }); 
            break;
    }
    ctx.restore();
    requestAnimationFrame(masterLoop);
};

const handleCrash = () => {
    currentState = GAME_STATES.GAMEOVER; stopMusicLoops();
    spawnFloatingComment(true, stickman.x, stickman.y);
    playTone(110, 0.45, 'sawtooth', 0.25);
    
    setTimeout(() => {
        triggerMenuModal("CRASH SIGNATURE RECORDED", "Unstable engine feedback looping. Recalibrate vectors.", "Re-Calibrate System", currentRoundLetterUnlocked);
    }, 900);
};

const letterParagraphs = [
    "To witchy madam ji,",
    "Pretty unbelivable but koi koi madam 20 rey aajha dekhi ta, i know pretty unbelivable right, like aren't u in your 50's already.",
    "emoji ok ok chill , bd ko din ho testo saaro pni nasunau aajha hjr lai. its definately not cause i'm scared of being cursed at all night either.",
    "Well jokes aside madam ji, many many happy returns of the day. genuinely hope u have the best years ahead and just chill, dheroi mean pni hunu prya xainw",
    "Happy Birthday. I hope today brings you even a fraction of the immense joy you give to everyone around you. Always and forever."
];

const executeLetterByLetterReveal = () => {
    DOM.letterTextContainer.innerHTML = "";
    if (activeLetterRevealTimeout) clearTimeout(activeLetterRevealTimeout);
    
    let paragraphIndex = 0;
    
    const buildNextParagraph = () => {
        if (paragraphIndex >= letterParagraphs.length) return;
        
        const pElement = document.createElement('div');
        pElement.className = 'letter-p-block';
        DOM.letterTextContainer.appendChild(pElement);
        
        const textString = letterParagraphs[paragraphIndex];
        let charIndex = 0;
        
        const typeNextChar = () => {
            if (charIndex < textString.length) {
                const charSpan = document.createElement('span');
                charSpan.className = 'letter-char';
                let currentChar = textString[charIndex];
                charSpan.innerText = currentChar;
                pElement.appendChild(charSpan);
                
                setTimeout(() => { charSpan.classList.add('revealed'); }, 10);
                charIndex++;
                
                let nextDelay = 30;
                if (currentChar === '.' || currentChar === '!') nextDelay = 500;
                else if (currentChar === ',') nextDelay = 220;
                
                activeLetterRevealTimeout = setTimeout(typeNextChar, nextDelay);
            } else {
                paragraphIndex++;
                DOM.letterTextContainer.scrollTop = DOM.letterTextContainer.scrollHeight;
                activeLetterRevealTimeout = setTimeout(buildNextParagraph, 700);
            }
        };
        typeNextChar();
    };
    buildNextParagraph();
};

DOM.menuBtn.addEventListener('click', () => {
    initAudio();
    if (audioCtx && audioCtx.state === 'suspended') { audioCtx.resume(); }
    
    difficultyLevel = parseInt(DOM.diffSelect.value);
    DOM.menuModal.classList.add('hidden');
    
    if (currentState === GAME_STATES.MENU || currentState === GAME_STATES.GAMEOVER) {
        resetGameData();
        startGameMusicLoop();
        currentState = GAME_STATES.PLAYING;
        
        DOM.liveHeader.style.opacity = '1';
        
        DOM.targetGoalHud.classList.remove('hidden');
        DOM.targetGoalHud.style.opacity = '1';
        
        bgTargetDisplayTimeout = setTimeout(() => {
            DOM.targetGoalHud.style.opacity = '0';
            setTimeout(() => { DOM.targetGoalHud.classList.add('hidden'); }, 600);
        }, 3000);
    }
});

DOM.menuLetterBtn.addEventListener('click', () => {
    stopMusicLoops(); 
    if(celebrationAnimationId) cancelAnimationFrame(celebrationAnimationId);
    if(activeLetterRevealTimeout) clearTimeout(activeLetterRevealTimeout);
    
    DOM.verifyStage.classList.remove('hidden'); 
    DOM.unfoldedStage.classList.add('hidden'); 
    DOM.verifyError.classList.add('hidden'); 
    DOM.unfoldedStage.classList.remove('cake-shifted'); 
    DOM.letterTextContainer.innerHTML = ""; 
    DOM.identityInput.value = "";
    candleIsBlownOut = false;
    
    DOM.flame.style.opacity = '1';
    DOM.flame.style.transform = 'scale(1)';
    DOM.flameHint.classList.remove('hidden');
    
    DOM.letterScreen.classList.remove('hidden'); 
    bdayCanvas.width = window.innerWidth; bdayCanvas.height = window.innerHeight;
    void DOM.letterScreen.offsetWidth; 
    DOM.letterScreen.classList.add('visible');
});

DOM.submitIdentityBtn.addEventListener('click', () => {
    if (DOM.identityInput.value.trim().toLowerCase() === "witch") {
        DOM.verifyStage.classList.add('hidden');
        DOM.unfoldedStage.classList.remove('hidden');
        initCelebrationFX(); 
        processCelebrationFX(); 
        playBirthdayCelebrationMusic();
    } else {
        DOM.verifyError.classList.remove('hidden'); playTone(140, 0.15, 'sawtooth', 0.2);
    }
});

DOM.flame.addEventListener('click', () => {
    if (candleIsBlownOut) return;
    candleIsBlownOut = true;
    
    DOM.flameHint.classList.add('hidden');
    DOM.flame.style.opacity = '0';
    DOM.flame.style.transform = 'scale(0) translateY(-15px)';
    DOM.flame.style.transition = 'all 0.6s ease';
    
    playTone(220, 0.8, 'triangle', 0.05);
    
    setTimeout(() => {
        DOM.unfoldedStage.classList.add('cake-shifted');
        setTimeout(() => { executeLetterByLetterReveal(); }, 600);
    }, 400);
});

DOM.closeLetterBtn.addEventListener('click', () => {
    stopMusicLoops(); 
    if(celebrationAnimationId) cancelAnimationFrame(celebrationAnimationId);
    if(activeLetterRevealTimeout) clearTimeout(activeLetterRevealTimeout);
    DOM.letterScreen.classList.remove('visible');
    setTimeout(() => { DOM.letterScreen.classList.add('hidden'); }, 300);
});

window.addEventListener('resize', () => { 
    if (!DOM.letterScreen.classList.contains('hidden')) { 
        bdayCanvas.width = window.innerWidth; bdayCanvas.height = window.innerHeight; 
    } 
});

const triggerJumpAction = (e) => { 
    if (currentState === GAME_STATES.PLAYING) { 
        if (e.cancelable) e.preventDefault(); 
        stickman.vy = stickman.jumpStrength; 
        spawnFlameParticles(stickman.x, stickman.y); 
        playTone(390, 0.1, 'triangle', 0.12); 
    } 
};

const handleFirstInteraction = (e) => {
    initAudio();
    if (audioCtx && audioCtx.state === 'suspended') { audioCtx.resume(); }
    triggerJumpAction(e);
};

window.addEventListener('keydown', (e) => { if (e.code === 'Space') handleFirstInteraction(e); });
canvas.addEventListener('touchstart', handleFirstInteraction, { passive: false });
canvas.addEventListener('mousedown', handleFirstInteraction);

window.addEventListener('DOMContentLoaded', () => { initSequence(); masterLoop(); });