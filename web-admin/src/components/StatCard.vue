<script setup lang="ts">
defineProps<{ title: string; value: string | number; note: string; tone: "blue" | "green" | "orange" | "red" }>();
</script>
<template><article class="stat-card" :class="`tone-${tone}`"><div class="stat-accent" /><div><p>{{ title }}</p><strong>{{ value }}</strong><span>{{ note }}</span></div><div class="stat-orb" /></article></template>
