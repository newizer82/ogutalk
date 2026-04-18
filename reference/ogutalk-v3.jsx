import { useState, useEffect, useRef, useCallback } from "react";

// ══════════════════════════════════════════════════════════
//  오구 사운드 엔진 — 4가지 톤
// ══════════════════════════════════════════════════════════
const OGU_TONES = {
  여유: { label: "여유", emoji: "😌", desc: "느리고 부드럽게", color: "#34d399" },
  바쁨: { label: "바쁨", emoji: "⚡", desc: "빠르고 긴박하게", color: "#f59e0b" },
  화남: { label: "화남", emoji: "😤", desc: "강하고 거칠게", color: "#ef4444" },
  유쾌: { label: "유쾌", emoji: "😄", desc: "밝고 경쾌하게", color: "#818cf8" },
};

const VOICE_CHARACTERS = [
  { id: "boy",        name: "남자아이", emoji: "👦", rate: 1.3,  pitch: 1.6, premium: false },
  { id: "girl",       name: "여자아이", emoji: "👧", rate: 1.2,  pitch: 1.8, premium: false },
  { id: "girlfriend", name: "여친",    emoji: "💕", rate: 1.0,  pitch: 1.4, premium: true  },
  { id: "boyfriend",  name: "남친",    emoji: "💙", rate: 0.9,  pitch: 0.8, premium: true  },
  { id: "mom",        name: "엄마",    emoji: "👩", rate: 0.85, pitch: 1.1, premium: true  },
  { id: "grandma",    name: "할머니",  emoji: "👵", rate: 0.75, pitch: 0.9, premium: true  },
  { id: "gyeongsan",  name: "경상도",  emoji: "🗣️", rate: 1.0,  pitch: 1.0, premium: true  },
  { id: "jeolla",     name: "전라도",  emoji: "🗣️", rate: 0.9,  pitch: 1.1, premium: true  },
  { id: "chungcheong",name: "충청도",  emoji: "🗣️", rate: 0.8,  pitch: 0.95,premium: true  },
];

const VOICE_TEXTS = {
  boy:         (h, m) => `오구! ${h}시 ${m}분이야! 집중해!`,
  girl:        (h, m) => `오구~ ${h}시 ${m}분이에요! 파이팅!`,
  girlfriend:  (h, m) => `자기야~ 벌써 ${h}시 ${m}분이야. 잠깐 쉬어~`,
  boyfriend:   (h, m) => `야, ${h}시 ${m}분이야. 잠깐 스트레칭 해.`,
  mom:         (h, m) => `어머, 벌써 ${h}시 ${m}분이네. 눈 좀 쉬어야지~`,
  grandma:     (h, m) => `아이고, ${h}시 ${m}분이 다 됐구먼. 허리 좀 펴거라~`,
  gyeongsan:   (h, m) => `오구야! ${h}시 ${m}분 됐다 아이가! 쉬어라 카이!`,
  jeolla:      (h, m) => `오구~ ${h}시 ${m}분이여! 잠깐 쉬어부러~`,
  chungcheong: (h, m) => `오구유~ ${h}시 ${m}분이 다 됐유. 쉬어야 쓰것어~`,
};

function playOguSound(tone = "유쾌") {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;

    const configs = {
      여유: [
        { freq: 392, start: 0,   dur: 0.4, type: "sine",     gain: 0.25 },
        { freq: 523, start: 0.35,dur: 0.5, type: "sine",     gain: 0.2  },
      ],
      바쁨: [
        { freq: 659, start: 0,    dur: 0.12, type: "square",   gain: 0.35 },
        { freq: 784, start: 0.14, dur: 0.12, type: "square",   gain: 0.35 },
        { freq: 988, start: 0.28, dur: 0.14, type: "square",   gain: 0.35 },
      ],
      화남: [
        { freq: 880, start: 0,   dur: 0.15, type: "sawtooth", gain: 0.45 },
        { freq: 698, start: 0.1, dur: 0.15, type: "sawtooth", gain: 0.4  },
        { freq: 523, start: 0.2, dur: 0.2,  type: "sawtooth", gain: 0.35 },
      ],
      유쾌: [
        { freq: 523, start: 0,    dur: 0.2, type: "triangle", gain: 0.3  },
        { freq: 659, start: 0.18, dur: 0.2, type: "triangle", gain: 0.3  },
        { freq: 784, start: 0.36, dur: 0.3, type: "triangle", gain: 0.3  },
      ],
    };

    (configs[tone] || configs["유쾌"]).forEach(({ freq, start, dur, type, gain: g }) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now + start);
      gain.gain.setValueAtTime(g, now + start);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
      osc.start(now + start);
      osc.stop(now + start + dur + 0.05);
    });
  } catch (_) {}
}

function speakTime(voiceId, hour, minute) {
  if (!window.speechSynthesis) return;
  const vc  = VOICE_CHARACTERS.find((v) => v.id === voiceId) || VOICE_CHARACTERS[0];
  const txt = (VOICE_TEXTS[voiceId] || VOICE_TEXTS.boy)(hour, minute);
  const utt = new SpeechSynthesisUtterance(txt);
  utt.lang  = "ko-KR";
  utt.rate  = vc.rate;
  utt.pitch = vc.pitch;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utt);
}

