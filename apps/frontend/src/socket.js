import { reactive } from 'vue';
import { io } from 'socket.io-client';

export const state = reactive({
  connected: false,
  policies: {},
  methods: {},
});

// "undefined" means the URL will be computed from the `window.location` object
const URL = process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:3000';

export const socket = io(URL);

socket.on('connect', () => {
  state.connected = true;
});

socket.on('disconnect', () => {
  state.connected = false;
});

socket.on('start', ({ policies, methods }) => {
  state.methods = { ...methods };
  state.policies = { ...policies };
});

socket.on('live-stats', ({ policies, methods }) => {
  Object.keys(policies).forEach((key) => {
    state.policies[key] = policies[key];
  });
  Object.keys(methods).forEach((key) => {
    state.methods[key] = methods[key];
  });
});
