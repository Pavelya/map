import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      keyframes: {
        slideIn: {
          from: { transform: 'translateX(calc(100% + 1rem))', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        slideOut: {
          from: { transform: 'translateX(0)', opacity: '1' },
          to: { transform: 'translateX(calc(100% + 1rem))', opacity: '0' },
        },
        swipeOut: {
          from: { transform: 'translateX(var(--radix-toast-swipe-end-x))' },
          to: { transform: 'translateX(calc(100% + 1rem))' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        contentShow: {
          from: {
            opacity: '0',
            transform: 'translate(-50%, -48%) scale(0.96)',
          },
          to: {
            opacity: '1',
            transform: 'translate(-50%, -50%) scale(1)',
          },
        },
        scaleIn: {
          from: { transform: 'scale(0)' },
          to: { transform: 'scale(1)' },
        },
      },
      animation: {
        slideIn: 'slideIn 150ms cubic-bezier(0.16, 1, 0.3, 1)',
        slideOut: 'slideOut 100ms ease-in',
        swipeOut: 'swipeOut 100ms ease-out',
        fadeIn: 'fadeIn 200ms ease-out',
        contentShow: 'contentShow 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        scaleIn: 'scaleIn 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
}
export default config