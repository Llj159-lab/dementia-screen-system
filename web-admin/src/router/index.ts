import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/login", name: "login", component: () => import("@/views/LoginView.vue"), meta: { public: true, title: "登录" } },
    {
      path: "/", component: () => import("@/layout/AdminLayout.vue"), redirect: "/dashboard",
      children: [
        { path: "dashboard", component: () => import("@/views/DashboardView.vue"), meta: { title: "数据看板" } },
        { path: "patients", component: () => import("@/views/PatientListView.vue"), meta: { title: "患者管理" } },
        { path: "assessments", component: () => import("@/views/AssessmentListView.vue"), meta: { title: "测评管理" } },
        { path: "assessments/:id", component: () => import("@/views/AssessmentDetailView.vue"), meta: { title: "测评详情" } },
        { path: "system/accounts", component: () => import("@/views/AccountView.vue"), meta: { title: "账号管理", admin: true } },
        { path: "system/password", component: () => import("@/views/PasswordView.vue"), meta: { title: "修改密码" } },
        { path: "system/logs", component: () => import("@/views/OperationLogView.vue"), meta: { title: "操作日志" } },
      ],
    },
    { path: "/:pathMatch(.*)*", component: () => import("@/views/NotFoundView.vue"), meta: { public: true, title: "页面不存在" } },
  ],
});

router.beforeEach((to) => {
  document.title = `${String(to.meta.title ?? "管理后台")} - 认知筛查系统`;
  const auth = useAuthStore();
  if (!to.meta.public && !auth.isAuthenticated) return { path: "/login", query: { redirect: to.fullPath } };
  if (to.meta.admin && !auth.isAdmin) return "/dashboard";
  if (to.path === "/login" && auth.isAuthenticated) return "/dashboard";
  return true;
});

export default router;
