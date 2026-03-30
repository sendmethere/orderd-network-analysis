'use client';

interface TooltipProps {
  visible: boolean;
  x: number;
  y: number;
  title: string;
  content: string;
}

export default function Tooltip({ visible, x, y, title, content }: TooltipProps) {
  if (!visible) return null;

  const lines = content.split('\n');

  return (
    <div
      style={{
        position: 'fixed',
        left: x + 14,
        top: y - 10,
        zIndex: 9999,
        pointerEvents: 'none',
      }}
      className="bg-slate-900 text-white rounded-lg shadow-xl max-w-xs p-3 text-sm"
    >
      {title && (
        <div className="font-semibold text-indigo-300 mb-1.5 text-sm">{title}</div>
      )}
      <div className="text-slate-200 text-xs leading-relaxed space-y-1">
        {lines.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
    </div>
  );
}
