import { useState, useEffect, useRef, useCallback } from "react";

// ──────────────────────────────────────────
// 오구 사운드 (Web Audio API)
// ──────────────────────────────────────────
const playOguSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {}
};

// ──────────────────────────────────────────
// 샘플 데이터
// ──────────────────────────────────────────
const ECONOMIC_TIPS = [
  { title: "복리의 마법", content: "매년 7% 수익이면 약 10년 후 원금이 2배가 됩니다. 워런 버핏은 '복리는 세계 8번째 불가사의'라고 했습니다.", category: "투자기초" },
  { title: "72의 법칙", content: "투자 원금이 2배가 되는 기간: 72 ÷ 수익률(%) = 해. 예: 연 8%면 72÷8=9년.", category: "투자기초" },
  { title: "ETF란?", content: "주식처럼 거래되는 펀드. 개별 주식보다 위험 분산, 펀드보다 수수료 저렴. 초보 투자자에게 추천!", category: "투자기초" },
  { title: "인플레이션과 현금", content: "인플레이션 3%면 100만원의 실질가치는 1년 후 97만원. 현금만 갖고 있으면 매년 가치가 줄어듭니다.", category: "경제개념" },
  { title: "PER(주가수익비율)", content: "PER = 주가 ÷ 주당순이익. PER 10이면 투자금 회수에 10년. 같은 업종 내 PER이 낮으면 저평가 가능성.", category: "주식용어" },
  { title: "분산투자 원칙", content: "달걀을 한 바구니에 담지 마라. 주식·채권·부동산 등 나눠 투자하면 전체 손실을 줄일 수 있습니다.", category: "투자기초" },
];

const STOCK_DATA = [
  { name: "테슬라", ticker: "TSLA", price: "$178.23", change: "+3.45%", positive: true, news: "자율주행 FSD v13 업데이트 발표" },
  { name: "삼성전자", ticker: "005930", price: "72,400원", change: "+1.2%", positive: true, news: "AI 반도체 수요 증가로 실적 개선" },
  { name: "애플", ticker: "AAPL", price: "$198.50", change: "-0.8%", positive: false, news: "EU 규제 영향 우려" },
  { name: "엔비디아", ticker: "NVDA", price: "$892.30", change: "+5.2%", positive: true, news: "데이터센터 GPU 수요 폭증" },
  { name: "비트코인", ticker: "BTC", price: "$67,450", change: "+2.1%", positive: true, news: "기관 투자 유입 지속" },
];

const QUOTES = [
  { text: "시간은 금이다.", author: "벤자민 프랭클린" },
  { text: "시작이 반이다.", author: "아리스토텔레스" },
  { text: "천 리 길도 한 걸음부터.", author: "노자" },
  { text: "오늘 할 일을 내일로 미루지 마라.", author: "벤자민 프랭클린" },
  { text: "실패는 성공의 어머니다.", author: "토마스 에디슨" },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);

