import React from 'react';
import Masonry from 'react-masonry-css';

interface BentoMasonryProps {
  children: React.ReactNode;
  /** Column count by viewport breakpoint (px). Defaults to 3 cols ≥1024px, 2 ≥640px, else 1. */
  breakpointCols?: Record<string | number, number>;
  className?: string;
}

/**
 * Pinterest-style masonry. Cards size to their own content; column flow
 * packs short cards under tall ones with no dead space.
 *
 * Usage:
 *   <BentoMasonry>
 *     <CardA /> <CardB /> <CardC /> ...
 *   </BentoMasonry>
 *
 * Children must be direct cards (no wrapper divs) — masonry treats each
 * as a column-flow item. Each child should declare its own height naturally
 * via content; do NOT pass h-full or fixed heights, or packing won't work.
 */
export function BentoMasonry({
  children,
  breakpointCols = { default: 3, 1023: 2, 639: 1 },
  className = '',
}: BentoMasonryProps) {
  return (
    <Masonry
      breakpointCols={breakpointCols}
      className={`bento-masonry ${className}`}
      columnClassName="bento-masonry__col"
    >
      {children}
    </Masonry>
  );
}
