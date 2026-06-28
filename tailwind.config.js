/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0a0a0a',
        'ink-soft': '#111111',
        'ink-card': '#141414',
        gold: {
          DEFAULT: '#C9A84C',
          light: '#E2C879',
          dark: '#9E8237',
        },
        bone: '#EDE8DD',
        muted: '#8A8579',
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        luxe: '0.22em',
      },
      maxWidth: {
        content: '1200px',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        shimmer: 'shimmer 6s linear infinite',
      },
      backgroundImage: {
        'gold-line':
          'linear-gradient(90deg, transparent, #C9A84C 50%, transparent)',
      },
    },
  },
  plugins: [],
}
