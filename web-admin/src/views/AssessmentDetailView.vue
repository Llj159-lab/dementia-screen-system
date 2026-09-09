<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { ArrowLeft, Download, Printer } from "@element-plus/icons-vue";
import { api } from "@/api";
import StatusTag from "@/components/StatusTag.vue";
import type { Assessment, Patient } from "@/types";

const route = useRoute(); const router = useRouter(); const loading = ref(true); const assessment = ref<Assessment>(); const patient = ref<Patient | null>(null);
async function load() { try { const result = await api.assessment(String(route.params.id)); assessment.value = result.assessment; patient.value = result.patient; } catch (error) { ElMessage.error(error instanceof Error ? error.message : "加载失败"); } finally { loading.value = false; } }
async function download() { await api.downloadPdf(String(route.params.id)); ElMessage.success("报告已生成"); }
function printReport() { window.print(); }
onMounted(load);
</script>
<template><div v-loading="loading" class="page-stack"><div class="detail-toolbar"><el-button :icon="ArrowLeft" @click="router.back()">返回列表</el-button><div /><el-button :icon="Printer" @click="printReport">打印</el-button><el-button type="primary" :icon="Download" @click="download">导出PDF</el-button></div>
<section v-if="assessment" class="report-sheet"><div class="report-header"><div class="report-symbol">CS</div><div><p>COGNITIVE SCREENING REPORT</p><h1>认知筛查评估报告</h1></div><StatusTag :status="assessment.status" :is-abnormal="assessment.scoreSummary.isAbnormal" /></div>
<div class="report-meta"><div><span>患者编号</span><b>{{ patient?.patientCode ?? assessment.patientId }}</b></div><div><span>患者姓名</span><b>{{ patient?.name ?? '--' }}</b></div><div><span>性别</span><b>{{ patient?.gender === 'male' ? '男' : patient?.gender === 'female' ? '女' : '未知' }}</b></div><div><span>受教育年限</span><b>{{ patient?.educationYears ?? '--' }} 年</b></div></div>
<div class="result-block"><div><span>评估量表</span><h2>{{ assessment.scaleCode }}</h2><p>版本 {{ assessment.scaleVersion }}</p></div><div class="result-score"><span>测评总分</span><strong>{{ assessment.scoreSummary.totalScore ?? '--' }}</strong><em>/ {{ assessment.scoreSummary.maximumScore ?? '--' }}</em></div><div><span>评估结果</span><h2>{{ assessment.scoreSummary.resultLabel ?? '等待评分引擎' }}</h2><p>{{ assessment.scoreSummary.scoringStatus === 'calculated' ? '已完成自动评分' : '待任务1评分引擎计算' }}</p></div></div>
<div class="report-section"><h3>答题明细</h3><el-table :data="assessment.answers ?? []" border><el-table-column type="index" label="#" width="60" /><el-table-column prop="itemCode" label="题目编码" /><el-table-column prop="optionCode" label="选择结果" /><el-table-column prop="answerStatus" label="作答状态" /></el-table><el-empty v-if="!assessment.answers?.length" description="列表接口的模拟记录暂未附带逐题答案" :image-size="70" /></div>
<div class="report-note"><b>重要说明</b><p>本报告仅用于认知筛查和科研记录，不构成疾病诊断。异常结果应由专业医师结合临床检查进一步评估。</p></div><footer>报告编号：{{ assessment.assessmentId }}　生成时间：{{ new Date().toLocaleString() }}</footer></section></div></template>
