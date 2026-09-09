<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { Download, Refresh, Search, View } from "@element-plus/icons-vue";
import { api } from "@/api";
import StatusTag from "@/components/StatusTag.vue";
import type { Assessment } from "@/types";

const router = useRouter(); const loading = ref(false); const exporting = ref(false); const items = ref<Assessment[]>([]); const total = ref(0);
const query = reactive({ page: 1, pageSize: 10, keyword: "", scaleCode: "", status: "" });
const scales = ["SCD_Q9", "GDS", "FAQ", "MMSE", "MOCA_B", "CDR"];
async function load() { loading.value = true; try { const result = await api.assessments(query); items.value = result.items; total.value = result.total; } finally { loading.value = false; } }
function reset() { Object.assign(query, { page: 1, keyword: "", scaleCode: "", status: "" }); load(); }
async function exportExcel() { exporting.value = true; try { await api.downloadExcel(); ElMessage.success("导出成功"); } finally { exporting.value = false; } }
onMounted(load);
</script>
<template><div class="page-stack"><section class="panel filter-panel"><div class="filter-row"><el-input v-model="query.keyword" placeholder="患者姓名或编号" clearable :prefix-icon="Search" @keyup.enter="load" /><el-select v-model="query.scaleCode" placeholder="量表类型" clearable><el-option v-for="scale in scales" :key="scale" :label="scale" :value="scale" /></el-select><el-select v-model="query.status" placeholder="测评状态" clearable><el-option label="已提交" value="submitted" /><el-option label="进行中" value="in_progress" /><el-option label="草稿" value="draft" /></el-select><el-button type="primary" :icon="Search" @click="load">查询</el-button><el-button :icon="Refresh" @click="reset">重置</el-button><div class="filter-spacer" /><el-button :loading="exporting" :icon="Download" @click="exportExcel">批量导出</el-button></div></section>
<section class="panel table-panel"><div class="panel-heading"><div><h3>测评记录</h3><p>共 {{ total }} 条测评记录</p></div></div><el-table v-loading="loading" :data="items" stripe><el-table-column prop="patientCode" label="患者编号" min-width="150" /><el-table-column prop="patientName" label="患者姓名" min-width="110" /><el-table-column label="量表" width="120"><template #default="scope"><span class="scale-chip">{{ scope.row.scaleCode }}</span></template></el-table-column><el-table-column label="得分" width="100"><template #default="scope"><b class="score-text">{{ scope.row.scoreSummary.totalScore ?? '--' }}</b><span class="score-max"> / {{ scope.row.scoreSummary.maximumScore ?? '--' }}</span></template></el-table-column><el-table-column label="筛查结果" width="110"><template #default="scope"><StatusTag :status="scope.row.status" :is-abnormal="scope.row.scoreSummary.isAbnormal" /></template></el-table-column><el-table-column label="提交时间" min-width="170"><template #default="scope">{{ scope.row.submittedAt ? new Date(scope.row.submittedAt).toLocaleString() : '--' }}</template></el-table-column><el-table-column label="操作" width="120" fixed="right"><template #default="scope"><el-button link type="primary" :icon="View" @click="router.push(`/assessments/${scope.row.assessmentId}`)">查看详情</el-button></template></el-table-column></el-table><div class="pagination"><el-pagination v-model:current-page="query.page" v-model:page-size="query.pageSize" layout="total, prev, pager, next" :total="total" @current-change="load" /></div></section></div></template>
