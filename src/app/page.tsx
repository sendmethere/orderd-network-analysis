'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { OnaResult, CodeName } from '@/lib/types';
import { computeONA, getStanzaDetails } from '@/lib/onaCalculations';
import { DATASETS, DatasetConfig } from '@/lib/sampleData';
import ControlPanel from '@/components/ControlPanel';
import InfoPanel from '@/components/InfoPanel';
import Tooltip from '@/components/Tooltip';
import NodeLegend from '@/components/NodeLegend';
import NodeDetailPanel from '@/components/NodeDetailPanel';
import RawDataModal from '@/components/RawDataModal';

const OnaGraph = dynamic(() => import('@/components/OnaGraph'), { ssr: false });

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  title: string;
  content: string;
}

export default function HomePage() {
  const [activeDatasetKey, setActiveDatasetKey] = useState<string>('futureworld');
  const [windowSize, setWindowSize] = useState(7);
  const [viewMode, setViewMode] = useState<'both' | 'active' | 'passive' | 'subtracted'>('both');
  const [subtractedMultiplier, setSubtractedMultiplier] = useState(4);
  const [nodeSpread, setNodeSpread] = useState(1.4);
  const [edgeThreshold, setEdgeThreshold] = useState(0.015);
  const [result, setResult] = useState<OnaResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, title: '', content: '' });
  const [highlightedNode, setHighlightedNode] = useState<CodeName | null>(null);
  const [selectedNode, setSelectedNode] = useState<CodeName | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<{ ground: CodeName; response: CodeName } | null>(null);
  const [stanzaDetails, setStanzaDetails] = useState<Array<{ rowIndex: number; userID: string; activityNumber: number; activeCodes: string[] }>>([]);
  const [rawDataOpen, setRawDataOpen] = useState(false);
  const computeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeDataset: DatasetConfig = DATASETS.find(d => d.key === activeDatasetKey) ?? DATASETS[0];

  const runONA = useCallback((ws: number, dataset: DatasetConfig) => {
    setLoading(true);
    setResult(null);
    if (computeTimeout.current) clearTimeout(computeTimeout.current);
    computeTimeout.current = setTimeout(() => {
      try {
        const r = computeONA(dataset.data, ws, dataset.codes);
        setResult(r);
      } catch (e) {
        console.error('ONA computation error:', e);
      } finally {
        setLoading(false);
      }
    }, 100);
  }, []);

  useEffect(() => {
    setSelectedEdge(null);
    setSelectedNode(null);
    setStanzaDetails([]);
    runONA(windowSize, activeDataset);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowSize, activeDatasetKey]);

  const handleEdgeClick = useCallback((ground: CodeName, response: CodeName) => {
    setSelectedEdge({ ground, response });
    const details = getStanzaDetails(activeDataset.data, ground, response, windowSize, activeDataset.codes);
    setStanzaDetails(details);
  }, [activeDataset, windowSize]);

  const handleTooltipChange = useCallback((state: TooltipState) => {
    setTooltip(state);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              ONA 시뮬레이터
              <span className="ml-2 text-sm font-normal text-slate-500">Ordered Network Analysis</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              초보 연구자를 위한 인터랙티브 순서화 네트워크 분석 도구
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-medium">
              분석 단위 {result?.units.length ?? '—'}개
            </span>
            <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
              {result?.nodes.length ?? (activeDataset.codes?.length ?? 7)}개 변인
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-6 py-6 space-y-5">
        {/* Dataset Selector */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-sm font-bold text-slate-700">데이터셋 선택</h2>
            <span className="text-xs text-slate-400">데이터셋을 변경하면 ONA가 재계산됩니다</span>
            <button
              onClick={() => setRawDataOpen(true)}
              className="ml-auto flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 border border-indigo-200 hover:border-indigo-400 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              <span>📋</span>
              원시 데이터 보기
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {DATASETS.map((ds) => (
              <button
                key={ds.key}
                onClick={() => setActiveDatasetKey(ds.key)}
                className={`text-left p-3.5 rounded-lg border-2 transition-all ${
                  activeDatasetKey === ds.key
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className={`text-sm font-bold ${activeDatasetKey === ds.key ? 'text-indigo-800' : 'text-slate-700'}`}>
                    {ds.label}
                  </span>
                  {activeDatasetKey === ds.key && (
                    <span className="flex-shrink-0 text-[10px] bg-indigo-600 text-white px-1.5 py-0.5 rounded font-semibold">
                      선택됨
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mb-1.5 leading-relaxed">{ds.description}</p>
                <div className="text-[10px] text-slate-400 font-mono">{ds.context}</div>
                <div className="mt-2 flex gap-2 flex-wrap">
                  <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">
                    ■ {ds.activeGroupLabel}
                  </span>
                  <span className="text-[10px] bg-red-50 text-red-700 px-2 py-0.5 rounded-full border border-red-100">
                    ■ {ds.passiveGroupLabel}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main Analysis Area */}
        <div className="grid grid-cols-[1fr_280px] gap-5">
          {/* Left: Graph + Legend */}
          <div className="space-y-4">
            {/* View mode banner for subtracted */}
            {viewMode === 'subtracted' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-800">
                <strong>빼기 네트워크 모드</strong> — 파란색: {activeDataset.activeGroupLabel}이 더 강한 연결 / 빨간색: {activeDataset.passiveGroupLabel}이 더 강한 연결
              </div>
            )}

            {/* Graph */}
            <div className="relative">
              {result && !loading ? (
                <OnaGraph
                  result={result}
                  viewMode={viewMode}
                  subtractedMultiplier={subtractedMultiplier}
                  onEdgeClick={handleEdgeClick}
                  onTooltipChange={handleTooltipChange}
                  highlightedNode={highlightedNode}
                  onNodeHover={setHighlightedNode}
                  selectedNode={selectedNode}
                  onNodeClick={setSelectedNode}
                  activeGroupLabel={activeDataset.activeGroupLabel}
                  passiveGroupLabel={activeDataset.passiveGroupLabel}
                  nodeSpread={nodeSpread}
                  edgeThreshold={edgeThreshold}
                />
              ) : (
                <div className="w-full aspect-square bg-white rounded-xl border border-slate-200 flex items-center justify-center text-slate-400">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm">ONA 계산 중...</p>
                    <p className="text-xs text-slate-300 mt-1">{activeDataset.label}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Node detail panel (노드 클릭 시 표시) */}
            {selectedNode && result && (
              <NodeDetailPanel
                result={result}
                selectedNode={selectedNode}
                viewMode={viewMode}
                onClose={() => setSelectedNode(null)}
              />
            )}

            {/* Node Legend below graph */}
            <NodeLegend
              result={result}
              highlightedNode={highlightedNode}
              onNodeHover={setHighlightedNode}
            />
          </div>

          {/* Right: Controls + Info */}
          <div className="space-y-4">
            <ControlPanel
              windowSize={windowSize}
              onWindowSizeChange={setWindowSize}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              subtractedMultiplier={subtractedMultiplier}
              onSubtractedMultiplierChange={setSubtractedMultiplier}
              nodeSpread={nodeSpread}
              onNodeSpreadChange={setNodeSpread}
              edgeThreshold={edgeThreshold}
              onEdgeThresholdChange={setEdgeThreshold}
              activeGroupLabel={activeDataset.activeGroupLabel}
              passiveGroupLabel={activeDataset.passiveGroupLabel}
              loading={loading}
            />
            <InfoPanel
              result={result}
              selectedEdge={selectedEdge}
              stanzaDetails={stanzaDetails}
              viewMode={viewMode}
            />
          </div>
        </div>
      </main>

      <Tooltip {...tooltip} />

      <RawDataModal
        open={rawDataOpen}
        onClose={() => setRawDataOpen(false)}
        data={activeDataset.data}
        codes={activeDataset.codes ?? ['StartProblem', 'EndProblem', 'PlanningTool', 'MoveHistory', 'TileChange', 'Reading', 'Diagram']}
        datasetLabel={activeDataset.label}
      />
    </div>
  );
}
