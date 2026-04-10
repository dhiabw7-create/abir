import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/features/auth/auth-context";

export function TenantSwitcher(): JSX.Element | null {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ["admin-tenants-switcher"],
    queryFn: async () => {
      const response = await api.get<
        Array<{ id: string; name: string; slug: string }>
      >("/admin/tenants");
      return response.data;
    },
    enabled: user?.role === "SUPER_ADMIN"
  });

  if (user?.role !== "SUPER_ADMIN") {
    return null;
  }

  const activeTenantId = localStorage.getItem("activeTenantId") ?? user.tenantId;

  return (
    <label className="inline-flex items-center gap-2.5 rounded-xl border border-slate-300/80 bg-white/95 px-4 py-2.5 text-xs font-semibold shadow-sm backdrop-blur transition-all duration-200 hover:border-sky-300/80 hover:shadow-md dark:border-slate-700/80 dark:bg-slate-900/90 dark:hover:border-sky-700/80">
      <span className="font-bold uppercase tracking-[0.05em] text-slate-600 dark:text-slate-400">Tenant</span>
      <select
        className="h-auto border-0 bg-transparent px-0 py-0 text-sm font-bold text-slate-900 shadow-none ring-0 focus-visible:ring-0 dark:text-slate-100"
        defaultValue={activeTenantId}
        onChange={(event) => {
          localStorage.setItem("activeTenantId", event.target.value);
          window.location.reload();
        }}
      >
        {(data ?? []).map((tenant) => (
          <option key={tenant.id} value={tenant.id}>
            {tenant.name}
          </option>
        ))}
      </select>
      <ChevronDown className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
    </label>
  );
}
