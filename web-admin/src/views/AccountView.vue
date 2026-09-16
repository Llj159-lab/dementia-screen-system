<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import { Plus } from "@element-plus/icons-vue";
import { api } from "@/api";
import StatusTag from "@/components/StatusTag.vue";
import type { RoleCode, User } from "@/types";

const loading = ref(false); const accounts = ref<User[]>([]); const dialog = ref(false);
const form = reactive<Partial<User> & { displayName: string; password?: string }>({ username: "", displayName: "", password: "", roleCodes: ["evaluator"], status: "active" });
const roleNames: Record<RoleCode, string> = { admin: "管理员", researcher: "研究员", evaluator: "测评员" };
async function load() { loading.value = true; try { accounts.value = await api.accounts(); } finally { loading.value = false; } }
function open(account?: User) { Object.assign(form, account ?? { userId: undefined, username: "", displayName: "", password: "", roleCodes: ["evaluator"], status: "active" }); dialog.value = true; }
async function save() { if (!form.displayName || (!form.userId && (!form.username || !form.password))) return ElMessage.warning("请补全账号信息"); await api.saveAccount(form); ElMessage.success("保存成功"); dialog.value = false; load(); }
onMounted(load);
</script>
<template><div class="page-stack"><section class="panel table-panel"><div class="panel-heading"><div><h3>系统账号</h3><p>管理后台登录账号及角色权限</p></div><el-button type="primary" :icon="Plus" @click="open()">新增账号</el-button></div><el-table v-loading="loading" :data="accounts" stripe><el-table-column prop="username" label="登录账号" min-width="150" /><el-table-column prop="displayName" label="显示名称" min-width="140" /><el-table-column label="角色" min-width="160"><template #default="scope"><el-tag v-for="role in scope.row.roleCodes" :key="role" class="role-tag" effect="plain">{{ roleNames[role as RoleCode] }}</el-tag></template></el-table-column><el-table-column label="状态" width="100"><template #default="scope"><StatusTag :status="scope.row.status" /></template></el-table-column><el-table-column label="最近登录" min-width="180"><template #default="scope">{{ scope.row.lastLoginAt ? new Date(scope.row.lastLoginAt).toLocaleString() : '从未登录' }}</template></el-table-column><el-table-column label="操作" width="100"><template #default="scope"><el-button link type="primary" @click="open(scope.row)">编辑</el-button></template></el-table-column></el-table></section>
<el-dialog v-model="dialog" :title="form.userId ? '编辑账号' : '新增账号'" width="520px"><el-form :model="form" label-width="90px"><el-form-item label="登录账号" required><el-input v-model="form.username" :disabled="Boolean(form.userId)" /></el-form-item><el-form-item label="显示名称" required><el-input v-model="form.displayName" /></el-form-item><el-form-item v-if="!form.userId" label="初始密码" required><el-input v-model="form.password" type="password" show-password /></el-form-item><el-form-item label="角色"><el-select v-model="form.roleCodes" multiple><el-option label="管理员" value="admin" /><el-option label="研究员" value="researcher" /><el-option label="测评员" value="evaluator" /></el-select></el-form-item><el-form-item label="状态"><el-radio-group v-model="form.status"><el-radio value="active">启用</el-radio><el-radio value="disabled">禁用</el-radio><el-radio value="pending">待激活</el-radio></el-radio-group></el-form-item></el-form><template #footer><el-button @click="dialog = false">取消</el-button><el-button type="primary" @click="save">保存</el-button></template></el-dialog></div></template>
