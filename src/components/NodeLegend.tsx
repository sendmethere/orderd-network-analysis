'use client';

import { OnaResult, CodeName } from '@/lib/types';

interface NodeLegendProps {
  result: OnaResult | null;
  highlightedNode: CodeName | null;
  onNodeHover: (code: CodeName | null) => void;
}

interface CodeMeta {
  korean: string;
  category: string;
  categoryColor: string;
  description: string;
  icon: string;
}

const CODE_META_MAP: Record<string, CodeMeta> = {
  // Futureworld / SmartFarm codes
  StartProblem: {
    korean: '문제 시작', category: '시스템', categoryColor: 'bg-slate-100 text-slate-600',
    description: '새로운 문제가 시작되는 시스템 자동 이벤트', icon: '▶',
  },
  EndProblem: {
    korean: '문제 종료', category: '시스템', categoryColor: 'bg-slate-100 text-slate-600',
    description: '문제가 성공적으로 해결되어 마무리되는 이벤트', icon: '⏹',
  },
  PlanningTool: {
    korean: '계획 도구', category: '자기조절', categoryColor: 'bg-violet-100 text-violet-700',
    description: '목표를 설정하고 전략을 수립하는 자기 조절 학습 행동', icon: '📋',
  },
  MoveHistory: {
    korean: '이동 내역', category: '자기조절', categoryColor: 'bg-violet-100 text-violet-700',
    description: '이전 행동을 되돌아보는 자기 성찰(Self-reflection) 행동', icon: '🔄',
  },
  TileChange: {
    korean: '타일 교체', category: '인지·문제해결', categoryColor: 'bg-emerald-100 text-emerald-700',
    description: '환경 타일을 교체하는 핵심 문제 해결 행동', icon: '🔧',
  },
  Reading: {
    korean: '읽기', category: '인지·문제해결', categoryColor: 'bg-emerald-100 text-emerald-700',
    description: '텍스트 정보를 읽는 탐색 및 학습 행동', icon: '📖',
  },
  Diagram: {
    korean: '다이어그램', category: '인지·문제해결', categoryColor: 'bg-emerald-100 text-emerald-700',
    description: '상태 다이어그램을 확인하는 시각적 학습 행동', icon: '📊',
  },
  // CSCL T/ONA codes
  Share_Compare: {
    korean: '공유·비교', category: 'CKC', categoryColor: 'bg-blue-100 text-blue-700',
    description: '자신의 생각을 말하고 동료의 생각과 비교하는 정보 공유 행동', icon: '💬',
  },
  Disagree: {
    korean: '불일치 탐색', category: 'CKC', categoryColor: 'bg-orange-100 text-orange-700',
    description: '반론 제기, 의견 충돌 — 불협화음을 드러내고 탐색하는 행동', icon: '⚡',
  },
  Negotiate: {
    korean: '공유 의미 협상', category: 'CKC', categoryColor: 'bg-indigo-100 text-indigo-700',
    description: '절충안 탐색, 함께 의미 만들기 — 공동 지식 구성의 핵심 단계', icon: '🤝',
  },
  Test_Modify: {
    korean: '가설 검증·수정', category: 'CKC', categoryColor: 'bg-teal-100 text-teal-700',
    description: '제안된 이해를 확인하거나 수정하는 비판적 검토 행동', icon: '🔬',
  },
  Emo_Mot: {
    korean: '감정·동기 조절', category: '조절', categoryColor: 'bg-pink-100 text-pink-700',
    description: '부정적 감정을 긍정으로 전환하고 집단 분위기를 유지하는 행동', icon: '💡',
  },
  Cogn: {
    korean: '인지 조절', category: '조절', categoryColor: 'bg-violet-100 text-violet-700',
    description: '과제 이해 부족을 인식하고 전략을 조정하는 메타인지 행동', icon: '🧠',
  },
};

const FALLBACK_META: CodeMeta = {
  korean: '', category: '기타', categoryColor: 'bg-slate-100 text-slate-500',
  description: '코드 설명 없음', icon: '●',
};

