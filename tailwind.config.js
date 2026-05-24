/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      keyframes: {
        'echo-in': {
          '0%': { opacity: '0', transform: 'translateY(10px) scale(0.985)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'echo-bg-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'echo-in': 'echo-in 420ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'echo-bg-in': 'echo-bg-in 520ms ease-out both',
      },
    },
  },
  plugins: [],
}
