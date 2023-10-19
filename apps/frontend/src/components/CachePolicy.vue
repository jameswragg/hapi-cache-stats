<script setup>
import { computed, onMounted, ref } from 'vue';
import { state } from "@/socket";
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import BarChart from './BarChart.vue';
import MethodStats from './MethodStats.vue';
import { convertObjectValuesToPercentages } from '../helpers/index.js'
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from '@headlessui/vue'
import { ChevronUpIcon } from '@heroicons/vue/20/solid'

dayjs.extend(relativeTime);

const props = defineProps(['policy', 'name']);
const isMounted = ref(false);
const colors = ['#303d4e', '#65b787', '#cae8d8', '#f2c14b', '#cca8f6', '#e77975'];

onMounted(() => {
  isMounted.value = true;
});

const isMountedAndReady = computed(() => isMounted.value && props.policy?.snapshots?.length > 1)

const lastSnapshot = computed(() => {
  const snapshots = props.policy.snapshots;

  return snapshots.length ? snapshots[snapshots.length - 1] : {};
});

const hitRate = computed(() =>
  parseFloat((lastSnapshot.value.hits / lastSnapshot.value.gets || 0) * 100)
);
const staleRate = computed(() =>
  parseFloat(lastSnapshot.value.stales / lastSnapshot.value.gets || 0)
);
const readableTimeFrame = computed(() => {
  const snapshots = props.policy.snapshots;
  const first = dayjs((snapshots[0] && snapshots[0].timestamp) || Date.now());
  const last = dayjs((snapshots.length && snapshots[snapshots.length - 1].timestamp) || Date.now());

  return first.to(last, true);
});

const snapshotsAsPercentages = computed(() =>
  props.policy.snapshots.map((s) => convertObjectValuesToPercentages(s))
);

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      stacked: true,
      display: false,
    },
    y: {
      stacked: true,
      max: 100,
      min: 0,
    },
  },
};

const chartData = computed(() => {
  if (isMounted.value && props.policy?.snapshots?.length > 1) {
    const keys = Object.keys(props.policy.snapshots[0]).filter((k) => k !== 'timestamp');

    return {
      labels: props.policy.snapshots.map((s) => dayjs(s.timestamp).format('HH:mm:ss')),
      datasets: keys.map((key, i) => {
        return {
          label: key,
          backgroundColor: colors[i] || '#eee',
          data: snapshotsAsPercentages.value.map((item) => item[key]),
        };
      }),
    };
  } else {
    return {}
  }
});

const methods = computed(() => {
  const result = {};

  props.policy.segments.forEach(key => {
    result[key] = state.methods[key.substring(1)];
  })

  return result
})

</script>

<template>
  <section class="p-4 leading-5 bg-white border-solid rounded-lg shadow-xl b-1 shadow-black/5 ring-1 ring-slate-700/10">
    <h2 class="mb-5 text-2xl" title="Cache name">
      {{ props.name }}
      <span class="block text-xs text-slate-400">Client engine: {{ props.policy.type }}</span>
    </h2>

    <div class="flex">
      <div class="w-5/12">
        <p class="my-2 text-xs text-slate-600">Sample period — {{ readableTimeFrame }}</p>
        <div class="flex-wrap space-y-2 ">
          <p class="flex-1 text-xs uppercase text-slate-400 w-44">
            Hit rate
            <span class="block text-3xl font-bold text-black">{{ hitRate.toFixed(4) }}%</span>
          </p>
          <p class="flex-1 text-xs uppercase text-slate-400 w-44">
            Stale rate
            <span class="block text-3xl font-bold text-black">{{ staleRate.toFixed(4) }}%</span>
          </p>
        </div>
      </div>
      <div class="flex-1">
        <div class="relative w-full h-auto">
          <BarChart v-if="isMountedAndReady" :chartData="chartData" :chartOptions="chartOptions" />
        </div>
      </div>
    </div>

    <div class="flex w-full gap-10 my-5">
      <template v-for="(value, key, index) in lastSnapshot">
        <div v-if="key !== 'timestamp'" class="flex-1 space-y-2" :key="key">
          <p class="" :class="`block text-xs uppercase border-b-2 text-slate-400 border-[${colors[index]}]`"> {{
            key.toUpperCase()
          }}</p>
          <p class="text-2xl font-bold">{{ value.toLocaleString() }}</p>
        </div>
      </template>
    </div>


    <Disclosure v-slot="{ open }">
      <DisclosureButton
        class="flex justify-between w-full px-4 py-2 text-sm font-medium text-left rounded-lg text-sky-600 bg-sky-400/10 hover:bg-sky-400/20 focus:outline-none focus-visible:ring focus-visible:ring-purple-500 focus-visible:ring-opacity-75">
        <p class="text-xs ">Segments/methods ({{ props.policy.segments.length }})</p>
        <ChevronUpIcon :class="open ? 'rotate-180 transform' : ''" class="w-5 h-5 text-sky-600" />
      </DisclosureButton>
      <DisclosurePanel class="px-4 pt-4 pb-2 space-y-3 text-sm text-gray-500">
        <MethodStats v-for="(value, key) in methods" :name="key" :stats="value" class="w-full" :key="key" />
      </DisclosurePanel>
    </Disclosure>


  </section>
</template>
