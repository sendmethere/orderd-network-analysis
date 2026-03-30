'use client';

import { useState } from 'react';
import { OnaResult, CodeName } from '@/lib/types';

interface InfoPanelProps {
  result: OnaResult | null;
  selectedEdge?: { ground: CodeName; response: CodeName } | null;
  stanzaDetails?: Array<{ rowIndex: number; userID: string; activityNumber: number; activeCodes: string[] }>;
  viewMode: 'both' | 'active' | 'passive' | 'subtracted';
}

const CODE_DESCRIPTIONS: Record<string, string> = {
  StartProblem: '문제 시작 — 게임에서 새로운 환경 문제가 시작되는 시스템 자동 이벤트',
  EndProblem: '문제 종료 — 환경 문제가 성공적으로 해결되어 마무리되는 시스템 자동 이벤트',
  PlanningTool: '계획 도구 — 목표를 설정하고 전략을 수립하는 자기 조절 학습 행동',
  MoveHistory: '이동 내역 — 타일 교체 기록을 되돌아보는 자기 성찰(Self-reflection) 행동',
  TileChange: '타일 교체 — 환경 타일을 다른 옵션으로 교체하는 핵심 문제 해결 행동',
  Reading: '읽기 — 타일 교체 전 텍스트 정보를 읽는 탐색 및 학습 행동',
  Diagram: '다이어그램 — 환경 상태 다이어그램을 확인하는 시각적 학습 행동',
  // CSCL T/ONA codes
  Share_Compare: '공유·비교 — 자신의 생각을 말하고 동료의 생각과 비교하는 정보 공유 행동',
  Disagree: '불일치 탐색 — 반론 제기, 의견 충돌을 드러내고 탐색하는 행동',
  Negotiate: '공유 의미 협상 — 절충안 탐색, 함께 의미 만들기 (CKC 핵심 단계)',
  Test_Modify: '가설 검증·수정 — 제안된 이해를 확인하거나 수정하는 비판적 검토 행동',
  Emo_Mot: '감정·동기 조절 — 부정적 감정을 긍정으로 전환하고 집단 분위기를 유지하는 행동',
  Cogn: '인지 조절 — 과제 이해 부족을 인식하고 전략을 조정하는 메타인지 행동',
};

