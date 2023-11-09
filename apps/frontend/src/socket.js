import { reactive } from 'vue'
import { io } from 'socket.io-client'

export const state = reactive({
  connected: false,
  policies: {}
})

// "undefined" means the URL will be computed from the `window.location` object
const URL = import.meta.env.PROD ? undefined : 'http://localhost:3000'

export const socket = io(URL)

socket.on('connect', () => {
  state.connected = true
})

socket.on('disconnect', () => {
  state.connected = false
})

socket.on('start', ({ policies }) => {
  state.policies = { ...policies }
})

socket.on('live-stats', ({ policies }) => {
  Object.keys(policies).forEach((key) => {
    state.policies[key] = policies[key]
  })
})
