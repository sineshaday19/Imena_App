/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        imena: {
          bg: '#F5F7F6',
          teal: '#0F9D8A',
        },
      },
      borderRadius: { xl: '0.75rem' },
      maxWidth: {
        mobile: '390px',
        card: '430px',
        screen: '100%',
      },
      boxShadow: {
        soft: '0 4px 20px rgba(0,0,0,0.06)',
      },
      screens: {
        xs: '480px',
      },
    },
  },
  plugins: [],
}
