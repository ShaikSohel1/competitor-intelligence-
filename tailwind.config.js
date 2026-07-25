/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        pill: '9999px',
      },
      colors: {
        // Stripi Tokens
        primary: {
          DEFAULT: '#533afd',
          deep: '#4434d4',
          press: '#2e2b8c',
          soft: '#665efd',
          subdued: '#b9b9f9',
          foreground: '#ffffff',
        },
        'brand-dark-900': '#1c1e54',
        ink: {
          DEFAULT: '#0d253d',
          secondary: '#273951',
          mute: '#64748d',
          'mute-2': '#61718a',
        },
        canvas: {
          DEFAULT: '#ffffff',
          soft: '#f6f9fc',
          cream: '#f5e9d4',
        },
        hairline: {
          DEFAULT: '#e3e8ee',
          input: '#a8c3de',
        },
        ruby: '#ea2261',
        magenta: '#f96bee',
        lemon: '#9b6829',
        'shadow-blue': '#003770',

        // Shadcn compatibility mappings
        background: '#ffffff',
        foreground: '#0d253d',
        card: {
          DEFAULT: '#ffffff',
          foreground: '#0d253d',
        },
        popover: {
          DEFAULT: '#ffffff',
          foreground: '#0d253d',
        },
        secondary: {
          DEFAULT: '#f6f9fc',
          foreground: '#273951',
        },
        muted: {
          DEFAULT: '#f6f9fc',
          foreground: '#64748d',
        },
        accent: {
          DEFAULT: '#f6f9fc',
          foreground: '#0d253d',
        },
        destructive: {
          DEFAULT: '#ea2261',
          foreground: '#ffffff',
        },
        border: '#e3e8ee',
        input: '#a8c3de',
        ring: '#533afd',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
