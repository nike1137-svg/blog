"use strict";

/* =========================================================
   꼰대 상사 당황시키기 - 게임 로직
   규칙: 잔소리 중 [성질부리기] 버튼 연타로 게이지를 채우면 성공.
        5판 3선승 / 기회 10번 소진 / 전체 30초 중 먼저 오는 조건에 종료.
   ========================================================= */

// ---- 설정값 (원하면 여기 숫자만 바꾸면 됩니다) ----
const CONFIG = {
  WINS_NEEDED: 3,       // 최종 승리에 필요한 판 수 (3선승)
  MAX_CHANCES: 10,      // 총 기회 (실패 시 1씩 차감)
  TOTAL_TIME: 30,       // 전체 제한시간 (초)
  ROUND_WINDOW: 5,      // 한 판당 게이지를 채울 제한시간 (초)
  GAUGE_TARGET: 100,    // 게이지 목표치
  TAP_GAIN: 7,          // 연타 1회당 상승량
  GAUGE_DECAY: 8,       // 초당 자연 감소량 (연타를 멈추면 줄어듦)
  REACT_PAUSE: 1200,    // 성공/실패 연출 시간 (ms)
};

// ---- 꼰대 잔소리 대사 ----
const NAG_LINES = [
  "나 때는 말이야~ 야근이 기본이었어!",
  "요즘 젊은 것들은 패기가 없어!",
  "이걸 보고서라고 썼나?",
  "주말에 등산 한 번 안 오나?",
  "커피 한 잔 안 타 오고 말이야",
  "내가 왕년에 말이지…",
  "라떼는 말이야, 상사가 하늘이었어",
  "요즘 것들은 인사성이 없어!",
];

// ---- 플레이어 반격 대사 ----
const SHOUT_LINES = [
  "그만 좀 하세요!! 🔥",
  "저 그런 사람 아닙니다!!",
  "꼰대질 그만!!!",
  "시대가 바뀌었어요!!",
  "할 말 있으면 메일로!!",
];

// ---- DOM 참조 ----
const el = {
  myScore: document.getElementById("my-score"),
  bossScore: document.getElementById("boss-score"),
  chances: document.getElementById("chances-value"),
  time: document.getElementById("time-value"),
  statChances: document.getElementById("stat-chances"),
  statTime: document.getElementById("stat-time"),

  startScreen: document.getElementById("start-screen"),
  gameScreen: document.getElementById("game-screen"),
  resultScreen: document.getElementById("result-screen"),

  startBtn: document.getElementById("start-btn"),
  restartBtn: document.getElementById("restart-btn"),
  tapBtn: document.getElementById("tap-btn"),

  speech: document.getElementById("speech-bubble"),
  boss: document.getElementById("boss"),
  bossFace: document.getElementById("boss-face"),
  shout: document.getElementById("player-shout"),
  banner: document.getElementById("state-banner"),

  roundFill: document.getElementById("round-timer-fill"),
  gaugeFill: document.getElementById("gauge-fill"),
  gaugePercent: document.getElementById("gauge-percent"),

  resultEmoji: document.getElementById("result-emoji"),
  resultTitle: document.getElementById("result-title"),
  resultDesc: document.getElementById("result-desc"),
};

// ---- 게임 상태 ----
let state = null;

function newState() {
  return {
    myScore: 0,
    bossScore: 0,
    chances: CONFIG.MAX_CHANCES,
    totalTime: CONFIG.TOTAL_TIME,
    gauge: 0,
    roundTime: CONFIG.ROUND_WINDOW,
    phase: "idle",   // idle | playing | reacting | over
    lastTick: 0,
    running: false,
    timer: null,
  };
}

const TICK_MS = 50; // 게임 클럭 간격 (초당 약 20회)

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// =========================================================
//  화면 전환
// =========================================================
function show(screen) {
  el.startScreen.classList.add("hidden");
  el.gameScreen.classList.add("hidden");
  el.resultScreen.classList.add("hidden");
  screen.classList.remove("hidden");
}

// =========================================================
//  게임 시작
// =========================================================
function startGame() {
  if (state && state.timer) clearInterval(state.timer); // 이전 게임 정리
  state = newState();
  updateHUD();
  show(el.gameScreen);
  el.gameScreen.classList.remove("hidden");
  state.running = true;
  state.lastTick = performance.now();
  // setInterval 기반 클럭: 탭이 백그라운드여도 멈추지 않음
  state.timer = setInterval(() => loop(performance.now()), TICK_MS);
  startRound();
}

// =========================================================
//  한 판(라운드) 시작
// =========================================================
function startRound() {
  state.phase = "playing";
  state.gauge = 0;
  state.roundTime = CONFIG.ROUND_WINDOW;

  el.speech.textContent = rand(NAG_LINES);
  el.bossFace.textContent = "😠";
  el.boss.className = "nagging";
  el.tapBtn.disabled = false;
  setBanner("nag", "😤 잔소리 방어 중! 연타!!");
  updateBars();
}

// =========================================================
//  메인 루프
// =========================================================
function loop(now) {
  if (!state || !state.running) return;
  const dt = (now - state.lastTick) / 1000;
  state.lastTick = now;

  if (state.phase === "playing") {
    // --- 판 성공: 게이지 목표 달성 (감소 적용 전에 먼저 판정) ---
    if (state.gauge >= CONFIG.GAUGE_TARGET) {
      state.gauge = CONFIG.GAUGE_TARGET;
      updateBars();
      return roundWin();
    }

    // 전체 시간 감소
    state.totalTime -= dt;
    // 판 시간 감소
    state.roundTime -= dt;
    // 게이지 자연 감소 (연타를 멈추면 줄어듦)
    state.gauge = Math.max(0, state.gauge - CONFIG.GAUGE_DECAY * dt);

    updateBars();
    updateHUD();

    // --- 전체 시간 종료 ---
    if (state.totalTime <= 0) { state.totalTime = 0; return endGame("time"); }
    // --- 판 실패: 시간 초과 ---
    if (state.roundTime <= 0) {
      state.roundTime = 0;
      return roundLose();
    }
  }
  // setInterval이 반복 호출하므로 여기서 재예약하지 않음
}

