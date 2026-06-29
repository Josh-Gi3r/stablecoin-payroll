import React, { useState, useMemo, useRef, useEffect } from 'react';

interface BubbleItem {
  name?: string;
  code?: string;
  value: number;
  image?: string;
  logo?: string;
  displayValue: string;
}

interface BubbleBentoProps {
  items: BubbleItem[];
  type: 'employee' | 'vendor' | 'currency';
  title: string;
}

// Each bubble gets a unique float animation with different amplitude, speed, and phase
const FLOAT_CONFIGS = [
  { dx: 3, dy: 5, duration: 6, delay: 0 },
  { dx: -4, dy: 3, duration: 7, delay: 1.2 },
  { dx: 2, dy: -4, duration: 5.5, delay: 0.6 },
  { dx: -3, dy: -3, duration: 8, delay: 1.8 },
  { dx: 4, dy: 2, duration: 6.5, delay: 0.3 },
  { dx: -2, dy: 4, duration: 7.5, delay: 2.1 },
  { dx: 3, dy: -2, duration: 5, delay: 1.5 },
];

// Depth layers — some bubbles sit behind, some in front
const DEPTH_LAYERS: Array<{ z: number; opacity: number; blur: number; scale: number }> = [
  { z: 30, opacity: 1, blur: 0, scale: 1 },       // front — largest
  { z: 20, opacity: 0.92, blur: 0, scale: 1 },     // front
  { z: 10, opacity: 0.85, blur: 0.5, scale: 0.97 }, // mid
  { z: 5, opacity: 0.78, blur: 0.8, scale: 0.95 },  // back-mid
  { z: 2, opacity: 0.7, blur: 1, scale: 0.93 },     // back
  { z: 1, opacity: 0.65, blur: 1.2, scale: 0.91 },  // deep back
  { z: 0, opacity: 0.6, blur: 1.5, scale: 0.9 },    // deepest
];

