<script setup>
import { state } from '@/socket'
import ConnectionManager from './components/ConnectionManager.vue'
import CachePolicy from './components/CachePolicy.vue'
</script>

<template>
  <div class="container px-5 mx-auto my-10 space-y-10">
    <h1 class="flex text-3xl align-middle">
      hapi.js cache stats
      <ConnectionManager class="ml-2" />
    </h1>

    <section class="space-y-5">
      <h2 class="text-sm text-slate-500">
        Cache policies ({{ Object.keys(state.policies).length }})
      </h2>
      <CachePolicy
        v-for="(policy, name) in state.policies"
        :policy="policy"
        :name="name"
        :key="name"
      />
    </section>
  </div>
</template>

<style scoped></style>
