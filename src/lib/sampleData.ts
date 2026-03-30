import { EventRow } from './types';

function generateTimestamp(base: Date, offsetSeconds: number): string {
  return new Date(base.getTime() + offsetSeconds * 1000).toISOString();
}

function makeRow(
  userID: string,
  condition: 'Active' | 'Passive',
  activityNumber: number,
  timestamp: string,
  codes: Partial<Record<string, 0 | 1>>
): EventRow {
  return {
    UserID: userID,
    Condition: condition,
    ActivityNumber: activityNumber,
    Timestamp: timestamp,
    StartProblem: codes.StartProblem ?? 0,
    EndProblem: codes.EndProblem ?? 0,
    PlanningTool: codes.PlanningTool ?? 0,
    MoveHistory: codes.MoveHistory ?? 0,
    TileChange: codes.TileChange ?? 0,
    Reading: codes.Reading ?? 0,
    Diagram: codes.Diagram ?? 0,
  };
}

function generateActiveActivity(userID: string, activityNumber: number, baseDate: Date): EventRow[] {
  const rows: EventRow[] = [];
  let t = 0;
  // StartProblem
  rows.push(makeRow(userID, 'Active', activityNumber, generateTimestamp(baseDate, t), { StartProblem: 1 }));
  t += 2;
  // PlanningTool (always starts with plan)
  rows.push(makeRow(userID, 'Active', activityNumber, generateTimestamp(baseDate, t), { PlanningTool: 1 }));
  t += 3;
  // Reading -> Diagram -> TileChange loops (with self-reflection)
  const cycles = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < cycles; i++) {
    if (Math.random() < 0.7) {
      rows.push(makeRow(userID, 'Active', activityNumber, generateTimestamp(baseDate, t), { Reading: 1 }));
      t += 2;
    }
    if (Math.random() < 0.6) {
      rows.push(makeRow(userID, 'Active', activityNumber, generateTimestamp(baseDate, t), { Diagram: 1 }));
      t += 2;
    }
    rows.push(makeRow(userID, 'Active', activityNumber, generateTimestamp(baseDate, t), { TileChange: 1 }));
    t += 3;
    // Self-reflection after TileChange (Active pattern)
    if (Math.random() < 0.6) {
      rows.push(makeRow(userID, 'Active', activityNumber, generateTimestamp(baseDate, t), { PlanningTool: 1 }));
      t += 2;
    }
    if (Math.random() < 0.4) {
      rows.push(makeRow(userID, 'Active', activityNumber, generateTimestamp(baseDate, t), { MoveHistory: 1 }));
      t += 2;
    }
  }
  // EndProblem
  rows.push(makeRow(userID, 'Active', activityNumber, generateTimestamp(baseDate, t), { EndProblem: 1 }));
  return rows;
}

function generatePassiveActivity(userID: string, activityNumber: number, baseDate: Date): EventRow[] {
  const rows: EventRow[] = [];
  let t = 0;
  rows.push(makeRow(userID, 'Passive', activityNumber, generateTimestamp(baseDate, t), { StartProblem: 1 }));
  t += 2;
  // Quick planning (less)
  if (Math.random() < 0.4) {
    rows.push(makeRow(userID, 'Passive', activityNumber, generateTimestamp(baseDate, t), { PlanningTool: 1 }));
    t += 3;
  }
  // TileChange heavy, less reflection
  const cycles = 4 + Math.floor(Math.random() * 4);
  for (let i = 0; i < cycles; i++) {
    if (Math.random() < 0.25) {
      rows.push(makeRow(userID, 'Passive', activityNumber, generateTimestamp(baseDate, t), { Reading: 1 }));
      t += 2;
    }
    if (Math.random() < 0.15) {
      rows.push(makeRow(userID, 'Passive', activityNumber, generateTimestamp(baseDate, t), { Diagram: 1 }));
      t += 2;
    }
    rows.push(makeRow(userID, 'Passive', activityNumber, generateTimestamp(baseDate, t), { TileChange: 1 }));
    t += 2;
    // Very rarely checks plan or history
    if (Math.random() < 0.1) {
      rows.push(makeRow(userID, 'Passive', activityNumber, generateTimestamp(baseDate, t), { MoveHistory: 1 }));
      t += 2;
    }
  }
  rows.push(makeRow(userID, 'Passive', activityNumber, generateTimestamp(baseDate, t), { EndProblem: 1 }));
  return rows;
}

