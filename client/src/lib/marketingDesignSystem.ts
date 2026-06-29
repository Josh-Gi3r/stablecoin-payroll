// Marketing Design System
// Color palette, typography, spacing, and animation utilities

export const colors = {
  // Primary
  white: '#FFFFFF',
  black: '#000000',
  
  // Accents
  cyan: '#7DD3FC',
  purple: '#C8A0F0',
  pink: '#E879F9',
  blue: '#87CEEB',
  
  // Backgrounds
  lightBg: '#F8F9FA',
  darkBg: '#0F1729',
  
  // Text
  textPrimary: '#000000',
  textSecondary: '#666666',
  textMuted: '#999999',
};

export const typography = {
  // Font sizes
  display: 'text-5xl md:text-6xl lg:text-7xl',
  h1: 'text-4xl md:text-5xl lg:text-6xl',
  h2: 'text-3xl md:text-4xl lg:text-5xl',
  h3: 'text-2xl md:text-3xl lg:text-4xl',
  h4: 'text-xl md:text-2xl lg:text-3xl',
  body: 'text-base md:text-lg',
  small: 'text-sm md:text-base',
  tiny: 'text-xs md:text-sm',
  
  // Font weights
  bold: 'font-bold',
  semibold: 'font-semibold',
  medium: 'font-medium',
  normal: 'font-normal',
  light: 'font-light',
};

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  '2xl': '32px',
  '3xl': '48px',
  '4xl': '64px',
  '5xl': '80px',
};

export const animations = {
  // Parallax effect hook
  parallax: (scrollY: number, speed: number = 0.5) => ({
    transform: `translateY(${scrollY * speed}px)`,
  }),
  
  // Fade in on scroll
  fadeIn: 'animate-fadeIn',
  
  // Slide in from left
  slideInLeft: 'animate-slideInLeft',
  
  // Slide in from right
  slideInRight: 'animate-slideInRight',
  
  // Scale up
  scaleUp: 'animate-scaleUp',
  
  // Bounce
  bounce: 'animate-bounce',
};

export const shadows = {
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
  '2xl': 'shadow-2xl',
  heavy: 'shadow-2xl',
};

export const borders = {
  thin: '1px',
  medium: '2px',
  thick: '3px',
};

// Utility functions
export const getParallaxStyle = (scrollY: number, speed: number = 0.5) => ({
  transform: `translateY(${scrollY * speed}px)`,
  transition: 'transform 0.1s ease-out',
});

export const getDoodlePosition = (position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right', offset: number = 0) => {
  const baseClass = 'absolute pointer-events-none';
  const positions = {
    'top-left': `${baseClass} top-${offset} left-${offset}`,
    'top-right': `${baseClass} top-${offset} right-${offset}`,
    'bottom-left': `${baseClass} bottom-${offset} left-${offset}`,
    'bottom-right': `${baseClass} bottom-${offset} right-${offset}`,
  };
  return positions[position];
};

export const getResponsiveClass = (mobile: string, tablet: string, desktop: string) => {
  return `${mobile} md:${tablet} lg:${desktop}`;
};
