module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bw: '#0b0f12',
        cream: {
          DEFAULT: '#f5e6c8',
          light: '#fff8ec',
          dark: '#d9c6a0',
        },
        'cream-muted': '#e6dcc5'
      }
    },
  },
  plugins: [],
}