export function generateSampleData(): EventRow[] {
  const allRows: EventRow[] = [];
  const baseDate = new Date('2024-01-15T09:00:00Z');

  for (let u = 0; u < 15; u++) {
    const userID = `Active_U${String(u + 1).padStart(2, '0')}`;
    for (let a = 1; a <= 4; a++) {
      const actDate = new Date(baseDate.getTime() + (u * 10 + a) * 3600 * 1000);
      allRows.push(...generateActiveActivity(userID, a, actDate));
    }
  }
  for (let u = 0; u < 15; u++) {
    const userID = `Passive_U${String(u + 1).padStart(2, '0')}`;
    for (let a = 1; a <= 4; a++) {
      const actDate = new Date(baseDate.getTime() + (u * 10 + a) * 3600 * 1000);
      allRows.push(...generatePassiveActivity(userID, a, actDate));
    }
  }
  return allRows;
}

export const SAMPLE_DATA: EventRow[] = generateSampleData();

// ─── 두 번째 데이터셋: 스마트팜(SmartFarm) ──────────────────────────────────
// 농업 시뮬레이션 게임. Active 집단은 Diagram→Reading→TileChange 탐구 중심,
// Passive 집단은 TileChange 시행착오 반복 패턴.

function generateSmartFarmActiveActivity(userID: string, activityNumber: number, baseDate: Date): EventRow[] {
  const rows: EventRow[] = [];
  let t = 0;
  rows.push(makeRow(userID, 'Active', activityNumber, generateTimestamp(baseDate, t), { StartProblem: 1 }));
  t += 2;
  rows.push(makeRow(userID, 'Active', activityNumber, generateTimestamp(baseDate, t), { PlanningTool: 1 }));
  t += 3;
  // SmartFarm Active: Diagram heavy, then Reading, then TileChange
  const cycles = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < cycles; i++) {
    // Always check diagram first (farm state visualization)
    rows.push(makeRow(userID, 'Active', activityNumber, generateTimestamp(baseDate, t), { Diagram: 1 }));
    t += 2;
    if (Math.random() < 0.65) {
      rows.push(makeRow(userID, 'Active', activityNumber, generateTimestamp(baseDate, t), { Reading: 1 }));
      t += 2;
    }
    rows.push(makeRow(userID, 'Active', activityNumber, generateTimestamp(baseDate, t), { TileChange: 1 }));
    t += 3;
    // Strong self-reflection via MoveHistory
    if (Math.random() < 0.7) {
      rows.push(makeRow(userID, 'Active', activityNumber, generateTimestamp(baseDate, t), { MoveHistory: 1 }));
      t += 2;
    }
    if (Math.random() < 0.4) {
      rows.push(makeRow(userID, 'Active', activityNumber, generateTimestamp(baseDate, t), { PlanningTool: 1 }));
      t += 2;
    }
  }
  rows.push(makeRow(userID, 'Active', activityNumber, generateTimestamp(baseDate, t), { EndProblem: 1 }));
  return rows;
}

