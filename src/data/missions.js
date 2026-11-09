// ── 오늘의 미션 풀 ──────────────────────────────────────────────
// 원칙 세 가지
//  1. 5분 컷 — "1시간 책 읽기"는 실패하고 "책 1페이지 소리 내어 읽기"는 해낸다.
//     59분 알람이 울린 그 순간에 끝낼 수 있어야 한다.
//  2. 세 영역에서 하나씩 — 몸 / 정리 / 머리. 무작위로 3개 뽑으면 머리 쓰는 일만 셋이 걸려 질린다.
//  3. 공통 90 + 생애주기 20 — 성별로 나누지 않는다(편견이 생기고 관리만 번거롭다).
//     생애주기도 선택 사항이며, 고르지 않으면 공통 풀만 쓴다.
//
// 2026-11 에 50개를 더했다 (저속노화·건강 관리, 디지털 정돈, 미리 준비, AI에게 질문하기, 손 기록, 감정 돌보기).
// 몸을 나무라거나 효능을 약속하는 문구는 쓰지 않는다. 죽은 미션은 완료율로 가려낸다.

export const AREAS = {
  body: { label: '몸',   emoji: '🏃' },
  tidy: { label: '정리', emoji: '🧹' },
  mind: { label: '머리', emoji: '🧠' },
}

export const STAGES = {
  student: '학생',
  young:   '청년·직장인',
  parent:  '직장인·부모',
  senior:  '시니어',
}

