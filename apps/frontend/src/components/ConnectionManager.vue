<script setup>
import { socket, state } from '@/socket'
import { computed } from 'vue'
import { PlayPauseIcon } from '@heroicons/vue/20/solid'

const connected = computed(() => state.connected)

const connect = () => {
  socket.connect()
}
const disconnect = () => {
  socket.disconnect()
}
</script>

<template>
  <button v-if="connected" class="px-2 border rounded-lg" @click="disconnect()">
    <PlayPauseIcon class="block w-5 h-5 text-green-600" />
  </button>
  <button v-else class="inline-block px-2 border rounded-lg" @click="connect()">
    <PlayPauseIcon class="block w-5 h-5 text-red-600" />
  </button>
</template>
