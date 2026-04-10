import { motion } from "framer-motion";
import {
  AppShell,
  Badge,
  type AppShellItem
} from "@medflow/ui";
import type { AppRole } from "@medflow/shared";
import {
  Activity,
  Calendar,
  ClipboardList,
  FileCheck2,
  FileText,
  LayoutDashboard,
  Settings,
  Shield,
  Stethoscope,
  Wallet,
  Users,
  FlaskConical
} from "lucide-react";
import { Outlet } from "react-router-dom";
import { Topbar } from "./topbar";
import { useI18n } from "@/lib/i18n-context";
import { useAuth } from "@/features/auth/auth-context";

interface RoleAwareAppShellItem extends AppShellItem {
  roles: AppRole[];
}

export function AppLayout(): JSX.Element {
  const { t } = useI18n();
  const { user } = useAuth();

  const roleAwareItems: RoleAwareAppShellItem[] = [
    {
      label: t("common.dashboard"),
      href: "/app/dashboard",
      icon: LayoutDashboard,
      roles: ["SUPER_ADMIN", "DOCTOR", "SECRETARY"]
    },
    {
      label: t("common.patients"),
      href: "/app/patients",
      icon: Users,
      roles: ["SUPER_ADMIN", "DOCTOR", "SECRETARY"]
    },
    {
      label: t("common.agenda"),
      href: "/app/agenda",
      icon: Calendar,
      roles: ["SUPER_ADMIN", "DOCTOR", "SECRETARY"]
    },
    {
      label: t("common.waitingRoom"),
      href: "/app/waiting-room",
      icon: Activity,
      roles: ["SUPER_ADMIN", "DOCTOR", "SECRETARY"]
    },
    {
      label: t("common.consultations"),
      href: "/app/consultations",
      icon: Stethoscope,
      roles: ["SUPER_ADMIN", "DOCTOR"]
    },
    {
      label: t("common.prescriptions"),
      href: "/app/prescriptions",
      icon: ClipboardList,
      roles: ["SUPER_ADMIN", "DOCTOR"]
    },
    {
      label: t("common.documents"),
      href: "/app/documents",
      icon: FileText,
      roles: ["SUPER_ADMIN", "DOCTOR", "SECRETARY"]
    },
    {
      label: t("common.cnam"),
      href: "/app/cnam/verification",
      icon: FileCheck2,
      roles: ["SUPER_ADMIN", "DOCTOR"]
    },
    {
      label: t("common.finance"),
      href: "/app/finance",
      icon: Wallet,
      roles: ["SUPER_ADMIN", "DOCTOR"]
    },
    {
      label: t("common.reports"),
      href: "/app/reports",
      icon: FlaskConical,
      roles: ["SUPER_ADMIN", "DOCTOR"]
    },
    {
      label: t("common.settings"),
      href: "/app/settings",
      icon: Settings,
      roles: ["SUPER_ADMIN", "DOCTOR", "SECRETARY"]
    },
    {
      label: t("common.admin"),
      href: "/app/admin",
      icon: Shield,
      roles: ["SUPER_ADMIN"]
    }
  ];

  const role = user?.role as AppRole | undefined;
  const items: AppShellItem[] = roleAwareItems.filter((item) =>
    role ? item.roles.includes(role) : false
  );

  return (
    <AppShell
      items={items}
      topbar={<Topbar />}
      footer={
        <div className="space-y-3">
          <Badge variant="success" className="w-full justify-center py-1.5">
            Production Ready
          </Badge>
          <p className="medical-footer text-center font-medium">This software does not provide medical advice.</p>
        </div>
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
      >
        <Outlet />
      </motion.div>
    </AppShell>
  );
}