// ══════════════════════════════════════════════════════════
//  샘플 데이터
// ══════════════════════════════════════════════════════════
const ECONOMIC_TIPS = [
  { title: "복리의 마법",     content: "매년 7% 수익이면 약 10년 후 원금이 2배. 워런 버핏은 '복리는 세계 8번째 불가사의'라고 했습니다.", category: "투자기초" },
  { title: "72의 법칙",      content: "투자 원금이 2배 되는 기간: 72 ÷ 수익률(%). 연 8%면 9년만에 2배!",                           category: "투자기초" },
  { title: "ETF란?",         content: "주식처럼 거래되는 펀드. 개별 주식보다 위험 분산, 펀드보다 수수료 저렴.",                      category: "투자기초" },
  { title: "PER 이해하기",   content: "PER = 주가 ÷ 주당순이익. 동일 업종 내 PER 낮으면 저평가 가능성.",                            category: "주식용어" },
  { title: "분산투자 원칙",   content: "달걀을 한 바구니에 담지 마라. 주식·채권·부동산 나눠 투자하면 전체 손실 줄어듭니다.",          category: "투자기초" },
];

const QUOTES = [
  { text: "시간은 금이다.",              author: "벤자민 프랭클린" },
  { text: "시작이 반이다.",              author: "아리스토텔레스" },
  { text: "천 리 길도 한 걸음부터.",     author: "노자" },
  { text: "오늘 할 일을 내일로 미루지 마라.", author: "벤자민 프랭클린" },
  { text: "실패는 성공의 어머니다.",      author: "토마스 에디슨" },
];

// ══════════════════════════════════════════════════════════
//  재사용 컴포넌트
// ══════════════════════════════════════════════════════════
function Toggle({ on, onToggle, color = "#6366f1" }) {
  return (
    <div
      onClick={onToggle}
      style={{
        width: 48, height: 26, borderRadius: 13, cursor: "pointer",
        background: on ? color : "rgba(255,255,255,0.1)",
        position: "relative", transition: "background 0.3s",
        flexShrink: 0,
      }}
    >
      <div style={{
        width: 20, height: 20, borderRadius: 10, background: "white",
        position: "absolute", top: 3,
        left: on ? 25 : 3,
        transition: "left 0.3s",
        boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
      }} />
    </div>
  );
}

function PremiumBadge() {
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, padding: "2px 6px",
      borderRadius: 6, background: "linear-gradient(135deg, #f59e0b, #f97316)",
      color: "white", marginLeft: 6, letterSpacing: 0.5,
    }}>PRO</span>
  );
}

