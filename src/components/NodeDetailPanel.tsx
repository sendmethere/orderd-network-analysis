'use client';

import { OnaResult, CodeName, Edge } from '@/lib/types';

interface NodeDetailPanelProps {
  result: OnaResult;
  selectedNode: CodeName;
  viewMode: 'both' | 'active' | 'passive' | 'subtracted';
  onClose: () => void;
}

const CODE_KO: Record<string, string> = {
  StartProblem: '문제 시작',
  EndProblem: '문제 종료',
  PlanningTool: '계획 도구',
  MoveHistory: '이동 내역',
  TileChange: '타일 교체',
  Reading: '읽기',
  Diagram: '다이어그램',
};

function getWeight(edge: Edge, viewMode: string): number {
  if (viewMode === 'active')     return edge.weightActive;
  if (viewMode === 'passive')    return edge.weightPassive;
  if (viewMode === 'subtracted') return Math.abs(edge.weightDiff);
  return (edge.weightActive + edge.weightPassive) / 2;
}

export default function NodeDetailPanel({
  result,
  selectedNode,
  viewMode,
  onClose,
}: NodeDetailPanelProps) {
  const node = result.nodes.find(n => n.code === selectedNode);
  if (!node) return null;

  // ── 공간 거리 계산 ──
  const distances = result.nodes
    .filter(n => n.code !== selectedNode)
    .map(n => ({
      code: n.code,
      dist: Math.sqrt((n.x - node.x) ** 2 + (n.y - node.y) ** 2),
    }))
    .sort((a, b) => a.dist - b.dist);
  const nearest  = distances[0];
  const farthest = distances[distances.length - 1];

  // ── 발신(outgoing) 엣지: ground = selectedNode, response ≠ selectedNode ──
  const outEdges = result.edges
    .filter(e => e.ground === selectedNode && e.response !== selectedNode)
    .map(e => ({ ...e, w: getWeight(e, viewMode) }))
    .filter(e => e.w > 0)
    .sort((a, b) => b.w - a.w);

  // ── 수신(incoming) 엣지: response = selectedNode, ground ≠ selectedNode ──
  const inEdges = result.edges
    .filter(e => e.response === selectedNode && e.ground !== selectedNode)
    .map(e => ({ ...e, w: getWeight(e, viewMode) }))
    .filter(e => e.w > 0)
    .sort((a, b) => b.w - a.w);

  // ── 자기 연결 ──
  const selfEdge = result.edges.find(
    e => e.ground === selectedNode && e.response === selectedNode
  );
  const selfW = selfEdge ? getWeight(selfEdge, viewMode) : 0;

  // ── 반응 횟수 순위 ──
  const sortedByResponse = [...result.nodes].sort((a, b) => b.responseCount - a.responseCount);
  const responseRank = sortedByResponse.findIndex(n => n.code === selectedNode) + 1;

  // ── 발신/수신 총 강도 ──
  const outStrength = outEdges.reduce((s, e) => s + e.w, 0);
  const inStrength  = inEdges.reduce((s, e) => s + e.w, 0);

  const maxW = Math.max(...[...outEdges, ...inEdges].map(e => e.w), 0.001);

  return (
    <div className="bg-white rounded-xl border-2 border-amber-400 overflow-hidden shadow-lg">
      {/* Header */}
      <div className="bg-amber-50 px-4 py-3 flex items-center justify-between border-b border-amber-200">
        <div>
          <span className="text-sm font-bold text-amber-900">{selectedNode}</span>
          <span className="ml-2 text-xs text-amber-700">{CODE_KO[selectedNode]}</span>
        </div>
        <button
          onClick={onClose}
          className="text-amber-500 hover:text-amber-800 text-lg leading-none font-bold"
        >
          ×
        </button>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto max-h-[520px]">

        {/* ── 기본 통계 ── */}
        <Section title="기본 통계">
          <div className="grid grid-cols-2 gap-2">
            <StatChip label="반응(Response) 횟수" value={node.responseCount} rank={`${responseRank}/7위`} color="indigo" />
            <StatChip label="자기 연결 횟수" value={node.selfConnectionCount} sub={selfW > 0 ? `가중치 ${selfW.toFixed(4)}` : undefined} color="blue" />
            <StatChip label="발신 총 강도" value={outStrength.toFixed(4)} sub={`${outEdges.length}개 연결`} color="green" />
            <StatChip label="수신 총 강도" value={inStrength.toFixed(4)} sub={`${inEdges.length}개 연결`} color="violet" />
          </div>
        </Section>

        {/* ── 공간 관계 ── */}
        <Section title="공간 관계 (Co-registration 기반)">
          <div className="space-y-2">
            <RelRow
              badge="가장 가까운"
              badgeColor="bg-amber-100 text-amber-800 border-amber-300"
              code={nearest.code}
              value={`거리 ${nearest.dist.toFixed(3)}`}
              bar={null}
            />
            <RelRow
              badge="가장 먼"
              badgeColor="bg-slate-100 text-slate-600 border-slate-300"
              code={farthest.code}
              value={`거리 ${farthest.dist.toFixed(3)}`}
              bar={null}
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
            공동 등록(Co-registration)으로 최적화된 2D 좌표 기준 유클리드 거리입니다.
          </p>
        </Section>

        {/* ── 발신 연결 ── */}
        <Section title={`발신 연결 — ${selectedNode} → …`}>
          {outEdges.length === 0 ? (
            <p className="text-xs text-slate-400">유효한 발신 연결 없음</p>
          ) : (
            <div className="space-y-1.5">
              {outEdges.map((e, i) => (
                <EdgeRow
                  key={e.response}
                  rank={i + 1}
                  code={e.response}
                  weight={e.w}
                  maxW={maxW}
                  isTop={i === 0}
                  isBottom={i === outEdges.length - 1 && outEdges.length > 1}
                  direction="out"
                  weightActive={e.weightActive}
                  weightPassive={e.weightPassive}
                />
              ))}
            </div>
          )}
        </Section>

        {/* ── 수신 연결 ── */}
        <Section title={`수신 연결 — … → ${selectedNode}`}>
          {inEdges.length === 0 ? (
            <p className="text-xs text-slate-400">유효한 수신 연결 없음</p>
          ) : (
            <div className="space-y-1.5">
              {inEdges.map((e, i) => (
                <EdgeRow
                  key={e.ground}
                  rank={i + 1}
                  code={e.ground}
                  weight={e.w}
                  maxW={maxW}
                  isTop={i === 0}
                  isBottom={i === inEdges.length - 1 && inEdges.length > 1}
                  direction="in"
                  weightActive={e.weightActive}
                  weightPassive={e.weightPassive}
                />
              ))}
            </div>
          )}
        </Section>

        {/* ── 비율 비교 ── */}
        {outStrength + inStrength > 0 && (
          <Section title="발신 vs 수신 비율">
            <div className="flex items-center gap-1 h-4 rounded-full overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-l-full transition-all"
                style={{ width: `${(outStrength / (outStrength + inStrength)) * 100}%` }}
              />
              <div
                className="bg-violet-400 h-full rounded-r-full flex-1 transition-all"
              />
            </div>
            <div className="flex justify-between text-[10px] mt-1">
              <span className="text-emerald-700 font-semibold">
                발신 {((outStrength / (outStrength + inStrength)) * 100).toFixed(1)}%
              </span>
              <span className="text-violet-700 font-semibold">
                수신 {((inStrength / (outStrength + inStrength)) * 100).toFixed(1)}%
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              발신 비율이 높을수록 이 행동이 다른 행동을 유도하는 경향이 강합니다.
            </p>
          </Section>
        )}
      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">{title}</div>
      {children}
    </div>
  );
}

