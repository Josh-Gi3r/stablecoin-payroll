import React from 'react';

interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Vertical rhythm between children. Default 'md' = space-y-6. */
  spacing?: 'sm' | 'md' | 'lg';
}

const spacingClass: Record<NonNullable<PageContainerProps['spacing']>, string> = {
  sm: 'space-y-4',
  md: 'space-y-6',
  lg: 'space-y-8',
};

/**
 * Wraps every view's root content with consistent padding and vertical rhythm.
 * Use exactly once per view, as the outermost element.
 */
export function PageContainer({
  children,
  spacing = 'md',
  className = '',
  style,
  ...rest
}: PageContainerProps) {
  return (
    <div
      className={`min-h-full w-full ${spacingClass[spacing]} ${className}`}
      style={{
        paddingInline: 'var(--page-pad-x)',
        paddingBlock: 'var(--page-pad-y)',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
