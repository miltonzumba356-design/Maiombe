/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        obs: '#07090C',
        dk: '#0B1910',
        gold: {
          DEFAULT: '#C9A84C',
          2: '#DEB96A',
          3: '#F2D898',
        },
        em: {
          DEFAULT: '#26B870',
          2: '#178A4A',
          3: '#0A5028',
        },
        cr: {
          DEFAULT: '#D43352',
          2: '#8A1825',
        },
        am: {
          DEFAULT: '#E09020',
          2: '#885800',
        },
        sl: {
          DEFAULT: '#7888A0',
          2: '#364858',
          3: '#182230',
        },
        wp: '#E5EBF2',
        wm: '#7888A0',
        wk: '#FFFFFF',
        pb: 'rgba(11,25,16,0.9)',
        pe: 'rgba(201,168,76,0.16)',
      },
      borderRadius: {
        rg: '14px',
        rm: '9px',
        rs: '5px',
      },
      fontFamily: {
        sans: ['Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['Courier New', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