function generateSmartFarmPassiveActivity(userID: string, activityNumber: number, baseDate: Date): EventRow[] {
  const rows: EventRow[] = [];
  let t = 0;
  rows.push(makeRow(userID, 'Passive', activityNumber, generateTimestamp(baseDate, t), { StartProblem: 1 }));
  t += 2;
  // SmartFarm Passive: pure trial-and-error TileChange, minimal planning/reading
  const cycles = 5 + Math.floor(Math.random() * 5);
  for (let i = 0; i < cycles; i++) {
    if (Math.random() < 0.12) {
      rows.push(makeRow(userID, 'Passive', activityNumber, generateTimestamp(baseDate, t), { Diagram: 1 }));
      t += 2;
    }
    if (Math.random() < 0.1) {
      rows.push(makeRow(userID, 'Passive', activityNumber, generateTimestamp(baseDate, t), { Reading: 1 }));
      t += 2;
    }
    // TileChange self-loop: often does TileChange repeatedly
    rows.push(makeRow(userID, 'Passive', activityNumber, generateTimestamp(baseDate, t), { TileChange: 1 }));
    t += 2;
    if (Math.random() < 0.5) {
      rows.push(makeRow(userID, 'Passive', activityNumber, generateTimestamp(baseDate, t), { TileChange: 1 }));
      t += 2;
    }
  }
  rows.push(makeRow(userID, 'Passive', activityNumber, generateTimestamp(baseDate, t), { EndProblem: 1 }));
  return rows;
}

export function generateSmartFarmData(): EventRow[] {
  const allRows: EventRow[] = [];
  const baseDate = new Date('2024-06-01T09:00:00Z');

  for (let u = 0; u < 15; u++) {
    const userID = `SF_Active_U${String(u + 1).padStart(2, '0')}`;
    for (let a = 1; a <= 4; a++) {
      const actDate = new Date(baseDate.getTime() + (u * 10 + a) * 3600 * 1000);
      allRows.push(...generateSmartFarmActiveActivity(userID, a, actDate));
    }
  }
  for (let u = 0; u < 15; u++) {
    const userID = `SF_Passive_U${String(u + 1).padStart(2, '0')}`;
    for (let a = 1; a <= 4; a++) {
      const actDate = new Date(baseDate.getTime() + (u * 10 + a) * 3600 * 1000);
      allRows.push(...generateSmartFarmPassiveActivity(userID, a, actDate));
    }
  }
  return allRows;
}

export const SMARTFARM_DATA: EventRow[] = generateSmartFarmData();

// ─── 세 번째 데이터셋: CSCL T/ONA (Zabolotna et al., 2025) ──────────────────
// CKC 코드(상호 배타적) + 조절 코드(비배타적): SimSketch(Active) vs Simua(Passive)
// SimSketch 패턴: Cogn→Negotiate 강, Emo_Mot→Negotiate 강, Emo_Mot 자기전이
// Simua 패턴: Share_Compare↔Emo_Mot 양방향 강, Negotiate→Cogn 중간, Share_Compare→Disagree 강

export const CSCL_CODES = ['Share_Compare', 'Disagree', 'Negotiate', 'Test_Modify', 'Emo_Mot', 'Cogn'] as const;
export type CsclCodeName = typeof CSCL_CODES[number];

function makeCsclRow(
  userID: string,
  condition: 'Active' | 'Passive',
  activityNumber: number,
  timestamp: string,
  ckc: CsclCodeName,
  emoMot: 0 | 1 = 0,
  cogn: 0 | 1 = 0
): EventRow {
  return {
    UserID: userID,
    Condition: condition,
    ActivityNumber: activityNumber,
    Timestamp: timestamp,
    Share_Compare: ckc === 'Share_Compare' ? 1 : 0,
    Disagree:      ckc === 'Disagree'      ? 1 : 0,
    Negotiate:     ckc === 'Negotiate'     ? 1 : 0,
    Test_Modify:   ckc === 'Test_Modify'   ? 1 : 0,
    Emo_Mot:       emoMot,
    Cogn:          cogn,
  };
}

