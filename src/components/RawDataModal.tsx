'use client';

import { useState, useMemo } from 'react';
import { EventRow } from '@/lib/types';

interface RawDataModalProps {
  open: boolean;
  onClose: () => void;
  data: EventRow[];
  codes: readonly string[];
  datasetLabel: string;
}

const PAGE_SIZE = 50;

export default function RawDataModal({
  open, onClose, data, codes, datasetLabel,
}: RawDataModalProps) {
  const [conditionFilter, setConditionFilter] = useState<'all' | 'Active' | 'Passive'>('all');
  const [userSearch, setUserSearch] = useState('');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let rows = data;
    if (conditionFilter !== 'all') rows = rows.filter(r => r.Condition === conditionFilter);
    if (userSearch.trim()) {
      const q = userSearch.trim().toLowerCase();
      rows = rows.filter(r => String(r.UserID).toLowerCase().includes(q));
    }
    return rows;
  }, [data, conditionFilter, userSearch]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const uniqueUsers = useMemo(() => new Set(data.map(r => r.UserID)).size, [data]);

  function handleSearchChange(v: string) {
    setUserSearch(v);
    setPage(0);
  }
  function handleConditionChange(v: 'all' | 'Active' | 'Passive') {
    setConditionFilter(v);
    setPage(0);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl mx-4 flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900">원시 데이터 (Raw Data)</h2>
            <p className="text-xs text-slate-500 mt-0.5">{datasetLabel}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-2 text-xs text-slate-500">
              <span className="bg-slate-100 px-2 py-0.5 rounded-full">전체 {data.length.toLocaleString()}행</span>
              <span className="bg-slate-100 px-2 py-0.5 rounded-full">분석 단위 {uniqueUsers}개</span>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 text-lg font-bold transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 flex-shrink-0">
          {/* Condition filter */}
          <div className="flex gap-1">
            {(['all', 'Active', 'Passive'] as const).map(v => (
              <button
                key={v}
                onClick={() => handleConditionChange(v)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors ${
                  conditionFilter === v
                    ? v === 'all'
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                      : v === 'Active'
                      ? 'bg-blue-50 text-blue-700 border-blue-300'
                      : 'bg-red-50 text-red-700 border-red-300'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {v === 'all' ? '전체' : v === 'Active' ? 'Active 집단' : 'Passive 집단'}
              </button>
            ))}
          </div>

          {/* UserID search */}
          <input
            type="text"
            value={userSearch}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="UserID 검색..."
            className="ml-auto text-xs border border-slate-200 rounded-lg px-3 py-1.5 w-48 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
          />

          {/* Result count */}
          <span className="text-xs text-slate-400 flex-shrink-0">
            {filtered.length.toLocaleString()}행 해당
          </span>
        </div>

        {/* Table */}
        <div className="overflow-auto flex-1">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-50 z-10">
              <tr>
                <th className="text-left px-3 py-2 font-semibold text-slate-600 border-b border-slate-200 whitespace-nowrap">#</th>
                <th className="text-left px-3 py-2 font-semibold text-slate-600 border-b border-slate-200 whitespace-nowrap">UserID</th>
                <th className="text-left px-3 py-2 font-semibold text-slate-600 border-b border-slate-200 whitespace-nowrap">Condition</th>
                <th className="text-left px-3 py-2 font-semibold text-slate-600 border-b border-slate-200 whitespace-nowrap">Activity</th>
                <th className="text-left px-3 py-2 font-semibold text-slate-600 border-b border-slate-200 whitespace-nowrap">Timestamp</th>
                {codes.map(code => (
                  <th
                    key={code}
                    className="text-center px-2 py-2 font-semibold text-slate-600 border-b border-slate-200 whitespace-nowrap"
                  >
                    {code}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row, i) => {
                const globalIdx = safePage * PAGE_SIZE + i + 1;
                const isActive = row.Condition === 'Active';
                return (
                  <tr
                    key={globalIdx}
                    className={`border-b border-slate-100 ${
                      i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                    } hover:bg-indigo-50/40 transition-colors`}
                  >
                    <td className="px-3 py-1.5 text-slate-400 font-mono">{globalIdx}</td>
                    <td className="px-3 py-1.5 font-mono text-slate-700 whitespace-nowrap">{String(row.UserID)}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                        isActive ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {String(row.Condition)}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-center font-mono text-slate-600">{String(row.ActivityNumber)}</td>
                    <td className="px-3 py-1.5 font-mono text-slate-400 whitespace-nowrap text-[10px]">
                      {String(row.Timestamp).replace('T', ' ').replace('.000Z', '')}
                    </td>
                    {codes.map(code => {
                      const val = row[code];
                      return (
                        <td key={code} className="px-2 py-1.5 text-center">
                          {val === 1
                            ? <span className="inline-block w-4 h-4 rounded bg-indigo-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">1</span>
                            : <span className="text-slate-200 font-mono">0</span>
                          }
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={5 + codes.length} className="text-center py-12 text-slate-400 text-sm">
                    조건에 해당하는 데이터가 없습니다
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 flex-shrink-0">
          <span className="text-xs text-slate-500">
            {filtered.length > 0
              ? `${safePage * PAGE_SIZE + 1}–${Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} / ${filtered.length.toLocaleString()}행`
              : '0행'}
          </span>
          <div className="flex gap-1">
            <PageBtn label="«" disabled={safePage === 0} onClick={() => setPage(0)} />
            <PageBtn label="‹" disabled={safePage === 0} onClick={() => setPage(p => Math.max(0, p - 1))} />
            {getPagesAround(safePage, totalPages).map((p, i) =>
              p === null
                ? <span key={`sep-${i}`} className="w-7 h-7 flex items-center justify-center text-slate-300 text-xs">…</span>
                : <PageBtn
                    key={p}
                    label={String(p + 1)}
                    active={p === safePage}
                    onClick={() => setPage(p)}
                  />
            )}
            <PageBtn label="›" disabled={safePage >= totalPages - 1} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} />
            <PageBtn label="»" disabled={safePage >= totalPages - 1} onClick={() => setPage(totalPages - 1)} />
          </div>
          <span className="text-xs text-slate-400">{totalPages}페이지 중 {safePage + 1}</span>
        </div>
      </div>
    </div>
  );
}

function PageBtn({
  label, onClick, disabled, active,
}: { label: string; onClick: () => void; disabled?: boolean; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
        active
          ? 'bg-indigo-600 text-white'
          : disabled
          ? 'text-slate-300 cursor-not-allowed'
          : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {label}
    </button>
  );
}

function getPagesAround(current: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const pages: (number | null)[] = [];
  pages.push(0);
  if (current > 2) pages.push(null);
  for (let p = Math.max(1, current - 1); p <= Math.min(total - 2, current + 1); p++) pages.push(p);
  if (current < total - 3) pages.push(null);
  pages.push(total - 1);
  return pages;
}
