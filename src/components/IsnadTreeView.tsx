import React, { useMemo, useRef, useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ExternalLink,
  Download,
  Image as ImageIcon,
} from 'lucide-react';
import { MuhallaHadith, Narrator } from '../types/hadith';
import { DEFAULT_PLATFORM_SETTINGS, PlatformSettings } from '../types/settings';

interface IsnadTreeViewProps {
  hadiths: MuhallaHadith[];
  narrators: Narrator[];
  selectedHadithId: string;
  treeStyle?: PlatformSettings['isnadTreeStyle'];
  onSelectHadith: (id: string) => void;
  onOpenNarratorInDirectory: (narratorId: string) => void;
}

interface TreeNode {
  id: string;
  label: string;
  subLabel: string;
  level: number;
  x: number;
  y: number;
  isProphet?: boolean;
  isAndalusian: boolean;
  inMuhallaPath: boolean;
  inNineBooksPath: boolean;
  pathCount: number;
  narrator?: Narrator;
}

interface TreeEdge {
  id: string;
  fromId: string;
  toId: string;
  sourceType: 'muhalla' | 'nine_books';
}

function truncateText(str: string, maxLen: number): string {
  if (!str) return '';
  return str.length > maxLen ? `${str.slice(0, maxLen - 1)}…` : str;
}

