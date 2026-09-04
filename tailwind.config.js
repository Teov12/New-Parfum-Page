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
          DEFAULT: '#fffdfa',
          dim: '#f3ece3',
          container: '#fcf7f1',
          'container-low': '#fefbf7',
          'container-high': '#f7eee3',
          'container-highest': '#f2e5d6',
          lowest: '#ffffff',
          variant: '#f2e5d6'
        },
        primary: {
          DEFAULT: '#2e1911',
          container: '#784233',
          fixed: '#fde8e1',
          'fixed-dim': '#f5cfc4'
        },
        'on-primary': {
          DEFAULT: '#ffffff',
          container: '#ffffff',
          fixed: '#2e1911',
          'fixed-variant': '#5c382e'
        },
        secondary: {
          DEFAULT: '#6d6964',
          container: '#f2eae1',
          fixed: '#f2eae1',
          'fixed-dim': '#ded5cb'
        },
        'on-secondary': {
          DEFAULT: '#ffffff',
          container: '#706c67',
          fixed: '#24211d',
          'fixed-variant': '#54504b'
        },
        tertiary: {
          DEFAULT: '#0b2622',
          container: '#1f3d37',
          fixed: '#dcf0eb',
          'fixed-dim': '#c2ddd7'
        },
        'on-tertiary': {
          DEFAULT: '#ffffff',
          container: '#8fa8a3',
          fixed: '#0e2925',
          'fixed-variant': '#3f5753'
        },
        outline: {
          DEFAULT: '#9c8e89',
          variant: '#e8ded8'
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
          DEFAULT: '#241f18',
          variant: '#5c4e4a'
        },
        'inverse-surface': '#5a3126',
        'inverse-on-surface': '#fdf6ee',
        'inverse-primary': '#f5cfc4'
      },
      fontFamily: {
        sans: ['"Open Sans"', 'sans-serif'],
        serif: ['"Open Sans"', 'sans-serif'],
        display: ['"Open Sans"', 'sans-serif'],
        headline: ['"Open Sans"', 'sans-serif'],
        body: ['"Open Sans"', 'sans-serif'],
        label: ['"Open Sans"', 'sans-serif']
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
        'xs': '2px',
        'sm': '4px',
        DEFAULT: '4px',
        'md': '6px',
        'lg': '8px',
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
        'full': '9999px'
      }
    },
  },
  plugins: [],
}
