import React, { useState, useEffect, useRef } from 'react';

interface BubbleItem {
  name?: string;
  code?: string;
  value: number;
  image?: string;
  logo?: string;
  displayValue: string;
}

interface PhysicsBubbleChartProps {
  items: BubbleItem[];
  type: 'employee' | 'vendor' | 'currency';
  title: string;
}

interface Bubble {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  item: BubbleItem;
  index: number;
}

const PhysicsBubbleChart: React.FC<PhysicsBubbleChartProps> = ({ items, type, title }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const bubblesRef = useRef<Bubble[]>([]);
  const animationRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Constants
  const MIN_R = 0.1;
  const MAX_R = 0.28;
  const MOUSE_REPULSION_RANGE = 100;
  const MOUSE_REPULSION_STRENGTH = 0.6;
  const COLLISION_STRENGTH = 0.04;
  const DAMPING = 0.97;
  const MIN_DRIFT_SPEED = 0.08;
  const MAX_SPEED = 1.5;

  // Color assignment
  const getColor = (value: number, maxValue: number): string => {
    return 'var(--sky-500)'; // sky blue for all bubbles
  };

  // Initialize bubbles
  useEffect(() => {
    if (containerSize.width === 0 || containerSize.height === 0 || items.length === 0) return;

    const maxValue = Math.max(...items.map((item) => item.value));
    const minDim = Math.min(containerSize.width, containerSize.height);
    const minR = minDim * MIN_R;
    const maxR = minDim * MAX_R;

    const newBubbles: Bubble[] = items.map((item, idx) => {
      const normalized = (item.value - Math.min(...items.map((i) => i.value))) / (maxValue - Math.min(...items.map((i) => i.value)) || 1);
      const r = Math.max(minR, normalized * maxR);

      // Grid layout with jitter
      const cols = Math.ceil(Math.sqrt(items.length));
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const cellWidth = containerSize.width / cols;
      const cellHeight = containerSize.height / Math.ceil(items.length / cols);

      const x = col * cellWidth + cellWidth / 2 + (Math.random() - 0.5) * 20;
      const y = row * cellHeight + cellHeight / 2 + (Math.random() - 0.5) * 20;

      const speed = 0.05 + Math.random() * 0.07;
      const angle = Math.random() * Math.PI * 2;

      return {
        x: Math.max(r, Math.min(x, containerSize.width - r)),
        y: Math.max(r, Math.min(y, containerSize.height - r)),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r,
        item,
        index: idx,
      };
    });

    bubblesRef.current = newBubbles;
  }, [items, containerSize]);

  // Physics simulation loop
  useEffect(() => {
    if (containerSize.width === 0 || containerSize.height === 0) return;

    const animate = () => {
      const bubbles = bubblesRef.current;
      if (bubbles.length === 0) return;

      // Apply forces to each bubble
      for (let i = 0; i < bubbles.length; i++) {
        const b = bubbles[i];

        // 1. Mouse repulsion
        const dx = b.x - mousePos.x;
        const dy = b.y - mousePos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const repulsionDist = b.r + MOUSE_REPULSION_RANGE;

        if (dist < repulsionDist && dist > 0) {
          const force = (1 - dist / repulsionDist) * MOUSE_REPULSION_STRENGTH;
          b.vx += (dx / dist) * force;
          b.vy += (dy / dist) * force;
        }

        // 2. Soft collision push with other bubbles
        for (let j = i + 1; j < bubbles.length; j++) {
          const other = bubbles[j];
          const cdx = other.x - b.x;
          const cdy = other.y - b.y;
          const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
          const minDist = b.r + other.r;

          if (cdist < minDist && cdist > 0) {
            const overlap = minDist - cdist;
            const force = overlap * COLLISION_STRENGTH;
            const nx = cdx / cdist;
            const ny = cdy / cdist;

            b.vx -= nx * force;
            b.vy -= ny * force;
            other.vx += nx * force;
            other.vy += ny * force;
          }
        }

        // 3. Damping + minimum drift
        const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        if (speed > MIN_DRIFT_SPEED) {
          b.vx *= DAMPING;
          b.vy *= DAMPING;
        } else if (speed < 0.01) {
          // Random new direction if stopped
          const angle = Math.random() * Math.PI * 2;
          b.vx = Math.cos(angle) * MIN_DRIFT_SPEED;
          b.vy = Math.sin(angle) * MIN_DRIFT_SPEED;
        }

        // Cap max speed
        const finalSpeed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        if (finalSpeed > MAX_SPEED) {
          b.vx = (b.vx / finalSpeed) * MAX_SPEED;
          b.vy = (b.vy / finalSpeed) * MAX_SPEED;
        }

        // Update position
        b.x += b.vx;
        b.y += b.vy;

        // Wall bouncing - hard boundaries
        const padding = 35;
        if (b.x - b.r < padding) {
          b.x = b.r + padding;
          b.vx = Math.abs(b.vx) * 0.8; // Bounce with damping
        }
        if (b.x + b.r > containerSize.width - padding) {
          b.x = containerSize.width - b.r - padding;
          b.vx = -Math.abs(b.vx) * 0.8;
        }
        if (b.y - b.r < padding) {
          b.y = b.r + padding;
          b.vy = Math.abs(b.vy) * 0.8;
        }
        if (b.y + b.r > containerSize.height - padding) {
          b.y = containerSize.height - b.r - padding;
          b.vy = -Math.abs(b.vy) * 0.8;
        }
      }

      // Render
      if (svgRef.current) {
        const maxValue = Math.max(...items.map((item) => item.value));
        bubbles.forEach((b, idx) => {
          const group = svgRef.current?.querySelector(`[data-bubble="${idx}"]`) as SVGGElement;
          if (group) {
            group.setAttribute('transform', `translate(${b.x}, ${b.y})`);

            const circle = group.querySelector('circle') as SVGCircleElement;
            if (circle) {
              const color = getColor(b.item.value, maxValue);
              circle.setAttribute('fill', color + '12');
              circle.setAttribute('stroke', hoveredIndex === idx ? color + '99' : color + '50');
            }
          }
        });
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [items, containerSize, mousePos, hoveredIndex]);

  // Resize observer
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

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) {
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleMouseLeave = () => {
    setMousePos({ x: -1000, y: -1000 });
  };

  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="flex flex-col h-full" ref={containerRef}>
      <h3 className="text-sm font-bold text-black mb-3">{title}</h3>

      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        style={{
          background: 'rgba(255, 255, 255, 0.015)',
          border: '1px solid rgba(255, 255, 255, 0.03)',
          borderRadius: '12px',
          cursor: 'pointer',
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {bubblesRef.current.map((bubble, idx) => {
          const displayName = type === 'currency' ? bubble.item.code : bubble.item.name;
          const color = getColor(bubble.item.value, maxValue);

          return (
            <g
              key={idx}
              data-bubble={idx}
              transform={`translate(${bubble.x}, ${bubble.y})`}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Bubble circle */}
              <circle
                cx="0"
                cy="0"
                r={bubble.r}
                fill={color + '15'}
                stroke={hoveredIndex === idx ? color : color + '60'}
                strokeWidth={hoveredIndex === idx ? '2.5' : '1.5'}
                filter={hoveredIndex === idx ? 'drop-shadow(0 0 12px rgba(125, 211, 252, 0.4))' : 'drop-shadow(0 2px 8px rgba(125, 211, 252, 0.15))'}
              />

              {/* Token name */}
              <text
                x="0"
                y="-4"
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={bubble.r * 0.28}
                fontWeight="bold"
                fill={color}
                pointerEvents="none"
              >
                {displayName}
              </text>

              {/* Market cap */}
              <text
                x="0"
                y={bubble.r * 0.15}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={bubble.r * 0.2}
                fill={color}
                opacity="0.7"
                pointerEvents="none"
              >
                {bubble.item.displayValue}
              </text>

              {/* Hover tooltip */}
              {hoveredIndex === idx && (
                <g>
                  <rect
                    x="-40"
                    y={-bubble.r - 30}
                    width="80"
                    height="24"
                    rx="4"
                    fill="black"
                    opacity="0.9"
                  />
                  <text
                    x="0"
                    y={-bubble.r - 18}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="11"
                    fill="white"
                    pointerEvents="none"
                  >
                    {displayName}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default PhysicsBubbleChart;
