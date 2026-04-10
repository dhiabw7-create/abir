import { motion } from "framer-motion";
import { Bell, Languages, LogOut, Moon, Sun } from "lucide-react";
import { Badge, Button } from "@medflow/ui";
import { useAuth } from "@/features/auth/auth-context";
import { useTheme } from "@/lib/theme-context";
import { useI18n } from "@/lib/i18n-context";
import { TenantSwitcher } from "./tenant-switcher";

export function Topbar(): JSX.Element {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage } = useI18n();
  const roleLabel = user ? getRoleLabel(user.role, language) : null;
  const fullName = user ? `${user.firstName} ${user.lastName}` : "Session";
  const initials = user ? `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase() : "MF";
  const todayLabel = new Intl.DateTimeFormat(language === "ar" ? "ar-TN" : "fr-TN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date());

  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-3"
      >
        <motion.div
          whileHover={{ scale: 1.05, rotate: 5 }}
          whileTap={{ scale: 0.95 }}
          className="relative grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 via-cyan-500 to-teal-500 text-sm font-bold text-white shadow-lg shadow-sky-500/40 transition-all duration-300"
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent" />
          <span className="relative z-10">{initials}</span>
        </motion.div>
        <div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400"
          >
            {todayLabel}
          </motion.p>
          <div className="flex items-center gap-2.5">
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-base font-bold text-slate-900 dark:text-slate-100"
            >
              {fullName}
            </motion.h2>
            {user ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Badge className="border-sky-200 bg-gradient-to-r from-sky-50 to-cyan-50 text-sky-700 shadow-sm dark:border-sky-800 dark:from-sky-950/50 dark:to-cyan-950/30 dark:text-sky-300">
                  {roleLabel}
                </Badge>
              </motion.div>
            ) : null}
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-wrap items-center gap-2.5 xl:justify-end"
      >
        <TenantSwitcher />
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setLanguage(language === "fr" ? "ar" : "fr")}
            title="Toggle language"
            className="h-10 w-10 transition-all duration-200 hover:bg-sky-50 hover:border-sky-200 dark:hover:bg-sky-950/30 dark:hover:border-sky-800"
          >
            <Languages className="h-4 w-4 transition-transform duration-200 hover:rotate-12" />
          </Button>
        </motion.div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="secondary"
            size="icon"
            onClick={toggleTheme}
            title="Toggle theme"
            className="h-10 w-10 transition-all duration-200 hover:bg-sky-50 hover:border-sky-200 dark:hover:bg-sky-950/30 dark:hover:border-sky-800"
          >
            <motion.div
              animate={{ rotate: theme === "dark" ? 0 : 180 }}
              transition={{ duration: 0.3 }}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-amber-500" />
              ) : (
                <Moon className="h-4 w-4 text-slate-600 dark:text-slate-300" />
              )}
            </motion.div>
          </Button>
        </motion.div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="secondary"
            size="icon"
            title="Notifications"
            className="relative h-10 w-10 transition-all duration-200 hover:bg-sky-50 hover:border-sky-200 dark:hover:bg-sky-950/30 dark:hover:border-sky-800"
          >
            <Bell className="h-4 w-4" />
            <motion.span
              className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </Button>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            variant="outline"
            onClick={() => logout()}
            className="inline-flex items-center gap-2 border-slate-300 transition-all duration-200 hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:hover:border-red-800 dark:hover:bg-red-950/20 dark:hover:text-red-400"
          >
            <LogOut className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
            <span className="font-medium">Logout</span>
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}

function getRoleLabel(role: string, language: "fr" | "ar"): string {
  if (language !== "ar") {
    return role;
  }

  if (role === "SUPER_ADMIN") {
    return "مدير المنصة";
  }
  if (role === "DOCTOR") {
    return "طبيب";
  }
  if (role === "SECRETARY") {
    return "كاتبة طبيب";
  }
  return role;
}
