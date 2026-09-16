import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'

const app = createApp(App)

// Custom scroll-reveal directive using native IntersectionObserver
app.directive('reveal', {
  mounted(el, binding) {
    if (typeof window === 'undefined' || !window.IntersectionObserver) {
      el.classList.add('reveal-active')
      return
    }

    const val = binding.value || {}
    const delay = val.delay || 0
    const direction = val.direction || 'up' // 'up', 'down', 'left', 'right', 'zoom'

    el.classList.add('reveal-init', `reveal-${direction}`)

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const trigger = () => {
              el.classList.add('reveal-active')
              // Clean up reveal classes after transition ends so hover transforms (e.g. -translate-y-1) work natively
              el._revealCleanupTimeout = setTimeout(() => {
                el.classList.remove('reveal-init', 'reveal-active', `reveal-${direction}`)
              }, 800)
            }

            if (delay > 0) {
              el._revealTimeout = setTimeout(trigger, delay)
            } else {
              trigger()
            }
            observer.unobserve(el)
          }
        })
      },
      {
        threshold: 0.05,
        rootMargin: '0px 0px -15px 0px'
      }
    )

    observer.observe(el)
    el._revealObserver = observer
  },
  unmounted(el) {
    if (el._revealObserver) {
      el._revealObserver.disconnect()
    }
    if (el._revealTimeout) {
      clearTimeout(el._revealTimeout)
    }
    if (el._revealCleanupTimeout) {
      clearTimeout(el._revealCleanupTimeout)
    }
  }
})

const pinia = createPinia()
app.use(pinia)
app.use(router)

app.mount('#app')

