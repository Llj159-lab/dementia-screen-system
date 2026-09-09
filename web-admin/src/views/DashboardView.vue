<script setup lang="ts">
import { BarChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import { init, graphic, use, type ECharts } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { api } from "@/api";
import StatCard from "@/components/StatCard.vue";
import type { Assessment, Overview } from "@/types";

use([BarChart, GridComponent, TooltipComponent, CanvasRenderer]);

const loading = ref(true); const overview = ref<Overview>({ patientTotal: 0, activePatientTotal: 0, assessmentTotal: 0, submittedAssessmentTotal: 0, scoredAssessmentTotal: 0, abnormalTotal: 0, abnormalRatio: 0 });
const recent = ref<Assessment[]>([]); const chartEl = ref<HTMLElement>(); let chart: ECharts | undefined;
const abnormalPercent = computed(() => `${(overview.value.abnormalRatio * 100).toFixed(1)}%`);
async function load() {
  loading.value = true;
  const [summary, distribution, assessments] = await Promise.all([api.overview(), api.distribution(), api.assessments({ page: 1, pageSize: 6 })]);
  overview.value = summary; recent.value = assessments.items; await nextTick();
  chart = init(chartEl.value!); chart.setOption({
    grid: { left: 34, right: 18, top: 28, bottom: 32 }, tooltip: { trigger: "axis" },
    xAxis: { type: "category", data: distribution.map((item) => item.score), axisLine: { lineStyle: { color: "#dbe4ea" } }, axisLabel: { color: "#74818b" } },
    yAxis: { type: "value", minInterval: 1, splitLine: { lineStyle: { color: "#edf2f4" } }, axisLabel: { color: "#74818b" } },
    series: [{ type: "bar", data: distribution.map((item) => item.count), barMaxWidth: 30, itemStyle: { color: new graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: "#26a69a" }, { offset: 1, color: "#8edbd3" }]), borderRadius: [6, 6, 0, 0] } }],
  }); loading.value = false;
}
const resize = () => chart?.resize(); onMounted(() => { load(); window.addEventListener("resize", resize); }); onBeforeUnmount(() => { window.removeEventListener("resize", resize); chart?.dispose(); });
</script>
<template><div v-loading="loading" class="page-stack">
  <div class="welcome-strip"><div><p>今日概览</p><h2>欢迎回来，开始高效管理筛查工作</h2><span>数据每次进入页面时自动刷新</span></div><div class="pulse-graphic"><i /><i /><i /></div></div>
  <div class="stats-grid"><StatCard title="患者总数" :value="overview.patientTotal" :note="`${overview.activePatientTotal} 人处于活跃状态`" tone="blue" /><StatCard title="测评总量" :value="overview.assessmentTotal" :note="`${overview.submittedAssessmentTotal} 份已提交`" tone="green" /><StatCard title="异常占比" :value="abnormalPercent" :note="`${overview.abnormalTotal} 份筛查异常`" tone="red" /><StatCard title="有效评分" :value="overview.scoredAssessmentTotal" note="待评分记录不计入比例" tone="orange" /></div>
  <div class="dashboard-grid"><section class="panel chart-panel"><div class="panel-heading"><div><h3>得分分布</h3><p>全部已完成测评的分数频次</p></div><el-tag effect="plain">实时统计</el-tag></div><div ref="chartEl" class="chart" /></section>
  <section class="panel"><div class="panel-heading"><div><h3>最近测评</h3><p>最新提交的筛查记录</p></div><router-link to="/assessments">查看全部</router-link></div><div class="recent-list"><div v-for="item in recent" :key="item.assessmentId" class="recent-row"><div class="scale-badge">{{ item.scaleCode.slice(0, 2) }}</div><div><strong>{{ item.patientName ?? item.patientId }}</strong><span>{{ item.scaleCode }} · {{ new Date(item.createdAt).toLocaleDateString() }}</span></div><b :class="{ danger: item.scoreSummary.isAbnormal }">{{ item.scoreSummary.totalScore ?? '--' }}</b></div></div></section></div>
</div></template>
