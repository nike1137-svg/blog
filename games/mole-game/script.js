"use strict";

/* =========================================================
   찍찍이 잡기 - 게임 로직
   규칙: 9칸 중 무작위 한 칸에 찍찍이(🐭) 등장 → 사라지기 전에
        클릭(터치)해서 잡으면 +1점. 제한시간 30초 뒤 결과 표시.
        시간이 갈수록 지속시간이 짧아져(빨라져) 어려워집니다.
        가끔 고양이(🐱)가 등장하며, 고양이를 누르면 -1점 감점!
   ========================================================= */

// ---- 설정값 (원하면 이 숫자만 바꾸면 됩니다) ----
const CONFIG = {
  GAME_TIME: 30,          // 전체 제한시간 (초)
  LIFESPAN_START: 1200,   // 초반 찍찍이 지속시간 (ms)
  LIFESPAN_END: 600,      // 후반 찍찍이 지속시간 (ms)
  GAP_MIN: 250,           // 등장 사이 최소 간격 (ms)
  GAP_MAX: 550,           // 등장 사이 최대 간격 (ms)
  RUSH_AT: 10,            // 남은 시간이 이 값 이하면 '막판' 빨강 배너 (초)
  CAT_CHANCE: 0.22,       // 고양이가 등장할 확률 (0~1). 0.22 = 약 22%
  CAT_PENALTY: 1,         // 고양이를 눌렀을 때 깎이는 점수
  MOUSE_EMOJI: "🐭",      // 찍찍이(쥐) 이모지
  CAT_EMOJI: "🐱",        // 고양이 이모지
  FLASH_MS: 900,          // 고양이 감점 알림 배너 표시 시간 (ms)
};

// ---- DOM 참조 ----
const el = {
  score: document.getElementById("score-value"),
  time: document.getElementById("time-value"),
  statScore: document.getElementById("stat-score"),
  statTime: document.getElementById("stat-time"),
  timeFill: document.getElementById("time-fill"),
  banner: document.getElementById("state-banner"),
  board: document.getElementById("board"),
  holes: Array.from(document.querySelectorAll(".hole")),

  startScreen: document.getElementById("start-screen"),
  resultScreen: document.getElementById("result-screen"),
  startBtn: document.getElementById("start-btn"),
  restartBtn: document.getElementById("restart-btn"),

  resultEmoji: document.getElementById("result-emoji"),
  resultTitle: document.getElementById("result-title"),
  resultScore: document.getElementById("result-score"),
  resultDesc: document.getElementById("result-desc"),
};

// ---- 게임 상태 ----
let state = null;

function newState() {
  return {
    score: 0,
    timeLeft: CONFIG.GAME_TIME,
    running: false,
    activeHole: -1,     // 현재 무언가 떠 있는 칸 (-1이면 없음)
    activeType: "",     // 떠 있는 것의 종류: "mouse" | "cat"
    lastHole: -1,       // 직전 칸 (연속 중복 방지용)
    lastTick: 0,
    clockTimer: null,       // 카운트다운 인터벌
    moleTimer: null,        // 찍찍이/고양이 등장·퇴장 타이머
    bannerFlashUntil: 0,    // 이 시각(ms)까지는 감점 알림 배너 유지
  };
}

function rand(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }

// =========================================================
//  화면 전환
// =========================================================
function show(screen) {
  el.startScreen.classList.add("hidden");
  el.resultScreen.classList.add("hidden");
  if (screen) screen.classList.remove("hidden");
}

// =========================================================
//  게임 시작
// =========================================================
function startGame() {
  clearTimers();
  state = newState();
  state.running = true;
  updateHUD();
  clearAllMoles();
  show(null); // 오버레이 모두 숨김 → 밭이 보임
  setBanner("play", "🐭 찍찍이를 잡아라!");

  // 카운트다운 클럭 (setInterval: 백그라운드에서도 진행)
  state.lastTick = performance.now();
  state.clockTimer = setInterval(tickClock, 100);

  // 첫 두더지 등장
  scheduleMole();
}

// =========================================================
//  카운트다운
// =========================================================
function tickClock() {
  if (!state.running) return;
  const now = performance.now();
  state.timeLeft -= (now - state.lastTick) / 1000;
  state.lastTick = now;

  if (state.timeLeft <= 0) {
    state.timeLeft = 0;
    updateHUD();
    return endGame();
  }
  // 배너: 고양이 감점 알림이 표시 중이면 유지, 아니면 상황별 기본 문구
  if (now >= state.bannerFlashUntil) {
    if (state.timeLeft <= CONFIG.RUSH_AT) {
      setBanner("rush", "🔥 막판 스퍼트! 서둘러!");
    } else {
      setBanner("play", "🐭 찍찍이를 잡아라!");
    }
  }
  updateHUD();
}

// =========================================================
//  두더지 등장 스케줄
// =========================================================
function scheduleMole() {
  if (!state.running) return;
  const gap = rand(CONFIG.GAP_MIN, CONFIG.GAP_MAX);
  state.moleTimer = setTimeout(popMole, gap);
}

