import { useState, useEffect } from "react";

/**
 * 웜 다크(warm) ↔ 라이트(light) 테마 토글 훅
 * - localStorage "bf-theme" 에 저장하여 재실행 시에도 유지
 * - document.documentElement 에 data-theme 속성을 적용
 */
export function useTheme() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("bf-theme") || "warm"
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("bf-theme", theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "warm" ? "light" : "warm"));

  return { theme, toggle };
}