export default function InfoPanel({ result, selectedEdge, stanzaDetails, viewMode }: InfoPanelProps) {
  const [activeTab, setActiveTab] = useState<'guide' | 'data' | 'edge' | 'process'>('guide');

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Tabs */}
      <div className="grid grid-cols-4 border-b border-slate-200">
        {[
          { id: 'guide', label: '해설' },
          { id: 'data',  label: '데이터' },
          { id: 'edge',  label: '연결' },
          { id: 'process', label: '분석 원리' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'guide' | 'data' | 'edge' | 'process')}
            className={`text-xs font-semibold py-3 border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4 text-sm overflow-y-auto max-h-[500px]">
        {/* ─ Guide Tab ─ */}
        {activeTab === 'guide' && (
          <div className="space-y-4">
            <Section title="시각적 요소 해설">
              <GuideItem icon="⭕" title="노드 크기">
                노드의 크기는 이 행동이 이전 상황에 대한 <strong>'반응(Response)'</strong>으로서 얼마나 자주, 능동적으로 선택되었는지를 나타냅니다.
              </GuideItem>
              <GuideItem icon="🔵" title="노드 내부 원 (자기 연결)">
                노드 중앙의 색칠된 원은 동일한 행동이 연이어 발생한 <strong>'자기 연결'</strong>의 빈도와 강도를 의미합니다.
              </GuideItem>
              <GuideItem icon="△" title="삼각형 엣지 (브로드캐스트 모델)">
                두 노드를 연결하는 삼각형의 두께와 채도가 높을수록 두 행동 간의 연속적인 발생 빈도(연결 강도)가 강합니다. <strong>꼭짓점은 정보의 출처(Ground)</strong>를, <strong>밑변은 반응(Response)</strong>을 나타냅니다.
              </GuideItem>
              <GuideItem icon="›" title="쉐브론 기호 (방향성)">
                삼각형 위의 꺾쇠(Chevron) 기호는 인과적 흐름과 순서를 보여줍니다. 양방향 연결이 존재할 경우, <strong>더 빈번하게 발생한 방향에만</strong> 표시됩니다.
              </GuideItem>
            </Section>

            <Section title="공간 해석">
              <p className="text-slate-600 text-xs leading-relaxed">
                노드가 위치한 공간은 무작위가 아닙니다. <strong>공동 등록(Co-registration)</strong> 알고리즘을 통해 노드와 사용자의 점 사이 거리가 최소화되도록 배치됩니다.
              </p>
              <p className="text-slate-600 text-xs leading-relaxed mt-1">
                사용자의 점(●)이 특정 노드 방향에 치우쳐 있다면, 해당 사용자가 그 노드들 사이의 연결을 훨씬 더 빈번하게 발생시켰다는 것을 뜻합니다.
              </p>
              <p className="text-slate-600 text-xs leading-relaxed mt-1">
                <strong>■ 사각형</strong>은 그룹 평균을, <strong>점선 박스</strong>는 95% 신뢰구간을 나타냅니다.
              </p>
            </Section>

            {viewMode === 'subtracted' && (
              <Section title="빼기 네트워크 해설">
                <p className="text-slate-600 text-xs leading-relaxed">
                  빼기 네트워크 모드에서는 두 집단(적극적 계획 집단 vs 소극적 계획 집단) 간의 연결 가중치 차이를 대비되는 색상으로 시각화합니다.
                </p>
                <div className="mt-2 space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
                    <span className="text-slate-600"><strong>파란색</strong>: 적극적 계획 집단의 연결이 더 강함</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
                    <span className="text-slate-600"><strong>빨간색</strong>: 소극적 계획 집단의 연결이 더 강함</span>
                  </div>
                </div>
                <p className="text-slate-600 text-xs mt-2 leading-relaxed">
                  적극적 계획 집단(파란색)은 계획 도구 → 읽기/다이어그램으로 이어지는 연결이 강합니다. 소극적 계획 집단(빨간색)은 타일 교체 중심의 단순 반복 패턴이 두드러집니다.
                </p>
              </Section>
            )}
          </div>
        )}

        {/* ─ Data Tab ─ */}
        {activeTab === 'data' && (
          <div className="space-y-4">
            <Section title="퓨쳐월드(Futureworld) 샘플 데이터">
              <p className="text-slate-600 text-xs leading-relaxed">
                이 데이터는 지속 가능 발전 교육용 게임에서 수집되었습니다. 자기 조절 학습을 위해 '계획 도구(PlanningTool)'와 '이동 내역(MoveHistory)'을 사용하며, 문제 해결을 위해 '타일 교체(TileChange)', '읽기(Reading)', '다이어그램(Diagram)' 등의 학습 행동을 수행합니다.
              </p>
              {result && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <StatCard label="전체 학습자" value={result.units.length} />
                  <StatCard label="적극적 계획" value={result.units.filter(u => u.condition === 'Active').length} color="text-blue-700" />
                  <StatCard label="소극적 계획" value={result.units.filter(u => u.condition === 'Passive').length} color="text-red-700" />
                  <StatCard label="연결 수" value={result.edges.length} />
                </div>
              )}
            </Section>

            <Section title="변인(노드) 설명">
              <div className="space-y-2">
                {(result?.nodes ?? []).map(node => (
                  <div key={node.code} className="text-xs">
                    <span className="font-semibold text-slate-700">{node.code}</span>
                    <span className="text-slate-500 ml-1">— {CODE_DESCRIPTIONS[node.code] ?? '코드 설명 없음'}</span>
                    {result && (
                      <div className="mt-0.5 text-slate-400">
                        반응 횟수: {node.responseCount}회
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}

        {/* ─ Edge/Interpretive Loop Tab ─ */}
        {activeTab === 'edge' && (
          <div className="space-y-4">
            {selectedEdge ? (
              <>
                <Section title={`${selectedEdge.ground} → ${selectedEdge.response}`}>
                  <p className="text-xs text-slate-600 mb-2">
                    이 연결은 <strong>{selectedEdge.ground}</strong>이 발생한 후, 스탄자 창 내에서 <strong>{selectedEdge.response}</strong>가 반응으로 등장한 패턴을 나타냅니다.
                  </p>
                  {result && (() => {
                    const edge = result.edges.find(
                      e => e.ground === selectedEdge.ground && e.response === selectedEdge.response
                    );
                    if (!edge) return <p className="text-xs text-slate-400">연결 정보 없음</p>;
                    return (
                      <div className="space-y-1.5 text-xs">
                        <Row label="Active 평균 가중치" value={edge.weightActive.toFixed(4)} color="text-blue-700" />
                        <Row label="Passive 평균 가중치" value={edge.weightPassive.toFixed(4)} color="text-red-700" />
                        <Row label="차이 (Active - Passive)" value={edge.weightDiff > 0 ? `+${edge.weightDiff.toFixed(4)}` : edge.weightDiff.toFixed(4)} color={edge.weightDiff > 0 ? 'text-blue-600' : 'text-red-600'} />
                        <Row label="지배 집단" value={edge.dominantGroup === 'Active' ? '적극적 계획 집단' : edge.dominantGroup === 'Passive' ? '소극적 계획 집단' : '동일'} />
                      </div>
                    );
                  })()}
                </Section>
                {stanzaDetails && stanzaDetails.length > 0 && (
                  <Section title="이동 스탄자 창 내역 (해석적 루프)">
                    <p className="text-xs text-slate-500 mb-2">
                      이 연결을 생성한 원본 로그 데이터 샘플입니다.
                    </p>
                    <div className="space-y-1.5">
                      {stanzaDetails.slice(0, 10).map((entry, i) => (
                        <div key={i} className="text-xs bg-slate-50 rounded p-2">
                          <span className="font-mono text-slate-500">{entry.userID}</span>
                          <span className="text-slate-400 mx-1">활동 {entry.activityNumber}</span>
                          <span className="text-indigo-600">→ [{entry.activeCodes.join(', ')}]</span>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-slate-400 text-sm">
                <div className="text-2xl mb-2">△</div>
                <p>그래프의 삼각형 엣지를 클릭하면</p>
                <p>연결 상세 정보와 원본 데이터를 확인할 수 있습니다.</p>
                <p className="mt-2 text-xs">(해석적 루프 닫기)</p>
              </div>
            )}
          </div>
        )}

        {/* ─ Process / Pipeline Tab ─ */}
        {activeTab === 'process' && <ProcessTab />}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   분석 원리 탭: ONA 계산 파이프라인 + 해석 논리
   ═══════════════════════════════════════════════════════════ */
function ProcessTab() {
  const [openStep, setOpenStep] = useState<number | null>(0);
  const [openInterp, setOpenInterp] = useState<number | null>(0);

  const steps = [
    {
      num: 1,
      title: '이동 스탄자 창',
      subtitle: 'Moving Stanza Window',
      color: 'bg-violet-50 border-violet-200',
      badge: 'bg-violet-600',
      diagram: <StanzaWindowDiagram />,
      what: '데이터를 한 줄씩 스캔하며 현재 이벤트(Response)와 창 안의 이전 이벤트(Ground) 사이의 방향성 연결을 추출합니다.',
      how: '창 크기가 7이면 현재 행을 기준으로 최대 6개 이전 행을 Ground로 삼아 짝을 만듭니다. 창이 클수록 더 멀리 떨어진 사건들도 연결됩니다.',
      key: '같은 대화(Activity) 안에서만 연결을 추출합니다. 서로 다른 문제 세션끼리는 연결되지 않습니다.',
    },
    {
      num: 2,
      title: '비대칭 인접 행렬',
      subtitle: 'Asymmetric Adjacency Matrix',
      color: 'bg-blue-50 border-blue-200',
      badge: 'bg-blue-600',
      diagram: <AdjacencyMatrixDiagram />,
      what: '각 학습자(분석 단위)별로 N×N 행렬을 구성합니다. 행렬의 [Ground][Response] 셀에 연결 횟수를 누적합니다.',
      how: 'A→B와 B→A는 별개의 셀에 독립적으로 기록됩니다. 대각선(A→A)은 자기 연결(Self-connection)을 나타냅니다. 이후 행렬을 1차원 벡터(길이 N²)로 펼칩니다.',
      key: '일반 네트워크 분석의 대칭 행렬(A↔B)과 달리, ONA는 방향(인과 순서)을 보존합니다.',
    },
    {
      num: 3,
      title: '구면 정규화',
      subtitle: 'Spherical Normalization',
      color: 'bg-cyan-50 border-cyan-200',
      badge: 'bg-cyan-600',
      diagram: <NormalizationDiagram />,
      what: '학습자마다 이벤트 발생 총량(발화량)이 다르므로, 벡터를 그 크기(L2 노름)로 나눠 단위 구면 위의 점으로 변환합니다.',
      how: 'v_norm = v / ‖v‖. 정규화 후 각 값은 0~1 범위로 수렴하며, 절대 빈도가 아닌 상대적 연결 패턴을 나타냅니다.',
      key: '이 과정 덕분에 100개 이벤트를 발생시킨 학습자와 30개를 발생시킨 학습자를 공정하게 비교할 수 있습니다.',
    },
    {
      num: 4,
      title: '차원 축소 — 평균 회전',
      subtitle: 'Means Rotation (MR)',
      color: 'bg-emerald-50 border-emerald-200',
      badge: 'bg-emerald-600',
      diagram: <MeansRotationDiagram />,
      what: '고차원(N²) 정규화 벡터를 2D 공간으로 압축합니다. 두 집단이 있을 때는 집단 간 차이를 극대화하는 평균 회전(MR)을 사용합니다.',
      how: '두 집단 평균 벡터의 차이 방향을 MR1(X축)으로 설정합니다. 그 직교 방향의 주성분을 MR2(Y축)로 설정합니다. 결과: 각 학습자는 2D 공간의 단일 점(ONA 점수)을 갖게 됩니다.',
      key: 'MR1(가로축)이 두 집단을 가장 잘 분리하는 방향입니다. 집단 간 차이는 주로 X축을 따라 나타납니다.',
    },
    {
      num: 5,
      title: '공동 등록 최적화',
      subtitle: 'Co-registration',
      color: 'bg-amber-50 border-amber-200',
      badge: 'bg-amber-700',
      diagram: <CoregistrationDiagram />,
      what: '2D 공간에서 각 학습자의 ONA 점수(●)와 그 학습자의 네트워크 센트로이드(연결 가중치로 계산한 노드 위치의 가중 평균) 사이의 거리를 최소화하도록 노드 위치를 최적화합니다.',
      how: '연립 최소제곱 문제를 유사역행렬(pseudoinverse)로 풉니다. 결과: 각 노드가 "그 노드와 자주 연결된 학습자들이 모여 있는 공간"으로 이동합니다.',
      key: '이 과정으로 "어떤 노드가 오른쪽에 있다 → 오른쪽 학습자들이 그 노드를 자주 사용했다"는 공간적 해석이 가능해집니다.',
    },
  ];

  const interps = [
    {
      title: '① 전체 공간 배치부터 파악하세요',
      icon: '🗺️',
      content: '먼저 어떤 노드가 오른쪽/왼쪽/위/아래에 모여 있는지 확인합니다. 그 방향이 해당 차원(X축, Y축)을 정의하는 핵심 행동 패턴입니다.',
    },
    {
      title: '② 집단 평균(■)의 위치를 비교하세요',
      icon: '📍',
      content: '두 집단의 사각형(■) 사이의 거리와 방향을 확인합니다. X축(MR1)에서의 거리가 클수록 두 집단의 행동 패턴 차이가 큽니다. 점선 박스(95% CI)가 겹치지 않으면 통계적으로 유의미한 차이입니다.',
    },
    {
      title: '③ 삼각형 엣지로 인과 흐름을 읽으세요',
      icon: '△',
      content: '꼭짓점(Ground) → 밑변(Response) 방향으로 행동이 이어진 것입니다. 두꺼울수록 그 순서가 자주 발생했다는 뜻입니다. 쉐브론(›) 기호가 최종 방향을 확인시켜 줍니다.',
    },
    {
      title: '④ 노드 크기로 행동의 능동성을 판단하세요',
      icon: '⭕',
      content: '노드가 클수록 그 행동이 이전 상황에 반응(Response)하여 자주 등장했다는 뜻입니다. 중앙의 색칠된 원이 클수록 동일한 행동이 연이어 반복(자기 연결)된 것입니다.',
    },
    {
      title: '⑤ 빼기 네트워크로 집단 차이를 구체화하세요',
      icon: '➖',
      content: '빼기 네트워크 모드에서는 두 집단의 평균 연결 강도 차이만 시각화됩니다. 파란 삼각형은 Active 집단에서 더 강하게 나타난 행동 흐름, 빨간 삼각형은 Passive 집단에서 더 강한 흐름입니다.',
    },
  ];

  return (
    <div className="space-y-5">
      {/* Pipeline */}
      <div>
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">
          계산 파이프라인 — 5단계
        </div>
        <div className="space-y-1.5">
          {steps.map((step) => (
            <div key={step.num} className={`rounded-lg border overflow-hidden ${step.color}`}>
              <button
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left"
                onClick={() => setOpenStep(openStep === step.num - 1 ? null : step.num - 1)}
              >
                <span className={`flex-shrink-0 w-5 h-5 rounded-full ${step.badge} text-white text-[10px] font-bold flex items-center justify-center`}>
                  {step.num}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-800 truncate">{step.title}</div>
                  <div className="text-[10px] text-slate-500 truncate">{step.subtitle}</div>
                </div>
                <span className="text-slate-400 text-xs flex-shrink-0">
                  {openStep === step.num - 1 ? '▲' : '▼'}
                </span>
              </button>

              {openStep === step.num - 1 && (
                <div className="px-3 pb-3 space-y-2.5">
                  {/* Diagram */}
                  <div className="flex justify-center bg-white/70 rounded-lg p-2">
                    {step.diagram}
                  </div>
                  {/* Text */}
                  <div className="space-y-2">
                    <LabeledText label="무엇을" text={step.what} />
                    <LabeledText label="어떻게" text={step.how} />
                    <div className="bg-white/80 border border-current/10 rounded p-2 text-[10px] text-slate-600 leading-relaxed">
                      <span className="font-bold text-slate-700">핵심 포인트 </span>{step.key}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-100" />

      {/* Interpretation Guide */}
      <div>
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">
          그래프 해석 순서
        </div>
        <div className="space-y-1.5">
          {interps.map((item, i) => (
            <div key={i} className="rounded-lg border border-slate-200 overflow-hidden">
              <button
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-slate-50"
                onClick={() => setOpenInterp(openInterp === i ? null : i)}
              >
                <span className="text-base leading-none flex-shrink-0">{item.icon}</span>
                <span className="flex-1 text-xs font-semibold text-slate-700 text-left">{item.title}</span>
                <span className="text-slate-400 text-xs flex-shrink-0">
                  {openInterp === i ? '▲' : '▼'}
                </span>
              </button>
              {openInterp === i && (
                <div className="px-3 pb-3">
                  <p className="text-[11px] text-slate-600 leading-relaxed">{item.content}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Mini Diagrams ─────────────────────────────────────────── */

function StanzaWindowDiagram() {
  const rows = [
    { label: 'row i-3', codes: 'PlanningTool', role: 'ground' },
    { label: 'row i-2', codes: 'Reading', role: 'ground' },
    { label: 'row i-1', codes: 'Diagram', role: 'ground' },
    { label: 'row i',   codes: 'TileChange', role: 'response' },
  ];
  return (
    <svg width="220" height="120" viewBox="0 0 220 120" className="text-xs">
      {/* Window bracket */}
      <rect x="4" y="4" width="212" height="112" rx="6"
        fill="none" stroke="#8b5cf6" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.5" />
      <text x="110" y="16" textAnchor="middle" fontSize="8" fill="#7c3aed" fontWeight="700">
        스탄자 창 (크기 = 4)
      </text>
      {rows.map((r, i) => {
        const y = 24 + i * 22;
        const isResp = r.role === 'response';
        return (
          <g key={i}>
            <rect x="8" y={y} width="204" height="18" rx="3"
              fill={isResp ? '#e0e7ff' : '#f5f3ff'} />
            <text x="14" y={y + 12} fontSize="8" fill="#6b7280">{r.label}</text>
            <rect x="70" y={y + 3} width="80" height="12" rx="2"
              fill={isResp ? '#6366f1' : '#8b5cf6'} opacity={isResp ? 1 : 0.55} />
            <text x="110" y={y + 12} textAnchor="middle" fontSize="8"
              fill="white" fontWeight={isResp ? '700' : '400'}>{r.codes}</text>
            <text x="162" y={y + 12} fontSize="8"
              fill={isResp ? '#4338ca' : '#7c3aed'} fontWeight="600">
              {isResp ? '← Response' : '← Ground'}
            </text>
          </g>
        );
      })}
      {/* Arrow: Ground → Response */}
      <line x1="58" y1="46" x2="58" y2="88" stroke="#8b5cf6" strokeWidth="1.5" markerEnd="url(#arr)" />
      <defs>
        <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#8b5cf6" />
        </marker>
      </defs>
    </svg>
  );
}

function AdjacencyMatrixDiagram() {
  const codes = ['Plan', 'Read', 'Tile'];
  const data = [
    [3, 5, 2],
    [1, 2, 8],
    [4, 1, 3],
  ];
  const maxVal = 8;
  return (
    <svg width="210" height="120" viewBox="0 0 210 120">
      <text x="105" y="10" textAnchor="middle" fontSize="8" fill="#64748b" fontWeight="700">
        비대칭 인접 행렬 (Ground → Response)
      </text>
      {/* Col headers */}
      {codes.map((c, j) => (
        <text key={j} x={62 + j * 42} y="24" textAnchor="middle" fontSize="8" fill="#3b82f6" fontWeight="600">{c}</text>
      ))}
      <text x="14" y="24" fontSize="7" fill="#94a3b8">Ground↓</text>
      {/* Row headers + cells */}
      {codes.map((r, i) => (
        <g key={i}>
          <text x="44" y={38 + i * 26} textAnchor="end" fontSize="8" fill="#8b5cf6" fontWeight="600">{r}</text>
          {codes.map((_, j) => {
            const val = data[i][j];
            const intensity = val / maxVal;
            const isSelf = i === j;
            return (
              <g key={j}>
                <rect x={50 + j * 42} y={26 + i * 26} width="34" height="20" rx="3"
                  fill={isSelf ? `rgba(59,130,246,${0.15 + intensity * 0.6})` : `rgba(99,102,241,${0.1 + intensity * 0.6})`}
                  stroke={isSelf ? '#3b82f6' : '#e2e8f0'} strokeWidth={isSelf ? '1.5' : '0.5'} />
                <text x={67 + j * 42} y={40 + i * 26} textAnchor="middle" fontSize="9"
                  fill={intensity > 0.5 ? 'white' : '#334155'} fontWeight="600">{val}</text>
              </g>
            );
          })}
        </g>
      ))}
      {/* Self-connection label */}
      <text x="105" y="108" textAnchor="middle" fontSize="7.5" fill="#3b82f6">
        ↖ 대각선 = 자기 연결(A→A)
      </text>
    </svg>
  );
}

function NormalizationDiagram() {
  return (
    <svg width="210" height="112" viewBox="0 0 210 112">
      <text x="105" y="10" textAnchor="middle" fontSize="8" fill="#64748b" fontWeight="700">
        구면 정규화: v → v / ‖v‖
      </text>
      {/* Before */}
      <text x="52" y="25" textAnchor="middle" fontSize="8" fill="#94a3b8">정규화 전</text>
      {[
        { w: 60, label: 'A', color: '#818cf8' },
        { w: 35, label: 'B', color: '#818cf8' },
        { w: 48, label: 'C', color: '#818cf8' },
      ].map((b, i) => (
        <g key={i}>
          <rect x="8" y={30 + i * 20} width={b.w} height="14" rx="3" fill={b.color} opacity="0.7" />
          <text x="6" y={41 + i * 20} textAnchor="end" fontSize="8" fill="#64748b">{b.label}</text>
        </g>
      ))}
      {/* Arrow */}
      <text x="105" y="56" textAnchor="middle" fontSize="11" fill="#6366f1">→</text>
      <text x="105" y="67" textAnchor="middle" fontSize="7.5" fill="#6366f1" fontWeight="600">÷ ‖v‖</text>
      {/* After */}
      <text x="160" y="25" textAnchor="middle" fontSize="8" fill="#94a3b8">정규화 후</text>
      {[
        { w: 44, val: '0.71', color: '#6366f1' },
        { w: 26, val: '0.42', color: '#6366f1' },
        { w: 36, val: '0.57', color: '#6366f1' },
      ].map((b, i) => (
        <g key={i}>
          <rect x="114" y={30 + i * 20} width={b.w} height="14" rx="3" fill={b.color} opacity="0.8" />
          <text x={162 + b.w / 2} y={41 + i * 20} fontSize="8" fill="#334155" fontWeight="600">{b.val}</text>
        </g>
      ))}
      {/* Sphere hint */}
      <circle cx="105" cy="94" r="12" fill="none" stroke="#6366f1" strokeWidth="1" strokeDasharray="3,2" opacity="0.5" />
      <circle cx="113" cy="89" r="2.5" fill="#6366f1" opacity="0.8" />
      <circle cx="98" cy="97" r="2.5" fill="#818cf8" opacity="0.8" />
      <text x="105" y="110" textAnchor="middle" fontSize="7.5" fill="#64748b">모든 벡터가 단위 구면 위로</text>
    </svg>
  );
}

function MeansRotationDiagram() {
  const activePoints = [[155,55],[165,45],[145,60],[158,50],[170,58]];
  const passivePoints = [[55,65],[62,50],[48,72],[58,55],[65,68]];
  const activeMean = [159, 54];
  const passiveMean = [58, 62];
  return (
    <svg width="210" height="118" viewBox="0 0 210 118">
      <text x="105" y="10" textAnchor="middle" fontSize="8" fill="#64748b" fontWeight="700">
        평균 회전: 집단 간 거리 → X축(MR1)
      </text>
      {/* MR1 axis */}
      <line x1="20" y1="75" x2="195" y2="75" stroke="#e2e8f0" strokeWidth="1" />
      <line x1="105" y1="20" x2="105" y2="105" stroke="#e2e8f0" strokeWidth="1" />
      {/* Passive dots */}
      {passivePoints.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4" fill="#ef4444" opacity="0.55" />
      ))}
      {/* Active dots */}
      {activePoints.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4" fill="#3b82f6" opacity="0.55" />
      ))}
      {/* Means */}
      <rect x={activeMean[0]-5} y={activeMean[1]-5} width="10" height="10" fill="#3b82f6" stroke="white" strokeWidth="1.5" />
      <rect x={passiveMean[0]-5} y={passiveMean[1]-5} width="10" height="10" fill="#ef4444" stroke="white" strokeWidth="1.5" />
      {/* Arrow between means */}
      <line x1={passiveMean[0]+6} y1={passiveMean[1]} x2={activeMean[0]-6} y2={activeMean[1]}
        stroke="#6366f1" strokeWidth="1.5" strokeDasharray="3,2"
        markerEnd="url(#mr-arr)" />
      <defs>
        <marker id="mr-arr" markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" orient="auto">
          <path d="M0,0 L5,2.5 L0,5 Z" fill="#6366f1" />
        </marker>
      </defs>
      <text x="105" y="94" textAnchor="middle" fontSize="8" fill="#6366f1" fontWeight="700">
        MR1 (X축) ← 이 방향이 집단 차이 극대화
      </text>
      <text x="18" y="109" fontSize="7.5" fill="#ef4444" fontWeight="600">Passive</text>
      <text x="152" y="44" fontSize="7.5" fill="#3b82f6" fontWeight="600">Active</text>
    </svg>
  );
}

function CoregistrationDiagram() {
  return (
    <svg width="210" height="118" viewBox="0 0 210 118">
      <text x="105" y="10" textAnchor="middle" fontSize="8" fill="#64748b" fontWeight="700">
        공동 등록: ONA점수 ≈ 네트워크 센트로이드
      </text>
      {/* Nodes */}
      <circle cx="60"  cy="45" r="14" fill="#f8fafc" stroke="#334155" strokeWidth="1.5" />
      <text x="60"  y="49" textAnchor="middle" fontSize="7" fill="#334155" fontWeight="600">Plan</text>
      <circle cx="150" cy="40" r="14" fill="#f8fafc" stroke="#334155" strokeWidth="1.5" />
      <text x="150" y="44" textAnchor="middle" fontSize="7" fill="#334155" fontWeight="600">Read</text>
      <circle cx="105" cy="90" r="14" fill="#f8fafc" stroke="#334155" strokeWidth="1.5" />
      <text x="105" y="94" textAnchor="middle" fontSize="7" fill="#334155" fontWeight="600">Tile</text>
      {/* Edges */}
      <line x1="74" y1="50" x2="136" y2="45" stroke="#6366f1" strokeWidth="2" opacity="0.4" />
      <line x1="68" y1="56" x2="96" y2="78" stroke="#6366f1" strokeWidth="3.5" opacity="0.6" />
      <line x1="143" y1="52" x2="117" y2="78" stroke="#6366f1" strokeWidth="1.5" opacity="0.3" />
      {/* Centroid */}
      <circle cx="95" cy="68" r="4" fill="#6366f1" opacity="0.3" />
      {/* ONA score point */}
      <circle cx="93" cy="70" r="5" fill="#3b82f6" stroke="white" strokeWidth="1.5" />
      {/* Dashed line */}
      <line x1="93" y1="70" x2="95" y2="68" stroke="#3b82f6" strokeWidth="1" strokeDasharray="2,1" />
      <text x="105" y="108" textAnchor="middle" fontSize="7.5" fill="#6366f1">
        ● ONA점수 ≈ ◎ 센트로이드 (최소화)
      </text>
    </svg>
  );
}

function LabeledText({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{label} </span>
      <span className="text-[10.5px] text-slate-600 leading-relaxed">{text}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{title}</h3>
      {children}
    </div>
  );
}

function GuideItem({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 py-2 border-b border-slate-100 last:border-0">
      <span className="text-lg leading-none mt-0.5">{icon}</span>
      <div>
        <div className="font-semibold text-slate-700 text-xs mb-0.5">{title}</div>
        <p className="text-slate-500 text-xs leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

function StatCard({ label, value, color = 'text-slate-800' }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-slate-50 rounded-lg p-2.5 text-center">
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function Row({ label, value, color = 'text-slate-700' }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-slate-500">{label}</span>
      <span className={`font-mono font-semibold ${color}`}>{value}</span>
    </div>
  );
}
