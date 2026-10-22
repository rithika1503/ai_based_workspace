/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Pastel soft palette
        surface: {
          DEFAULT: '#fafaf9',
          raised: '#ffffff',
          border: '#e8e5e0',
        },
        pastel: {
          blue:   '#dbeafe',
          purple: '#ede9fe',
          green:  '#dcfce7',
          yellow: '#fef9c3',
          pink:   '#fce7f3',
          orange: '#ffedd5',
          red:    '#fee2e2',
        },
        ink: {
          DEFAULT: '#1c1917',
          muted:   '#78716c',
          soft:    '#a8a29e',
        },
        accent: {
          DEFAULT: '#7c9cb0',
          hover:   '#6389a1',
          light:   '#ddeaf2',
        },
        priority: {
          low:    '#86efac',
          medium: '#93c5fd',
          high:   '#fca5a5',
          urgent: '#f9a8d4',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '8px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        modal: '0 8px 30px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
};