export default function NodeLegend({ result, highlightedNode, onNodeHover }: NodeLegendProps) {
  const maxResponseCount = result
    ? Math.max(...result.nodes.map(n => n.responseCount), 1)
    : 1;
  const maxSelfCount = result
    ? Math.max(...result.nodes.map(n => n.selfConnectionCount), 1)
    : 1;

  // Drive displayed codes from result.nodes (dataset-aware)
  const nodeCodes = result ? result.nodes.map(n => n.code) : [];

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800">변인(노드) 범례</h3>
        <span className="text-xs text-slate-400">노드에 마우스를 올려 하이라이트</span>
      </div>

      <div className="p-3 grid grid-cols-2 gap-2">
        {nodeCodes.map((code) => {
          const meta = CODE_META_MAP[code] ?? FALLBACK_META;
          const nodeData = result?.nodes.find(n => n.code === code);
          const responseCount = nodeData?.responseCount ?? 0;
          const selfCount = nodeData?.selfConnectionCount ?? 0;
          const responsePct = (responseCount / maxResponseCount) * 100;
          const selfPct = (selfCount / maxSelfCount) * 100;
          const isHL = !highlightedNode || highlightedNode === code;

          return (
            <button
              key={code}
              className={`text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                highlightedNode === code
                  ? 'border-indigo-400 bg-indigo-50 shadow-sm'
                  : isHL
                  ? 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40'
                  : 'border-slate-100 opacity-40'
              }`}
              onMouseEnter={() => onNodeHover(code)}
              onMouseLeave={() => onNodeHover(null)}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-base leading-none">{meta.icon}</span>
                <span className="text-xs font-bold text-slate-800">{meta.korean || code}</span>
                <span className={`ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded-full ${meta.categoryColor}`}>
                  {meta.category}
                </span>
              </div>

              <div className="font-mono text-[10px] text-slate-400 mb-1.5">{code}</div>

              <p className="text-[10px] text-slate-500 leading-relaxed mb-2">
                {meta.description}
              </p>

              {result && (
                <div className="space-y-1">
                  <div>
                    <div className="flex justify-between text-[9px] text-slate-400 mb-0.5">
                      <span>반응(Response) 횟수</span>
                      <span className="font-mono">{responseCount}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-400 rounded-full transition-all duration-500"
                        style={{ width: `${responsePct}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[9px] text-slate-400 mb-0.5">
                      <span>자기 연결(Self-conn.)</span>
                      <span className="font-mono">{selfCount}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-300 rounded-full transition-all duration-500"
                        style={{ width: `${selfPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Visual Encoding Legend */}
      <div className="px-4 py-3 border-t border-slate-100 space-y-2">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">시각적 인코딩</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <EncodingItem
            visual={
              <svg width="32" height="32" viewBox="0 0 32 32">
                <circle cx="16" cy="16" r="12" fill="none" stroke="#334155" strokeWidth="2" />
                <circle cx="16" cy="16" r="5" fill="none" stroke="#334155" strokeWidth="1.5" strokeDasharray="2,2" />
                <text x="16" y="8" textAnchor="middle" fontSize="5" fill="#64748b">대</text>
                <text x="16" y="26" textAnchor="middle" fontSize="5" fill="#64748b">소</text>
              </svg>
            }
            label="노드 크기"
            desc="반응(Response) 발생 횟수에 비례"
          />
          <EncodingItem
            visual={
              <svg width="32" height="32" viewBox="0 0 32 32">
                <circle cx="16" cy="16" r="11" fill="none" stroke="#94a3b8" strokeWidth="1.5" />
                <circle cx="16" cy="16" r="6" fill="#3b82f6" opacity="0.8" />
              </svg>
            }
            label="내부 원"
            desc="자기 연결(Self-connection) 빈도"
          />
          <EncodingItem
            visual={
              <svg width="32" height="32" viewBox="0 0 32 32">
                <polygon points="4,26 16,6 28,26" fill="#6366f1" opacity="0.7" />
                <polygon points="8,24 16,10 24,24" fill="white" opacity="0.5" />
                <circle cx="4" cy="26" r="2" fill="#334155" />
                <circle cx="28" cy="26" r="2" fill="#334155" />
              </svg>
            }
            label="삼각형 엣지"
            desc="꼭짓점=Ground, 밑변=Response"
          />
          <EncodingItem
            visual={
              <svg width="32" height="32" viewBox="0 0 32 32">
                <line x1="4" y1="16" x2="28" y2="16" stroke="#94a3b8" strokeWidth="1.5" />
                <polyline points="18,10 26,16 18,22" fill="none" stroke="#334155" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            label="쉐브론(›)"
            desc="인과적 흐름 방향 표시"
          />
          <EncodingItem
            visual={
              <svg width="32" height="32" viewBox="0 0 32 32">
                <rect x="4" y="10" width="24" height="12" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="3,2" />
                <rect x="10" y="13" width="4" height="4" fill="#3b82f6" />
              </svg>
            }
            label="점선 박스"
            desc="그룹 95% 신뢰구간"
          />
          <EncodingItem
            visual={
              <svg width="32" height="32" viewBox="0 0 32 32">
                <circle cx="10" cy="16" r="3" fill="#3b82f6" opacity="0.7" />
                <rect x="17" y="12" width="8" height="8" fill="#ef4444" opacity="0.9" />
              </svg>
            }
            label="점● / 사각형■"
            desc="개별 학습자 / 그룹 평균"
          />
        </div>
      </div>
    </div>
  );
}

function EncodingItem({
  visual,
  label,
  desc,
}: {
  visual: React.ReactNode;
  label: string;
  desc: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-shrink-0 w-8 h-8">{visual}</div>
      <div>
        <div className="text-[10px] font-semibold text-slate-700">{label}</div>
        <div className="text-[9px] text-slate-400 leading-tight">{desc}</div>
      </div>
    </div>
  );
}