/** id 는 바뀌면 안 된다 — 최근 기록·건너뛴 횟수가 id 로 남는다 */
export const MISSIONS = [
  // ── 🏃 몸 (공통 31) ──
  { id: 'b01', area: 'body', text: '창문 열고 찬물 한 컵 마시기' },
  { id: 'b02', area: 'body', text: '목·어깨 5분 스트레칭' },
  { id: 'b03', area: 'body', text: '밖에 나가 10분 걷기' },
  { id: 'b04', area: 'body', text: '스쿼트 15회' },
  { id: 'b05', area: 'body', text: '눈 감고 깊게 20번 숨쉬기' },
  { id: 'b06', area: 'body', text: '계단으로 3개 층 오르기' },
  { id: 'b07', area: 'body', text: '물 한 병 채워서 책상에 두기' },
  { id: 'b08', area: 'body', text: '턱 당기고 허리 펴기 1분' },
  { id: 'b09', area: 'body', text: '플랭크 1분 버티기' },
  { id: 'b10', area: 'body', text: '점심 먹고 10분 걷기' },
  { id: 'b11', area: 'body', text: '손목·발목 30번 돌리기' },
  { id: 'b12', area: 'body', text: '과일이나 채소 한 조각 먹기' },
  { id: 'b13', area: 'body', text: '햇볕 드는 곳에서 5분 서 있기' },
  { id: 'b14', area: 'body', text: '오늘 30분 일찍 잘 준비 시작하기' },
  { id: 'b15', area: 'body', text: '다음 끼니는 채소부터 한 입 먹기' },
  { id: 'b16', area: 'body', text: '다음 끼니에 넣을 단백질 하나 정하기' },
  { id: 'b17', area: 'body', text: '단 음료 대신 물이나 탄산수 고르기' },
  { id: 'b18', area: 'body', text: '제자리 뛰기 1분' },
  { id: 'b19', area: 'body', text: '밖에서 5분만 가볍게 달려보기' },
  { id: 'b20', area: 'body', text: '의자에서 손 안 짚고 일어나기 10번' },
  { id: 'b21', area: 'body', text: '벽 짚고 팔굽혀펴기 15회' },
  { id: 'b22', area: 'body', text: '한 발로 서서 좌우 30초씩 버티기' },
  { id: 'b23', area: 'body', text: '화면에서 눈 떼고 먼 곳 20초 보기' },
  { id: 'b24', area: 'body', text: '오늘 잠들 시각 정해서 알람 맞추기' },
  { id: 'b25', area: 'body', text: '오후 커피 대신 물 한 잔 마시기' },
  { id: 'b26', area: 'body', text: '4초 들이쉬고 6초 내쉬기 10번' },
  { id: 'b27', area: 'body', text: '좋아하는 노래 한 곡에 맞춰 몸 흔들기' },
  { id: 'b28', area: 'body', text: '고관절 스트레칭 좌우 1분씩' },
  { id: 'b29', area: 'body', text: '벽 밀며 종아리 늘리기 좌우 30초' },
  { id: 'b30', area: 'body', text: '다음 끼니 첫 세 입 천천히 씹기' },
  { id: 'b31', area: 'body', text: '발가락 쥐었다 펴기 20번' },

  // ── 🧹 정리 (공통 29) ──
  { id: 't01', area: 'tidy', text: '스크린샷 10장 지우기' },
  { id: 't02', area: 'tidy', text: '책상 위 컵과 쓰레기 치우기' },
  { id: 't03', area: 'tidy', text: '일주일 안 쓴 앱 2개 지우기' },
  { id: 't04', area: 'tidy', text: '쇼핑 앱 광고 알림 끄기' },
  { id: 't05', area: 'tidy', text: '안 읽은 메일 10개 정리하기' },
  { id: 't06', area: 'tidy', text: '지갑 속 영수증 비우기' },
  { id: 't07', area: 'tidy', text: '바탕화면 임시 파일 정리하기' },
  { id: 't08', area: 'tidy', text: '냉장고에서 유통기한 지난 것 하나 버리기' },
  { id: 't09', area: 'tidy', text: '내일 입을 옷 미리 꺼내두기' },
  { id: 't10', area: 'tidy', text: '안경과 휴대폰 화면 닦기' },
  { id: 't11', area: 'tidy', text: '가방 속 필요 없는 것 하나 빼기' },
  { id: 't12', area: 'tidy', text: '사진첩에서 흔들린 사진 지우기' },
  { id: 't13', area: 'tidy', text: '현관 신발 가지런히 놓기' },
  { id: 't14', area: 'tidy', text: '잠금화면에 뜨는 앱 알림 하나 끄기' },
  { id: 't15', area: 'tidy', text: '홈 화면 첫 페이지에서 앱 하나 치우기' },
  { id: 't16', area: 'tidy', text: '안 쓰는 사이트 계정 하나 탈퇴하기' },
  { id: 't17', area: 'tidy', text: '중요한 계정에 2단계 인증 켜기' },
  { id: 't18', area: 'tidy', text: '이제 안 보는 채널 구독 3개 정리하기' },
  { id: 't19', area: 'tidy', text: '저장만 해둔 게시물 5개 정리하기' },
  { id: 't20', area: 'tidy', text: '열어 둔 브라우저 탭 5개 닫기' },
  { id: 't21', area: 'tidy', text: '다운로드 폴더 파일 5개 지우기' },
  { id: 't22', area: 'tidy', text: '클라우드에서 큰 파일 하나 지우기' },
  { id: 't23', area: 'tidy', text: '휴대폰에 긴급 연락처 등록하기' },
  { id: 't24', area: 'tidy', text: '보조배터리 충전해 두기' },
  { id: 't25', area: 'tidy', text: '내일 챙길 것 현관에 미리 두기' },
  { id: 't26', area: 'tidy', text: '페트병 라벨 떼서 분리배출하기' },
  { id: 't27', area: 'tidy', text: '안 쓰는 충전선 한곳에 모으기' },
  { id: 't28', area: 'tidy', text: '텀블러 씻어서 내일 쓸 준비 하기' },
  { id: 't29', area: 'tidy', text: '식탁 위 물건 세 개 제자리에 두기' },

  // ── 🧠 머리 (공통 30) ──
  { id: 'm01', area: 'mind', text: '읽던 책 3쪽 읽기' },
  { id: 'm02', area: 'mind', text: '오늘 잘한 일 한 줄 적기' },
  { id: 'm03', area: 'mind', text: '모르는 단어 하나 찾아보기' },
  { id: 'm04', area: 'mind', text: '떠오른 생각 1분 음성 메모로 남기기' },
  { id: 'm05', area: 'mind', text: '외국어 단어 3개 외우기' },
  { id: 'm06', area: 'mind', text: '관심 분야 기사 1편 끝까지 읽기' },
  { id: 'm07', area: 'mind', text: '이번 주 목표 하나 다시 보기' },
  { id: 'm08', area: 'mind', text: '오늘 쓴 돈 적어보기' },
  { id: 'm09', area: 'mind', text: '고맙다고 말할 사람 한 명 떠올려 연락하기' },
  { id: 'm10', area: 'mind', text: '내일 할 일 3개만 미리 적기' },
  { id: 'm11', area: 'mind', text: '자주 쓰는 문장 단축어로 등록하기' },
  { id: 'm12', area: 'mind', text: '구독 중인 서비스 하나 점검하기' },
  { id: 'm13', area: 'mind', text: '최근 배운 것 한 줄로 요약하기' },
  { id: 'm14', area: 'mind', text: 'AI에게 요즘 고민 하나 질문해보기' },
  { id: 'm15', area: 'mind', text: 'AI 답변 중 하나를 직접 찾아 확인하기' },
  { id: 'm16', area: 'mind', text: '좋아하는 문장 한 줄 손으로 베껴 쓰기' },
  { id: 'm17', area: 'mind', text: '지금 기분을 단어 하나로 적기' },
  { id: 'm18', area: 'mind', text: '오늘 기분 좋았던 순간 하나 떠올리기' },
  { id: 'm19', area: 'mind', text: '처음 가볼 가게나 메뉴 하나 정하기' },
  { id: 'm20', area: 'mind', text: '요즘 궁금한 것을 질문 하나로 적기' },
  { id: 'm21', area: 'mind', text: '오늘 일정을 종이에 손으로 적기' },
  { id: 'm22', area: 'mind', text: '본 뉴스 하나 원래 출처 찾아보기' },
  { id: 'm23', area: 'mind', text: '눈 감고 들리는 소리 세 가지 세기' },
  { id: 'm24', area: 'mind', text: '1분 동안 아무것도 안 하고 창밖 보기' },
  { id: 'm25', area: 'mind', text: '이웃이나 동료에게 먼저 인사 건네기' },
  { id: 'm26', area: 'mind', text: '연락 뜸했던 친구에게 안부 한 줄 보내기' },
  { id: 'm27', area: 'mind', text: '이번 주 안 써도 될 지출 하나 정하기' },
  { id: 'm28', area: 'mind', text: '장바구니에서 안 급한 물건 하나 빼기' },
  { id: 'm29', area: 'mind', text: '어제 가장 오래 쓴 앱 확인해보기' },
  { id: 'm30', area: 'mind', text: '오늘 배운 것을 설명하듯 말해보기' },

  // ── 생애주기: 학생 (5) ──
  { id: 's01', area: 'mind', stage: 'student', text: '오늘 수업 핵심 키워드 3개 적기' },
  { id: 's02', area: 'mind', stage: 'student', text: '관심 있는 직무 공고 하나 읽어보기' },
  { id: 's03', area: 'tidy', stage: 'student', text: '단톡방 알림 하나 끄기' },
  { id: 's04', area: 'body', stage: 'student', text: '자기 전 휴대폰 손 닿지 않는 곳에 두기' },
  { id: 's05', area: 'mind', stage: 'student', text: '해보고 싶은 일 하나 구체적으로 적기' },

  // ── 생애주기: 청년·직장인 (5) ──
  { id: 'y01', area: 'mind', stage: 'young', text: '오늘 꼭 끝낼 일 3가지 적고 시작하기' },
  { id: 'y02', area: 'mind', stage: 'young', text: '업무에 쓸 단축키 하나 익히기' },
  { id: 'y03', area: 'tidy', stage: 'young', text: '퇴근 전 책상과 메모 정리하기' },
  { id: 'y04', area: 'mind', stage: 'young', text: '경제 뉴스 헤드라인 3개 훑기' },
  { id: 'y05', area: 'tidy', stage: 'young', text: '안 입는 옷 한 벌 꺼내 놓기' },

  // ── 생애주기: 직장인·부모 (5) ──
  { id: 'p01', area: 'mind', stage: 'parent', text: '가족에게 안부 한 줄 보내기' },
  { id: 'p02', area: 'mind', stage: 'parent', text: '이번 달 고정 지출 하나 확인하기' },
  { id: 'p03', area: 'body', stage: 'parent', text: '커피 대신 따뜻한 차 마시기' },
  { id: 'p04', area: 'tidy', stage: 'parent', text: '차 안 쓰레기 비우기' },
  { id: 'p05', area: 'mind', stage: 'parent', text: '주말에 같이 할 일 하나 정하기' },

  // ── 생애주기: 시니어 (5) ──
  { id: 'n01', area: 'body', stage: 'senior', text: '발뒤꿈치 들기 20번' },
  { id: 'n02', area: 'body', stage: 'senior', text: '햇볕 쬐며 20분 걷기' },
  { id: 'n03', area: 'mind', stage: 'senior', text: '신문 사설 한 편 소리 내어 읽기' },
  { id: 'n04', area: 'mind', stage: 'senior', text: '오랜 친구에게 안부 전화하기' },
  { id: 'n05', area: 'tidy', stage: 'senior', text: '약 보관함 확인하고 정리하기' },
]

export const missionById = id => MISSIONS.find(m => m.id === id) ?? null
