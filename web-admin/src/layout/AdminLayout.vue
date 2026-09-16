<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { DataAnalysis, Document, Fold, HomeFilled, Lock, Operation, Setting, User, UserFilled } from "@element-plus/icons-vue";
import { useAuthStore } from "@/stores/auth";

const route = useRoute(); const router = useRouter(); const auth = useAuthStore();
const collapsed = ref(false); const mobileOpen = ref(false);
const active = computed(() => route.path);
const title = computed(() => String(route.meta.title ?? "管理后台"));
const navigate = (path: string) => { router.push(path); mobileOpen.value = false; };
const logout = () => { auth.logout(); router.replace("/login"); };
</script>

<template>
  <div class="admin-shell">
    <div v-if="mobileOpen" class="mobile-mask" @click="mobileOpen = false" />
    <aside class="sidebar" :class="{ collapsed, 'mobile-open': mobileOpen }">
      <div class="brand">
        <div class="brand-mark"><DataAnalysis /></div>
        <div v-if="!collapsed" class="brand-copy"><strong>认知筛查</strong><span>管理系统</span></div>
      </div>
      <el-menu :default-active="active" :collapse="collapsed" router @select="mobileOpen = false">
        <el-menu-item index="/dashboard"><el-icon><HomeFilled /></el-icon><template #title>数据看板</template></el-menu-item>
        <el-menu-item index="/patients"><el-icon><User /></el-icon><template #title>患者管理</template></el-menu-item>
        <el-menu-item index="/assessments"><el-icon><Document /></el-icon><template #title>测评管理</template></el-menu-item>
        <el-sub-menu index="system">
          <template #title><el-icon><Setting /></el-icon><span>系统设置</span></template>
          <el-menu-item v-if="auth.isAdmin" index="/system/accounts"><el-icon><UserFilled /></el-icon>账号管理</el-menu-item>
          <el-menu-item index="/system/password"><el-icon><Lock /></el-icon>修改密码</el-menu-item>
          <el-menu-item index="/system/logs"><el-icon><Operation /></el-icon>操作日志</el-menu-item>
        </el-sub-menu>
      </el-menu>
      <button class="collapse-button" @click="collapsed = !collapsed"><el-icon><Fold /></el-icon><span v-if="!collapsed">收起菜单</span></button>
    </aside>
    <main class="main-area">
      <header class="topbar">
        <button class="mobile-trigger" @click="mobileOpen = true">☰</button>
        <div><h1>{{ title }}</h1><p>阿尔茨海默病临床前期认知筛查评估系统</p></div>
        <el-dropdown>
          <div class="user-chip"><el-avatar :size="36">{{ auth.user?.displayName.slice(0, 1) }}</el-avatar><span>{{ auth.user?.displayName }}</span><b>⌄</b></div>
          <template #dropdown><el-dropdown-menu><el-dropdown-item @click="navigate('/system/password')">修改密码</el-dropdown-item><el-dropdown-item divided @click="logout">退出登录</el-dropdown-item></el-dropdown-menu></template>
        </el-dropdown>
      </header>
      <section class="content"><router-view /></section>
    </main>
  </div>
</template>
