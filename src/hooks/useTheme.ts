import { useEffect } from "react";
import { useAppStore } from "@/stores/appStore";

export function useTheme() {
  const { role, theme } = useAppStore();

  useEffect(() => {
    document.documentElement.setAttribute("data-role", role);
  }, [role]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
  }, [theme]);
}
