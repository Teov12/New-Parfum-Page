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
            if (delay > 0) {
              setTimeout(() => {
                el.classList.add('reveal-active')
              }, delay)
            } else {
              el.classList.add('reveal-active')
            }
            observer.unobserve(el)
          }
        })
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -40px 0px'
      }
    )

    observer.observe(el)
    el._revealObserver = observer
  },
  unmounted(el) {
    if (el._revealObserver) {
      el._revealObserver.disconnect()
    }
  }
})

const pinia = createPinia()
app.use(pinia)
app.use(router)

app.mount('#app')

