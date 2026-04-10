import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@medflow/ui";
import { api } from "@/lib/api";
import { toast } from "sonner";

export function ForgotPasswordPage(): JSX.Element {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");

    try {
      await api.post("/auth/forgot-password", { email });
      toast.success("If the email exists, reset instructions were sent.");
    } catch {
      toast.error("Unable to process request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="pointer-events-none absolute inset-0 bg-mesh" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Reset Password</CardTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Enter your account email to request a reset.
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1">
                <label className="text-sm font-medium">Email</label>
                <Input type="email" name="email" required />
              </div>
              <Button className="w-full" disabled={loading}>
                {loading ? "Submitting..." : "Send Request"}
              </Button>
              <Link className="text-sm text-sky-600 hover:underline" to="/auth/login">
                Back to login
              </Link>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
