<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, type FormInstance, type FormRules } from "element-plus";
import { api } from "@/api";
import { useAuthStore } from "@/stores/auth";

const router = useRouter(); const auth = useAuthStore(); const formRef = ref<FormInstance>(); const loading = ref(false);
const form = reactive({ currentPassword: "", newPassword: "", confirmPassword: "" });
const rules: FormRules = {
  currentPassword: [{ required: true, message: "请输入当前密码", trigger: "blur" }],
  newPassword: [{ required: true, min: 8, message: "新密码至少8位", trigger: "blur" }],
  confirmPassword: [{ validator: (_rule, value, callback) => value === form.newPassword ? callback() : callback(new Error("两次输入的密码不一致")), trigger: "blur" }],
};
async function submit() { if (!await formRef.value?.validate()) return; loading.value = true; try { await api.changePassword(form.currentPassword, form.newPassword); ElMessage.success("密码修改成功，请重新登录"); auth.logout(); router.replace("/login"); } catch (error) { ElMessage.error(error instanceof Error ? error.message : "修改失败"); } finally { loading.value = false; } }
</script>
<template><div class="page-stack"><section class="panel form-panel"><div class="panel-heading"><div><h3>修改登录密码</h3><p>定期更新密码有助于保护患者数据安全</p></div></div><el-alert title="密码修改后，当前账号的所有登录会话都会失效。" type="info" show-icon :closable="false" /><el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="password-form"><el-form-item label="当前密码" prop="currentPassword"><el-input v-model="form.currentPassword" type="password" show-password /></el-form-item><el-form-item label="新密码" prop="newPassword"><el-input v-model="form.newPassword" type="password" show-password /><div class="field-help">至少8位，建议同时包含字母、数字和符号。</div></el-form-item><el-form-item label="确认新密码" prop="confirmPassword"><el-input v-model="form.confirmPassword" type="password" show-password /></el-form-item><el-button type="primary" :loading="loading" @click="submit">确认修改</el-button></el-form></section></div></template>
