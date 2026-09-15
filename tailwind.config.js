/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#030712',
          900: '#0a0f1d',
          850: '#0e162c',
          800: '#14203e',
          700: '#1c2d56',
        },
        cyan: {
          DEFAULT: '#00f5d4',
          glow: 'rgba(0, 245, 212, 0.4)',
        },
        sky: {
          DEFAULT: '#38bdf8',
          glow: 'rgba(56, 189, 248, 0.4)',
        },
        alert: {
          normal: '#10b981',
          moderate: '#f59e0b',
          urgent: '#ef4444',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 25px rgba(0, 245, 212, 0.35)',
        'glow-sky': '0 0 25px rgba(56, 189, 248, 0.35)',
        'glow-urgent': '0 0 25px rgba(239, 68, 68, 0.4)',
        'phone': '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 0 12px #1e293b, 0 0 0 14px rgba(56, 189, 248, 0.3)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scanline': 'scan 2.5s linear infinite',
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        }
      }
    },
  },
  plugins: [],
}
