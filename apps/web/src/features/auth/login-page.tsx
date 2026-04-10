import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@medflow/ui";
import { Stethoscope, Shield, Sparkles } from "lucide-react";
import { loginSchema } from "@medflow/shared";
import { useAuth } from "./auth-context";
import { toast } from "sonner";

export function LoginPage(): JSX.Element {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      tenantSlug: String(formData.get("tenantSlug") ?? "") || undefined
    };

    const parsed = loginSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid form data");
      setLoading(false);
      return;
    }

    try {
      await login(parsed.data);
      toast.success("Welcome back");
      navigate(from ?? "/app/dashboard", { replace: true });
    } catch {
      toast.error("Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      {/* Animated background elements */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-sky-400/20 blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, 50, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute -right-20 bottom-20 h-96 w-96 rounded-full bg-teal-400/20 blur-3xl"
          animate={{
            x: [0, -100, 0],
            y: [0, -50, 0],
            scale: [1, 1.3, 1]
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/10 blur-3xl"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="border-slate-200/80 bg-white/[0.92] shadow-2xl backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/[0.92]">
          <CardHeader className="space-y-4 pb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 via-cyan-500 to-teal-500 shadow-lg shadow-sky-500/30"
            >
              <Stethoscope className="h-8 w-8 text-white" />
            </motion.div>
            <div className="text-center">
              <CardTitle className="text-4xl font-extrabold gradient-text-medical tracking-tight">MedFlow</CardTitle>
              <p className="mt-3 text-base font-semibold text-slate-600 dark:text-slate-400">
                Professional Clinic Management Platform
              </p>
            </div>
            <div className="flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-emerald-50/90 to-teal-50/90 px-4 py-2.5 shadow-sm dark:from-emerald-950/40 dark:to-teal-950/40">
              <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-[0.05em] text-emerald-700 dark:text-emerald-300">
                HIPAA Compliant • Encrypted
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <motion.form
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="space-y-5"
              onSubmit={handleSubmit}
            >
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-2"
              >
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Email
                </label>
                <Input
                  type="email"
                  name="email"
                  placeholder="doctor@clinic.tn"
                  required
                  className="transition-all duration-200 focus:ring-2 focus:ring-sky-500/50"
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-2"
              >
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Password
                </label>
                <Input
                  type="password"
                  name="password"
                  placeholder="********"
                  required
                  className="transition-all duration-200 focus:ring-2 focus:ring-sky-500/50"
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                className="space-y-2"
              >
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Tenant Slug <span className="text-xs font-normal text-slate-500">(optional)</span>
                </label>
                <Input
                  type="text"
                  name="tenantSlug"
                  placeholder="clinic-centre-ville"
                  className="transition-all duration-200 focus:ring-2 focus:ring-sky-500/50"
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <Button
                  className="w-full text-base font-semibold shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Sparkles className="h-4 w-4" />
                      </motion.div>
                      Signing in...
                    </span>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="flex items-center justify-between pt-2 text-sm"
              >
                <Link
                  className="font-medium text-sky-600 transition-colors hover:text-sky-700 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
                  to="/auth/forgot-password"
                >
                  Forgot password?
                </Link>
                <span className="medical-footer text-xs">This software does not provide medical advice.</span>
              </motion.div>
            </motion.form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