const BubbleBento: React.FC<BubbleBentoProps> = ({ items, type, title }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const maxValue = Math.max(...items.map((item) => item.value));
  const minValue = Math.min(...items.map((item) => item.value));

  const getBubbleSize = (value: number): number => {
    const minDim = Math.min(containerSize.width, containerSize.height);
    const minBubble = minDim * 0.22;
    const maxBubble = minDim * 0.44;
    if (maxValue === minValue) return (minBubble + maxBubble) / 2;
    const normalized = (value - minValue) / (maxValue - minValue);
    return minBubble + normalized * (maxBubble - minBubble);
  };

  // Organic cluster layout: bubbles OVERLAP, nest into each other
  const layout = useMemo(() => {
    if (containerSize.width === 0 || containerSize.height === 0) return [];

    const cw = containerSize.width;
    const ch = containerSize.height;
    const cx = cw / 2;
    const cy = ch / 2;

    // Sort by value descending — biggest gets center + front depth
    const indexed = items.map((item, i) => ({ item, originalIndex: i }));
    indexed.sort((a, b) => b.item.value - a.item.value);

    const placed: Array<{
      x: number;
      y: number;
      r: number;
      originalIndex: number;
      depth: number;
    }> = [];

    for (let i = 0; i < indexed.length; i++) {
      const { item, originalIndex } = indexed[i];
      const r = getBubbleSize(item.value) / 2;
      const depth = i; // largest = 0 (front), smallest = last (back)

      if (i === 0) {
        // Largest bubble: slightly off-center for organic feel
        placed.push({ x: cx - r * 0.1, y: cy - r * 0.05, r, originalIndex, depth });
        continue;
      }

      // Place subsequent bubbles by nestling against existing ones
      // Allow 15-30% overlap — this is what makes them feel like bubbles
      const overlapFactor = 0.65 + Math.random() * 0.15; // 65-80% of combined radii = 20-35% overlap

      let bestX = cx;
      let bestY = cy;
      let bestScore = Infinity;

      // Try positions around each already-placed bubble
      for (const p of placed) {
        const targetDist = (r + p.r) * overlapFactor;

        for (let angle = 0; angle < Math.PI * 2; angle += 0.2) {
          // Slight randomness in angle to avoid symmetry
          const a = angle + (Math.random() - 0.5) * 0.3;
          const tx = p.x + Math.cos(a) * targetDist;
          const ty = p.y + Math.sin(a) * targetDist;

          // Soft bounds — allow bubbles to be partially clipped (up to 20%)
          const margin = -r * 0.2;
          if (tx - r < margin || tx + r > cw - margin) continue;
          if (ty - r < margin || ty + r > ch - margin) continue;

          // Score: prefer positions close to center, avoid too-deep overlaps with non-target bubbles
          let score = Math.sqrt((tx - cx) ** 2 + (ty - cy) ** 2) * 0.5;
          let tooDeep = false;

          for (const q of placed) {
            if (q === p) continue;
            const dx = tx - q.x;
            const dy = ty - q.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const combined = r + q.r;

            // Reject if more than 50% overlap with another bubble (too much)
            if (dist < combined * 0.5) {
              tooDeep = true;
              break;
            }
            // Penalize moderate overlaps slightly
            if (dist < combined * 0.75) {
              score += 10;
            }
          }

          if (tooDeep) continue;

          if (score < bestScore) {
            bestScore = score;
            bestX = tx;
            bestY = ty;
          }
        }
      }

      placed.push({ x: bestX, y: bestY, r, originalIndex, depth });
    }

    // Map back to original order with depth info
    const result: Array<{ x: number; y: number; depth: number }> = new Array(items.length);
    for (const p of placed) {
      result[p.originalIndex] = { x: p.x - p.r, y: p.y - p.r, depth: p.depth };
    }
    return result;
  }, [items, containerSize]);

  const isEmoji = (str: string | undefined) => {
    if (!str) return false;
    return str.length <= 2 && str.charCodeAt(0) > 127;
  };

  const getInitials = (name: string | undefined) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Generate keyframes style tag for float animations (once)
  const floatKeyframes = useMemo(() => {
    return FLOAT_CONFIGS.map(
      (cfg, i) => `
      @keyframes bubbleFloat${i} {
        0%, 100% { transform: translate(0px, 0px); }
        25% { transform: translate(${cfg.dx}px, ${-cfg.dy}px); }
        50% { transform: translate(${-cfg.dx * 0.5}px, ${cfg.dy}px); }
        75% { transform: translate(${cfg.dx * 0.7}px, ${-cfg.dy * 0.3}px); }
      }
    `
    ).join('\n');
  }, []);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-sm font-bold text-black mb-3">{title}</h3>

      <style>{floatKeyframes}</style>

      {/* Bubble container */}
      <div
        ref={containerRef}
        className="relative flex-1 min-h-[200px] rounded-xl"
        onMouseMove={handleMouseMove}
        style={{
          background: 'rgba(255, 255, 255, 0.015)',
          border: '1px solid rgba(255, 255, 255, 0.03)',
        }}
      >
        {layout.length > 0 &&
          items.map((item, idx) => {
            const size = getBubbleSize(item.value);
            const pos = layout[idx];
            if (!pos) return null;

            const displayName = type === 'currency' ? item.code : item.name;
            const logoOrImage =
              type === 'currency' ? item.logo : type === 'employee' ? item.image : item.logo;
            const showEmoji = isEmoji(logoOrImage);
            const isHovered = hoveredIndex === idx;

            const depthConfig = DEPTH_LAYERS[Math.min(pos.depth, DEPTH_LAYERS.length - 1)];
            const floatConfig = FLOAT_CONFIGS[idx % FLOAT_CONFIGS.length];

            // Calculate cursor repulsion
            const bubbleCenterX = pos.x + size / 2;
            const bubbleCenterY = pos.y + size / 2;
            const dx = bubbleCenterX - mousePos.x;
            const dy = bubbleCenterY - mousePos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const repulsionRadius = size * 3;
            const repulsionStrength = Math.max(0, 1 - distance / repulsionRadius) * 30;
            const repulsionX = distance > 0 ? (dx / distance) * repulsionStrength : 0;
            const repulsionY = distance > 0 ? (dy / distance) * repulsionStrength : 0;

            // Hovered bubble pops to front, pauses float
            const currentZ = isHovered ? 100 : depthConfig.z;
            const currentOpacity = isHovered ? 1 : depthConfig.opacity;
            const currentScale = isHovered ? 1.12 : depthConfig.scale;

            return (
              <div
                key={idx}
                className="absolute"
                style={{
                  left: `${pos.x + repulsionX}px`,
                  top: `${pos.y + repulsionY}px`,
                  width: `${size}px`,
                  height: `${size}px`,
                  zIndex: currentZ,
                  opacity: currentOpacity,
                  filter: isHovered ? 'blur(0px)' : `blur(${depthConfig.blur}px)`,
                  animation: isHovered
                    ? 'none'
                    : `bubbleFloat${idx % FLOAT_CONFIGS.length} ${floatConfig.duration}s ease-in-out ${floatConfig.delay}s infinite`,
                  transition: 'left 0.15s ease-out, top 0.15s ease-out, opacity 0.3s, filter 0.3s, z-index 0s',
                }}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* The bubble itself */}
                <div
                  className="absolute inset-0 rounded-full flex items-center justify-center cursor-pointer overflow-hidden"
                  style={{
                    background: isHovered
                      ? 'rgba(125, 211, 252, 0.22)'
                      : `rgba(125, 211, 252, ${0.06 + (1 - pos.depth / items.length) * 0.08})`,
                    border: isHovered
                      ? '2px solid rgba(125, 211, 252, 0.7)'
                      : `1.5px solid rgba(125, 211, 252, ${0.15 + (1 - pos.depth / items.length) * 0.15})`,
                    boxShadow: isHovered
                      ? '0 0 40px rgba(125, 211, 252, 0.35), inset 0 -8px 20px rgba(125, 211, 252, 0.15), inset 0 4px 12px rgba(255, 255, 255, 0.08)'
                      : `0 ${4 + depthConfig.z * 0.3}px ${12 + depthConfig.z}px rgba(0, 0, 0, ${0.15 + pos.depth * 0.03}), inset 0 -4px 10px rgba(125, 211, 252, 0.04), inset 0 2px 6px rgba(255, 255, 255, 0.04)`,
                    backdropFilter: 'blur(12px)',
                    transform: `scale(${currentScale})`,
                    transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                >
                  {/* Glass highlight — top-left shine */}
                  <div
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      top: '8%',
                      left: '12%',
                      width: '35%',
                      height: '25%',
                      background:
                        'radial-gradient(ellipse at center, rgba(255,255,255,0.12) 0%, transparent 70%)',
                      transform: 'rotate(-30deg)',
                    }}
                  />

                  {showEmoji ? (
                    <span style={{ fontSize: size * 0.4, position: 'relative', zIndex: 2 }}>
                      {logoOrImage}
                    </span>
                  ) : logoOrImage ? (
                    <img
                      src={logoOrImage}
                      alt={displayName}
                      className="w-full h-full object-cover"
                      style={{ position: 'relative', zIndex: 2 }}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent && !parent.querySelector('.fallback-initials')) {
                          const fallback = document.createElement('span');
                          fallback.className = 'fallback-initials';
                          fallback.style.cssText = `font-size: ${size * 0.26}px; font-weight: 700; color: #6ee7b7; letter-spacing: 0.5px; position: relative; z-index: 2;`;
                          fallback.textContent = getInitials(displayName);
                          parent.appendChild(fallback);
                        }
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        fontSize: size * 0.26,
                        fontWeight: 700,
                        color: '#6ee7b7',
                        letterSpacing: '0.5px',
                        position: 'relative',
                        zIndex: 2,
                      }}
                    >
                      {getInitials(displayName)}
                    </span>
                  )}
                </div>

                {/* Tooltip — only on hover, pops above */}
                {isHovered && (
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      bottom: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      marginBottom: '10px',
                      zIndex: 200,
                    }}
                  >
                    <div
                      className="px-3 py-2 rounded-xl text-center whitespace-nowrap"
                      style={{
                        background: 'rgba(10, 15, 30, 0.95)',
                        border: '1px solid var(--border-default)',
                        backdropFilter: 'blur(12px)',
                        boxShadow:
                          '0 12px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(125, 211, 252, 0.1)',
                      }}
                    >
                      <div className="text-[11px] font-semibold text-white">{displayName}</div>
                      <div className="text-xs font-bold text-emerald-400">{item.displayValue}</div>
                    </div>
                    <div
                      className="mx-auto"
                      style={{
                        width: 0,
                        height: 0,
                        borderLeft: '5px solid transparent',
                        borderRight: '5px solid transparent',
                        borderTop: '5px solid rgba(10, 15, 30, 0.95)',
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default BubbleBento;
