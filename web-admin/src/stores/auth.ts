import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { api } from "@/api";
import type { User } from "@/types";

export const useAuthStore = defineStore("auth", () => {
  const token = ref(localStorage.getItem("access_token") ?? "");
  const saved = localStorage.getItem("auth_user");
  const user = ref<User | null>(saved ? JSON.parse(saved) as User : null);
  const isAuthenticated = computed(() => Boolean(token.value && user.value));
  const isAdmin = computed(() => user.value?.roleCodes.includes("admin") ?? false);

  async function login(username: string, password: string): Promise<void> {
    const result = await api.login(username, password);
    token.value = result.token; user.value = result.user;
    localStorage.setItem("access_token", result.token);
    localStorage.setItem("auth_user", JSON.stringify(result.user));
  }
  function logout(): void {
    token.value = ""; user.value = null;
    localStorage.removeItem("access_token"); localStorage.removeItem("auth_user");
  }
  return { token, user, isAuthenticated, isAdmin, login, logout };
});
