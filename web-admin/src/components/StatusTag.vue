<script setup lang="ts">
import { computed } from "vue";
const props = defineProps<{ abnormal?: boolean | null; status?: string }>();
const label = computed(() => props.abnormal === true ? "异常" : props.abnormal === false ? "正常" : props.status === "active" ? "启用" : props.status === "archived" || props.status === "disabled" ? "停用" : props.status === "submitted" ? "已提交" : "待处理");
const type = computed(() => props.abnormal === true ? "danger" : props.abnormal === false || props.status === "active" ? "success" : props.status === "submitted" ? "primary" : "info");
</script>
<template><el-tag :type="type" effect="light" round>{{ label }}</el-tag></template>
