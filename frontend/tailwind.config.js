/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Earthy green palette
        garden: {
          50: '#f3f8f0',
          100: '#e4f0dd',
          200: '#c8e2bb',
          300: '#a0cc8e',
          400: '#74b060',
          500: '#529440',
          600: '#3e7630',
          700: '#325e27',
          800: '#2a4c22',
          900: '#23401d',
        },
        // Warm soil tones
        soil: {
          50: '#faf6f1',
          100: '#f2e9df',
          200: '#e5d3be',
          300: '#d3b494',
          400: '#be9268',
          500: '#a97849',
          600: '#8d613b',
          700: '#744e33',
          800: '#60412d',
          900: '#503729',
        },
        // Harvest amber
        harvest: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
