import { useState } from "react";
import { Bell, Globe, Lock, Save, Settings as SettingsIcon, User } from "lucide-react";
import Button from "../components/ui/Button";
import Toggle from "../components/ui/Toggle";
import { useAuth } from "../hooks/useAuth";

export default function SettingsPage() {
  const { user, updateProfile } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    language: "fr",
    notifications: true,
    emailNotifications: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggleChange = (name) => {
    setFormData((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      await updateProfile({ name: formData.name, email: formData.email });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-6 w-6 text-cyan-700" />
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Parametres</h1>
            <p className="text-sm text-slate-500">Ajustez votre experience PharmaConnect.</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {saveSuccess && (
          <div className="mb-5 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Parametres enregistres.</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <User size={15} /> Nom
              </span>
              <input
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              />
            </label>
          </div>

          <label className="space-y-2 block">
            <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Globe size={15} /> Langue
            </span>
            <select
              name="language"
              value={formData.language}
              onChange={handleInputChange}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            >
              <option value="fr">Francais</option>
              <option value="en">English</option>
              <option value="ar">Arabic</option>
            </select>
          </label>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
              <div>
                <p className="text-sm font-medium text-slate-800 flex items-center gap-2">
                  <Bell size={15} /> Notifications in-app
                </p>
                <p className="text-xs text-slate-500">Recevez les alertes dans l'application.</p>
              </div>
              <Toggle checked={formData.notifications} onChange={() => handleToggleChange("notifications")} />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
              <div>
                <p className="text-sm font-medium text-slate-800">Notifications email</p>
                <p className="text-xs text-slate-500">Recevez les alertes importantes par email.</p>
              </div>
              <Toggle checked={formData.emailNotifications} onChange={() => handleToggleChange("emailNotifications")} />
            </div>

            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-sm font-medium text-slate-800 flex items-center gap-2">
                <Lock size={15} /> Securite
              </p>
              <p className="text-xs text-slate-500 mt-1">Le changement de mot de passe est gere depuis les ecrans metiers.</p>
            </div>
          </div>

          <div className="pt-2">
            <Button type="submit" className="flex items-center gap-2" disabled={isSaving}>
              <Save size={15} />
              {isSaving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
