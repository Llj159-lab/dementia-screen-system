import { createPinia } from "pinia";
import { createApp } from "vue";
import {
  ElAlert, ElAvatar, ElButton, ElCheckbox, ElConfigProvider, ElDatePicker,
  ElDialog, ElDropdown, ElDropdownItem, ElDropdownMenu, ElEmpty, ElForm,
  ElFormItem, ElIcon, ElInput, ElInputNumber, ElMenu, ElMenuItem, ElOption,
  ElPagination, ElRadio, ElRadioGroup, ElSelect, ElSubMenu, ElTable,
  ElTableColumn, ElTag,
} from "element-plus";
import "element-plus/dist/index.css";
import App from "./App.vue";
import router from "./router";
import "./styles/index.css";

const app = createApp(App).use(createPinia()).use(router);
[
  ElAlert, ElAvatar, ElButton, ElCheckbox, ElConfigProvider, ElDatePicker,
  ElDialog, ElDropdown, ElDropdownItem, ElDropdownMenu, ElEmpty, ElForm,
  ElFormItem, ElIcon, ElInput, ElInputNumber, ElMenu, ElMenuItem, ElOption,
  ElPagination, ElRadio, ElRadioGroup, ElSelect, ElSubMenu, ElTable,
  ElTableColumn, ElTag,
].forEach((component) => app.use(component));
app.mount("#app");