// =========================================================
//  판 승리 (상사 당황 → 쭈그러짐)
// =========================================================
function roundWin() {
  state.phase = "reacting";
  state.myScore++;
  el.tapBtn.disabled = true;

  el.bossFace.textContent = "😳";
  el.boss.className = "flustered";
  el.speech.textContent = "헉… 뭐, 뭐야?!";
  setBanner("win", "😳 상사 당황! 성공!!");

  // 쭈그러지는 연출
  setTimeout(() => {
    el.bossFace.textContent = "😰";
    el.boss.className = "shrink";
    el.speech.textContent = "미, 미안하네…";
  }, 400);

  updateHUD();
  afterRound();
}

// =========================================================
//  판 실패 (상사 승리, 기회 -1)
// =========================================================
function roundLose() {
  state.phase = "reacting";
  state.bossScore++;
  state.chances--;
  el.tapBtn.disabled = true;

  el.bossFace.textContent = "😏";
  el.boss.className = "win";
  el.speech.textContent = "거봐, 요즘 것들은 끈기가 없어~";
  setBanner("lose", "😞 방어 실패… 기회 -1");

  updateHUD();
  afterRound();
}

// =========================================================
//  판 종료 후 처리 (다음 판 or 게임 종료)
// =========================================================
function afterRound() {
  setTimeout(() => {
    if (!state.running) return;
    // 종료 조건 체크
    if (state.myScore >= CONFIG.WINS_NEEDED) return endGame("win");
    if (state.bossScore >= CONFIG.WINS_NEEDED) return endGame("lose");
    if (state.chances <= 0) return endGame("chances");
    if (state.totalTime <= 0) return endGame("time");
    // 아니면 다음 판
    el.boss.className = "";
    state.lastTick = performance.now();
    startRound();
  }, CONFIG.REACT_PAUSE);
}

// =========================================================
//  버튼 연타 처리
// =========================================================
function onTap() {
  if (!state || state.phase !== "playing") return;
  state.gauge = Math.min(CONFIG.GAUGE_TARGET, state.gauge + CONFIG.TAP_GAIN);
  // 반격 대사 잠깐 표시
  el.shout.textContent = rand(SHOUT_LINES);
  el.shout.classList.remove("hidden");
  el.shout.style.animation = "none";
  void el.shout.offsetWidth; // 리플로우로 애니메이션 재시작
  el.shout.style.animation = "shout-pop 0.3s";
  updateBars();
}

// =========================================================
//  게임 종료
// =========================================================
function endGame(reason) {
  state.phase = "over";
  state.running = false;
  if (state.timer) { clearInterval(state.timer); state.timer = null; }
  el.tapBtn.disabled = true;

  const win = state.myScore > state.bossScore ? true
            : state.myScore < state.bossScore ? false
            : reason === "win";

  let emoji, title, desc;

  if (reason === "win" || (win && reason !== "lose")) {
    emoji = "🏆"; title = "승리!";
    desc = `상사를 완벽히 제압했습니다!<br>최종 스코어 ${state.myScore} : ${state.bossScore}`;
  } else if (reason === "lose") {
    emoji = "😭"; title = "패배…";
    desc = `상사에게 3판을 내줬어요.<br>최종 스코어 ${state.myScore} : ${state.bossScore}`;
  } else if (reason === "chances") {
    emoji = "💥"; title = "기회 소진!";
    desc = `기회를 모두 써버렸어요.<br>최종 스코어 ${state.myScore} : ${state.bossScore}`;
  } else { // time
    emoji = win ? "⏰🏆" : "⏰";
    title = win ? "시간 종료 - 승리!" : (state.myScore === state.bossScore ? "시간 종료 - 무승부" : "시간 종료 - 패배");
    desc = `30초가 끝났습니다.<br>최종 스코어 ${state.myScore} : ${state.bossScore}`;
  }

  el.resultEmoji.textContent = emoji;
  el.resultTitle.textContent = title;
  el.resultDesc.innerHTML = desc;
  show(el.resultScreen);
}

// =========================================================
//  UI 갱신
// =========================================================
function updateHUD() {
  el.myScore.textContent = state.myScore;
  el.bossScore.textContent = state.bossScore;
  el.chances.textContent = state.chances;
  el.time.textContent = Math.ceil(state.totalTime);

  // 경고 색: 시간 5초 이하 / 기회 3개 이하
  el.statTime.classList.toggle("warn", state.totalTime <= 5);
  el.statChances.classList.toggle("warn", state.chances <= 3);
}

function updateBars() {
  const gPct = (state.gauge / CONFIG.GAUGE_TARGET) * 100;
  el.gaugeFill.style.width = gPct + "%";
  el.gaugePercent.textContent = Math.round(gPct) + "%";

  const rPct = (state.roundTime / CONFIG.ROUND_WINDOW) * 100;
  el.roundFill.style.width = Math.max(0, rPct) + "%";
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

// 연타: 클릭 + 터치 모두 지원 (모바일 대응)
el.tapBtn.addEventListener("click", onTap);
el.tapBtn.addEventListener("touchstart", (e) => { e.preventDefault(); onTap(); }, { passive: false });
