'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import * as d3 from 'd3';
import { OnaResult, NodePosition, Edge, CodeName } from '@/lib/types';

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  content: string;
  title: string;
}

interface OnaGraphProps {
  result: OnaResult;
  viewMode: 'both' | 'active' | 'passive' | 'subtracted';
  subtractedMultiplier: number;
  onEdgeClick?: (ground: CodeName, response: CodeName) => void;
  onTooltipChange?: (state: TooltipState) => void;
  highlightedNode?: CodeName | null;
  onNodeHover?: (code: CodeName | null) => void;
  selectedNode?: CodeName | null;
  onNodeClick?: (code: CodeName | null) => void;
  activeGroupLabel?: string;
  passiveGroupLabel?: string;
  nodeSpread?: number;
  edgeThreshold?: number;
}

const WIDTH = 700;
const HEIGHT = 700;
const MARGIN = 80;
const INNER_WIDTH = WIDTH - 2 * MARGIN;
const INNER_HEIGHT = HEIGHT - 2 * MARGIN;

const ACTIVE_COLOR = '#3B82F6';  // blue
const PASSIVE_COLOR = '#EF4444'; // red
const NODE_STROKE = '#1e293b';

export default function OnaGraph({
  result,
  viewMode,
  subtractedMultiplier,
  onEdgeClick,
  onTooltipChange,
  highlightedNode,
  onNodeHover,
  selectedNode,
  onNodeClick,
  activeGroupLabel = '적극적 계획 집단',
  passiveGroupLabel = '소극적 계획 집단',
  nodeSpread = 1.0,
  edgeThreshold = 0.01,
}: OnaGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [panMode, setPanMode] = useState(false);
  const transformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const getScale = useCallback(() => {
    const { nodes } = result;
    const fallback = { xScale: d3.scaleLinear(), yScale: d3.scaleLinear(), cx: 0, cy: 0 };
    if (nodes.length === 0) return fallback;

    const rawX = [...nodes.map(n => n.x), ...result.units.map(u => u.onaScore.x)];
    const rawY = [...nodes.map(n => n.y), ...result.units.map(u => u.onaScore.y)];

    // 중심점은 원본 데이터 기준
    const cx = (d3.min(rawX)! + d3.max(rawX)!) / 2;
    const cy = (d3.min(rawY)! + d3.max(rawY)!) / 2;

    // 도메인은 원본(spread 미적용) 좌표로 계산 — spread는 좌표 변환 시에만 적용
    const xExtent = d3.extent(rawX) as [number, number];
    const yExtent = d3.extent(rawY) as [number, number];
    const padding = 0.15 * Math.max(xExtent[1] - xExtent[0], yExtent[1] - yExtent[0], 0.1);

    const xScale = d3.scaleLinear()
      .domain([xExtent[0] - padding, xExtent[1] + padding])
      .range([MARGIN, WIDTH - MARGIN]);
    const yScale = d3.scaleLinear()
      .domain([yExtent[0] - padding, yExtent[1] + padding])
      .range([HEIGHT - MARGIN, MARGIN]);

    return { xScale, yScale, cx, cy };
  }, [result]);

  useEffect(() => {
    if (!svgRef.current || !result) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { nodes, edges, units, activeMean, passiveMean, activeCI, passiveCI } = result;
    const { xScale: _xScale, yScale: _yScale, cx: _cx, cy: _cy } = getScale();
    // spread 적용: 모든 좌표를 전체 중심점 기준으로 확장
    const xScale = (v: number) => _xScale(_cx + (v - _cx) * nodeSpread);
    const yScale = (v: number) => _yScale(_cy + (v - _cy) * nodeSpread);

    // Compute max response count for node sizing
    const maxResponseCount = Math.max(...nodes.map(n => n.responseCount), 1);
    const maxSelfCount = Math.max(...nodes.map(n => n.selfConnectionCount), 1);

    const nodeRadius = (n: NodePosition) => {
      const minR = 9, maxR = 22;
      return minR + (maxR - minR) * Math.sqrt(n.responseCount / maxResponseCount);
    };
    const selfRadius = (n: NodePosition) => {
      const minR = 3, maxR = 9;
      return minR + (maxR - minR) * Math.sqrt(n.selfConnectionCount / Math.max(maxSelfCount, 1));
    };

    // Get edge weights based on view mode
    function getEdgeWeight(edge: Edge): number {
      if (viewMode === 'active') return edge.weightActive;
      if (viewMode === 'passive') return edge.weightPassive;
      if (viewMode === 'subtracted') return Math.abs(edge.weightDiff) * subtractedMultiplier;
      return (edge.weightActive + edge.weightPassive) / 2; // both = average
    }

    function getEdgeColor(edge: Edge): string {
      if (viewMode === 'subtracted') {
        if (edge.dominantGroup === 'Active') return ACTIVE_COLOR;
        if (edge.dominantGroup === 'Passive') return PASSIVE_COLOR;
        return '#888';
      }
      if (viewMode === 'active') return ACTIVE_COLOR;
      if (viewMode === 'passive') return PASSIVE_COLOR;
      return '#6366f1';
    }

    const maxEdgeWeight = Math.max(...edges.map(e => getEdgeWeight(e)), 0.001);

    // Content group — this is what gets panned/zoomed
    const contentGroup = svg.append('g').attr('class', 'content')
      .attr('transform', transformRef.current.toString());

    // Layers (선언 순서 = z-index: 뒤에 선언될수록 앞에 그려짐)
    const edgeLayer = contentGroup.append('g').attr('class', 'edge-layer');
    const chevronLayer = contentGroup.append('g').attr('class', 'chevron-layer');
    const ciLayer = contentGroup.append('g').attr('class', 'ci-layer');
    const pointLayer = contentGroup.append('g').attr('class', 'point-layer');
    const nodeLayer = contentGroup.append('g').attr('class', 'node-layer');
    const labelLayer = contentGroup.append('g').attr('class', 'label-layer');
    const meanLayer = contentGroup.append('g').attr('class', 'mean-layer'); // 항상 노드 위에 렌더링
    const annotationLayer = contentGroup.append('g').attr('class', 'annotation-layer'); // 최상단: 선택 어노테이션

    // Draw axes (pan과 함께 이동)
    contentGroup.append('line')
      .attr('x1', MARGIN).attr('x2', WIDTH - MARGIN)
      .attr('y1', HEIGHT / 2).attr('y2', HEIGHT / 2)
      .attr('stroke', '#cbd5e1').attr('stroke-width', 1).attr('stroke-dasharray', '4,4');
    contentGroup.append('line')
      .attr('x1', WIDTH / 2).attr('x2', WIDTH / 2)
      .attr('y1', MARGIN).attr('y2', HEIGHT - MARGIN)
      .attr('stroke', '#cbd5e1').attr('stroke-width', 1).attr('stroke-dasharray', '4,4');

    // ─── EDGES (Broadcast Triangles) ───────────────────────────────────
    // For each edge, draw two overlapping triangles with Ground at apex, Response at base
    // Only draw if weight is significant
    const WEIGHT_THRESHOLD = edgeThreshold;

    // Determine which edges have chevrons (direction display)
    // For each pair (A->B, B->A), chevron goes to stronger one. If equal, both.
    const chevronEdges = new Set<string>();
    const processedPairs = new Set<string>();

    for (const edge of edges) {
      const key = `${edge.ground}_${edge.response}`;
      const reverseKey = `${edge.response}_${edge.ground}`;
      if (processedPairs.has(key)) continue;
      processedPairs.add(key);
      processedPairs.add(reverseKey);

      const reverseEdge = edges.find(e => e.ground === edge.response && e.response === edge.ground);
      const wFwd = getEdgeWeight(edge);
      const wRev = reverseEdge ? getEdgeWeight(reverseEdge) : 0;

      if (wFwd > wRev + 0.001) {
        chevronEdges.add(key);
      } else if (wRev > wFwd + 0.001) {
        if (reverseEdge) chevronEdges.add(reverseKey);
      } else if (wFwd > WEIGHT_THRESHOLD && wRev > WEIGHT_THRESHOLD) {
        // Equal strength: both get chevrons
        chevronEdges.add(key);
        if (reverseEdge) chevronEdges.add(reverseKey);
      }
    }

    // Draw broadcast triangles
    for (const edge of edges) {
      const w = getEdgeWeight(edge);
      if (w < WEIGHT_THRESHOLD) continue;

      const groundNode = nodes.find(n => n.code === edge.ground);
      const responseNode = nodes.find(n => n.code === edge.response);
      if (!groundNode || !responseNode) continue;

      // Skip self-connections here (they are shown via inner circle)
      if (edge.ground === edge.response) continue;

      const gx = xScale(groundNode.x);
      const gy = yScale(groundNode.y);
      const rx = xScale(responseNode.x);
      const ry = yScale(responseNode.y);

      const thickness = Math.max(2, 20 * (w / maxEdgeWeight));
      const opacity = 0.3 + 0.5 * (w / maxEdgeWeight);
      const color = getEdgeColor(edge);

      const isHighlighted = highlightedNode === null || highlightedNode === undefined ||
        edge.ground === highlightedNode || edge.response === highlightedNode;
      const edgeOpacity = highlightedNode ? (isHighlighted ? opacity : opacity * 0.1) : opacity;

      // Direction vector from apex (ground) to base midpoint (response)
      const dx = rx - gx;
      const dy = ry - gy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1) continue;

      const ux = dx / dist;
      const uy = dy / dist;

      // Perpendicular
      const px = -uy;
      const py = ux;

      // Outer triangle: apex at ground node edge, base at response node
      const baseWidth = thickness * 2.5;
      const apexOffset = nodeRadius(groundNode);
      const baseOffset = nodeRadius(responseNode);

      const apexX = gx + ux * apexOffset;
      const apexY = gy + uy * apexOffset;
      const baseCenterX = rx - ux * baseOffset;
      const baseCenterY = ry - uy * baseOffset;

      // Outer triangle points
      const tri1 = [
        [apexX, apexY],
        [baseCenterX + px * baseWidth, baseCenterY + py * baseWidth],
        [baseCenterX - px * baseWidth, baseCenterY - py * baseWidth],
      ];

      // Inner triangle (60% size)
      const innerScale = 0.55;
      const innerApexX = gx + ux * (apexOffset + dist * (1 - innerScale) * 0.5);
      const innerApexY = gy + uy * (apexOffset + dist * (1 - innerScale) * 0.5);
      const innerBaseCenterX = rx - ux * (baseOffset + dist * (1 - innerScale) * 0.5);
      const innerBaseCenterY = ry - uy * (baseOffset + dist * (1 - innerScale) * 0.5);
      const innerBaseWidth = baseWidth * innerScale;

      const tri2 = [
        [innerApexX, innerApexY],
        [innerBaseCenterX + px * innerBaseWidth, innerBaseCenterY + py * innerBaseWidth],
        [innerBaseCenterX - px * innerBaseWidth, innerBaseCenterY - py * innerBaseWidth],
      ];

      const edgeGroup = edgeLayer.append('g')
        .attr('class', `edge edge-${edge.ground}-${edge.response}`)
        .style('cursor', 'pointer')
        .on('click', () => onEdgeClick?.(edge.ground, edge.response))
        .on('mouseenter', (event) => {
          onTooltipChange?.({
            visible: true,
            x: event.clientX,
            y: event.clientY,
            title: `${edge.ground} → ${edge.response}`,
            content: `두 노드를 연결하는 삼각형의 두께와 채도가 높을수록 두 행동 간의 연속적인 발생 빈도(연결 강도)가 강하다는 것을 의미합니다. 꼭짓점은 정보의 출처(Ground: ${edge.ground})를, 밑변은 반응(Response: ${edge.response})을 나타냅니다.\n\nActive 강도: ${edge.weightActive.toFixed(4)}\nPassive 강도: ${edge.weightPassive.toFixed(4)}`,
          });
        })
        .on('mousemove', (event) => {
          onTooltipChange?.({ visible: true, x: event.clientX, y: event.clientY, title: `${edge.ground} → ${edge.response}`, content: '' });
        })
        .on('mouseleave', () => onTooltipChange?.({ visible: false, x: 0, y: 0, title: '', content: '' }));

      edgeGroup.append('polygon')
        .attr('points', tri1.map(p => p.join(',')).join(' '))
        .attr('fill', color)
        .attr('fill-opacity', edgeOpacity)
        .attr('stroke', 'none');

      edgeGroup.append('polygon')
        .attr('points', tri2.map(p => p.join(',')).join(' '))
        .attr('fill', '#fff')
        .attr('fill-opacity', edgeOpacity * 0.6)
        .attr('stroke', 'none');

      // ─── CHEVRON ───────────────────────────────────────────────────────
      const edgeKey = `${edge.ground}_${edge.response}`;
      if (chevronEdges.has(edgeKey)) {
        const chevMidX = (apexX + baseCenterX) / 2;
        const chevMidY = (apexY + baseCenterY) / 2;
        const chevSize = Math.max(6, thickness * 0.8);

        // Chevron: two lines forming a > shape pointing from Ground to Response
        const c1x = chevMidX - ux * chevSize - px * chevSize * 0.7;
        const c1y = chevMidY - uy * chevSize - py * chevSize * 0.7;
        const c2x = chevMidX + ux * chevSize * 0.3;
        const c2y = chevMidY + uy * chevSize * 0.3;
        const c3x = chevMidX - ux * chevSize + px * chevSize * 0.7;
        const c3y = chevMidY - uy * chevSize + py * chevSize * 0.7;

        chevronLayer.append('polyline')
          .attr('points', `${c1x},${c1y} ${c2x},${c2y} ${c3x},${c3y}`)
          .attr('fill', 'none')
          .attr('stroke', d3.color(color)?.darker(1.5)?.toString() ?? '#000')
          .attr('stroke-width', Math.max(1.5, thickness * 0.3))
          .attr('stroke-linecap', 'round')
          .attr('stroke-linejoin', 'round')
          .attr('opacity', isHighlighted ? 0.9 : 0.15)
          .on('mouseenter', (event) => {
            onTooltipChange?.({
              visible: true,
              x: event.clientX,
              y: event.clientY,
              title: `방향: ${edge.ground} → ${edge.response}`,
              content: `삼각형 위의 꺾쇠(Chevron) 기호는 어떤 행동에서 어떤 행동으로 이어졌는지 인과적 흐름과 순서를 보여줍니다. 양방향 연결이 존재할 경우, 화면 혼란을 방지하기 위해 더 빈번하게 발생한(강도가 강한) 방향에만 표시됩니다.`,
            });
          })
          .on('mouseleave', () => onTooltipChange?.({ visible: false, x: 0, y: 0, title: '', content: '' }));
      }
    }

    // ─── INDIVIDUAL POINTS ─────────────────────────────────────────────
    for (const unit of units) {
      const px = xScale(unit.onaScore.x);
      const py = yScale(unit.onaScore.y);
      const color = unit.condition === 'Active' ? ACTIVE_COLOR : PASSIVE_COLOR;

      if (viewMode === 'both' || viewMode === unit.condition.toLowerCase() as 'active' | 'passive') {
        pointLayer.append('circle')
          .attr('cx', px).attr('cy', py)
          .attr('r', 4)
          .attr('fill', color)
          .attr('fill-opacity', 0.6)
          .attr('stroke', '#fff')
          .attr('stroke-width', 1);
      }
    }

    // ─── CONFIDENCE INTERVALS ─────────────────────────────────────────
    function drawCI(ci: { x: [number, number]; y: [number, number] }, color: string, showGroup: boolean) {
      if (!showGroup) return;
      const x1 = xScale(ci.x[0]);
      const x2 = xScale(ci.x[1]);
      const y1 = yScale(ci.y[1]); // flip
      const y2 = yScale(ci.y[0]);
      ciLayer.append('rect')
        .attr('x', x1).attr('y', y1)
        .attr('width', Math.abs(x2 - x1))
        .attr('height', Math.abs(y2 - y1))
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '5,4')
        .attr('opacity', 0.6)
        .on('mouseenter', (event) => {
          onTooltipChange?.({
            visible: true,
            x: event.clientX,
            y: event.clientY,
            title: `${color === ACTIVE_COLOR ? '적극적 계획 집단' : '소극적 계획 집단'} 95% 신뢰구간`,
            content: '각 그룹의 평균 점 주변으로 차원별 95% 신뢰구간을 점선 박스(Box) 형태로 렌더링하여 통계적 분포를 보여줍니다.',
          });
        })
        .on('mouseleave', () => onTooltipChange?.({ visible: false, x: 0, y: 0, title: '', content: '' }));
    }

    const showActive = viewMode === 'both' || viewMode === 'active';
    const showPassive = viewMode === 'both' || viewMode === 'passive';

    drawCI(activeCI, ACTIVE_COLOR, showActive);
    drawCI(passiveCI, PASSIVE_COLOR, showPassive);

    // ─── GROUP MEANS (Squares) ─────────────────────────────────────────
    function drawMean(mean: { x: number; y: number }, color: string, label: string, showGroup: boolean) {
      if (!showGroup) return;
      const mx = xScale(mean.x);
      const my = yScale(mean.y);
      const size = 18;
      // 흰색 외곽선으로 뒤 요소와 구분
      meanLayer.append('rect')
        .attr('x', mx - size / 2 - 2).attr('y', my - size / 2 - 2)
        .attr('width', size + 4).attr('height', size + 4)
        .attr('fill', 'white').attr('rx', 2);
      meanLayer.append('rect')
        .attr('x', mx - size / 2).attr('y', my - size / 2)
        .attr('width', size).attr('height', size)
        .attr('fill', color)
        .attr('stroke', '#fff')
        .attr('stroke-width', 2.5)
        .attr('rx', 2)
        .on('mouseenter', (event) => {
          onTooltipChange?.({
            visible: true,
            x: event.clientX,
            y: event.clientY,
            title: `${label} 집단 평균`,
            content: '공간 상의 사각형(Square) 아이콘은 그룹 전체의 평균 위치를 나타냅니다. 점선 박스는 95% 신뢰구간을 의미합니다.',
          });
        })
        .on('mouseleave', () => onTooltipChange?.({ visible: false, x: 0, y: 0, title: '', content: '' }));
    }

    drawMean(activeMean, ACTIVE_COLOR, '적극적 계획', showActive);
    drawMean(passiveMean, PASSIVE_COLOR, '소극적 계획', showPassive);

    // ─── NODES ────────────────────────────────────────────────────────
    for (const node of nodes) {
      const nx = xScale(node.x);
      const ny = yScale(node.y);
      const r = nodeRadius(node);
      const sr = selfRadius(node);
      const isHL = !highlightedNode || highlightedNode === node.code;

      const isSel = selectedNode === node.code;
      const nodeGroup = nodeLayer.append('g')
        .attr('class', `node node-${node.code}`)
        .style('cursor', 'pointer')
        .on('click', () => {
          onNodeClick?.(isSel ? null : node.code);
        })
        .on('mouseenter', (event) => {
          onNodeHover?.(node.code);
          onTooltipChange?.({
            visible: true,
            x: event.clientX,
            y: event.clientY,
            title: node.code,
            content: `노드의 크기는 이 행동이 이전 상황에 대한 '반응(Response)'으로서 얼마나 자주, 능동적으로 선택되었는지를 나타냅니다.\n\n반응 횟수: ${node.responseCount}회\n자기 연결: ${node.selfConnectionCount}회\n\n클릭하면 상세 통계를 볼 수 있습니다.`,
          });
        })
        .on('mouseleave', () => {
          onNodeHover?.(null);
          onTooltipChange?.({ visible: false, x: 0, y: 0, title: '', content: '' });
        });

      // Outer circle (node size = response count)
      nodeGroup.append('circle')
        .attr('cx', nx).attr('cy', ny)
        .attr('r', r)
        .attr('fill', '#f8fafc')
        .attr('stroke', NODE_STROKE)
        .attr('stroke-width', 2)
        .attr('opacity', isHL ? 1 : 0.25);

      // Inner circle (self-connection)
      const selfIntensity = node.selfConnectionCount / maxSelfCount;
      const selfColor = d3.interpolateBlues(0.2 + selfIntensity * 0.8);
      nodeGroup.append('circle')
        .attr('cx', nx).attr('cy', ny)
        .attr('r', sr)
        .attr('fill', selfColor)
        .attr('stroke', 'none')
        .attr('opacity', isHL ? 0.9 : 0.15)
        .on('mouseenter', (event) => {
          onNodeHover?.(node.code);
          onTooltipChange?.({
            visible: true,
            x: event.clientX,
            y: event.clientY,
            title: `${node.code} - 자기 연결`,
            content: `노드 중앙의 색칠된 원은 동일한 행동이 연이어 발생한 '자기 연결'의 빈도와 강도를 의미합니다.\n\n자기 연결 횟수: ${node.selfConnectionCount}회`,
          });
        });
    }

    // ─── LABELS ───────────────────────────────────────────────────────
    for (const node of nodes) {
      const nx = xScale(node.x);
      const ny = yScale(node.y);
      const r = nodeRadius(node);
      const isHL = !highlightedNode || highlightedNode === node.code;

      labelLayer.append('text')
        .attr('x', nx)
        .attr('y', ny + r + 14)
        .attr('text-anchor', 'middle')
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .attr('fill', '#1e293b')
        .attr('opacity', isHL ? 1 : 0.2)
        .text(node.code);
    }

    // ─── SELECTED NODE ANNOTATIONS ────────────────────────────────────
    if (selectedNode) {
      const selNode = nodes.find(n => n.code === selectedNode);
      if (selNode) {
        const snx = xScale(selNode.x);
        const sny = yScale(selNode.y);
        const sr = nodeRadius(selNode);

        // Outer selection ring (dashed gold)
        annotationLayer.append('circle')
          .attr('cx', snx).attr('cy', sny)
          .attr('r', sr + 8)
          .attr('fill', 'none')
          .attr('stroke', '#f59e0b')
          .attr('stroke-width', 2.5)
          .attr('stroke-dasharray', '6,4');

        // Inner selection ring (solid)
        annotationLayer.append('circle')
          .attr('cx', snx).attr('cy', sny)
          .attr('r', sr + 3)
          .attr('fill', 'none')
          .attr('stroke', '#fbbf24')
          .attr('stroke-width', 1.5)
          .attr('opacity', 0.7);

        // ── 가장 가까운 / 먼 노드 계산 ──
        const distances = nodes
          .filter(n => n.code !== selectedNode)
          .map(n => ({
            code: n.code,
            dist: Math.sqrt((xScale(n.x) - snx) ** 2 + (yScale(n.y) - sny) ** 2),
            nx: xScale(n.x),
            ny: yScale(n.y),
            r: nodeRadius(n),
          }))
          .sort((a, b) => a.dist - b.dist);

        const nearestNode = distances[0];
        const farthestNode = distances[distances.length - 1];

        if (nearestNode) {
          // Dashed line to nearest node
          annotationLayer.append('line')
            .attr('x1', snx).attr('y1', sny)
            .attr('x2', nearestNode.nx).attr('y2', nearestNode.ny)
            .attr('stroke', '#f59e0b')
            .attr('stroke-width', 1.5)
            .attr('stroke-dasharray', '5,4')
            .attr('opacity', 0.7);

          // Label "가장 가까운" near midpoint
          const mx = (snx + nearestNode.nx) / 2;
          const my = (sny + nearestNode.ny) / 2 - 8;
          const labelW = 72;
          annotationLayer.append('rect')
            .attr('x', mx - labelW / 2).attr('y', my - 9)
            .attr('width', labelW).attr('height', 14)
            .attr('rx', 4).attr('fill', '#fef3c7').attr('opacity', 0.95);
          annotationLayer.append('text')
            .attr('x', mx).attr('y', my + 2)
            .attr('text-anchor', 'middle')
            .attr('font-size', '8.5px').attr('font-weight', '700')
            .attr('fill', '#92400e')
            .text('가장 가까운 노드');
        }

        // ── 엣지 강도 계산 헬퍼 ──
        function getW(e: Edge): number {
          if (viewMode === 'active')     return e.weightActive;
          if (viewMode === 'passive')    return e.weightPassive;
          if (viewMode === 'subtracted') return Math.abs(e.weightDiff);
          return (e.weightActive + e.weightPassive) / 2;
        }

        const outEdges = edges
          .filter(e => e.ground === selectedNode && e.response !== selectedNode && getW(e) > 0.001)
          .sort((a, b) => getW(b) - getW(a));

        const inEdges = edges
          .filter(e => e.response === selectedNode && e.ground !== selectedNode && getW(e) > 0.001)
          .sort((a, b) => getW(b) - getW(a));

        // ── 뱃지 그리기 헬퍼 ──
        // fromX/Y → toX/Y 방향의 엣지 위에 뱃지를 그립니다.
        // posRatio: 0=from 쪽, 1=to 쪽  /  perpOffset: 엣지 수직 방향 오프셋(px)
        function drawBadge(
          fromX: number, fromY: number,
          toX: number, toY: number,
          label: string,
          bgFill: string, strokeCol: string, textCol: string,
          posRatio: number, perpOffset: number,
        ) {
          const bx = fromX + (toX - fromX) * posRatio;
          const by = fromY + (toY - fromY) * posRatio;
          const dx = toX - fromX, dy = toY - fromY;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const cx = bx + (-dy / len) * perpOffset;
          const cy = by + ( dx / len) * perpOffset;
          const bw = label.length * 5.8 + 8;
          annotationLayer.append('rect')
            .attr('x', cx - bw / 2).attr('y', cy - 8)
            .attr('width', bw).attr('height', 15).attr('rx', 4)
            .attr('fill', bgFill).attr('stroke', strokeCol).attr('stroke-width', 1);
          annotationLayer.append('text')
            .attr('x', cx).attr('y', cy + 4)
            .attr('text-anchor', 'middle').attr('font-size', '8px').attr('font-weight', '700')
            .attr('fill', textCol).text(label);
        }

        // ── 발신 뱃지 (최강 / 최약) ──
        // 타겟 노드 근처(pos=0.78)에 배치, 최강=위쪽, 최약=아래쪽 오프셋
        if (outEdges[0]) {
          const tgt = nodes.find(n => n.code === outEdges[0].response);
          if (tgt) {
            drawBadge(snx, sny, xScale(tgt.x), yScale(tgt.y),
              '최강 발신', '#dcfce7', '#16a34a', '#15803d', 0.78, +13);
          }
        }
        if (outEdges.length > 1) {
          const weakOut = outEdges[outEdges.length - 1];
          const tgt2 = nodes.find(n => n.code === weakOut.response);
          if (tgt2) {
            drawBadge(snx, sny, xScale(tgt2.x), yScale(tgt2.y),
              '최약 발신', '#f0fdf4', '#86efac', '#166534', 0.78, -13);
          }
        }

        // ── 수신 뱃지 (최강 / 최약) ──
        // 소스 노드 근처(pos=0.78)에 배치
        if (inEdges[0]) {
          const src = nodes.find(n => n.code === inEdges[0].ground);
          if (src) {
            drawBadge(snx, sny, xScale(src.x), yScale(src.y),
              '최강 수신', '#dbeafe', '#2563eb', '#1d4ed8', 0.78, +13);
          }
        }
        if (inEdges.length > 1) {
          const weakIn = inEdges[inEdges.length - 1];
          const src2 = nodes.find(n => n.code === weakIn.ground);
          if (src2) {
            drawBadge(snx, sny, xScale(src2.x), yScale(src2.y),
              '최약 수신', '#eff6ff', '#93c5fd', '#1e40af', 0.78, -13);
          }
        }

        // Selected node name badge
        annotationLayer.append('rect')
          .attr('x', snx - 36).attr('y', sny - sr - 24)
          .attr('width', 72).attr('height', 16).attr('rx', 5)
          .attr('fill', '#f59e0b').attr('opacity', 0.95);
        annotationLayer.append('text')
          .attr('x', snx).attr('y', sny - sr - 12)
          .attr('text-anchor', 'middle').attr('font-size', '9px').attr('font-weight', '800')
          .attr('fill', 'white').text(selectedNode);
      }
    }

    // ─── LEGEND ───────────────────────────────────────────────────────
    // Top-right: group color legend
    const groupLegend = svg.append('g').attr('transform', `translate(${MARGIN + 8}, ${MARGIN + 8})`);
    groupLegend.append('rect')
      .attr('x', -6).attr('y', -6).attr('width', 180).attr('height', 70)
      .attr('rx', 6).attr('fill', 'white').attr('fill-opacity', 0.88)
      .attr('stroke', '#e2e8f0').attr('stroke-width', 1);

    groupLegend.append('text')
      .attr('x', 0).attr('y', 8)
      .attr('font-size', '9px').attr('font-weight', '700')
      .attr('fill', '#64748b').attr('letter-spacing', '0.06em')
      .text('집단 구분');

    if (showActive) {
      groupLegend.append('rect').attr('x', 0).attr('y', 14).attr('width', 11).attr('height', 11)
        .attr('fill', ACTIVE_COLOR).attr('rx', 2);
      groupLegend.append('text').attr('x', 16).attr('y', 23)
        .attr('font-size', '10px').attr('fill', '#1e3a8a').attr('font-weight', '600')
        .text(activeGroupLabel.length > 14 ? activeGroupLabel.slice(0, 14) + '…' : activeGroupLabel);
    }
    if (showPassive) {
      groupLegend.append('rect').attr('x', 0).attr('y', 30).attr('width', 11).attr('height', 11)
        .attr('fill', PASSIVE_COLOR).attr('rx', 2);
      groupLegend.append('text').attr('x', 16).attr('y', 39)
        .attr('font-size', '10px').attr('fill', '#7f1d1d').attr('font-weight', '600')
        .text(passiveGroupLabel.length > 14 ? passiveGroupLabel.slice(0, 14) + '…' : passiveGroupLabel);
    }

    // Bottom-left: visual encoding mini legend
    const encLegend = svg.append('g').attr('transform', `translate(${MARGIN + 8}, ${HEIGHT - MARGIN - 80})`);
    encLegend.append('rect')
      .attr('x', -6).attr('y', -6).attr('width', 210).attr('height', 86)
      .attr('rx', 6).attr('fill', 'white').attr('fill-opacity', 0.88)
      .attr('stroke', '#e2e8f0').attr('stroke-width', 1);

    encLegend.append('text')
      .attr('x', 0).attr('y', 8)
      .attr('font-size', '9px').attr('font-weight', '700')
      .attr('fill', '#64748b').attr('letter-spacing', '0.06em')
      .text('시각적 인코딩');

    const encItems = [
      { y: 20, visual: () => {
          encLegend.append('circle').attr('cx', 8).attr('cy', 20).attr('r', 7).attr('fill', 'none').attr('stroke', '#334155').attr('stroke-width', 1.5);
          encLegend.append('circle').attr('cx', 8).attr('cy', 20).attr('r', 3).attr('fill', '#3b82f6').attr('opacity', 0.85);
        }, label: '노드 크기 = 반응(Response) 횟수 | 내부 원 = 자기 연결' },
      { y: 38, visual: () => {
          encLegend.append('polygon').attr('points', '8,28 2,45 14,45').attr('fill', '#6366f1').attr('opacity', 0.65);
          encLegend.append('polygon').attr('points', '8,32 4,43 12,43').attr('fill', 'white').attr('opacity', 0.55);
        }, label: '삼각형 = 방향성 연결 (꼭짓점→밑변)' },
      { y: 56, visual: () => {
          encLegend.append('line').attr('x1', 2).attr('y1', 56).attr('x2', 14).attr('y2', 56).attr('stroke', '#94a3b8').attr('stroke-width', 1.5);
          encLegend.append('polyline').attr('points', '9,52 14,56 9,60').attr('fill', 'none').attr('stroke', '#334155').attr('stroke-width', 1.5).attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round');
        }, label: '쉐브론(›) = 인과 흐름 방향' },
      { y: 74, visual: () => {
          encLegend.append('rect').attr('x', 2).attr('y', 66).attr('width', 12).attr('height', 10).attr('fill', 'none').attr('stroke', '#64748b').attr('stroke-width', 1).attr('stroke-dasharray', '2,2');
          encLegend.append('rect').attr('x', 6).attr('y', 69).attr('width', 4).attr('height', 4).attr('fill', '#64748b').attr('opacity', 0.7);
        }, label: '■ 사각형 = 그룹 평균 | 점선박스 = 95% CI' },
    ];

    for (const item of encItems) {
      item.visual();
      encLegend.append('text')
        .attr('x', 20).attr('y', item.y)
        .attr('font-size', '9.5px').attr('fill', '#475569')
        .text(item.label);
    }

  }, [result, viewMode, subtractedMultiplier, highlightedNode, selectedNode, nodeSpread, edgeThreshold, getScale, onEdgeClick, onTooltipChange, onNodeHover, onNodeClick, activeGroupLabel, passiveGroupLabel]);

  // ─── Zoom / Pan behavior ──────────────────────────────────────────────
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);

    if (!panMode) {
      svg.on('.zoom', null);
      svg.style('cursor', null);
      return;
    }

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.25, 4])
      .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        transformRef.current = event.transform;
        svg.select<SVGGElement>('g.content').attr('transform', event.transform.toString());
      });

    svg.call(zoom);
    // Restore any previously saved transform
    svg.call(zoom.transform, transformRef.current);
    zoomRef.current = zoom;

    svg.style('cursor', 'grab');
    svg.on('mousedown.cursor', () => svg.style('cursor', 'grabbing'));
    svg.on('mouseup.cursor',   () => svg.style('cursor', 'grab'));

    return () => {
      svg.on('.zoom', null);
      svg.on('mousedown.cursor', null);
      svg.on('mouseup.cursor', null);
      svg.style('cursor', null);
    };
  }, [panMode]);

  const resetView = useCallback(() => {
    if (!svgRef.current) return;
    transformRef.current = d3.zoomIdentity;
    const svg = d3.select(svgRef.current);
    svg.select<SVGGElement>('g.content').attr('transform', d3.zoomIdentity.toString());
    if (zoomRef.current) {
      svg.call(zoomRef.current.transform, d3.zoomIdentity);
    }
  }, []);

  return (
    <div className="relative">
      {/* Pan toolbar */}
      <div className="absolute top-2 right-2 z-10 flex gap-1 bg-white/90 rounded-lg border border-slate-200 shadow-sm p-1">
        <button
          title="선택 모드"
          onClick={() => setPanMode(false)}
          className={`w-7 h-7 rounded flex items-center justify-center text-sm transition-colors ${
            !panMode ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 hover:bg-slate-100'
          }`}
        >
          ↖
        </button>
        <button
          title="이동(Pan) 모드"
          onClick={() => setPanMode(true)}
          className={`w-7 h-7 rounded flex items-center justify-center text-sm transition-colors ${
            panMode ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 hover:bg-slate-100'
          }`}
        >
          ✋
        </button>
        {panMode && (
          <button
            title="초기 위치로"
            onClick={resetView}
            className="w-7 h-7 rounded flex items-center justify-center text-sm text-slate-400 hover:bg-slate-100 transition-colors"
          >
            ⌂
          </button>
        )}
      </div>
      <svg
        ref={svgRef}
        width={WIDTH}
        height={HEIGHT}
        className="bg-white rounded-xl border border-slate-200"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
    </div>
  );
}
