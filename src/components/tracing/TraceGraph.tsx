import React, { useEffect, useMemo, useRef } from 'react';
import { useTraceStore } from '../../store/traceStore';
import { Activity, Cpu, MessageSquare, Database } from 'lucide-react';

type Node = { id: string; name: string; kind: string; start: number; end: number; parent?: string | null };

export const TraceGraph: React.FC = () => {
  const { spans, selectedTraceId } = useTraceStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const nodes = useMemo<Node[]>(() => {
    return spans.map(s => ({
      id: s.span_id,
      name: s.name,
      kind: s.kind,
      start: new Date(s.start_time).getTime(),
      end: new Date(s.end_time).getTime(),
      parent: s.parent_span_id || null,
    }));
  }, [spans]);

  const timeBounds = useMemo(() => {
    if (nodes.length === 0) return { min: 0, max: 1 };
    const min = Math.min(...nodes.map(n => n.start));
    const max = Math.max(...nodes.map(n => n.end));
    return { min, max };
  }, [nodes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    ctx.clearRect(0, 0, width, height);

    // Layout: rows by depth
    const byId = new Map(nodes.map(n => [n.id, n]));
    const depthMap = new Map<string, number>();
    function depth(n: Node): number {
      if (!n.parent || !byId.has(n.parent)) return 0;
      const key = n.id;
      if (depthMap.has(key)) return depthMap.get(key)!;
      const d = 1 + depth(byId.get(n.parent)!);
      depthMap.set(key, d);
      return d;
    }
    const rows = nodes.map(n => depth(n));
    const maxDepth = rows.length ? Math.max(...rows) : 0;

    const padLeft = 80;
    const padRight = 20;
    const padTop = 20;
    const rowH = Math.max(24, Math.floor((height - padTop - 20) / (maxDepth + 1 || 1)));
    const scaleX = (t: number) => padLeft + ((t - timeBounds.min) / Math.max(1, timeBounds.max - timeBounds.min)) * (width - padLeft - padRight);

    // Axes
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText(`Trace ${selectedTraceId ?? ''}`, 8, 4);

    // Draw bars
    nodes.forEach((n, idx) => {
      const y = padTop + depth(n) * rowH;
      const x1 = scaleX(n.start);
      const x2 = scaleX(n.end);
      const w = Math.max(2, x2 - x1);

      // color by kind/name
      let color = '#9ca3af';
      if (/openai/.test(n.name)) color = '#7c3aed';
      else if (/google/.test(n.name)) color = '#059669';
      else if (/anthropic/.test(n.name)) color = '#ea580c';
      else if (/storage/.test(n.name)) color = '#2563eb';
      else if (/chat\.send_message/.test(n.name)) color = '#374151';

      ctx.fillStyle = color;
      ctx.globalAlpha = 0.15;
      ctx.fillRect(x1, y, w, rowH - 6);
      ctx.globalAlpha = 1;

      ctx.fillStyle = color;
      ctx.fillRect(x1, y, Math.min(4, w), rowH - 6);

      ctx.fillStyle = '#111827';
      const label = n.name.length > 40 ? n.name.slice(0, 37) + '…' : n.name;
      ctx.fillText(label, x1 + 6, y + 2);
    });
  }, [nodes, timeBounds, selectedTraceId]);

  return (
    <div className="h-64 border-t border-gray-200">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
};


