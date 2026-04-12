import React, { useMemo, useState } from "react";
import { Mail, Phone, Save, UserRound } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

const ProfilePage = () => {
  const { user, updateProfile } = useAuth();

  const initialData = useMemo(
    () => ({
      prenom: user?.prenom || "",
      nom: user?.nom || "",
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
    }),
    [user],
  );

  const [formData, setFormData] = useState(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);

    const mergedName = formData.name || [formData.prenom, formData.nom].filter(Boolean).join(" ").trim();

    await updateProfile({
      ...user,
      ...formData,
      name: mergedName,
    });

    setIsSaving(false);
    setMessage("Profil mis a jour localement.");
    setTimeout(() => setMessage(""), 2500);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Mon profil</h1>
        <p className="mt-1 text-sm text-slate-500">Mettez a jour vos informations personnelles.</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {message && <div className="mb-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Prenom</span>
              <input
                name="prenom"
                value={formData.prenom}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Nom</span>
              <input
                name="nom"
                value={formData.nom}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              />
            </label>
          </div>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Nom affiche</span>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 px-9 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              />
            </div>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 px-9 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              />
            </div>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Telephone</span>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 px-9 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              />
            </div>
          </label>

          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:opacity-60"
          >
            <Save size={16} />
            {isSaving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </form>
      </section>
    </div>
  );
};

export default ProfilePage;
