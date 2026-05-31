/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0c0e14',
          2: '#12151f',
          3: '#181c2a',
          4: '#1e2336',
        },
        border: {
          DEFAULT: '#252b40',
          2: '#313856',
        },
        accent: '#4f7ef8',
        'accent-2': '#3b62d6',
        green: '#22c55e',
        'green-dim': '#0f2a1a',
        red: '#ef4444',
        'red-dim': '#2a0f0f',
        amber: '#f59e0b',
        'amber-dim': '#2a1f0f',
        purple: '#a78bfa',
        'purple-dim': '#1a1535',
        primary: '#e2e8ff',
        secondary: '#8892b8',
        muted: '#4a5270',
      },
      fontFamily: {
        sans: ['var(--font-geist)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
    },
  },
  plugins: [],
};