function popMole() {
  if (!state.running) return;

  // 직전 칸을 제외하고 무작위 선택
  let idx;
  do { idx = rand(0, 8); } while (idx === state.lastHole);
  state.activeHole = idx;
  state.lastHole = idx;

  // 종류 결정: 확률적으로 고양이, 아니면 찍찍이
  const isCat = Math.random() < CONFIG.CAT_CHANCE;
  state.activeType = isCat ? "cat" : "mouse";

  const hole = el.holes[idx];
  hole.classList.remove("hit", "cat");
  hole.querySelector(".mole").textContent = isCat ? CONFIG.CAT_EMOJI : CONFIG.MOUSE_EMOJI;
  if (isCat) hole.classList.add("cat");
  hole.classList.add("up");

  // 경과 시간에 따라 지속시간 단축 (점점 빨라짐)
  const elapsed = CONFIG.GAME_TIME - state.timeLeft;
  const frac = Math.min(1, Math.max(0, elapsed / CONFIG.GAME_TIME));
  const lifespan = CONFIG.LIFESPAN_START +
                   (CONFIG.LIFESPAN_END - CONFIG.LIFESPAN_START) * frac;

  // 시간 내 못 잡으면 자동 퇴장
  state.moleTimer = setTimeout(() => {
    hideMole(idx);
    scheduleMole();
  }, lifespan);
}

function hideMole(idx) {
  const hole = el.holes[idx];
  hole.classList.remove("up");
  if (state.activeHole === idx) state.activeHole = -1;
}

// =========================================================
//  두더지 잡기 (클릭/터치)
// =========================================================
function whack(idx) {
  if (!state.running) return;
  if (idx !== state.activeHole) return; // 아무것도 없는 칸이면 무시 (감점 없음)

  const hole = el.holes[idx];
  const wasCat = state.activeType === "cat";

  if (wasCat) {
    // 고양이: 감점 (0점 밑으로는 내려가지 않음)
    state.score = Math.max(0, state.score - CONFIG.CAT_PENALTY);
    // 감점 알림 배너 잠깐 표시
    state.bannerFlashUntil = performance.now() + CONFIG.FLASH_MS;
    setBanner("rush", `🐱 앗! 고양이! −${CONFIG.CAT_PENALTY}점`);
  } else {
    // 찍찍이: 득점
    state.score++;
  }

  hole.classList.remove("up");
  hole.classList.add("hit"); // .cat 클래스는 유지되어 -1 이펙트가 뜸
  state.activeHole = -1;

  // 점수 강조 효과 (득점일 때만 초록 팝)
  if (!wasCat) {
    el.statScore.classList.remove("pop");
    void el.statScore.offsetWidth;
    el.statScore.classList.add("pop");
  }
  updateHUD();

  // 눌렀으면 자동 퇴장 타이머 취소 후 바로 다음 등장
  clearTimeout(state.moleTimer);
  scheduleMole();
}

// =========================================================
//  게임 종료
// =========================================================
function endGame() {
  state.running = false;
  clearTimers();
  clearAllMoles();

  const s = state.score;
  let emoji, desc;
  if (s <= 0)       { emoji = "😅"; desc = "다음엔 한 마리라도 잡아봐요! (고양이는 조심!)"; }
  else if (s <= 10) { emoji = "🐭"; desc = "워밍업 완료! 감 잡으셨죠?"; }
  else if (s <= 20) { emoji = "👏"; desc = "제법인데요? 손이 빠르시네요!"; }
  else if (s <= 30) { emoji = "🏆"; desc = "찍찍이 사냥꾼 등극!"; }
  else              { emoji = "👑"; desc = "찍찍이의 천적! 경이로운 반응속도!"; }

  el.resultEmoji.textContent = emoji;
  el.resultTitle.textContent = "게임 종료!";
  el.resultScore.textContent = `점수: ${s}점`;
  el.resultDesc.textContent = desc;
  show(el.resultScreen);
}

// =========================================================
//  정리 / UI 갱신
// =========================================================
function clearTimers() {
  if (state && state.clockTimer) clearInterval(state.clockTimer);
  if (state && state.moleTimer) clearTimeout(state.moleTimer);
}

function clearAllMoles() {
  el.holes.forEach(h => h.classList.remove("up", "hit", "cat"));
}

function updateHUD() {
  el.score.textContent = state.score;
  el.time.textContent = Math.ceil(state.timeLeft);
  el.statTime.classList.toggle("warn", state.timeLeft <= 5);

  const pct = (state.timeLeft / CONFIG.GAME_TIME) * 100;
  el.timeFill.style.width = Math.max(0, pct) + "%";
}

function setBanner(type, text) {
  el.banner.className = "banner-" + type;
  el.banner.textContent = text;
}

// =========================================================
//  이벤트 바인딩
// =========================================================
el.startBtn.addEventListener("click", startGame);
el.restartBtn.addEventListener("click", startGame);

// 각 구멍: pointerdown 으로 마우스/터치 모두 한 번에 처리 (반응 빠름)
el.holes.forEach(hole => {
  const idx = Number(hole.dataset.idx);
  hole.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    whack(idx);
  });
});
