module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        iskolar: {
          navy: '#15265C',
          blue: '#305DE0',
          action: '#305BFE',
          sky: '#4F96FF',
          pale: '#DFE6F2',
          surface: '#E8EDF7',
          bg: '#F7F9FD',
          card: '#FFFFFF',
          text: '#172033',
          muted: '#68758A',
          border: '#DCE5F2',
          blush: '#EAB9B3',
          success: '#1F8A5B',
          warning: '#C57A05',
          error: '#C33E4D',
          info: '#2E67D1',
        },
      },
      fontFamily: {
        heading: ['var(--font-heading)', 'Poppins', 'Inter', 'sans-serif'],
        body: ['var(--font-body)', 'Poppins', 'Inter', 'sans-serif'],
        mono: ['var(--font-technical)', 'monospace'],
      },
      borderRadius: {
        sm: '10px',
        md: '14px',
        lg: '18px',
        xl: '24px',
        pill: '999px',
      },
      boxShadow: {
        card: '0 4px 20px -2px rgba(21, 38, 92, 0.06), 0 2px 6px -1px rgba(21, 38, 92, 0.04)',
        nav: '0 8px 30px rgba(21, 38, 92, 0.12)',
        modal: '0 20px 40px -10px rgba(21, 38, 92, 0.20)',
      },
    },
  },
  plugins: [],
}
