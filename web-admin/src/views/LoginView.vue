<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, type FormInstance, type FormRules } from "element-plus";
import { DataAnalysis, Lock, User } from "@element-plus/icons-vue";
import { useAuthStore } from "@/stores/auth";

const router = useRouter(); const route = useRoute(); const auth = useAuthStore();
const formRef = ref<FormInstance>(); const loading = ref(false);
const form = reactive({ username: "", password: "", remember: true });
const rules: FormRules = { username: [{ required: true, message: "请输入用户名", trigger: "blur" }], password: [{ required: true, message: "请输入密码", trigger: "blur" }] };
async function submit() {
  if (!await formRef.value?.validate()) return;
  loading.value = true;
  try { await auth.login(form.username, form.password); ElMessage.success("登录成功"); await router.replace(String(route.query.redirect ?? "/dashboard")); }
  catch (error) { ElMessage.error(error instanceof Error ? error.message : "登录失败"); }
  finally { loading.value = false; }
}
</script>
<template>
  <div class="login-page">
    <section class="login-hero">
      <div class="hero-grid" /><div class="hero-content"><div class="hero-logo"><DataAnalysis /></div>
      <p class="eyebrow">COGNITIVE SCREENING PLATFORM</p><h1>让每一次筛查<br />更准确、更高效</h1>
      <p>面向医疗机构的阿尔茨海默病临床前期认知筛查评估系统</p>
      <div class="hero-points"><span>六种专业量表</span><span>自动评分分析</span><span>数据安全管理</span></div></div>
    </section>
    <section class="login-panel"><div class="login-card"><div class="mobile-logo"><DataAnalysis /></div><h2>欢迎登录</h2><p class="subtitle">请使用系统分配的账号进入管理后台</p>
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" size="large" @keyup.enter="submit">
        <el-form-item label="用户名" prop="username"><el-input v-model="form.username" placeholder="请输入用户名" :prefix-icon="User" /></el-form-item>
        <el-form-item label="密码" prop="password"><el-input v-model="form.password" type="password" show-password placeholder="请输入密码" :prefix-icon="Lock" /></el-form-item>
        <div class="login-options"><el-checkbox v-model="form.remember">记住账号</el-checkbox><span>如需重置密码，请联系管理员</span></div>
        <el-button type="primary" :loading="loading" class="login-button" @click="submit">登录系统</el-button>
      </el-form>
    </div><footer>© 2026 认知筛查评估系统 · 仅供医疗筛查与科研使用</footer></section>
  </div>
</template>
