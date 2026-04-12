import { useEffect, useMemo, useState } from 'react';
import { Calendar, FileText, HeartPulse, UserRound } from 'lucide-react';
import api from '../../lib/api';

const PationDashboardPage = () => {
  const [profile, setProfile] = useState(null);
  const [ordonnances, setOrdonnances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [profileResponse, ordonnanceResponse] = await Promise.all([
          api.get('/pations/me'),
          api.get('/pations/me/ordonnances'),
        ]);

        setProfile(profileResponse.data?.pation || null);
        setOrdonnances(ordonnanceResponse.data?.ordonnances || []);
      } catch (requestError) {
        setError(requestError.response?.data?.error || 'Impossible de charger les données patient');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const latestOrdonnance = useMemo(() => {
    if (!ordonnances.length) return null;
    return ordonnances[0];
  }, [ordonnances]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
      </div>
    );
  }

  if (error) {
    return <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-emerald-600 to-cyan-600 p-6 text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-white/20 p-3">
            <HeartPulse size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold">Bienvenue {profile?.prenom || ''}</h1>
            <p className="text-sm text-emerald-100">Votre espace pation personnel</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-slate-600">
            <UserRound size={16} /> Identité
          </div>
          <p className="text-lg font-bold text-slate-900">{profile?.prenom} {profile?.nom}</p>
          <p className="text-sm text-slate-500">CIN: {profile?.cin || 'N/A'}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-slate-600">
            <FileText size={16} /> Ordonnances
          </div>
          <p className="text-3xl font-extrabold text-slate-900">{ordonnances.length}</p>
          <p className="text-sm text-slate-500">ordonnances enregistrées</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-slate-600">
            <Calendar size={16} /> Dernière ordonnance
          </div>
          <p className="text-lg font-bold text-slate-900">
            {latestOrdonnance ? new Date(latestOrdonnance.created_at).toLocaleDateString('fr-FR') : 'Aucune'}
          </p>
          <p className="text-sm text-slate-500">mise à jour la plus récente</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-xl font-bold text-slate-900">Dernière ordonnance</h2>
        {latestOrdonnance ? (
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="mb-2 text-sm text-slate-500">Statut: {latestOrdonnance.status}</p>
            <pre className="whitespace-pre-wrap text-sm text-slate-700">{latestOrdonnance.ordonnance}</pre>
          </div>
        ) : (
          <p className="text-slate-500">Aucune ordonnance trouvée.</p>
        )}
      </section>
    </div>
  );
};

export default PationDashboardPage;
