'use client';

interface ControlPanelProps {
  windowSize: number;
  onWindowSizeChange: (v: number) => void;
  viewMode: 'both' | 'active' | 'passive' | 'subtracted';
  onViewModeChange: (v: 'both' | 'active' | 'passive' | 'subtracted') => void;
  subtractedMultiplier: number;
  onSubtractedMultiplierChange: (v: number) => void;
  nodeSpread: number;
  onNodeSpreadChange: (v: number) => void;
  edgeThreshold: number;
  onEdgeThresholdChange: (v: number) => void;
  activeGroupLabel: string;
  passiveGroupLabel: string;
  loading: boolean;
}

export default function ControlPanel({
  windowSize,
  onWindowSizeChange,
  viewMode,
  onViewModeChange,
  subtractedMultiplier,
  onSubtractedMultiplierChange,
  nodeSpread,
  onNodeSpreadChange,
  edgeThreshold,
  onEdgeThresholdChange,
  activeGroupLabel,
  passiveGroupLabel,
  loading,
}: ControlPanelProps) {
  const viewModes = [
    { value: 'both',       label: '두 집단 모두',   color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { value: 'active',     label: activeGroupLabel,  color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { value: 'passive',    label: passiveGroupLabel, color: 'bg-red-50 text-red-700 border-red-200' },
    { value: 'subtracted', label: '빼기 네트워크',  color: 'bg-amber-50 text-amber-700 border-amber-200' },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
      <h2 className="text-base font-bold text-slate-800">분석 파라미터</h2>

      {/* Stanza Window Size */}
      <SliderRow
        label="이동 스탄자 창 크기"
        value={windowSize}
        min={2} max={10} step={1}
        display={String(windowSize)}
        displayClass="bg-indigo-50 text-indigo-700"
        accentClass="accent-indigo-600"
        hint={`현재 이벤트(Response)와 이전 ${windowSize - 1}개 이벤트(Ground) 간의 연결을 포착합니다.`}
        disabled={loading}
        onChange={onWindowSizeChange}
      />

      {/* View Mode */}
      <div>
        <label className="text-sm font-semibold text-slate-700 block mb-2">시각화 모드</label>
        <div className="grid grid-cols-2 gap-2">
          {viewModes.map(({ value, label, color }) => (
            <button
              key={value}
              onClick={() => onViewModeChange(value as 'both' | 'active' | 'passive' | 'subtracted')}
              title={label}
              className={`text-xs font-medium px-2 py-2 rounded-lg border transition-all truncate ${
                viewMode === value
                  ? color + ' border-current font-semibold shadow-sm'
                  : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Subtracted Network Multiplier */}
      {viewMode === 'subtracted' && (
        <SliderRow
          label="차이값 배수 (Multiplier)"
          value={subtractedMultiplier}
          min={1} max={10} step={0.5}
          display={`×${subtractedMultiplier}`}
          displayClass="bg-amber-50 text-amber-700"
          accentClass="accent-amber-500"
          hint="연결 차이가 미미할 경우 가독성을 높이기 위해 배수를 조정하세요."
          onChange={onSubtractedMultiplierChange}
        />
      )}

      {/* ── 가시성 조정 ── */}
      <div className="border-t border-slate-100 pt-4 space-y-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">가시성 조정</h3>

        <SliderRow
          label="노드 분산"
          value={nodeSpread}
          min={1.0} max={3.0} step={0.1}
          display={`×${nodeSpread.toFixed(1)}`}
          displayClass="bg-slate-100 text-slate-700"
          accentClass="accent-slate-500"
          hint="노드 간격이 좁아 삼각형이 겹칠 때 값을 높이세요."
          onChange={onNodeSpreadChange}
        />

        <SliderRow
          label="최소 엣지 강도 (필터)"
          value={edgeThreshold}
          min={0} max={0.12} step={0.005}
          display={edgeThreshold.toFixed(3)}
          displayClass="bg-slate-100 text-slate-700"
          accentClass="accent-slate-500"
          hint="이 값 미만의 약한 연결은 숨깁니다. 높일수록 강한 연결만 표시됩니다."
          onChange={onEdgeThresholdChange}
        />
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-indigo-600">
          <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          ONA 계산 중...
        </div>
      )}
    </div>
  );
}

function SliderRow({
  label, value, min, max, step,
  display, displayClass, accentClass,
  hint, disabled, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number;
  display: string; displayClass: string; accentClass: string;
  hint: string; disabled?: boolean; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <label className="text-sm font-semibold text-slate-700">{label}</label>
        <span className={`text-sm font-mono px-2 py-0.5 rounded-md ${displayClass}`}>{display}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className={`w-full ${accentClass}`}
        disabled={disabled}
      />
      <p className="text-xs text-slate-500 mt-1">{hint}</p>
    </div>
  );
}
