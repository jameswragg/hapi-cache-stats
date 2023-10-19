<script setup>
const props = defineProps(['name', 'stats']);
</script>

<template>
  <section
    class="p-4 leading-5 border-solid rounded-lg shadow-xl bg-[rgba(0,0,0,0.0125)] b-1 shadow-black/5 ring-1 ring-slate-700/10">
    <h2 class="inline-block px-2 py-1 mb-3 text-sm border rounded-lg bg-gray-50" title="Cache name">
      {{ props.name }}
    </h2>

    <div class="flex w-full gap-10">
      <template v-for="(value, key) in  stats">
        <template v-if="key !== 'hitRatio' && key !== 'staleRatio'">
          <div v-if="key !== 'timestamp'" class="flex-1" :key="key"
            :class="`w-[${Math.floor(100 / Object.keys(stats).length).toFixed()}%]`">
            <p class="block text-xs text-gray-500 uppercase border-b ">{{ key.toUpperCase() }}</p>
            <p class="text-xl font-bold">{{ value > 0 ? value.toLocaleString() : value }}</p>
          </div>
        </template>
      </template>
    </div>

  </section>
</template>
