<script setup lang="ts">import { useRouter } from "vue-router"; const router = useRouter();</script>
<template><div class="not-found"><strong>404</strong><h1>页面不存在</h1><p>你访问的页面可能已被移动或删除。</p><el-button type="primary" @click="router.replace('/dashboard')">返回首页</el-button></div></template>
