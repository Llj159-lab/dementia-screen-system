<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { Refresh, Search } from "@element-plus/icons-vue";
import { api } from "@/api";
import type { OperationLog } from "@/types";

const loading = ref(false); const logs = ref<OperationLog[]>([]); const total = ref(0);
const query = reactive({ page: 1, pageSize: 12, action: "" });
const actions = ["patient.create", "patient.update", "assessment.create", "report.export_pdf", "report.export_excel", "account.create", "account.update", "account.password_change"];
async function load() { loading.value = true; try { const result = await api.logs(query); logs.value = result.items; total.value = result.total; } finally { loading.value = false; } }
function reset() { query.action = ""; query.page = 1; load(); } onMounted(load);
</script>
<template><div class="page-stack"><section class="panel filter-panel"><div class="filter-row"><el-select v-model="query.action" placeholder="操作类型" clearable><el-option v-for="action in actions" :key="action" :label="action" :value="action" /></el-select><el-button type="primary" :icon="Search" @click="load">查询</el-button><el-button :icon="Refresh" @click="reset">重置</el-button></div></section><section class="panel table-panel"><div class="panel-heading"><div><h3>操作日志</h3><p>系统关键业务操作追踪记录</p></div></div><el-table v-loading="loading" :data="logs" stripe><el-table-column label="时间" min-width="180"><template #default="scope">{{ new Date(scope.row.createdAt).toLocaleString() }}</template></el-table-column><el-table-column prop="userId" label="操作用户" min-width="160" /><el-table-column label="操作类型" min-width="180"><template #default="scope"><span class="log-action">{{ scope.row.action }}</span></template></el-table-column><el-table-column prop="resourceType" label="资源类型" width="120" /><el-table-column prop="resourceId" label="资源ID" min-width="170" /><el-table-column prop="requestId" label="请求ID" min-width="170" /></el-table><div class="pagination"><el-pagination v-model:current-page="query.page" layout="total, prev, pager, next" :page-size="query.pageSize" :total="total" @current-change="load" /></div></section></div></template>