// SimSketch episode: Cogn→Negotiate high, Emo_Mot→Negotiate high, Emo_Mot self-transition
function generateSimSketchEpisode(userID: string, actNum: number, baseDate: Date): EventRow[] {
  const rows: EventRow[] = [];
  let t = 0;
  const episodeCount = 8 + Math.floor(Math.random() * 6); // ~10 avg per group

  for (let i = 0; i < episodeCount; i++) {
    const r = Math.random();
    if (r < 0.30) {
      // Cogn → Negotiate (high probability)
      rows.push(makeCsclRow(userID, 'Active', actNum, generateTimestamp(baseDate, t), 'Negotiate', 0, 1));
      t += 65;
      if (Math.random() < 0.75) {
        rows.push(makeCsclRow(userID, 'Active', actNum, generateTimestamp(baseDate, t), 'Negotiate'));
        t += 65;
      }
    } else if (r < 0.55) {
      // Emo_Mot → Negotiate (high)
      rows.push(makeCsclRow(userID, 'Active', actNum, generateTimestamp(baseDate, t), 'Share_Compare', 1));
      t += 60;
      rows.push(makeCsclRow(userID, 'Active', actNum, generateTimestamp(baseDate, t), 'Negotiate', 1));
      t += 65;
    } else if (r < 0.70) {
      // Emo_Mot self-transition (Emo_Mot appears with repeated CKC)
      rows.push(makeCsclRow(userID, 'Active', actNum, generateTimestamp(baseDate, t), 'Share_Compare', 1));
      t += 60;
      rows.push(makeCsclRow(userID, 'Active', actNum, generateTimestamp(baseDate, t), 'Negotiate', 1));
      t += 65;
    } else if (r < 0.82) {
      // Emo_Mot → Test_Modify (medium)
      rows.push(makeCsclRow(userID, 'Active', actNum, generateTimestamp(baseDate, t), 'Test_Modify', 1));
      t += 65;
    } else if (r < 0.90) {
      // Share_Compare → Disagree (low)
      rows.push(makeCsclRow(userID, 'Active', actNum, generateTimestamp(baseDate, t), 'Share_Compare'));
      t += 60;
      rows.push(makeCsclRow(userID, 'Active', actNum, generateTimestamp(baseDate, t), 'Disagree'));
      t += 60;
    } else {
      rows.push(makeCsclRow(userID, 'Active', actNum, generateTimestamp(baseDate, t), 'Test_Modify', 0, 1));
      t += 65;
    }
  }
  return rows;
}

// Simua episode: Share_Compare↔Emo_Mot bidirectional, Negotiate→Cogn, Share_Compare→Disagree high
function generateSimuaEpisode(userID: string, actNum: number, baseDate: Date): EventRow[] {
  const rows: EventRow[] = [];
  let t = 0;
  const episodeCount = 25 + Math.floor(Math.random() * 10); // ~29 avg per group

  for (let i = 0; i < episodeCount; i++) {
    const r = Math.random();
    if (r < 0.28) {
      // Share_Compare → Emo_Mot (high)
      rows.push(makeCsclRow(userID, 'Passive', actNum, generateTimestamp(baseDate, t), 'Share_Compare', 0));
      t += 38;
      rows.push(makeCsclRow(userID, 'Passive', actNum, generateTimestamp(baseDate, t), 'Share_Compare', 1));
      t += 38;
    } else if (r < 0.52) {
      // Emo_Mot → Share_Compare (high, bidirectional)
      rows.push(makeCsclRow(userID, 'Passive', actNum, generateTimestamp(baseDate, t), 'Share_Compare', 1));
      t += 38;
      rows.push(makeCsclRow(userID, 'Passive', actNum, generateTimestamp(baseDate, t), 'Share_Compare'));
      t += 38;
    } else if (r < 0.65) {
      // Share_Compare → Disagree (high)
      rows.push(makeCsclRow(userID, 'Passive', actNum, generateTimestamp(baseDate, t), 'Share_Compare'));
      t += 38;
      rows.push(makeCsclRow(userID, 'Passive', actNum, generateTimestamp(baseDate, t), 'Disagree'));
      t += 38;
    } else if (r < 0.78) {
      // Negotiate → Cogn (medium)
      rows.push(makeCsclRow(userID, 'Passive', actNum, generateTimestamp(baseDate, t), 'Negotiate'));
      t += 38;
      rows.push(makeCsclRow(userID, 'Passive', actNum, generateTimestamp(baseDate, t), 'Share_Compare', 0, 1));
      t += 38;
    } else if (r < 0.88) {
      rows.push(makeCsclRow(userID, 'Passive', actNum, generateTimestamp(baseDate, t), 'Test_Modify'));
      t += 38;
    } else {
      rows.push(makeCsclRow(userID, 'Passive', actNum, generateTimestamp(baseDate, t), 'Disagree', 0, 1));
      t += 38;
    }
  }
  return rows;
}