export const IsnadTreeView: React.FC<IsnadTreeViewProps> = ({
  hadiths,
  narrators,
  selectedHadithId,
  treeStyle = DEFAULT_PLATFORM_SETTINGS.isnadTreeStyle,
  onSelectHadith,
  onOpenNarratorInDirectory,
}) => {
  const activeHadith = useMemo(
    () => hadiths.find((h) => h.id === selectedHadithId) || hadiths[0],
    [hadiths, selectedHadithId]
  );

  const [hiddenPathIds, setHiddenPathIds] = useState<Set<string>>(new Set());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('ibn_hazm');
  const [zoom, setZoom] = useState<number>(1);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const narratorMap = useMemo(() => {
    const map = new Map<string, Narrator>();
    narrators.forEach((n) => map.set(n.id, n));
    return map;
  }, [narrators]);

  const togglePath = (pathId: string) => {
    setHiddenPathIds((prev) => {
      const next = new Set(prev);
      if (next.has(pathId)) next.delete(pathId);
      else next.add(pathId);
      return next;
    });
  };

  const isHorizontal = treeStyle.layout === 'horizontal';
  const nodeRadius =
    treeStyle.nodeShape === 'square'
      ? 2
      : treeStyle.nodeShape === 'soft'
        ? 18
        : 10;

  const graph = useMemo(() => {
    if (!activeHadith) {
      return {
        nodes: [] as TreeNode[],
        edges: [] as TreeEdge[],
        nodePosMap: new Map<string, { x: number; y: number }>(),
        width: 800,
        height: 500,
        NODE_W: 204,
        NODE_H: 70,
      };
    }

    const visiblePaths = activeHadith.paths.filter((p) => !hiddenPathIds.has(p.id));

    const levelMap = new Map<string, number>();
    const muhallaSet = new Set<string>();
    const nineBooksSet = new Set<string>();
    const pathMembership = new Map<string, Set<string>>();

    levelMap.set('prophet_root', 0);

    visiblePaths.forEach((path) => {
      path.chainNarratorIds.forEach((nid, idx) => {
        const proposedLevel = idx + 1;
        const current = levelMap.get(nid) ?? 0;
        if (proposedLevel > current) {
          levelMap.set(nid, proposedLevel);
        }
        if (path.sourceType === 'muhalla') muhallaSet.add(nid);
        else nineBooksSet.add(nid);

        if (!pathMembership.has(nid)) pathMembership.set(nid, new Set());
        pathMembership.get(nid)!.add(path.id);
      });
    });

    const edges: TreeEdge[] = [];
    const edgeDedup = new Set<string>();

    visiblePaths.forEach((path) => {
      const chain = ['prophet_root', ...path.chainNarratorIds];
      for (let i = 0; i < chain.length - 1; i++) {
        const fromId = chain[i];
        const toId = chain[i + 1];
        const edgeKey = `${fromId}->${toId}:${path.sourceType}`;
        if (!edgeDedup.has(edgeKey)) {
          edgeDedup.add(edgeKey);
          edges.push({
            id: `${path.id}-${i}`,
            fromId,
            toId,
            sourceType: path.sourceType,
          });
        }
      }
    });

    const byLevel = new Map<number, string[]>();
    levelMap.forEach((lvl, nid) => {
      if (nid === 'prophet_root' && visiblePaths.length === 0) return;
      if (!byLevel.has(lvl)) byLevel.set(lvl, []);
      byLevel.get(lvl)!.push(nid);
    });

    const NODE_W = 204;
    const NODE_H = 70;
    const GAP_X = isHorizontal ? 68 : 34;
    const GAP_Y = isHorizontal ? 28 : 64;
    const PAD_X = 48;
    const PAD_Y = 36;

    let maxInLevel = 1;
    byLevel.forEach((ids) => {
      if (ids.length > maxInLevel) maxInLevel = ids.length;
    });

    const maxLevel = Math.max(0, ...Array.from(byLevel.keys()));

    const totalWidth = isHorizontal
      ? Math.max(820, (maxLevel + 1) * NODE_W + maxLevel * GAP_X + PAD_X * 2)
      : Math.max(760, maxInLevel * NODE_W + (maxInLevel - 1) * GAP_X + PAD_X * 2);

    const totalHeight = isHorizontal
      ? Math.max(460, maxInLevel * NODE_H + (maxInLevel - 1) * GAP_Y + PAD_Y * 2)
      : Math.max(460, (maxLevel + 1) * NODE_H + maxLevel * GAP_Y + PAD_Y * 2);

    const nodes: TreeNode[] = [];
    const nodePosMap = new Map<string, { x: number; y: number }>();

    Array.from(byLevel.keys())
      .sort((a, b) => a - b)
      .forEach((lvl) => {
        const ids = byLevel.get(lvl)!;
        ids.sort((a, b) => {
          const aM = muhallaSet.has(a) ? 0 : 1;
          const bM = muhallaSet.has(b) ? 0 : 1;
          return aM - bM;
        });

        ids.forEach((nid, i) => {
          let x: number;
          let y: number;

          if (isHorizontal) {
            // Right-to-left tree flow (Prophet on the right, Ibn Hazm to the left)
            x = totalWidth - PAD_X - NODE_W - lvl * (NODE_W + GAP_X);
            const colH = ids.length * NODE_H + (ids.length - 1) * GAP_Y;
            const startY = (totalHeight - colH) / 2;
            y = startY + i * (NODE_H + GAP_Y);
          } else {
            const rowWidth = ids.length * NODE_W + (ids.length - 1) * GAP_X;
            const startX = (totalWidth - rowWidth) / 2;
            x = startX + i * (NODE_W + GAP_X);
            y = PAD_Y + lvl * (NODE_H + GAP_Y);
          }

          nodePosMap.set(nid, { x, y });

          if (nid === 'prophet_root') {
            nodes.push({
              id: nid,
              label: 'رسول الله محمد ﷺ',
              subLabel: 'مصدر التشريع والنص النبوي',
              level: 0,
              x,
              y,
              isProphet: true,
              isAndalusian: false,
              inMuhallaPath: true,
              inNineBooksPath: true,
              pathCount: visiblePaths.length,
            });
          } else {
            const n = narratorMap.get(nid);
            const displayName = n ? n.name.split('(')[0].trim() : nid;
            const sub = n
              ? `${n.tabaqah}${n.deathYearH ? ` · ت ${n.deathYearH}هـ` : ''}`
              : 'راوٍ في الإسناد';
            nodes.push({
              id: nid,
              label: displayName,
              subLabel: sub,
              level: lvl,
              x,
              y,
              isAndalusian: n?.origin === 'andalusian',
              inMuhallaPath: muhallaSet.has(nid),
              inNineBooksPath: nineBooksSet.has(nid),
              pathCount: pathMembership.get(nid)?.size || 1,
              narrator: n,
            });
          }
        });
      });

    return {
      nodes,
      edges,
      nodePosMap,
      width: totalWidth,
      height: totalHeight,
      NODE_W,
      NODE_H,
    };
  }, [activeHadith, hiddenPathIds, narratorMap, isHorizontal]);

  const selectedNarrator = useMemo(() => {
    if (!selectedNodeId || selectedNodeId === 'prophet_root') return null;
    return narratorMap.get(selectedNodeId) || null;
  }, [selectedNodeId, narratorMap]);

  const buildEdgePath = (
    from: { x: number; y: number },
    to: { x: number; y: number },
    sourceType: 'muhalla' | 'nine_books'
  ) => {
    const NW = graph.NODE_W;
    const NH = graph.NODE_H;
    const offset = sourceType === 'muhalla' ? 3 : -3;

    if (isHorizontal) {
      const x1 = from.x;
      const y1 = from.y + NH / 2 + offset;
      const x2 = to.x + NW + 2;
      const y2 = to.y + NH / 2 + offset;
      if (treeStyle.connectorStyle === 'straight') {
        return `M ${x1} ${y1} L ${x2} ${y2}`;
      }
      const midX = (x1 + x2) / 2;
      if (treeStyle.connectorStyle === 'step') {
        return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
      }
      return `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
    }

    const x1 = from.x + NW / 2 + offset;
    const y1 = from.y + NH;
    const x2 = to.x + NW / 2 + offset;
    const y2 = to.y - 2;
    if (treeStyle.connectorStyle === 'straight') {
      return `M ${x1} ${y1} L ${x2} ${y2}`;
    }
    const midY = (y1 + y2) / 2;
    if (treeStyle.connectorStyle === 'step') {
      return `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`;
    }
    return `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
  };

  const handleDownloadSvg = () => {
    const svgEl = svgRef.current;
    if (!svgEl || !activeHadith) return;
    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', String(graph.width));
    clone.setAttribute('height', String(graph.height));
    clone.style.background = treeStyle.canvasBgColor || '#FBF9F5';

    const serializer = new XMLSerializer();
    const svgStr = '<?xml version="1.0" encoding="UTF-8"?>\n' + serializer.serializeToString(clone);
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shajara_issue_${activeHadith.issueNumber}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPng = () => {
    const svgEl = svgRef.current;
    if (!svgEl || !activeHadith) return;
    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', String(graph.width));
    clone.setAttribute('height', String(graph.height));

    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(clone);
    const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const scale = 2;
      const canvas = document.createElement('canvas');
      canvas.width = graph.width * scale;
      canvas.height = graph.height * scale;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = treeStyle.canvasBgColor || '#FBF9F5';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((pngBlob) => {
          if (pngBlob) {
            const pngUrl = URL.createObjectURL(pngBlob);
            const a = document.createElement('a');
            a.href = pngUrl;
            a.download = `shajara_issue_${activeHadith.issueNumber}.png`;
            a.click();
            URL.revokeObjectURL(pngUrl);
          }
        }, 'image/png');
      }
      URL.revokeObjectURL(svgUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(svgUrl);
    };
    img.src = svgUrl;
  };

  if (!activeHadith) {
    return (
      <div className="bg-white border border-[#E6E0D4] rounded-xl p-12 text-center text-sm text-[#6B655E]">
        أضف حديثاً أولاً لعرض شجرة الإسناد.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Controls & Hadith Selector */}
      <div className="bg-white border border-[#E6E0D4] rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-[#1C1917]">
              شجرة الحديث ومقارنة طرق الإسناد
            </h2>
            <p className="text-xs text-[#6B655E]">
              تندمج الأسانيد تلقائياً عند الرواة المشتركين (مدار الإسناد) لبيان التقاء طريق ابن حزم الأندلسي بطرق الكتب التسعة.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={activeHadith.id}
              onChange={(e) => {
                onSelectHadith(e.target.value);
                setHiddenPathIds(new Set());
              }}
              className="px-3 py-2 text-xs font-medium bg-[#FBF9F5] border border-[#E6E0D4] rounded-lg focus:outline-none focus:border-[#14532D]"
            >
              {hadiths.map((h) => (
                <option key={h.id} value={h.id}>
                  مسألة {h.issueNumber}: {h.issueTitle.replace('مسألة:', '').trim()}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Path Toggles, Zoom & Download Options */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[#E6E0D4]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-[#6B655E]">الطرق الظاهرة:</span>
            {activeHadith.paths.map((p) => {
              const isVisible = !hiddenPathIds.has(p.id);
              const isMuhalla = p.sourceType === 'muhalla';
              return (
                <button
                  key={p.id}
                  onClick={() => togglePath(p.id)}
                  style={
                    isVisible
                      ? {
                          backgroundColor: isMuhalla
                            ? treeStyle.muhallaEdgeColor
                            : treeStyle.nineBooksEdgeColor,
                          borderColor: isMuhalla
                            ? treeStyle.muhallaEdgeColor
                            : treeStyle.nineBooksEdgeColor,
                        }
                      : undefined
                  }
                  className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer whitespace-nowrap ${
                    isVisible
                      ? 'text-white'
                      : 'bg-[#FBF9F5] text-[#6B655E] border-[#E6E0D4]'
                  }`}
                >
                  {p.sourceLabel}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {treeStyle.enableDownload && (
              <div className="flex items-center gap-1.5 ml-2">
                <button
                  type="button"
                  onClick={handleDownloadPng}
                  className="btn-hover-motion inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-[#14532D] hover:bg-[#114224] text-white rounded-md cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>تحميل صورة (PNG)</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadSvg}
                  className="btn-hover-motion inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-[#F3EFE6] hover:bg-[#E6E0D4] text-[#1C1917] rounded-md cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تحميل SVG</span>
                </button>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setZoom((z) => Math.max(0.65, +(z - 0.1).toFixed(2)))}
                title="تصغير"
                className="p-2 bg-[#F3EFE6] hover:bg-[#E6E0D4] rounded-md text-[#1C1917] cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-mono tabular-nums text-[#44403C] px-1.5">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(1.4, +(z + 0.1).toFixed(2)))}
                title="تكبير"
                className="p-2 bg-[#F3EFE6] hover:bg-[#E6E0D4] rounded-md text-[#1C1917] cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoom(1)}
                title="إعادة الضبط"
                className="p-2 bg-[#F3EFE6] hover:bg-[#E6E0D4] rounded-md text-[#1C1917] cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tree Canvas + Narrator Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div
          className="lg:col-span-8 bg-white rounded-xl overflow-hidden"
          style={{
            borderColor: treeStyle.frameColor || '#E6E0D4',
            borderWidth: `${treeStyle.frameBorderWidthPx ?? 1}px`,
            borderStyle: 'solid',
          }}
        >
          <div className="px-4 py-2.5 bg-[#FBF9F5] border-b border-[#E6E0D4] flex flex-wrap items-center gap-5 text-xs text-[#57534E]">
            <span className="inline-flex items-center gap-1.5">
              <span
                className="w-3 h-0.5 inline-block"
                style={{ backgroundColor: treeStyle.muhallaEdgeColor }}
              />
              <span>مسار ابن حزم (الأندلسي)</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="w-3 h-0.5 inline-block"
                style={{ backgroundColor: treeStyle.nineBooksEdgeColor }}
              />
              <span>مسارات الكتب التسعة</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="w-3 h-3 border-2 rounded-xs inline-block"
                style={{ borderColor: treeStyle.nineBooksEdgeColor }}
              />
              <span>مدار إسناد مشترك</span>
            </span>
          </div>

          <div
            className="overflow-auto p-4 max-h-[640px]"
            style={{ backgroundColor: treeStyle.canvasBgColor || '#FBF9F5' }}
            dir="ltr"
          >
            <svg
              ref={svgRef}
              width={graph.width * zoom}
              height={graph.height * zoom}
              viewBox={`0 0 ${graph.width} ${graph.height}`}
              className="mx-auto block select-none"
              style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif' }}
            >
              <defs>
                <marker
                  id="arrow-muhalla"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill={treeStyle.muhallaEdgeColor} />
                </marker>
                <marker
                  id="arrow-nine"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill={treeStyle.nineBooksEdgeColor} />
                </marker>
              </defs>

              {/* Edges */}
              {graph.edges.map((edge) => {
                const from = graph.nodePosMap.get(edge.fromId);
                const to = graph.nodePosMap.get(edge.toId);
                if (!from || !to) return null;
                const strokeColor =
                  edge.sourceType === 'muhalla'
                    ? treeStyle.muhallaEdgeColor
                    : treeStyle.nineBooksEdgeColor;
                return (
                  <path
                    key={edge.id}
                    d={buildEdgePath(from, to, edge.sourceType)}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={edge.sourceType === 'muhalla' ? 2.2 : 1.8}
                    strokeOpacity={0.85}
                    markerEnd={`url(#${
                      edge.sourceType === 'muhalla' ? 'arrow-muhalla' : 'arrow-nine'
                    })`}
                  />
                );
              })}

              {/* Pure SVG Nodes (ensures clean SVG & PNG downloads across all browsers) */}
              {graph.nodes.map((node) => {
                const NW = graph.NODE_W;
                const NH = graph.NODE_H;
                const isSelected = selectedNodeId === node.id;
                const isMadar = !node.isProphet && node.pathCount > 1;

                let fill = '#FFFFFF';
                let stroke = '#D6CEBE';
                if (node.isProphet) {
                  fill = treeStyle.nineBooksEdgeColor || '#14532D';
                  stroke = treeStyle.nineBooksEdgeColor || '#14532D';
                } else if (node.isAndalusian) {
                  fill = treeStyle.andalusianNodeColor || '#FFFBEB';
                  stroke = isSelected
                    ? treeStyle.muhallaEdgeColor
                    : '#B45309';
                } else if (isMadar) {
                  fill = '#F0FDF4';
                  stroke = treeStyle.nineBooksEdgeColor || '#14532D';
                }

                const badgeText = isMadar
                  ? 'مدار'
                  : node.isAndalusian && !node.isProphet
                    ? 'أندلسي'
                    : '';

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onClick={() => setSelectedNodeId(node.id)}
                    className="cursor-pointer"
                  >
                    {isMadar && (
                      <rect
                        x={-4}
                        y={-4}
                        width={NW + 8}
                        height={NH + 8}
                        rx={nodeRadius + 2}
                        fill="none"
                        stroke={treeStyle.nineBooksEdgeColor}
                        strokeWidth={1}
                        strokeDasharray="4 3"
                      />
                    )}
                    <rect
                      width={NW}
                      height={NH}
                      rx={nodeRadius}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={isSelected ? 2.5 : 1.25}
                    />

                    {/* Badge (left side in RTL) */}
                    {badgeText && (
                      <text
                        x={12}
                        y={27}
                        textAnchor="start"
                        fontSize={10}
                        fontWeight={600}
                        fill={isMadar ? treeStyle.nineBooksEdgeColor : treeStyle.muhallaEdgeColor}
                      >
                        {badgeText}
                      </text>
                    )}

                    {/* Main Narrator Name */}
                    <text
                      x={NW - 12}
                      y={28}
                      textAnchor="end"
                      direction="rtl"
                      fontSize={12}
                      fontWeight={700}
                      fill={node.isProphet ? '#FFFFFF' : '#1C1917'}
                    >
                      {truncateText(node.label, badgeText ? 21 : 26)}
                    </text>

                    {/* Sublabel */}
                    <text
                      x={NW - 12}
                      y={49}
                      textAnchor="end"
                      direction="rtl"
                      fontSize={10.5}
                      fill={node.isProphet ? 'rgba(255,255,255,0.85)' : '#6B655E'}
                    >
                      {truncateText(node.subLabel, 30)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Side Narrator Inspector */}
        <aside className="lg:col-span-4 bg-white border border-[#E6E0D4] rounded-xl p-5 space-y-4">
          {selectedNodeId === 'prophet_root' ? (
            <div className="space-y-2">
              <p className="text-xs text-[#14532D] font-medium">أصل السند والمتن</p>
              <h3 className="text-lg font-bold text-[#1C1917]">
                رسول الله محمد ﷺ
              </h3>
              <p className="font-hadith text-lg text-[#292524] pt-2 border-t border-[#E6E0D4]">
                «{activeHadith.matnWithTashkeel}»
              </p>
            </div>
          ) : selectedNarrator ? (
            <div className="space-y-4">
              <div className="space-y-1 pb-3 border-b border-[#E6E0D4]">
                <div className="flex items-center gap-2 text-xs text-[#6B655E]">
                  <span className="text-[#854D0E] font-medium">
                    {selectedNarrator.origin === 'andalusian'
                      ? 'المدرسة الأندلسية'
                      : selectedNarrator.tabaqah}
                  </span>
                  {selectedNarrator.deathYearH && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">
                        ت {selectedNarrator.deathYearH}هـ
                      </span>
                    </>
                  )}
                </div>
                <h3 className="text-base font-bold text-[#1C1917] leading-snug">
                  {selectedNarrator.name}
                </h3>
                <p className="text-xs text-[#6B655E]">
                  {selectedNarrator.region} · الدرجة: {selectedNarrator.grade}
                </p>
              </div>

              {selectedNarrator.ibnHazmVerdict && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-[#14532D]">
                    موقف ابن حزم في المحلّى
                  </p>
                  <p className="text-xs leading-relaxed text-[#292524]">
                    {selectedNarrator.ibnHazmVerdict}
                  </p>
                </div>
              )}

              {selectedNarrator.jarhTaadil.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[#E6E0D4]">
                  <p className="text-xs font-semibold text-[#1C1917]">
                    أقوال أئمة الجرح والتعديل
                  </p>
                  <div className="space-y-1.5">
                    {selectedNarrator.jarhTaadil.map((jt, i) => (
                      <p key={i} className="text-xs text-[#44403C] leading-relaxed">
                        <span className="font-semibold text-[#1C1917]">
                          {jt.scholar}:{' '}
                        </span>
                        {jt.verdict}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => onOpenNarratorInDirectory(selectedNarrator.id)}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-[#F3EFE6] hover:bg-[#E6E0D4] text-[#1C1917] rounded-lg transition-colors cursor-pointer"
              >
                <span>فتح البطاقة الكاملة في دراسة الرواة</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <p className="text-sm text-[#6B655E]">
              اضغط على أي راوٍ في شجرة الإسناد لعرض ترجمته ودرجته وموقف ابن حزم منه.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
};
