import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  /** Unique key for the column. Used for sorting and React keys. */
  key: string;
  /** Header label. */
  label: string;
  /** Custom cell renderer. Receives the row. Defaults to `row[key]`. */
  render?: (row: T) => React.ReactNode;
  /** Sortable? Uses native lexicographic sort on render() output (or row[key]). */
  sortable?: boolean;
  /** Cell alignment. Default 'left'. */
  align?: 'left' | 'right' | 'center';
  /** Class on the cell, e.g. 'font-mono tabular-nums'. */
  className?: string;
  /** Width hint, e.g. '120px' or '20%'. */
  width?: string;
  /** When the table collapses to cards on mobile, this column's value becomes the card title. */
  cardTitle?: boolean;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  /** When provided, the row is rendered with hover state and the click handler. */
  onRowClick?: (row: T, index: number) => void;
  /** Render this when data is empty. */
  emptyState?: React.ReactNode;
  /** Show zebra striping. Default false. */
  striped?: boolean;
  /** When true (default) the outer surface and border are rendered. Pass false if the table is inside an existing Surface. */
  bordered?: boolean;
  /** Sticky header on scroll. Default true. */
  stickyHeader?: boolean;
  /** Caption for screen readers. */
  caption?: string;
  /** Optional className on the outer wrapper. */
  className?: string;
}

type SortState = { key: string; dir: 'asc' | 'desc' } | null;

function rowToCell<T>(col: Column<T>, row: T): React.ReactNode {
  if (col.render) return col.render(row);
  // Best-effort generic access
  return (row as unknown as Record<string, React.ReactNode>)[col.key];
}

function valueForSort<T>(col: Column<T>, row: T): string | number {
  const cell = rowToCell(col, row);
  if (typeof cell === 'number') return cell;
  if (cell == null) return '';
  return String(cell);
}

export function Table<T>({
  columns,
  data,
  onRowClick,
  emptyState,
  striped = false,
  bordered = true,
  stickyHeader = true,
  caption,
  className = '',
}: TableProps<T>) {
  const [sort, setSort] = useState<SortState>(null);

  const sortedData = useMemo(() => {
    if (!sort) return data;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return data;
    const sign = sort.dir === 'asc' ? 1 : -1;
    return [...data].sort((a, b) => {
      const av = valueForSort(col, a);
      const bv = valueForSort(col, b);
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * sign;
      return String(av).localeCompare(String(bv)) * sign;
    });
  }, [data, sort, columns]);

  const handleHeaderClick = (col: Column<T>) => {
    if (!col.sortable) return;
    setSort((prev) => {
      if (!prev || prev.key !== col.key) return { key: col.key, dir: 'asc' };
      if (prev.dir === 'asc') return { key: col.key, dir: 'desc' };
      return null;
    });
  };

  const wrapperStyle: React.CSSProperties = bordered
    ? {
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow-card)',
        overflow: 'hidden',
      }
    : {};

  if (data.length === 0) {
    return (
      <div className={className} style={wrapperStyle}>
        {emptyState ?? <EmptyState title="No data" description="Nothing to show here yet." />}
      </div>
    );
  }

  const cardTitleCol = columns.find((c) => c.cardTitle) ?? columns[0];

  return (
    <div className={className} style={wrapperStyle}>
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full" style={{ borderCollapse: 'collapse' }}>
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead
            style={{
              background: 'var(--bg-surface-subtle)',
              position: stickyHeader ? 'sticky' : undefined,
              top: 0,
              zIndex: 1,
            }}
          >
            <tr>
              {columns.map((col) => {
                const isSorted = sort?.key === col.key;
                return (
                  <th
                    key={col.key}
                    onClick={() => handleHeaderClick(col)}
                    style={{
                      padding: '0.625rem 1rem',
                      textAlign: col.align ?? 'left',
                      width: col.width,
                      borderBottom: '1px solid var(--border-default)',
                      color: 'var(--text-secondary)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 'var(--font-weight-semibold)' as unknown as number,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      cursor: col.sortable ? 'pointer' : 'default',
                      userSelect: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span className="inline-flex items-center gap-2">
                      {col.label}
                      {col.sortable && (
                        <span style={{ color: isSorted ? 'var(--sky-700)' : 'var(--text-muted)' }}>
                          {isSorted
                            ? sort?.dir === 'asc'
                              ? <ChevronUp className="w-3.5 h-3.5" />
                              : <ChevronDown className="w-3.5 h-3.5" />
                            : <ChevronsUpDown className="w-3.5 h-3.5" />}
                        </span>
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, i) => (
              <tr
                key={i}
                onClick={onRowClick ? () => onRowClick(row, i) : undefined}
                className="transition-colors"
                style={{
                  background: striped && i % 2 === 1 ? 'var(--bg-surface-subtle)' : 'transparent',
                  cursor: onRowClick ? 'pointer' : 'default',
                  borderTop: i === 0 ? 'none' : '1px solid var(--border-subtle)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-surface-subtle)'; }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = striped && i % 2 === 1 ? 'var(--bg-surface-subtle)' : 'transparent';
                }}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={col.className}
                    style={{
                      padding: '0.75rem 1rem',
                      textAlign: col.align ?? 'left',
                      color: 'var(--text-primary)',
                      fontSize: 'var(--text-sm)',
                    }}
                  >
                    {rowToCell(col, row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked cards */}
      <div className="sm:hidden">
        {sortedData.map((row, i) => (
          <div
            key={i}
            onClick={onRowClick ? () => onRowClick(row, i) : undefined}
            className="px-4 py-3"
            style={{
              borderTop: i === 0 ? 'none' : '1px solid var(--border-subtle)',
              cursor: onRowClick ? 'pointer' : 'default',
            }}
          >
            <div
              className="font-semibold"
              style={{ color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}
            >
              {rowToCell(cardTitleCol, row)}
            </div>
            <dl className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1">
              {columns.filter((c) => c !== cardTitleCol).map((col) => (
                <React.Fragment key={col.key}>
                  <dt
                    style={{
                      color: 'var(--text-muted)',
                      fontSize: 'var(--text-xs)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {col.label}
                  </dt>
                  <dd
                    className={col.className}
                    style={{
                      color: 'var(--text-primary)',
                      fontSize: 'var(--text-xs)',
                      textAlign: col.align === 'right' ? 'right' : 'left',
                    }}
                  >
                    {rowToCell(col, row)}
                  </dd>
                </React.Fragment>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}
