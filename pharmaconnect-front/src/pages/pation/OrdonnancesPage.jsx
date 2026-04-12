import { useEffect, useMemo, useState } from 'react';
import { FileSearch, Search } from 'lucide-react';
import api from '../../lib/api';

const PationOrdonnancesPage = () => {
  const [ordonnances, setOrdonnances] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadOrdonnances = async () => {
      try {
        const response = await api.get('/pations/me/ordonnances');
        setOrdonnances(response.data?.ordonnances || []);
      } catch (requestError) {
        setError(requestError.response?.data?.error || 'Impossible de charger vos ordonnances');
      } finally {
        setLoading(false);
      }
    };

    loadOrdonnances();
  }, []);

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return ordonnances;

    return ordonnances.filter((item) => {
      const haystack = `${item.nom} ${item.prenom} ${item.cin} ${item.status} ${item.ordonnance}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [ordonnances, search]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-gradient-to-r from-emerald-600 to-cyan-600 p-6 text-white shadow-xl">
        <h1 className="text-3xl font-extrabold">Mes ordonnances</h1>
        <p className="text-sm text-emerald-100">Historique complet de vos prescriptions</p>
      </section>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">{error}</div>}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Rechercher par statut, CIN ou contenu..."
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <FileSearch className="mx-auto mb-3 text-slate-400" size={36} />
          <p className="font-semibold text-slate-700">Aucune ordonnance trouvée</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => (
            <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  {item.status}
                </span>
                <span className="text-xs text-slate-500">#{item.id}</span>
                <span className="text-xs text-slate-500">
                  {new Date(item.created_at).toLocaleDateString('fr-FR')}
                </span>
              </div>

              <p className="mb-2 text-sm text-slate-600">
                Patient: <strong>{item.prenom} {item.nom}</strong> | CIN: <strong>{item.cin}</strong>
              </p>
              <pre className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{item.ordonnance}</pre>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default PationOrdonnancesPage;
