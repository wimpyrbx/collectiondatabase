// tailwind.config.js
module.exports = {
  darkMode: 'class', // Enable dark mode using class-based toggling
  content: [
    './index.html',
    './src/**/*.{ts,tsx}', // Include all TS/TSX files in src
    './src/**/*.{js,jsx}', // Include all JS/JSX files in src
  ],
  theme: {
    extend: {
      backgroundImage: {
        'select-dark': "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")",
      },
      keyframes: {
        'flash-green': {
          '0%': { backgroundColor: 'transparent' },
          '15%': { backgroundColor: 'rgb(22 101 52 / 0.5)' }, // bg-green-800/50
          '85%': { backgroundColor: 'rgb(22 101 52 / 0.5)' }, // bg-green-800/50
          '100%': { backgroundColor: 'transparent' }
        }
      },
      animation: {
        'flash-green': 'flash-green 1.2s ease-in-out',
      }
    },
  },
  plugins: [],
  variants: {
    extend: {
      backgroundColor: ['hover', 'focus'],
      textColor: ['hover', 'focus']
    }
  },
  debug: true, // Enable purge debugging
  safelist: [
    // Safelist all color utilities (bg, text, border) for common colors
    {
      pattern: /(bg|text|border)-(gray|red|green|blue|cyan|yellow|indigo)-(50|100|200|300|400|500|600|700|800|900)/,
      variants: ['hover'], // Include hover variants
    },
    // Safelist opacity variants (e.g., bg-red-500/50)
    {
      pattern: /(bg|text|border)-(gray|red|green|blue|cyan|yellow|indigo)-[0-9]+\/(10|20|25|30|40|50|60|70|75|80|90|100)/,
      variants: ['hover'], // Include hover variants
    },
  ],
};