function StatChip({
  label, value, rank, sub, color,
}: {
  label: string;
  value: string | number;
  rank?: string;
  sub?: string;
  color: 'indigo' | 'blue' | 'green' | 'violet';
}) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-800',
    blue:   'bg-blue-50 text-blue-800',
    green:  'bg-emerald-50 text-emerald-800',
    violet: 'bg-violet-50 text-violet-800',
  };
  return (
    <div className={`rounded-lg p-2.5 ${colors[color]}`}>
      <div className="text-[10px] opacity-70 mb-0.5">{label}</div>
      <div className="text-sm font-bold leading-tight">{value}</div>
      {(rank || sub) && (
        <div className="text-[10px] opacity-60 mt-0.5">{rank ?? sub}</div>
      )}
    </div>
  );
}

function RelRow({
  badge, badgeColor, code, value, bar,
}: {
  badge: string;
  badgeColor: string;
  code: CodeName;
  value: string;
  bar: null;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border flex-shrink-0 ${badgeColor}`}>
        {badge}
      </span>
      <span className="text-xs font-bold text-slate-700 flex-1">{code}</span>
      <span className="text-[10px] font-mono text-slate-500">{value}</span>
    </div>
  );
}

function EdgeRow({
  rank, code, weight, maxW, isTop, isBottom, direction, weightActive, weightPassive,
}: {
  rank: number;
  code: CodeName;
  weight: number;
  maxW: number;
  isTop: boolean;
  isBottom: boolean;
  direction: 'in' | 'out';
  weightActive: number;
  weightPassive: number;
}) {
  const barPct = (weight / maxW) * 100;
  const rankColors = ['bg-amber-400', 'bg-slate-300', 'bg-orange-300'];
  const rankColor  = rankColors[rank - 1] ?? 'bg-slate-200';

  return (
    <div className={`rounded-lg border px-2.5 py-2 ${
      isTop    ? 'border-amber-300 bg-amber-50' :
      isBottom ? 'border-slate-200 bg-slate-50/50' :
                 'border-slate-100'
    }`}>
      <div className="flex items-center gap-2 mb-1.5">
        {/* Rank badge */}
        <span className={`w-4 h-4 rounded-full ${rankColor} text-[9px] font-bold flex items-center justify-center text-white flex-shrink-0`}>
          {rank}
        </span>
        {/* Direction arrow */}
        <span className="text-[10px] text-slate-400 flex-shrink-0">
          {direction === 'out' ? '→' : '←'}
        </span>
        {/* Target code */}
        <span className="text-xs font-bold text-slate-800 flex-1">{code}</span>
        {/* Badges */}
        <div className="flex gap-1 flex-shrink-0">
          {isTop && (
            <span className="text-[9px] bg-amber-100 text-amber-700 px-1 rounded font-semibold">
              {direction === 'out' ? '최강 발신' : '최강 수신'}
            </span>
          )}
          {isBottom && (
            <span className="text-[9px] bg-slate-100 text-slate-500 px-1 rounded font-semibold">
              {direction === 'out' ? '최약 발신' : '최약 수신'}
            </span>
          )}
        </div>
      </div>

      {/* Weight bar */}
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1">
        <div
          className={`h-full rounded-full ${direction === 'out' ? 'bg-emerald-400' : 'bg-violet-400'}`}
          style={{ width: `${barPct}%` }}
        />
      </div>

      {/* Active / Passive breakdown */}
      <div className="flex gap-2 text-[9px]">
        <span className="text-blue-600">Active: {weightActive.toFixed(4)}</span>
        <span className="text-red-500">Passive: {weightPassive.toFixed(4)}</span>
        <span className="text-slate-500 ml-auto font-mono">{weight.toFixed(4)}</span>
      </div>
    </div>
  );
}