export function generateCsclData(): EventRow[] {
  const allRows: EventRow[] = [];
  const baseDate = new Date('2024-09-01T09:00:00Z');

  // SimSketch: 9 groups × 3-4 members → use 9 "unit" IDs (Zabolotna treats group as unit)
  for (let g = 1; g <= 9; g++) {
    const userID = `SimSketch_G${String(g).padStart(2, '0')}`;
    for (let a = 1; a <= 2; a++) {
      const actDate = new Date(baseDate.getTime() + (g * 8 + a) * 3600 * 1000);
      allRows.push(...generateSimSketchEpisode(userID, a, actDate));
    }
  }

  // Simua: 5 groups × 3 members → 5 "unit" IDs
  for (let g = 1; g <= 5; g++) {
    const userID = `Simua_G${String(g).padStart(2, '0')}`;
    for (let a = 1; a <= 2; a++) {
      const actDate = new Date(baseDate.getTime() + (g * 8 + a) * 3600 * 1000);
      allRows.push(...generateSimuaEpisode(userID, a, actDate));
    }
  }

  return allRows;
}

export const CSCL_DATA: EventRow[] = generateCsclData();

export interface DatasetConfig {
  key: string;
  label: string;
  description: string;
  context: string;
  activeGroupLabel: string;
  passiveGroupLabel: string;
  data: EventRow[];
  codes?: readonly string[];
}

export const DATASETS: DatasetConfig[] = [
  {
    key: 'futureworld',
    label: '퓨쳐월드 (Futureworld)',
    description: '지속 가능 발전 교육용 게임. 환경 문제를 해결하며 자기 조절 학습 패턴을 분석합니다.',
    context: '대학원생 30명 | 계획 도구 활용도 기준 집단 분류',
    activeGroupLabel: '적극적 계획 집단 (계획 도구 高)',
    passiveGroupLabel: '소극적 계획 집단 (계획 도구 低)',
    data: SAMPLE_DATA,
  },
  {
    key: 'smartfarm',
    label: '스마트팜 (SmartFarm)',
    description: '농업 시뮬레이션 기반 STEM 교육 게임. 작물 재배 문제 해결 과정에서의 탐구 패턴을 분석합니다.',
    context: '대학생 30명 | 다이어그램·성찰 활용도 기준 집단 분류',
    activeGroupLabel: '탐구 중심 집단 (Diagram·MoveHistory 高)',
    passiveGroupLabel: '시행착오 집단 (TileChange 반복 中心)',
    data: SMARTFARM_DATA,
  },
  {
    key: 'cscl',
    label: 'CSCL T/ONA (Zabolotna et al., 2025)',
    description: '협력 지식 구성(CKC)과 집단 수준 조절의 시간적 맞물림. SimSketch(포스터 제작) vs Simua(로봇 조립) 과제 비교.',
    context: '중학생 49명 | 14개 집단 | 두 CSCL 과제 유형 기준 비교',
    activeGroupLabel: 'SimSketch (개념 포스터 제작)',
    passiveGroupLabel: 'Simua (로봇 조립)',
    data: CSCL_DATA,
    codes: CSCL_CODES,
  },
];
