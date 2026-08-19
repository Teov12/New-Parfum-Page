/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#fff8f3',
          dim: '#e3d8cb',
          container: '#f7ecdf',
          'container-low': '#fdf2e4',
          'container-high': '#f1e7d9',
          'container-highest': '#ece1d4',
          lowest: '#ffffff',
          variant: '#ece1d4'
        },
        primary: {
          DEFAULT: '#26110b',
          container: '#3d251e',
          fixed: '#ffdbd1',
          'fixed-dim': '#e5beb3'
        },
        'on-primary': {
          DEFAULT: '#ffffff',
          container: '#ae8a81',
          fixed: '#2b1610',
          'fixed-variant': '#5c4038'
        },
        secondary: {
          DEFAULT: '#5f5e59',
          container: '#e5e2db',
          fixed: '#e5e2db',
          'fixed-dim': '#c9c6c0'
        },
        'on-secondary': {
          DEFAULT: '#ffffff',
          container: '#65645f',
          fixed: '#1c1c18',
          'fixed-variant': '#474742'
        },
        tertiary: {
          DEFAULT: '#041a17',
          container: '#192f2b',
          fixed: '#cfe8e1',
          'fixed-dim': '#b3ccc6'
        },
        'on-tertiary': {
          DEFAULT: '#ffffff',
          container: '#7f9792',
          fixed: '#081f1c',
          'fixed-variant': '#354b47'
        },
        outline: {
          DEFAULT: '#827470',
          variant: '#d4c3bf'
        },
        error: {
          DEFAULT: '#ba1a1a',
          container: '#ffdad6'
        },
        'on-error': {
          DEFAULT: '#ffffff',
          container: '#93000a'
        },
        'on-surface': {
          DEFAULT: '#201b13',
          variant: '#504441'
        },
        'inverse-surface': '#353027',
        'inverse-on-surface': '#faefe1',
        'inverse-primary': '#e5beb3'
      },
      fontFamily: {
        serif: ['"Libre Caslon Text"', 'serif'],
        display: ['"Libre Caslon Text"', 'serif'],
        headline: ['"Libre Caslon Text"', 'serif'],
        sans: ['"Hanken Grotesk"', 'sans-serif'],
        body: ['"Hanken Grotesk"', 'sans-serif'],
        label: ['"Hanken Grotesk"', 'sans-serif']
      },
      fontSize: {
        'display-lg': ['64px', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display-lg-mobile': ['40px', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        'headline-lg': ['32px', { lineHeight: '1.3' }],
        'headline-md': ['24px', { lineHeight: '1.4' }],
        'body-lg': ['18px', { lineHeight: '1.6' }],
        'body-md': ['16px', { lineHeight: '1.6' }],
        'label-sm': ['12px', { lineHeight: '1.0', letterSpacing: '0.1em' }],
      },
      maxWidth: {
        'container-max': '1280px',
      },
      spacing: {
        'section-gap': '120px',
        'margin-desktop': '64px',
        'margin-mobile': '16px',
        'gutter': '24px',
      },
      borderRadius: {
        'none': '0px',
        'sm': '4px',
        DEFAULT: '8px',
        'md': '10px',
        'lg': '14px',
        'xl': '18px',
        '2xl': '24px',
        '3xl': '32px',
        'full': '9999px'
      }
    },
  },
  plugins: [],
}
