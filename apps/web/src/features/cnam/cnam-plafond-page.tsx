import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@medflow/ui";
import { api } from "@/lib/api";

export function CnamPlafondPage(): JSX.Element {
  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());

  const query = useQuery({
    queryKey: ["cnam-plafond", month, year],
    queryFn: async () => {
      const response = await api.get("/cnam/plafond", {
        params: { month, year }
      });
      return response.data as {
        total: number;
        plafond: number;
        remaining: number;
        exceeded: boolean;
      };
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plafond Estimation Report</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-3">
          <label>
            <span className="mb-1 block text-xs text-slate-500">Month</span>
            <Input
              type="number"
              min={1}
              max={12}
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
              className="w-28"
            />
          </label>
          <label>
            <span className="mb-1 block text-xs text-slate-500">Year</span>
            <Input
              type="number"
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
              className="w-32"
            />
          </label>
          <Button onClick={() => query.refetch()}>Refresh</Button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Metric label="Current Total" value={`${(query.data?.total ?? 0).toFixed(3)} TND`} />
          <Metric label="Estimated Plafond" value={`${(query.data?.plafond ?? 0).toFixed(3)} TND`} />
          <Metric
            label="Remaining"
            value={`${(query.data?.remaining ?? 0).toFixed(3)} TND`}
            highlight={query.data?.exceeded ? "text-red-600" : "text-emerald-600"}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({
  label,
  value,
  highlight
}: {
  label: string;
  value: string;
  highlight?: string;
}): JSX.Element {
  return (
    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${highlight ?? ""}`}>{value}</p>
    </div>
  );
}