// ──────────────────────────────────────────
// 메인 앱
// ──────────────────────────────────────────
export default function OguTalkV2() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState("home");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [userEmail, setUserEmail] = useState("");

  // 알람 상태
  const [alarmHours, setAlarmHours] = useState(() => {
    const h = {};
    for (let i = 7; i <= 23; i++) h[i] = true;
    return h;
  });
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [alarmTriggered, setAlarmTriggered] = useState(false);
  const [alarmContent, setAlarmContent] = useState(null);
  const [immersionMin, setImmersionMin] = useState(0);
  const [dailyAlarmCount, setDailyAlarmCount] = useState(0);
  const lastAlarmHour = useRef(-1);

  // 할일 상태
  const [todos, setTodos] = useState([
    { id: "1", title: "기획서 작성", priority: "high", done: false, dueDate: "2026-04-12" },
    { id: "2", title: "운동 30분", priority: "medium", done: false, dueDate: "2026-04-12" },
    { id: "3", title: "독서 20분", priority: "low", done: true, dueDate: "2026-04-12" },
  ]);
  const [newTodo, setNewTodo] = useState("");
  const [showTodoForm, setShowTodoForm] = useState(false);

  // 목표 상태
  const [goalTab, setGoalTab] = useState("yearly");
  const [goals, setGoals] = useState({
    yearly: [
      { id: "y1", title: "건강한 몸 만들기", progress: 68, desc: "주 4회 운동, 체중 75kg 목표" },
      { id: "y2", title: "재테크 목표 달성", progress: 45, desc: "연 수익률 15% 이상" },
    ],
    monthly: [
      { id: "m1", title: "4월 운동 20회", progress: 60, desc: "현재 12/20회 완료", parentId: "y1" },
      { id: "m2", title: "투자 포트폴리오 리밸런싱", progress: 30, desc: "ETF 비중 조정", parentId: "y2" },
    ],
    weekly: [
      { id: "w1", title: "이번 주 운동 5회", progress: 60, desc: "현재 3/5회", parentId: "m1" },
      { id: "w2", title: "경제 뉴스 매일 읽기", progress: 71, desc: "5/7일 완료", parentId: "y2" },
    ],
    daily: [
      { id: "d1", title: "30분 러닝", progress: 0, desc: "오늘의 운동", parentId: "w1" },
      { id: "d2", title: "투자 일지 작성", progress: 100, desc: "완료!", parentId: "y2" },
    ],
  });
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState("");

  // 키워드 상태
  const [keywords, setKeywords] = useState([
    { id: "k1", keyword: "테슬라", ticker: "TSLA", enabled: true },
    { id: "k2", keyword: "삼성전자", ticker: "005930", enabled: true },
    { id: "k3", keyword: "비트코인", ticker: "BTC", enabled: true },
  ]);
  const [selectedKeyword, setSelectedKeyword] = useState(null);
  const [newKeyword, setNewKeyword] = useState("");
  const [showKeywordForm, setShowKeywordForm] = useState(false);

  // 경제 상식 인덱스
  const [tipIndex, setTipIndex] = useState(0);

  // 콘텐츠 설정
  const [contentSettings, setContentSettings] = useState({
    weather: true, economy: true, quotes: true, todos: true, tips: true,
  });

  // 시계 업데이트
  useEffect(() => {
    const t = setInterval(() => {
      setCurrentTime(new Date());
      setImmersionMin((p) => p + 1 / 60);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // 59분 알람
  useEffect(() => {
    const m = currentTime.getMinutes(), h = currentTime.getHours(), s = currentTime.getSeconds();
    if (m === 59 && s === 0 && alarmHours[h] && lastAlarmHour.current !== h) {
      lastAlarmHour.current = h;
      triggerAlarm();
    }
  }, [currentTime]);

  const triggerAlarm = useCallback(() => {
    if (soundEnabled) playOguSound();
    const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    const tip = ECONOMIC_TIPS[Math.floor(Math.random() * ECONOMIC_TIPS.length)];
    const pendingTodos = todos.filter((t) => !t.done);
    setAlarmContent({ quote, tip, pendingTodos: pendingTodos.length });
    setAlarmTriggered(true);
    setDailyAlarmCount((c) => c + 1);
    setImmersionMin(0);
  }, [soundEnabled, todos]);

  const fmt = (d) => ({
    h: d.getHours().toString().padStart(2, "0"),
    m: d.getMinutes().toString().padStart(2, "0"),
    s: d.getSeconds().toString().padStart(2, "0"),
  });
  const time = fmt(currentTime);

  const nextAlarm = (() => {
    const h = currentTime.getHours(), m = currentTime.getMinutes();
    for (let i = 0; i < 24; i++) {
      const ch = (h + i) % 24;
      if (alarmHours[ch] && (i > 0 || m < 59)) return `${ch}:59`;
    }
    return "없음";
  })();

  // ──────── 로그인 화면 ────────
  if (!isLoggedIn) {
    return (
      <div style={S.container}>
        <div style={{ padding: "60px 24px", textAlign: "center" }}>
          <span style={{ fontSize: 56 }}>⏱️</span>
          <h1 style={S.logoText}>오구톡</h1>
          <p style={{ color: "#64748b", fontSize: 14, marginBottom: 40 }}>59분의 알림, 시간을 되찾는 습관</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              type="email"
              placeholder="이메일"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              style={S.input}
            />
            <input type="password" placeholder="비밀번호" style={S.input} />
            {authMode === "signup" && <input type="password" placeholder="비밀번호 확인" style={S.input} />}
            <button
              style={S.primaryBtn}
              onClick={() => { if (userEmail) setIsLoggedIn(true); }}
            >
              {authMode === "login" ? "로그인" : "회원가입"}
            </button>
            {authMode === "login" ? (
              <p style={{ color: "#64748b", fontSize: 13 }}>
                계정이 없으신가요?{" "}
                <span style={{ color: "#818cf8", cursor: "pointer" }} onClick={() => setAuthMode("signup")}>회원가입</span>
              </p>
            ) : (
              <p style={{ color: "#64748b", fontSize: 13 }}>
                이미 계정이 있으신가요?{" "}
                <span style={{ color: "#818cf8", cursor: "pointer" }} onClick={() => setAuthMode("login")}>로그인</span>
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ──────── 알람 팝업 ────────
  if (alarmTriggered && alarmContent) {
    return (
      <div style={S.container}>
        <div style={S.alarmOverlay}>
          <div style={S.alarmPopup}>
            <span style={{ fontSize: 48 }}>⏰</span>
            <div style={{ fontSize: 48, fontWeight: 800, color: "#818cf8", margin: "8px 0" }}>{time.h}:{time.m}</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: "#e2e8f0", marginBottom: 20 }}>오구! 정각이 다가옵니다</div>
            {/* 명언 */}
            <div style={S.alarmCard}>
              <div style={{ fontSize: 13, color: "#818cf8", marginBottom: 6 }}>💬 오늘의 명언</div>
              <div style={{ color: "#e2e8f0", fontWeight: 600 }}>"{alarmContent.quote.text}"</div>
              <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>— {alarmContent.quote.author}</div>
            </div>
            {/* 경제 상식 */}
            <div style={S.alarmCard}>
              <div style={{ fontSize: 13, color: "#f59e0b", marginBottom: 6 }}>📈 경제 상식</div>
              <div style={{ color: "#e2e8f0", fontWeight: 600 }}>{alarmContent.tip.title}</div>
              <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>{alarmContent.tip.content}</div>
            </div>
            {/* 할일 요약 */}
            <div style={{ ...S.alarmCard, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <div style={{ color: "#f87171" }}>✅ 미완료 할일 {alarmContent.pendingTodos}개</div>
            </div>
            <div style={{ background: "rgba(245,158,11,0.1)", borderRadius: 10, padding: "10px 14px", color: "#fbbf24", fontSize: 13, margin: "12px 0" }}>
              💡 잠깐 스트레칭하고 눈도 쉬어주세요!
            </div>
            <button style={S.primaryBtn} onClick={() => { setAlarmTriggered(false); setAlarmContent(null); }}>확인했어요!</button>
          </div>
        </div>
      </div>
    );
  }

  // ──────── 메인 앱 ────────
  return (
    <div style={S.container}>
      {/* 헤더 */}
      <div style={S.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 24 }}>⏱️</span>
          <span style={S.logoTextSmall}>오구톡</span>
        </div>
        <div style={{ color: "#64748b", fontSize: 12 }}>{userEmail || "사용자"}</div>
      </div>

      {/* 탭바 */}
      <div style={S.tabBar}>
        {[
          { id: "home", icon: "🏠", label: "홈" },
          { id: "todos", icon: "✅", label: "할일" },
          { id: "goals", icon: "🎯", label: "목표" },
          { id: "keywords", icon: "📈", label: "키워드" },
          { id: "settings", icon: "⚙️", label: "설정" },
        ].map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ ...S.tab, ...(activeTab === t.id ? S.tabActive : {}) }}>
            <span style={{ fontSize: 16 }}>{t.icon}</span>
            <span style={{ fontSize: 10 }}>{t.label}</span>
          </button>
        ))}
      </div>

      <div style={S.content}>
        {/* ════════ 홈 ════════ */}
        {activeTab === "home" && (
          <>
            {/* 시계 */}
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center" }}>
                <span style={{ fontSize: 60, fontWeight: 800, color: "#e2e8f0" }}>{time.h}</span>
                <span style={{ fontSize: 52, color: "#6366f1", fontWeight: 300 }}>:</span>
                <span style={{ fontSize: 60, fontWeight: 800, color: "#818cf8" }}>{time.m}</span>
                <span style={{ fontSize: 22, color: "#475569", marginLeft: 4 }}>{time.s}</span>
              </div>
              <div style={{ color: "#64748b", fontSize: 13 }}>
                {currentTime.getFullYear()}.{(currentTime.getMonth() + 1).toString().padStart(2, "0")}.{currentTime.getDate().toString().padStart(2, "0")} {["일", "월", "화", "수", "목", "금", "토"][currentTime.getDay()]}요일
              </div>
            </div>

            {/* 상태 카드 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
              <div style={S.statCard}><div style={{ fontSize: 18 }}>🔔</div><div style={S.statLabel}>다음 알람</div><div style={S.statValue}>{nextAlarm}</div></div>
              <div style={S.statCard}><div style={{ fontSize: 18 }}>⏳</div><div style={S.statLabel}>몰입 시간</div><div style={S.statValue}>{Math.floor(immersionMin)}분</div></div>
              <div style={S.statCard}><div style={{ fontSize: 18 }}>📢</div><div style={S.statLabel}>오늘 알람</div><div style={S.statValue}>{dailyAlarmCount}회</div></div>
            </div>

            {/* 경제 상식 카드 */}
            <div style={S.sectionTitle}>📚 오늘의 경제 상식</div>
            <div style={{ ...S.card, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ color: "#f59e0b", fontSize: 12, fontWeight: 600 }}>{ECONOMIC_TIPS[tipIndex].category}</span>
                <button style={{ background: "none", border: "none", color: "#818cf8", cursor: "pointer", fontSize: 12 }} onClick={() => setTipIndex((tipIndex + 1) % ECONOMIC_TIPS.length)}>다음 →</button>
              </div>
              <div style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{ECONOMIC_TIPS[tipIndex].title}</div>
              <div style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.5 }}>{ECONOMIC_TIPS[tipIndex].content}</div>
            </div>

            {/* 주식 미리보기 */}
            <div style={S.sectionTitle}>📈 관심 종목</div>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, marginBottom: 16 }}>
              {STOCK_DATA.filter((s) => keywords.some((k) => k.ticker === s.ticker)).map((s) => (
                <div key={s.ticker} style={{ ...S.card, minWidth: 140, flex: "0 0 auto" }}>
                  <div style={{ color: "#94a3b8", fontSize: 11 }}>{s.ticker}</div>
                  <div style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 15, margin: "2px 0" }}>{s.name}</div>
                  <div style={{ color: "#e2e8f0", fontSize: 14 }}>{s.price}</div>
                  <div style={{ color: s.positive ? "#34d399" : "#f87171", fontSize: 13, fontWeight: 600 }}>{s.change}</div>
                </div>
              ))}
            </div>

            {/* 오늘의 할일 미리보기 */}
            <div style={S.sectionTitle}>✅ 오늘의 할일</div>
            <div style={{ ...S.card, marginBottom: 16 }}>
              {todos.filter((t) => !t.done).slice(0, 3).map((t) => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  <span style={{ color: t.priority === "high" ? "#f87171" : t.priority === "medium" ? "#fbbf24" : "#94a3b8", fontSize: 8 }}>●</span>
                  <span style={{ color: "#e2e8f0", fontSize: 14 }}>{t.title}</span>
                </div>
              ))}
              {todos.filter((t) => !t.done).length === 0 && <div style={{ color: "#64748b", fontSize: 13 }}>모든 할일을 완료했어요! 🎉</div>}
            </div>

            {/* 명언 */}
            <div style={{ ...S.card, marginBottom: 16, borderLeft: "3px solid #818cf8" }}>
              <div style={{ color: "#e2e8f0", fontSize: 14, fontStyle: "italic" }}>"{QUOTES[Math.floor(currentTime.getMinutes() / 12) % QUOTES.length].text}"</div>
              <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>— {QUOTES[Math.floor(currentTime.getMinutes() / 12) % QUOTES.length].author}</div>
            </div>

            <button style={S.primaryBtn} onClick={triggerAlarm}>🔔 알람 테스트</button>
            <div style={{ textAlign: "center", color: "#475569", fontSize: 11, marginTop: 6 }}>버튼을 눌러 알람 미리보기</div>
          </>
        )}

        {/* ════════ 할일 ════════ */}
        {activeTab === "todos" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={S.sectionTitle}>✅ 할일 관리</div>
              <button style={S.addBtn} onClick={() => setShowTodoForm(!showTodoForm)}>+ 추가</button>
            </div>

            {showTodoForm && (
              <div style={{ ...S.card, marginBottom: 12 }}>
                <input
                  type="text" placeholder="할일을 입력하세요" value={newTodo}
                  onChange={(e) => setNewTodo(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newTodo.trim()) {
                      setTodos([{ id: Date.now().toString(), title: newTodo, priority: "medium", done: false, dueDate: "2026-04-12" }, ...todos]);
                      setNewTodo(""); setShowTodoForm(false);
                    }
                  }}
                  style={S.input} autoFocus
                />
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button style={{ ...S.smallBtn, background: "rgba(99,102,241,0.2)", color: "#818cf8" }} onClick={() => {
                    if (newTodo.trim()) {
                      setTodos([{ id: Date.now().toString(), title: newTodo, priority: "medium", done: false, dueDate: "2026-04-12" }, ...todos]);
                      setNewTodo(""); setShowTodoForm(false);
                    }
                  }}>저장</button>
                  <button style={S.smallBtn} onClick={() => setShowTodoForm(false)}>취소</button>
                </div>
              </div>
            )}

            <div style={{ color: "#64748b", fontSize: 12, marginBottom: 10 }}>미완료 {todos.filter((t) => !t.done).length}개 · 완료 {todos.filter((t) => t.done).length}개</div>

            {todos.filter((t) => !t.done).map((t) => (
              <div key={t.id} style={{ ...S.card, marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
                <button style={S.checkBtn} onClick={() => setTodos(todos.map((x) => x.id === t.id ? { ...x, done: true } : x))}>
                  <div style={{ width: 20, height: 20, borderRadius: 6, border: "2px solid #475569" }} />
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 500 }}>{t.title}</div>
                  <div style={{ color: "#64748b", fontSize: 11 }}>{t.dueDate}</div>
                </div>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: t.priority === "high" ? "#ef4444" : t.priority === "medium" ? "#f59e0b" : "#64748b" }} />
                <button style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 16 }} onClick={() => setTodos(todos.filter((x) => x.id !== t.id))}>×</button>
              </div>
            ))}

            {todos.filter((t) => t.done).length > 0 && (
              <>
                <div style={{ color: "#475569", fontSize: 12, margin: "16px 0 8px", fontWeight: 600 }}>완료됨</div>
                {todos.filter((t) => t.done).map((t) => (
                  <div key={t.id} style={{ ...S.card, marginBottom: 6, display: "flex", alignItems: "center", gap: 12, opacity: 0.5 }}>
                    <button style={S.checkBtn} onClick={() => setTodos(todos.map((x) => x.id === t.id ? { ...x, done: false } : x))}>
                      <div style={{ width: 20, height: 20, borderRadius: 6, background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 12 }}>✓</div>
                    </button>
                    <span style={{ color: "#94a3b8", fontSize: 14, textDecoration: "line-through" }}>{t.title}</span>
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {/* ════════ 목표 ════════ */}
        {activeTab === "goals" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={S.sectionTitle}>🎯 목표관리</div>
              <button style={S.addBtn} onClick={() => setShowGoalForm(!showGoalForm)}>+ 추가</button>
            </div>

            {/* 목표 유형 탭 */}
            <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
              {[
                { id: "yearly", label: "연간" },
                { id: "monthly", label: "월간" },
                { id: "weekly", label: "주간" },
                { id: "daily", label: "일간" },
              ].map((t) => (
                <button key={t.id} onClick={() => setGoalTab(t.id)} style={{ ...S.chipBtn, ...(goalTab === t.id ? { background: "rgba(99,102,241,0.2)", color: "#818cf8", borderColor: "#6366f1" } : {}) }}>
                  {t.label}
                </button>
              ))}
            </div>

            {showGoalForm && (
              <div style={{ ...S.card, marginBottom: 12 }}>
                <input type="text" placeholder="목표를 입력하세요" value={newGoalTitle} onChange={(e) => setNewGoalTitle(e.target.value)} style={S.input} autoFocus />
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button style={{ ...S.smallBtn, background: "rgba(99,102,241,0.2)", color: "#818cf8" }} onClick={() => {
                    if (newGoalTitle.trim()) {
                      setGoals({ ...goals, [goalTab]: [...goals[goalTab], { id: Date.now().toString(), title: newGoalTitle, progress: 0, desc: "" }] });
                      setNewGoalTitle(""); setShowGoalForm(false);
                    }
                  }}>저장</button>
                  <button style={S.smallBtn} onClick={() => setShowGoalForm(false)}>취소</button>
                </div>
              </div>
            )}

            {goals[goalTab].map((g) => (
              <div key={g.id} style={{ ...S.card, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 15 }}>{g.title}</div>
                  <span style={{ color: "#818cf8", fontWeight: 700, fontSize: 14 }}>{g.progress}%</span>
                </div>
                {/* 프로그레스 바 */}
                <div style={{ width: "100%", height: 6, borderRadius: 3, background: "#1e293b", marginTop: 8, marginBottom: 6 }}>
                  <div style={{ width: `${g.progress}%`, height: "100%", borderRadius: 3, background: g.progress >= 70 ? "linear-gradient(90deg, #34d399, #6ee7b7)" : "linear-gradient(90deg, #6366f1, #818cf8)", transition: "width 0.5s" }} />
                </div>
                {g.desc && <div style={{ color: "#64748b", fontSize: 12 }}>{g.desc}</div>}
                {/* 진행률 조절 */}
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <button style={S.tinyBtn} onClick={() => setGoals({ ...goals, [goalTab]: goals[goalTab].map((x) => x.id === g.id ? { ...x, progress: Math.max(0, x.progress - 10) } : x) })}>-10</button>
                  <button style={S.tinyBtn} onClick={() => setGoals({ ...goals, [goalTab]: goals[goalTab].map((x) => x.id === g.id ? { ...x, progress: Math.min(100, x.progress + 10) } : x) })}>+10</button>
                  {g.progress < 100 && <button style={{ ...S.tinyBtn, background: "rgba(52,211,153,0.2)", color: "#34d399" }} onClick={() => setGoals({ ...goals, [goalTab]: goals[goalTab].map((x) => x.id === g.id ? { ...x, progress: 100 } : x) })}>완료!</button>}
                </div>
              </div>
            ))}

            {goals[goalTab].length === 0 && (
              <div style={{ textAlign: "center", color: "#475569", padding: 40 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
                <div>목표를 추가해보세요!</div>
              </div>
            )}
          </>
        )}

        {/* ════════ 키워드 ════════ */}
        {activeTab === "keywords" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={S.sectionTitle}>📈 관심 키워드</div>
              <button style={S.addBtn} onClick={() => setShowKeywordForm(!showKeywordForm)}>+ 추가</button>
            </div>

            {showKeywordForm && (
              <div style={{ ...S.card, marginBottom: 12 }}>
                <input type="text" placeholder="키워드 (예: 엔비디아)" value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)} style={S.input} autoFocus />
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button style={{ ...S.smallBtn, background: "rgba(99,102,241,0.2)", color: "#818cf8" }} onClick={() => {
                    if (newKeyword.trim()) {
                      setKeywords([...keywords, { id: Date.now().toString(), keyword: newKeyword, ticker: "", enabled: true }]);
                      setNewKeyword(""); setShowKeywordForm(false);
                    }
                  }}>추가</button>
                  <button style={S.smallBtn} onClick={() => setShowKeywordForm(false)}>취소</button>
                </div>
              </div>
            )}

            {/* 키워드 칩 */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {keywords.map((k) => (
                <button key={k.id} onClick={() => setSelectedKeyword(selectedKeyword === k.id ? null : k.id)} style={{ ...S.chipBtn, ...(selectedKeyword === k.id ? { background: "rgba(99,102,241,0.2)", color: "#818cf8", borderColor: "#6366f1" } : {}) }}>
                  {k.keyword} {k.ticker && <span style={{ fontSize: 10, opacity: 0.6 }}>({k.ticker})</span>}
                </button>
              ))}
            </div>

            {/* 주식 정보 */}
            <div style={S.sectionTitle}>💹 종목 현황</div>
            {STOCK_DATA.filter((s) => keywords.some((k) => k.ticker === s.ticker) || (selectedKeyword && keywords.find((k) => k.id === selectedKeyword)?.keyword === s.name)).map((s) => (
              <div key={s.ticker} style={{ ...S.card, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 16 }}>{s.name}</div>
                    <div style={{ color: "#64748b", fontSize: 12 }}>{s.ticker}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: "#e2e8f0", fontWeight: 700 }}>{s.price}</div>
                    <div style={{ color: s.positive ? "#34d399" : "#f87171", fontWeight: 600, fontSize: 14 }}>{s.change}</div>
                  </div>
                </div>
                <div style={{ marginTop: 10, padding: "8px 10px", background: "rgba(255,255,255,0.03)", borderRadius: 8, color: "#94a3b8", fontSize: 12 }}>
                  📰 {s.news}
                </div>
              </div>
            ))}

            {STOCK_DATA.filter((s) => keywords.some((k) => k.ticker === s.ticker)).length === 0 && !selectedKeyword && (
              <div style={{ textAlign: "center", color: "#475569", padding: 40 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
                <div>종목 키워드를 추가하면 여기에 표시됩니다</div>
              </div>
            )}

            {/* 경제 상식 */}
            <div style={{ ...S.sectionTitle, marginTop: 20 }}>📚 경제 상식</div>
            <div style={S.card}>
              <div style={{ color: "#f59e0b", fontSize: 11, fontWeight: 600, marginBottom: 6 }}>{ECONOMIC_TIPS[tipIndex].category}</div>
              <div style={{ color: "#e2e8f0", fontWeight: 700, marginBottom: 6 }}>{ECONOMIC_TIPS[tipIndex].title}</div>
              <div style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.5 }}>{ECONOMIC_TIPS[tipIndex].content}</div>
              <button style={{ ...S.smallBtn, marginTop: 10, background: "rgba(245,158,11,0.1)", color: "#f59e0b" }} onClick={() => setTipIndex((tipIndex + 1) % ECONOMIC_TIPS.length)}>다음 상식 보기 →</button>
            </div>
          </>
        )}

        {/* ════════ 설정 ════════ */}
        {activeTab === "settings" && (
          <>
            {/* 프로필 */}
            <div style={{ ...S.card, marginBottom: 16, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: 24, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "white" }}>
                {(userEmail || "U")[0].toUpperCase()}
              </div>
              <div>
                <div style={{ color: "#e2e8f0", fontWeight: 600 }}>{userEmail || "사용자"}</div>
                <div style={{ color: "#64748b", fontSize: 12 }}>무료 플랜</div>
              </div>
            </div>

            {/* 사운드 */}
            <div style={{ ...S.settingSection }}>
              <div style={S.sectionTitle}>🔊 알람 사운드</div>
              <div style={S.settingRow}>
                <span style={{ color: "#e2e8f0" }}>알람 소리</span>
                <button style={{ ...S.toggle, background: soundEnabled ? "#6366f1" : "#334155" }} onClick={() => setSoundEnabled(!soundEnabled)}>
                  <div style={{ ...S.toggleKnob, transform: soundEnabled ? "translateX(20px)" : "translateX(2px)" }} />
                </button>
              </div>
              <button style={{ ...S.smallBtn, width: "100%", marginTop: 8, color: "#818cf8", border: "1px solid #334155" }} onClick={playOguSound}>♪ "오구" 소리 미리듣기</button>
            </div>

            {/* 알람 시간 */}
            <div style={S.settingSection}>
              <div style={S.sectionTitle}>⏰ 알람 시간 설정</div>
              <div style={{ color: "#64748b", fontSize: 12, marginBottom: 10 }}>선택한 시간의 59분에 알람이 울립니다</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 5 }}>
                {HOURS.map((h) => (
                  <button key={h} onClick={() => setAlarmHours({ ...alarmHours, [h]: !alarmHours[h] })} style={{ ...S.hourBtn, ...(alarmHours[h] ? S.hourBtnOn : {}) }}>
                    {h.toString().padStart(2, "0")}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                <button style={S.smallBtn} onClick={() => { const h = {}; for (let i = 7; i <= 22; i++) h[i] = true; setAlarmHours(h); }}>주간</button>
                <button style={S.smallBtn} onClick={() => { const h = {}; HOURS.forEach((i) => (h[i] = true)); setAlarmHours(h); }}>전체</button>
                <button style={S.smallBtn} onClick={() => setAlarmHours({})}>초기화</button>
              </div>
            </div>

            {/* 콘텐츠 설정 */}
            <div style={S.settingSection}>
              <div style={S.sectionTitle}>📋 알람 콘텐츠</div>
              {[
                { key: "weather", icon: "☀️", label: "날씨" },
                { key: "economy", icon: "📈", label: "경제/주식" },
                { key: "quotes", icon: "💬", label: "명언" },
                { key: "todos", icon: "✅", label: "할일 리마인더" },
                { key: "tips", icon: "📚", label: "경제 상식" },
              ].map((c) => (
                <div key={c.key} style={S.settingRow}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span>{c.icon}</span>
                    <span style={{ color: "#e2e8f0" }}>{c.label}</span>
                  </div>
                  <button style={{ ...S.toggle, background: contentSettings[c.key] ? "#6366f1" : "#334155" }} onClick={() => setContentSettings({ ...contentSettings, [c.key]: !contentSettings[c.key] })}>
                    <div style={{ ...S.toggleKnob, transform: contentSettings[c.key] ? "translateX(20px)" : "translateX(2px)" }} />
                  </button>
                </div>
              ))}
            </div>

            {/* 예정 알림 시간 */}
            <div style={S.settingSection}>
              <div style={S.sectionTitle}>🕐 스케줄 알림</div>
              <div style={{ color: "#64748b", fontSize: 12, marginBottom: 10 }}>시간별 특별 알림 (Coming Soon)</div>
              {[
                { time: "07:10", label: "해외 주식 요약", status: "soon" },
                { time: "07:20", label: "오늘의 할일 알림", status: "active" },
                { time: "22:00", label: "업무 요약 + 내일 계획", status: "soon" },
              ].map((s) => (
                <div key={s.time} style={{ ...S.settingRow, opacity: s.status === "soon" ? 0.5 : 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ color: "#818cf8", fontWeight: 700, fontFamily: "monospace" }}>{s.time}</span>
                    <span style={{ color: "#e2e8f0" }}>{s.label}</span>
                  </div>
                  {s.status === "soon" && <span style={{ color: "#475569", fontSize: 11 }}>준비중</span>}
                  {s.status === "active" && <span style={{ color: "#34d399", fontSize: 11 }}>활성</span>}
                </div>
              ))}
            </div>

            {/* Coming Soon */}
            <div style={{ ...S.settingSection, border: "1px dashed #334155" }}>
              <div style={S.sectionTitle}>🚀 Coming Soon</div>
              {["Google Calendar 연동", "AI 업무 요약", "유튜브/인스타 사용시간 연동", "프리미엄 구독"].map((f) => (
                <div key={f} style={{ color: "#475569", fontSize: 13, padding: "4px 0" }}>✨ {f}</div>
              ))}
            </div>

            <button style={{ ...S.smallBtn, width: "100%", marginTop: 16, color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }} onClick={() => setIsLoggedIn(false)}>로그아웃</button>
          </>
        )}
      </div>

      {/* 푸터 */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, textAlign: "center", padding: 8, background: "linear-gradient(transparent, #0f172a)" }}>
        <span style={{ color: "#1e293b", fontSize: 10 }}>오구톡 v2.0 MVP</span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────
// 스타일
// ──────────────────────────────────────────
const S = {
  container: { maxWidth: 420, margin: "0 auto", minHeight: "100vh", background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)", fontFamily: "'Segoe UI', -apple-system, sans-serif", color: "#e2e8f0" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)" },
  logoText: { fontSize: 32, fontWeight: 800, background: "linear-gradient(135deg, #818cf8, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: "8px 0" },
  logoTextSmall: { fontSize: 20, fontWeight: 800, background: "linear-gradient(135deg, #818cf8, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  tabBar: { display: "flex", justifyContent: "space-around", padding: "6px 8px", borderBottom: "1px solid rgba(255,255,255,0.05)" },
  tab: { display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "6px 12px", border: "none", borderRadius: 10, background: "transparent", color: "#64748b", cursor: "pointer" },
  tabActive: { background: "rgba(99,102,241,0.15)", color: "#818cf8" },
  content: { padding: "16px 20px 80px" },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: "#cbd5e1", marginBottom: 10 },
  card: { background: "rgba(30,41,59,0.6)", borderRadius: 14, padding: 14, border: "1px solid rgba(255,255,255,0.05)" },
  statCard: { background: "rgba(30,41,59,0.8)", borderRadius: 12, padding: "12px 8px", textAlign: "center", border: "1px solid rgba(255,255,255,0.05)" },
  statLabel: { color: "#64748b", fontSize: 10, margin: "4px 0 2px" },
  statValue: { color: "#e2e8f0", fontSize: 15, fontWeight: 700 },
  primaryBtn: { width: "100%", padding: 14, border: "none", borderRadius: 14, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white", fontSize: 16, fontWeight: 700, cursor: "pointer" },
  addBtn: { padding: "6px 14px", borderRadius: 8, border: "none", background: "rgba(99,102,241,0.2)", color: "#818cf8", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  smallBtn: { padding: "8px 14px", borderRadius: 8, border: "1px solid #334155", background: "transparent", color: "#94a3b8", fontSize: 12, cursor: "pointer" },
  tinyBtn: { padding: "4px 10px", borderRadius: 6, border: "1px solid #334155", background: "transparent", color: "#94a3b8", fontSize: 11, cursor: "pointer" },
  chipBtn: { padding: "6px 14px", borderRadius: 20, border: "1px solid #334155", background: "transparent", color: "#94a3b8", fontSize: 13, cursor: "pointer" },
  input: { padding: "12px 14px", borderRadius: 10, border: "1px solid #334155", background: "rgba(15,23,42,0.5)", color: "#e2e8f0", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box" },
  checkBtn: { background: "none", border: "none", cursor: "pointer", padding: 0 },
  settingSection: { marginBottom: 16, background: "rgba(30,41,59,0.5)", borderRadius: 14, padding: 14, border: "1px solid rgba(255,255,255,0.05)" },
  settingRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.03)" },
  toggle: { width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", position: "relative", transition: "background 0.3s" },
  toggleKnob: { width: 20, height: 20, borderRadius: 10, background: "white", position: "absolute", top: 2, transition: "transform 0.3s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" },
  hourBtn: { padding: "8px 2px", border: "1px solid #334155", borderRadius: 8, background: "rgba(15,23,42,0.5)", color: "#64748b", cursor: "pointer", textAlign: "center", fontSize: 12, fontWeight: 600 },
  hourBtnOn: { background: "rgba(99,102,241,0.2)", borderColor: "#6366f1", color: "#818cf8" },
  alarmOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 20 },
  alarmPopup: { maxWidth: 380, width: "100%", background: "linear-gradient(180deg, #1e293b, #0f172a)", borderRadius: 24, padding: 28, textAlign: "center", border: "1px solid rgba(99,102,241,0.3)", boxShadow: "0 0 60px rgba(99,102,241,0.2)" },
  alarmCard: { background: "rgba(99,102,241,0.1)", borderRadius: 12, padding: 14, marginBottom: 10, border: "1px solid rgba(99,102,241,0.15)", textAlign: "left" },
};
