import React, { useMemo, useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, ExternalLink } from 'lucide-react';
import { MuhallaHadith, Narrator } from '../types/hadith';

interface IsnadTreeViewProps {
  hadiths: MuhallaHadith[];
  narrators: Narrator[];
  selectedHadithId: string;
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

export const IsnadTreeView: React.FC<IsnadTreeViewProps> = ({
  hadiths,
  narrators,
  selectedHadithId,
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

  const graph = useMemo(() => {
    if (!activeHadith) {
      return { nodes: [] as TreeNode[], edges: [] as TreeEdge[], width: 800, height: 500 };
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

    // Group nodes by level
    const byLevel = new Map<number, string[]>();
    levelMap.forEach((lvl, nid) => {
      if (nid === 'prophet_root' && visiblePaths.length === 0) return;
      if (!byLevel.has(lvl)) byLevel.set(lvl, []);
      byLevel.get(lvl)!.push(nid);
    });

    const NODE_W = 196;
    const NODE_H = 68;
    const GAP_X = 34;
    const GAP_Y = 64;
    const PAD_X = 48;
    const PAD_Y = 36;

    let maxCols = 1;
    byLevel.forEach((ids) => {
      if (ids.length > maxCols) maxCols = ids.length;
    });

    const maxLevel = Math.max(0, ...Array.from(byLevel.keys()));
    const totalWidth = Math.max(760, maxCols * NODE_W + (maxCols - 1) * GAP_X + PAD_X * 2);
    const totalHeight = Math.max(460, (maxLevel + 1) * NODE_H + maxLevel * GAP_Y + PAD_Y * 2);

    const nodes: TreeNode[] = [];
    const nodePosMap = new Map<string, { x: number; y: number }>();

    Array.from(byLevel.keys())
      .sort((a, b) => a - b)
      .forEach((lvl) => {
        const ids = byLevel.get(lvl)!;
        // Put muhalla-only nodes to the right (or left) consistently
        ids.sort((a, b) => {
          const aM = muhallaSet.has(a) ? 0 : 1;
          const bM = muhallaSet.has(b) ? 0 : 1;
          return aM - bM;
        });

        const rowWidth = ids.length * NODE_W + (ids.length - 1) * GAP_X;
        const startX = (totalWidth - rowWidth) / 2;
        const y = PAD_Y + lvl * (NODE_H + GAP_Y);

        ids.forEach((nid, i) => {
          const x = startX + i * (NODE_W + GAP_X);
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
            const displayName = n
              ? n.name.split('(')[0].trim()
              : nid;
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

    return { nodes, edges, nodePosMap, width: totalWidth, height: totalHeight, NODE_W, NODE_H };
  }, [activeHadith, hiddenPathIds, narratorMap]);

  const selectedNarrator = useMemo(() => {
    if (!selectedNodeId || selectedNodeId === 'prophet_root') return null;
    return narratorMap.get(selectedNodeId) || null;
  }, [selectedNodeId, narratorMap]);

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

          <div className="flex items-center gap-2">
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

        {/* Path Toggles & Legend */}
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
                  className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer whitespace-nowrap ${
                    isVisible
                      ? isMuhalla
                        ? 'bg-[#854D0E] text-white border-[#854D0E]'
                        : 'bg-[#14532D] text-white border-[#14532D]'
                      : 'bg-[#FBF9F5] text-[#6B655E] border-[#E6E0D4]'
                  }`}
                >
                  {p.sourceLabel}
                </button>
              );
            })}
          </div>

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

      {/* Tree Canvas + Narrator Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 bg-white border border-[#E6E0D4] rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-[#FBF9F5] border-b border-[#E6E0D4] flex flex-wrap items-center gap-5 text-xs text-[#57534E]">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[#854D0E] inline-block" />
              <span>مسار ابن حزم (الأندلسي)</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[#14532D] inline-block" />
              <span>مسارات الكتب التسعة</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 border-2 border-[#14532D] rounded-xs inline-block" />
              <span>مدار إسناد مشترك</span>
            </span>
          </div>

          <div className="overflow-auto p-4 bg-[#FBF9F5]/60 max-h-[640px]" dir="ltr">
            <svg
              width={graph.width * zoom}
              height={graph.height * zoom}
              viewBox={`0 0 ${graph.width} ${graph.height}`}
              className="mx-auto block select-none"
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
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#854D0E" />
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
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#14532D" />
                </marker>
              </defs>

              {/* Edges */}
              {graph.edges.map((edge) => {
                const from = graph.nodePosMap?.get(edge.fromId);
                const to = graph.nodePosMap?.get(edge.toId);
                if (!from || !to) return null;
                const NW = graph.NODE_W || 196;
                const NH = graph.NODE_H || 68;
                const x1 = from.x + NW / 2 + (edge.sourceType === 'muhalla' ? 3 : -3);
                const y1 = from.y + NH;
                const x2 = to.x + NW / 2 + (edge.sourceType === 'muhalla' ? 3 : -3);
                const y2 = to.y - 2;
                const midY = (y1 + y2) / 2;
                const strokeColor =
                  edge.sourceType === 'muhalla' ? '#854D0E' : '#14532D';
                return (
                  <path
                    key={edge.id}
                    d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
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

              {/* Nodes */}
              {graph.nodes.map((node) => {
                const NW = graph.NODE_W || 196;
                const NH = graph.NODE_H || 68;
                const isSelected = selectedNodeId === node.id;
                const isMadar = !node.isProphet && node.pathCount > 1;

                let fill = '#FFFFFF';
                let stroke = '#D6CEBE';
                if (node.isProphet) {
                  fill = '#14532D';
                  stroke = '#14532D';
                } else if (node.isAndalusian) {
                  fill = '#FFFBEB';
                  stroke = isSelected ? '#854D0E' : '#B45309';
                } else if (isMadar) {
                  fill = '#F0FDF4';
                  stroke = '#14532D';
                }

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
                        rx={12}
                        fill="none"
                        stroke="#14532D"
                        strokeWidth={1}
                        strokeDasharray="4 3"
                      />
                    )}
                    <rect
                      width={NW}
                      height={NH}
                      rx={10}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={isSelected ? 2.5 : 1.25}
                    />
                    <foreignObject width={NW} height={NH}>
                      <div
                        dir="rtl"
                        className="w-full h-full px-3 py-2 flex flex-col justify-center text-right"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={`text-xs font-bold truncate ${
                              node.isProphet ? 'text-white' : 'text-[#1C1917]'
                            }`}
                          >
                            {node.label}
                          </span>
                          {isMadar && (
                            <span className="text-[10px] font-medium text-[#14532D] shrink-0">
                              مدار
                            </span>
                          )}
                          {node.isAndalusian && !node.isProphet && (
                            <span className="text-[10px] font-medium text-[#854D0E] shrink-0">
                              أندلسي
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-[11px] truncate mt-0.5 ${
                            node.isProphet ? 'text-white/80' : 'text-[#6B655E]'
                          }`}
                        >
                          {node.subLabel}
                        </span>
                      </div>
                    </foreignObject>
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

              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-[#14532D]">
                  موقف ابن حزم في المحلّى
                </p>
                <p className="text-xs leading-relaxed text-[#292524]">
                  {selectedNarrator.ibnHazmVerdict}
                </p>
              </div>

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