function GlassCard({ children, style = {}, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "rgba(255,255,255,0.05)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 20,
        padding: 16,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function ProgressBar({ value, color = "linear-gradient(90deg,#6366f1,#8b5cf6)" }) {
  return (
    <div style={{ width: "100%", height: 5, borderRadius: 3, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
      <div style={{ width: `${Math.min(100, value)}%`, height: "100%", borderRadius: 3, background: color, transition: "width 0.6s ease" }} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  메인 앱
// ══════════════════════════════════════════════════════════
export default function OguTalkV3() {
  const [now,     setNow]     = useState(new Date());
  const [tab,     setTab]     = useState("home");
  const [loginOpen, setLoginOpen] = useState(false);
  const [authMode,  setAuthMode]  = useState("login");
  const [email,     setEmail]     = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isPremium,  setIsPremium]  = useState(false);

  // 알람
  const [alarmHours, setAlarmHours] = useState(() => {
    const h = {};
    for (let i = 7; i <= 23; i++) h[i] = true;
    return h;
  });
  const [soundOn,       setSoundOn]       = useState(true);
  const [oguTone,       setOguTone]       = useState("유쾌");
  const [voiceChar,     setVoiceChar]     = useState("girl");
  const [voiceEnabled,  setVoiceEnabled]  = useState(false);
  const [alarmActive,   setAlarmActive]   = useState(false);
  const [alarmContent,  setAlarmContent]  = useState(null);
  const [immersion,     setImmersion]     = useState(0);
  const [alarmCount,    setAlarmCount]    = useState(0);
  const lastHour = useRef(-1);

  // 프리미엄 기능 토글
  const [premiumFeatures, setPremiumFeatures] = useState({
    todos: true, goals: true, keywords: true, scheduleAlerts: false,
  });

  // 할일
  const [todos, setTodos] = useState([
    { id: "1", text: "기획서 작성",   done: false, priority: "high"   },
    { id: "2", text: "운동 30분",     done: false, priority: "medium" },
    { id: "3", text: "독서 20분",     done: true,  priority: "low"    },
  ]);
  const [todoInput, setTodoInput] = useState("");
  const [showTodoForm, setShowTodoForm] = useState(false);

  // 목표
  const [goalPeriod, setGoalPeriod] = useState("weekly");
  const [goals, setGoals] = useState({
    yearly:  [{ id: "y1", title: "건강한 몸 만들기", progress: 68, desc: "주 4회 운동 목표" }],
    monthly: [{ id: "m1", title: "4월 운동 20회",   progress: 60, desc: "현재 12/20회" }],
    weekly:  [{ id: "w1", title: "이번 주 운동 5회", progress: 60, desc: "현재 3/5회" }],
    daily:   [{ id: "d1", title: "오늘 러닝 30분",   progress: 0,  desc: "오늘의 운동" }],
  });

  // 경제상식
  const [tipIdx, setTipIdx] = useState(0);

  // ── 시계
  useEffect(() => {
    const t = setInterval(() => {
      setNow(new Date());
      setImmersion((p) => p + 1 / 60);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // ── 59분 알람
  useEffect(() => {
    const m = now.getMinutes(), h = now.getHours(), s = now.getSeconds();
    if (m === 59 && s === 0 && alarmHours[h] && lastHour.current !== h) {
      lastHour.current = h;
      triggerAlarm(h, 59);
    }
  }, [now]);

  const triggerAlarm = useCallback((h = now.getHours(), m = now.getMinutes()) => {
    if (soundOn) playOguSound(oguTone);
    if (voiceEnabled) speakTime(voiceChar, h, m);
    const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    const t = ECONOMIC_TIPS[Math.floor(Math.random() * ECONOMIC_TIPS.length)];
    const pending = todos.filter((x) => !x.done).length;
    setAlarmContent({ quote: q, tip: t, pending });
    setAlarmActive(true);
    setAlarmCount((c) => c + 1);
    setImmersion(0);
  }, [soundOn, oguTone, voiceEnabled, voiceChar, todos]);

  const pad = (n) => String(n).padStart(2, "0");
  const HH = pad(now.getHours()), MM = pad(now.getMinutes()), SS = pad(now.getSeconds());
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][now.getDay()];
  const dateStr  = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 (${weekday})`;

  const nextAlarm = (() => {
    const h = now.getHours(), m = now.getMinutes();
    for (let i = 0; i < 24; i++) {
      const ch = (h + i) % 24;
      if (alarmHours[ch] && (i > 0 || m < 59)) {
        const diff = ((ch * 60 + 59) - (h * 60 + m) + 1440) % 1440;
        const dh   = Math.floor(diff / 60), dm = diff % 60;
        return { time: `${pad(ch)}:59`, diff: dh > 0 ? `${dh}시간 ${dm}분 후` : `${dm}분 후` };
      }
    }
    return { time: "없음", diff: "" };
  })();

  // ── 알람 팝업
  if (alarmActive && alarmContent) {
    return (
      <div style={S.root}>
        <div style={S.alarmBg}>
          {/* 펄스 링 */}
          <div style={S.pulseRing1} />
          <div style={S.pulseRing2} />
          <div style={S.alarmBox}>
            <div style={{ fontSize: 48, marginBottom: 4 }}>⏰</div>
            <div style={{ fontSize: 56, fontWeight: 900, background: G.logo, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1 }}>
              {HH}:{MM}
            </div>
            <div style={{ color: "#94a3b8", fontSize: 13, margin: "6px 0 24px" }}>
              {OGU_TONES[oguTone]?.emoji} 오구! 정각이 다가옵니다
            </div>

            <GlassCard style={{ marginBottom: 10, textAlign: "left" }}>
              <div style={{ color: "#818cf8", fontSize: 11, fontWeight: 700, marginBottom: 6 }}>💬 오늘의 명언</div>
              <div style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 14, lineHeight: 1.4 }}>"{alarmContent.quote.text}"</div>
              <div style={{ color: "#64748b", fontSize: 11, marginTop: 4 }}>— {alarmContent.quote.author}</div>
            </GlassCard>

            <GlassCard style={{ marginBottom: 10, textAlign: "left" }}>
              <div style={{ color: "#f59e0b", fontSize: 11, fontWeight: 700, marginBottom: 6 }}>📈 {alarmContent.tip.category}</div>
              <div style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 14 }}>{alarmContent.tip.title}</div>
              <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4, lineHeight: 1.5 }}>{alarmContent.tip.content}</div>
            </GlassCard>

            {alarmContent.pending > 0 && (
              <GlassCard style={{ marginBottom: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <div style={{ color: "#f87171", fontSize: 13 }}>✅ 미완료 할일 {alarmContent.pending}개 남아있어요</div>
              </GlassCard>
            )}

            <GlassCard style={{ marginBottom: 20, background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.15)" }}>
              <div style={{ color: "#fbbf24", fontSize: 12 }}>💡 잠깐 스트레칭하고 눈도 쉬어주세요!</div>
            </GlassCard>

            <button style={S.primaryBtn} onClick={() => { setAlarmActive(false); setAlarmContent(null); }}>확인했어요! 👍</button>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════ 로그인 모달 ══════════════
  const LoginModal = loginOpen && (
    <div style={S.modalBg} onClick={() => setLoginOpen(false)}>
      <div style={S.modalBox} onClick={(e) => e.stopPropagation()}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>⏱️</div>
          <div style={{ fontSize: 22, fontWeight: 800, background: G.logo, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>오구톡</div>
          <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
            {authMode === "login" ? "로그인하고 모든 기능을 사용하세요" : "새 계정을 만들어 시작하세요"}
          </div>
        </div>

        <input type="email"    placeholder="이메일"     value={email} onChange={(e) => setEmail(e.target.value)} style={S.input} />
        <input type="password" placeholder="비밀번호"                                                            style={{ ...S.input, marginTop: 8 }} />
        {authMode === "signup" && <input type="password" placeholder="비밀번호 확인" style={{ ...S.input, marginTop: 8 }} />}

        <button
          style={{ ...S.primaryBtn, marginTop: 16 }}
          onClick={() => { if (email) { setIsLoggedIn(true); setLoginOpen(false); } }}
        >
          {authMode === "login" ? "로그인" : "회원가입"}
        </button>

        {/* 소셜 로그인 구분선 */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0" }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
          <span style={{ color: "#475569", fontSize: 11 }}>또는</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
        </div>

        <button style={S.socialBtn}>
          <span style={{ fontSize: 16 }}>🟠</span> Google로 계속하기
        </button>
        <button style={{ ...S.socialBtn, marginTop: 8 }}>
          <span style={{ fontSize: 16 }}>🍎</span> Apple로 계속하기
        </button>

        <div style={{ textAlign: "center", marginTop: 16 }}>
          {authMode === "login" ? (
            <span style={{ color: "#64748b", fontSize: 12 }}>
              계정이 없으신가요?{" "}
              <span style={{ color: "#818cf8", cursor: "pointer" }} onClick={() => setAuthMode("signup")}>회원가입</span>
            </span>
          ) : (
            <span style={{ color: "#64748b", fontSize: 12 }}>
              이미 계정이 있으신가요?{" "}
              <span style={{ color: "#818cf8", cursor: "pointer" }} onClick={() => setAuthMode("login")}>로그인</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );

  // ══════════════ 메인 앱 ══════════════
  return (
    <div style={S.root}>
      {LoginModal}

      {/* ── 헤더 ── */}
      <div style={S.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>⏱️</span>
          <span style={{ fontSize: 18, fontWeight: 800, background: G.logo, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>오구톡</span>
          {isPremium && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 8, background: G.gold, color: "white" }}>PRO</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isLoggedIn ? (
            <div
              style={{ width: 32, height: 32, borderRadius: 16, background: G.purple, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
              onClick={() => setTab("settings")}
            >
              {email ? email[0].toUpperCase() : "U"}
            </div>
          ) : (
            <button style={S.loginBtn} onClick={() => setLoginOpen(true)}>로그인</button>
          )}
        </div>
      </div>

      {/* ── 콘텐츠 ── */}
      <div style={S.content}>

        {/* ════════ 홈 ════════ */}
        {tab === "home" && (
          <>
            {/* 시계 블록 */}
            <div style={{ textAlign: "center", padding: "12px 0 24px" }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 2 }}>
                <span style={{ fontSize: 72, fontWeight: 900, color: "#f1f5f9", letterSpacing: -4, lineHeight: 1 }}>{HH}</span>
                <span style={{ fontSize: 52, color: "#6366f1", fontWeight: 300, lineHeight: 1, marginBottom: 4 }}>:</span>
                <span style={{ fontSize: 72, fontWeight: 900, background: G.logo, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: -4, lineHeight: 1 }}>{MM}</span>
                <span style={{ fontSize: 20, color: "#475569", marginLeft: 6, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{SS}</span>
              </div>
              <div style={{ color: "#64748b", fontSize: 13, marginTop: 6 }}>{dateStr}</div>

              {/* 다음 오구 */}
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                marginTop: 12, padding: "6px 14px", borderRadius: 20,
                background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.2)",
              }}>
                <span style={{ fontSize: 12 }}>🔔</span>
                <span style={{ color: "#818cf8", fontSize: 13, fontWeight: 600 }}>다음 오구: {nextAlarm.time}</span>
                <span style={{ color: "#475569", fontSize: 11 }}>{nextAlarm.diff}</span>
              </div>
            </div>

            {/* 상태 카드 3개 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
              {[
                { label: "오늘 알람",   value: `${alarmCount}회`,                icon: "📢", color: "#818cf8" },
                { label: "몰입 시간",   value: `${String(Math.floor(immersion / 60)).padStart(2,"0")}:${String(Math.floor(immersion % 60)).padStart(2,"0")}`, icon: "⏳", color: "#f59e0b" },
                { label: "미완료 할일", value: `${todos.filter((t) => !t.done).length}개`, icon: "✅", color: "#34d399" },
              ].map((s) => (
                <GlassCard key={s.label} style={{ textAlign: "center", padding: "14px 8px" }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                  <div style={{ color: s.color, fontSize: 18, fontWeight: 800 }}>{s.value}</div>
                  <div style={{ color: "#64748b", fontSize: 10, marginTop: 2 }}>{s.label}</div>
                </GlassCard>
              ))}
            </div>

            {/* 알람 테스트 버튼 */}
            <button style={{ ...S.primaryBtn, marginBottom: 20 }} onClick={() => triggerAlarm()}>
              {OGU_TONES[oguTone]?.emoji} 오구 테스트
            </button>

            {/* 무료 사용자 → 프리미엄 배너 */}
            {!isPremium && (
              <GlassCard style={{ marginBottom: 20, background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))", border: "1px solid rgba(99,102,241,0.3)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 14 }}>✨ 프리미엄으로 업그레이드</div>
                    <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 3 }}>할일·목표·키워드·특별 목소리 잠금 해제</div>
                    <div style={{ color: "#818cf8", fontSize: 13, fontWeight: 700, marginTop: 4 }}>월 2,900원</div>
                  </div>
                  <button
                    style={{ padding: "8px 16px", borderRadius: 12, border: "none", background: G.purple, color: "white", fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}
                    onClick={() => setIsPremium(true)}
                  >
                    시작하기
                  </button>
                </div>
              </GlassCard>
            )}

            {/* 경제 상식 카드 */}
            <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", marginBottom: 8, letterSpacing: 0.5 }}>📚 오늘의 경제 상식</div>
            <GlassCard style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 8, background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>{ECONOMIC_TIPS[tipIdx].category}</span>
                <span style={{ color: "#475569", fontSize: 12, cursor: "pointer" }} onClick={() => setTipIdx((tipIdx + 1) % ECONOMIC_TIPS.length)}>다음 →</span>
              </div>
              <div style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{ECONOMIC_TIPS[tipIdx].title}</div>
              <div style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.6 }}>{ECONOMIC_TIPS[tipIdx].content}</div>
            </GlassCard>

            {/* 프리미엄 — 오늘의 할일 미리보기 */}
            {isPremium && premiumFeatures.todos && (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", marginBottom: 8, letterSpacing: 0.5 }}>✅ 오늘의 할일</div>
                <GlassCard style={{ marginBottom: 16 }}>
                  {todos.filter((t) => !t.done).slice(0, 3).map((t) => (
                    <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <span style={{ width: 7, height: 7, borderRadius: 4, flexShrink: 0, background: t.priority === "high" ? "#ef4444" : t.priority === "medium" ? "#f59e0b" : "#64748b" }} />
                      <span style={{ color: "#e2e8f0", fontSize: 13 }}>{t.text}</span>
                    </div>
                  ))}
                  {todos.filter((t) => !t.done).length === 0 && <div style={{ color: "#64748b", fontSize: 13, textAlign: "center", padding: "8px 0" }}>모든 할일 완료! 🎉</div>}
                </GlassCard>
              </>
            )}

            {/* 명언 */}
            <GlassCard style={{ borderLeft: "3px solid #818cf8" }}>
              <div style={{ color: "#e2e8f0", fontSize: 13, fontStyle: "italic", lineHeight: 1.5 }}>
                "{QUOTES[Math.floor(now.getMinutes() / 12) % QUOTES.length].text}"
              </div>
              <div style={{ color: "#475569", fontSize: 11, marginTop: 6 }}>— {QUOTES[Math.floor(now.getMinutes() / 12) % QUOTES.length].author}</div>
            </GlassCard>
          </>
        )}

        {/* ════════ 할일 ════════ */}
        {tab === "todos" && (
          <>
            {!isPremium || !premiumFeatures.todos ? (
              <PremiumLock feature="할일 관리" onUnlock={() => setIsPremium(true)} />
            ) : (
              <>
                <SectionHeader title="✅ 할일 관리" action="+ 추가" onAction={() => setShowTodoForm(!showTodoForm)} />

                {showTodoForm && (
                  <GlassCard style={{ marginBottom: 12 }}>
                    <input
                      type="text" placeholder="할일을 입력하세요" value={todoInput}
                      onChange={(e) => setTodoInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && todoInput.trim()) {
                          setTodos([{ id: Date.now().toString(), text: todoInput, done: false, priority: "medium" }, ...todos]);
                          setTodoInput(""); setShowTodoForm(false);
                        }
                      }}
                      style={S.input} autoFocus
                    />
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button style={S.accentSmallBtn} onClick={() => { if (todoInput.trim()) { setTodos([{ id: Date.now().toString(), text: todoInput, done: false, priority: "medium" }, ...todos]); setTodoInput(""); setShowTodoForm(false); } }}>저장</button>
                      <button style={S.ghostBtn} onClick={() => setShowTodoForm(false)}>취소</button>
                    </div>
                  </GlassCard>
                )}

                <div style={{ color: "#64748b", fontSize: 11, marginBottom: 12 }}>미완료 {todos.filter((t) => !t.done).length}개 · 완료 {todos.filter((t) => t.done).length}개</div>

                {todos.filter((t) => !t.done).map((t) => (
                  <GlassCard key={t.id} style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 12, padding: "12px 14px" }}>
                    <div
                      style={{ width: 22, height: 22, borderRadius: 7, border: "2px solid #475569", cursor: "pointer", flexShrink: 0 }}
                      onClick={() => setTodos(todos.map((x) => x.id === t.id ? { ...x, done: true } : x))}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 500 }}>{t.text}</div>
                    </div>
                    <span style={{ width: 8, height: 8, borderRadius: 4, background: t.priority === "high" ? "#ef4444" : t.priority === "medium" ? "#f59e0b" : "#475569" }} />
                    <span style={{ color: "#475569", fontSize: 18, cursor: "pointer" }} onClick={() => setTodos(todos.filter((x) => x.id !== t.id))}>×</span>
                  </GlassCard>
                ))}

                {todos.filter((t) => t.done).length > 0 && (
                  <>
                    <div style={{ color: "#475569", fontSize: 11, fontWeight: 700, margin: "16px 0 8px", letterSpacing: 0.5 }}>완료됨</div>
                    {todos.filter((t) => t.done).map((t) => (
                      <GlassCard key={t.id} style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", opacity: 0.5 }}>
                        <div
                          style={{ width: 22, height: 22, borderRadius: 7, background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 13, cursor: "pointer" }}
                          onClick={() => setTodos(todos.map((x) => x.id === t.id ? { ...x, done: false } : x))}
                        >✓</div>
                        <span style={{ color: "#94a3b8", fontSize: 13, textDecoration: "line-through" }}>{t.text}</span>
                      </GlassCard>
                    ))}
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* ════════ 목표 ════════ */}
        {tab === "goals" && (
          <>
            {!isPremium || !premiumFeatures.goals ? (
              <PremiumLock feature="목표 관리" onUnlock={() => setIsPremium(true)} />
            ) : (
              <>
                <SectionHeader title="🎯 목표 관리" />

                {/* 기간 탭 */}
                <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
                  {["yearly","monthly","weekly","daily"].map((p) => (
                    <button
                      key={p} onClick={() => setGoalPeriod(p)}
                      style={{ ...S.chipBtn, ...(goalPeriod === p ? { background: "rgba(99,102,241,0.2)", color: "#818cf8", borderColor: "#6366f1" } : {}) }}
                    >
                      {p === "yearly" ? "연간" : p === "monthly" ? "월간" : p === "weekly" ? "주간" : "일간"}
                    </button>
                  ))}
                </div>

                {goals[goalPeriod].map((g) => (
                  <GlassCard key={g.id} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <div style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 15 }}>{g.title}</div>
                      <span style={{ color: "#818cf8", fontWeight: 800, fontSize: 16 }}>{g.progress}%</span>
                    </div>
                    <ProgressBar value={g.progress} color={g.progress >= 70 ? "linear-gradient(90deg,#34d399,#6ee7b7)" : G.purple} />
                    {g.desc && <div style={{ color: "#64748b", fontSize: 12, marginTop: 8 }}>{g.desc}</div>}
                    <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                      {[{ d: -10, l: "−10" }, { d: +10, l: "+10" }].map(({ d, l }) => (
                        <button key={l} style={S.tinyBtn} onClick={() => setGoals({ ...goals, [goalPeriod]: goals[goalPeriod].map((x) => x.id === g.id ? { ...x, progress: Math.min(100, Math.max(0, x.progress + d)) } : x) })}>{l}</button>
                      ))}
                      {g.progress < 100 && (
                        <button style={{ ...S.tinyBtn, background: "rgba(52,211,153,0.15)", color: "#34d399", borderColor: "rgba(52,211,153,0.3)" }} onClick={() => setGoals({ ...goals, [goalPeriod]: goals[goalPeriod].map((x) => x.id === g.id ? { ...x, progress: 100 } : x) })}>완료!</button>
                      )}
                    </div>
                  </GlassCard>
                ))}

                {goals[goalPeriod].length === 0 && (
                  <div style={{ textAlign: "center", color: "#475569", padding: 60 }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
                    <div style={{ fontSize: 14 }}>목표를 추가해보세요!</div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ════════ 키워드 ════════ */}
        {tab === "keywords" && (
          <>
            {!isPremium || !premiumFeatures.keywords ? (
              <PremiumLock feature="키워드 & 주식" onUnlock={() => setIsPremium(true)} />
            ) : (
              <>
                <SectionHeader title="📈 관심 키워드" />
                <GlassCard>
                  <div style={{ color: "#64748b", fontSize: 13, textAlign: "center", padding: 20 }}>
                    키워드를 추가하면 관련 뉴스와 주가를<br/>알람 시 함께 확인할 수 있습니다.
                  </div>
                </GlassCard>
              </>
            )}
          </>
        )}

        {/* ════════ 설정 ════════ */}
        {tab === "settings" && (
          <>
            {/* 프로필 */}
            <GlassCard style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 50, height: 50, borderRadius: 25, background: G.purple, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: "white", fontWeight: 700 }}>
                {isLoggedIn && email ? email[0].toUpperCase() : "🐾"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 15 }}>{isLoggedIn ? email : "비로그인 사용자"}</div>
                <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>{isPremium ? "✨ 프리미엄 플랜" : "🔓 무료 플랜"}</div>
              </div>
              {!isLoggedIn && (
                <button style={S.loginBtn} onClick={() => setLoginOpen(true)}>로그인</button>
              )}
            </GlassCard>

            {/* 프리미엄 업그레이드 */}
            {!isPremium && (
              <GlassCard style={{ marginBottom: 16, background: "linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.15))", border: "1px solid rgba(99,102,241,0.3)" }}>
                <div style={{ color: "#e2e8f0", fontWeight: 700, marginBottom: 4 }}>✨ 프리미엄 업그레이드</div>
                <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 12 }}>할일·목표·키워드·다양한 오구 목소리 잠금 해제</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={{ ...S.primaryBtn, fontSize: 13, padding: "10px 20px", width: "auto" }} onClick={() => setIsPremium(true)}>
                    월 2,900원으로 시작
                  </button>
                </div>
              </GlassCard>
            )}

            {/* 오구 톤 선택 */}
            <SettingSection title="🎵 오구 사운드 톤">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                {Object.entries(OGU_TONES).map(([key, t]) => (
                  <button
                    key={key}
                    style={{
                      padding: "10px 12px", borderRadius: 12, border: `1px solid ${oguTone === key ? t.color : "rgba(255,255,255,0.08)"}`,
                      background: oguTone === key ? `${t.color}22` : "rgba(255,255,255,0.03)",
                      color: oguTone === key ? t.color : "#94a3b8", cursor: "pointer", textAlign: "left",
                    }}
                    onClick={() => { setOguTone(key); playOguSound(key); }}
                  >
                    <div style={{ fontSize: 18, marginBottom: 2 }}>{t.emoji}</div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{t.label}</div>
                    <div style={{ fontSize: 10, opacity: 0.7 }}>{t.desc}</div>
                  </button>
                ))}
              </div>
              <SettingRow label="알람 소리" icon="🔊">
                <Toggle on={soundOn} onToggle={() => setSoundOn(!soundOn)} />
              </SettingRow>
            </SettingSection>

            {/* 시간 안내 목소리 */}
            <SettingSection title={<>🗣️ 시간 안내 목소리 {!isPremium && <PremiumBadge />}</>}>
              <SettingRow label="음성 안내 사용" icon="💬">
                <Toggle on={voiceEnabled} onToggle={() => setVoiceEnabled(!voiceEnabled)} />
              </SettingRow>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 12 }}>
                {VOICE_CHARACTERS.map((vc) => {
                  const locked = vc.premium && !isPremium;
                  const selected = voiceChar === vc.id;
                  return (
                    <button
                      key={vc.id}
                      style={{
                        padding: "10px 8px", borderRadius: 12,
                        border: `1px solid ${selected ? "#818cf8" : "rgba(255,255,255,0.08)"}`,
                        background: selected ? "rgba(99,102,241,0.2)" : locked ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)",
                        color: locked ? "#475569" : selected ? "#818cf8" : "#94a3b8",
                        cursor: locked ? "not-allowed" : "pointer", textAlign: "center",
                        position: "relative", opacity: locked ? 0.6 : 1,
                      }}
                      onClick={() => {
                        if (locked) return;
                        setVoiceChar(vc.id);
                        if (voiceEnabled) speakTime(vc.id, now.getHours(), now.getMinutes());
                      }}
                    >
                      <div style={{ fontSize: 22, marginBottom: 2 }}>{vc.emoji}</div>
                      <div style={{ fontSize: 11, fontWeight: 600 }}>{vc.name}</div>
                      {locked && <div style={{ position: "absolute", top: 4, right: 4, fontSize: 9 }}>🔒</div>}
                    </button>
                  );
                })}
              </div>
              {isPremium && (
                <button
                  style={{ ...S.ghostBtn, width: "100%", marginTop: 10, color: "#818cf8" }}
                  onClick={() => speakTime(voiceChar, now.getHours(), now.getMinutes())}
                >
                  ▶ 목소리 미리듣기
                </button>
              )}
            </SettingSection>

            {/* 알람 시간 설정 */}
            <SettingSection title="⏰ 알람 시간 설정">
              <div style={{ color: "#64748b", fontSize: 11, marginBottom: 12 }}>선택한 시간의 59분에 알람이 울립니다</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 5 }}>
                {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                  <button
                    key={h}
                    onClick={() => setAlarmHours({ ...alarmHours, [h]: !alarmHours[h] })}
                    style={{
                      padding: "7px 2px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer",
                      border: `1px solid ${alarmHours[h] ? "#6366f1" : "rgba(255,255,255,0.08)"}`,
                      background: alarmHours[h] ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.03)",
                      color: alarmHours[h] ? "#818cf8" : "#64748b",
                    }}
                  >
                    {pad(h)}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                {[
                  { l: "주간", fn: () => { const h = {}; for (let i = 7; i <= 22; i++) h[i] = true; setAlarmHours(h); } },
                  { l: "전체", fn: () => { const h = {}; for (let i = 0; i < 24; i++) h[i] = true; setAlarmHours(h); } },
                  { l: "초기화", fn: () => setAlarmHours({}) },
                ].map((b) => <button key={b.l} style={S.ghostBtn} onClick={b.fn}>{b.l}</button>)}
              </div>
            </SettingSection>

            {/* 프리미엄 기능 온/오프 */}
            {isPremium && (
              <SettingSection title="🛠️ 기능 활성화">
                <div style={{ color: "#64748b", fontSize: 11, marginBottom: 10 }}>홈 화면 및 탭에 표시할 기능을 선택하세요</div>
                {[
                  { key: "todos",          icon: "✅", label: "할일 관리" },
                  { key: "goals",          icon: "🎯", label: "목표 관리" },
                  { key: "keywords",       icon: "📈", label: "키워드 & 주식" },
                  { key: "scheduleAlerts", icon: "🕐", label: "스케줄 알림 (준비중)" },
                ].map((f) => (
                  <SettingRow key={f.key} label={f.label} icon={f.icon}>
                    <Toggle
                      on={premiumFeatures[f.key]}
                      onToggle={() => setPremiumFeatures({ ...premiumFeatures, [f.key]: !premiumFeatures[f.key] })}
                    />
                  </SettingRow>
                ))}
              </SettingSection>
            )}

            {isLoggedIn && (
              <button
                style={{ ...S.ghostBtn, width: "100%", marginTop: 8, color: "#ef4444", borderColor: "rgba(239,68,68,0.2)" }}
                onClick={() => { setIsLoggedIn(false); setIsPremium(false); setEmail(""); }}
              >
                로그아웃
              </button>
            )}
          </>
        )}
      </div>

      {/* ── 하단 탭바 ── */}
      <div style={S.tabBar}>
        {[
          { id: "home",     icon: "🏠", label: "홈" },
          { id: "todos",    icon: "✅", label: "할일",   pro: true },
          { id: "goals",    icon: "🎯", label: "목표",   pro: true },
          { id: "keywords", icon: "📈", label: "키워드", pro: true },
          { id: "settings", icon: "⚙️", label: "설정" },
        ].map((t) => {
          const active  = tab === t.id;
          const locked  = t.pro && !isPremium;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ ...S.tabBtn, ...(active ? S.tabBtnActive : {}) }}>
              <span style={{ fontSize: 18 }}>{t.icon}</span>
              <span style={{ fontSize: 9, marginTop: 1 }}>{t.label}</span>
              {locked && <span style={{ position: "absolute", top: 4, right: 8, fontSize: 8 }}>🔒</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  소형 재사용 컴포넌트
// ══════════════════════════════════════════════════════════
function SectionHeader({ title, action, onAction }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#cbd5e1" }}>{title}</div>
      {action && <button style={{ padding: "5px 12px", borderRadius: 8, border: "none", background: "rgba(99,102,241,0.2)", color: "#818cf8", fontSize: 12, fontWeight: 600, cursor: "pointer" }} onClick={onAction}>{action}</button>}
    </div>
  );
}

function SettingSection({ title, children }) {
  return (
    <div style={{ marginBottom: 14, background: "rgba(255,255,255,0.03)", borderRadius: 20, padding: 16, border: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#cbd5e1", marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}

function SettingRow({ icon, label, children }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {icon && <span style={{ fontSize: 15 }}>{icon}</span>}
        <span style={{ color: "#e2e8f0", fontSize: 13 }}>{label}</span>
      </div>
      {children}
    </div>
  );
}

function PremiumLock({ feature, onUnlock }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
      <div style={{ color: "#e2e8f0", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{feature}</div>
      <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
        이 기능은 프리미엄 플랜에서만 사용할 수 있어요.<br />월 2,900원으로 모든 기능을 잠금 해제하세요.
      </div>
      <button
        style={{ padding: "12px 28px", borderRadius: 14, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer" }}
        onClick={onUnlock}
      >
        ✨ 프리미엄 시작하기
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  디자인 토큰
// ══════════════════════════════════════════════════════════
const G = {
  logo:   "linear-gradient(135deg, #818cf8, #a78bfa, #c084fc)",
  purple: "linear-gradient(135deg, #6366f1, #8b5cf6)",
  gold:   "linear-gradient(135deg, #f59e0b, #f97316)",
};

const S = {
  root: {
    maxWidth: 420, margin: "0 auto", minHeight: "100vh",
    background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(99,102,241,0.15) 0%, transparent 60%), linear-gradient(180deg, #080f1e 0%, #0d1526 50%, #111827 100%)",
    fontFamily: "'Segoe UI', -apple-system, 'Apple SD Gothic Neo', sans-serif",
    color: "#e2e8f0", position: "relative", overflowX: "hidden",
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "14px 20px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    backdropFilter: "blur(8px)",
    position: "sticky", top: 0, zIndex: 50,
    background: "rgba(8,15,30,0.85)",
  },
  content: { padding: "16px 18px 90px" },
  tabBar: {
    position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
    width: "100%", maxWidth: 420,
    display: "flex", justifyContent: "space-around",
    padding: "8px 8px calc(8px + env(safe-area-inset-bottom))",
    background: "rgba(8,15,30,0.92)",
    backdropFilter: "blur(16px)",
    borderTop: "1px solid rgba(255,255,255,0.06)",
    zIndex: 100,
  },
  tabBtn: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
    padding: "6px 10px", border: "none", borderRadius: 12,
    background: "transparent", color: "#475569", cursor: "pointer",
    position: "relative", minWidth: 48,
  },
  tabBtnActive: { background: "rgba(99,102,241,0.15)", color: "#818cf8" },

  primaryBtn: {
    width: "100%", padding: "14px 20px", border: "none", borderRadius: 16,
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer",
    boxShadow: "0 4px 20px rgba(99,102,241,0.35)",
  },
  loginBtn: {
    padding: "6px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700,
    border: "1px solid rgba(99,102,241,0.4)", background: "rgba(99,102,241,0.12)",
    color: "#818cf8", cursor: "pointer",
  },
  socialBtn: {
    width: "100%", padding: "11px 16px", borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)",
    color: "#94a3b8", fontSize: 13, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
  },
  accentSmallBtn: {
    padding: "8px 18px", borderRadius: 10, border: "none",
    background: "rgba(99,102,241,0.2)", color: "#818cf8", fontSize: 12, fontWeight: 600, cursor: "pointer",
  },
  ghostBtn: {
    padding: "8px 14px", borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.1)", background: "transparent",
    color: "#94a3b8", fontSize: 12, cursor: "pointer",
  },
  tinyBtn: {
    padding: "5px 12px", borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.1)", background: "transparent",
    color: "#94a3b8", fontSize: 11, cursor: "pointer",
  },
  chipBtn: {
    padding: "7px 16px", borderRadius: 20,
    border: "1px solid rgba(255,255,255,0.1)", background: "transparent",
    color: "#94a3b8", fontSize: 12, cursor: "pointer",
  },
  input: {
    width: "100%", padding: "12px 14px", borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)",
    color: "#e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box",
  },

  // 모달
  modalBg: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
    display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 200,
    backdropFilter: "blur(4px)",
  },
  modalBox: {
    width: "100%", maxWidth: 420,
    background: "linear-gradient(180deg,#141d2e,#0d1526)",
    borderRadius: "24px 24px 0 0",
    padding: "28px 24px 40px",
    border: "1px solid rgba(255,255,255,0.08)",
    borderBottom: "none",
    boxShadow: "0 -20px 60px rgba(0,0,0,0.5)",
  },

  // 알람 팝업
  alarmBg: {
    position: "fixed", inset: 0,
    background: "radial-gradient(ellipse at 50% 30%, rgba(99,102,241,0.25) 0%, rgba(0,0,0,0.95) 70%)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 999, padding: 20,
  },
  alarmBox: {
    width: "100%", maxWidth: 380,
    background: "linear-gradient(180deg, rgba(30,41,59,0.9), rgba(8,15,30,0.95))",
    backdropFilter: "blur(20px)",
    borderRadius: 28, padding: 28, textAlign: "center",
    border: "1px solid rgba(99,102,241,0.3)",
    boxShadow: "0 0 80px rgba(99,102,241,0.2)",
  },
  pulseRing1: {
    position: "absolute", width: 300, height: 300, borderRadius: "50%",
    border: "1px solid rgba(99,102,241,0.2)",
    animation: "pulse 2s ease-out infinite",
    top: "50%", left: "50%", transform: "translate(-50%, -50%)",
    pointerEvents: "none",
  },
  pulseRing2: {
    position: "absolute", width: 500, height: 500, borderRadius: "50%",
    border: "1px solid rgba(99,102,241,0.1)",
    animation: "pulse 2s ease-out infinite 0.5s",
    top: "50%", left: "50%", transform: "translate(-50%, -50%)",
    pointerEvents: "none",
  },
};
