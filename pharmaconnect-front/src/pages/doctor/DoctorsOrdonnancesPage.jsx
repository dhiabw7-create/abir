"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import {
  Search,
  FileText,
  User,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Edit,
  Trash,
  X,
  Filter,
  RefreshCw,
} from "lucide-react"

const OrdonnancesPage = () => {
  const [ordonnances, setOrdonnances] = useState([])
  const [searchNom, setSearchNom] = useState("")
  const [searchPrenom, setSearchPrenom] = useState("")
  const [searchCin, setSearchCin] = useState("")
  const [searchTriggered, setSearchTriggered] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState("pending")
  const [selectedOrdonnance, setSelectedOrdonnance] = useState(null)
  const [editData, setEditData] = useState({})

  useEffect(() => {
    fetchOrdonnances()
  }, [])

  const fetchOrdonnances = async () => {
    try {
      setLoading(true)
      const res = await axios.get("/api/ordonnances")
      setOrdonnances(Array.isArray(res.data) ? res.data : [])
      setError("")
    } catch (error) {
      console.error("Erreur lors du chargement des ordonnances :", error)
      setError("Erreur lors du chargement des ordonnances")
      setOrdonnances([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette ordonnance ?")) {
      return
    }

    try {
      await axios.delete(`/api/ordonnances/${id}`)
      setOrdonnances((prev) => prev.filter((ord) => ord.id !== id))
      setMessage(`Ordonnance N°${id} supprimée avec succès !`)
      setTimeout(() => setMessage(""), 3000)
    } catch (error) {
      console.error(error)
      setError("Erreur lors de la suppression de l'ordonnance")
    }
  }

  const handleEdit = async () => {
    try {
      const { id, nom, prenom, cin, ordonnance } = editData
      await axios.put(`/api/ordonnances/${id}`, {
        nom,
        prenom,
        cin,
        ordonnance,
      })
      setMessage("Ordonnance modifiée avec succès")
      fetchOrdonnances()
      setSelectedOrdonnance(null)
      setEditData({})
    } catch (error) {
      console.error(error)
      setError("Erreur lors de la modification")
    }
  }

  const handleSearch = () => {
    setSearchTriggered(true)
  }

  const clearSearch = () => {
    setSearchNom("")
    setSearchPrenom("")
    setSearchCin("")
    setSearchTriggered(false)
  }

  const pendingOrdonnances = ordonnances.filter((ord) => ord.status !== "Effectuée")
  const completedOrdonnances = ordonnances.filter((ord) => ord.status === "Effectuée")

  const filtered = pendingOrdonnances.filter(
    (ord) =>
      ord.nom.toLowerCase().includes(searchNom.toLowerCase()) &&
      ord.prenom.toLowerCase().includes(searchPrenom.toLowerCase()) &&
      ord.cin.includes(searchCin),
  )

  const displayedOrdonnances = activeTab === "pending" ? filtered : completedOrdonnances

  // Vérifier si des filtres sont actifs
  const hasActiveFilters = searchNom || searchPrenom || searchCin

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1D10FA] to-purple-600 text-white py-8 px-6 shadow-2xl">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Gestion des Ordonnances</h1>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab("pending")}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 ${
                activeTab === "pending"
                  ? "bg-white text-[#1D10FA] shadow-lg"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              <Clock className="w-5 h-5" />
              En attente ({pendingOrdonnances.length})
            </button>
            <button
              onClick={() => setActiveTab("completed")}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 ${
                activeTab === "completed"
                  ? "bg-white text-[#1D10FA] shadow-lg"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              <CheckCircle className="w-5 h-5" />
              Effectuées ({completedOrdonnances.length})
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Messages */}
        {message && (
          <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-400 rounded-lg shadow-md animate-fade-in">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
              <span className="text-green-800 font-medium">{message}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-400 rounded-lg shadow-md animate-fade-in">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
              <span className="text-red-800 font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Barre de recherche */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Search className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Rechercher des ordonnances</h2>
            {hasActiveFilters && (
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                Filtres actifs
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                Nom du patient
              </label>
              <input
                type="text"
                value={searchNom}
                onChange={(e) => setSearchNom(e.target.value)}
                placeholder="Rechercher par nom..."
                className="w-full px-4 py-3 border-2 border-gray-200 focus:border-[#1D10FA] transition-colors duration-200 rounded-lg bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#1D10FA]/20"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                Prénom du patient
              </label>
              <input
                type="text"
                value={searchPrenom}
                onChange={(e) => setSearchPrenom(e.target.value)}
                placeholder="Rechercher par prénom..."
                className="w-full px-4 py-3 border-2 border-gray-200 focus:border-[#1D10FA] transition-colors duration-200 rounded-lg bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#1D10FA]/20"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                Numéro CIN
              </label>
              <input
                type="text"
                value={searchCin}
                onChange={(e) => setSearchCin(e.target.value)}
                placeholder="Rechercher par CIN..."
                className="w-full px-4 py-3 border-2 border-gray-200 focus:border-[#1D10FA] transition-colors duration-200 rounded-lg bg-white/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#1D10FA]/20"
              />
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {hasActiveFilters ? (
                <span>
                  <Filter className="w-4 h-4 inline mr-1" />
                  {filtered.length} résultat(s) trouvé(s) sur {pendingOrdonnances.length} ordonnances
                </span>
              ) : (
                <span>
                  Total: {activeTab === "pending" ? pendingOrdonnances.length : completedOrdonnances.length} ordonnances
                </span>
              )}
            </div>

            <div className="flex gap-3">
              {hasActiveFilters && (
                <button
                  onClick={clearSearch}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-all duration-200"
                >
                  <X className="w-4 h-4" />
                  Effacer les filtres
                </button>
              )}

              <button
                onClick={fetchOrdonnances}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#1D10FA] to-purple-600 text-white hover:shadow-lg rounded-lg font-medium transition-all duration-200 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                Rechercher
              </button>
            </div>
          </div>
        </div>

        {/* Liste des ordonnances */}
        {loading ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-[#1D10FA] border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement des ordonnances...</p>
          </div>
        ) : displayedOrdonnances.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/20 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              {hasActiveFilters ? "Aucun résultat trouvé" : "Aucune ordonnance"}
            </h3>
            <p className="text-gray-500">
              {hasActiveFilters
                ? "Essayez de modifier vos critères de recherche"
                : activeTab === "pending"
                  ? "Aucune ordonnance en attente pour le moment"
                  : "Aucune ordonnance effectuée pour le moment"}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearSearch}
                className="mt-4 px-4 py-2 bg-[#1D10FA] text-white rounded-lg hover:bg-purple-600 transition-colors duration-200"
              >
                Voir toutes les ordonnances
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-6">
            {displayedOrdonnances.map((ord) => (
              <div
                key={ord.id}
                className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-800">Ordonnance N°{ord.id}</h3>
                      <div
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          ord.status === "Effectuée" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"
                        }`}
                      >
                        {ord.status}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>
                          <strong>Patient:</strong> {ord.prenom} {ord.nom}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>
                          <strong>CIN:</strong> {ord.cin}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>
                          <strong>Émise le:</strong> {new Date(ord.created_at).toLocaleDateString("fr-FR")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-4 mb-4 border border-gray-200">
                  <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Prescription:
                  </h4>
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono bg-white/50 p-3 rounded-lg">
                    {ord.ordonnance}
                  </pre>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setSelectedOrdonnance(ord)
                      setEditData({ ...ord })
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-700 hover:from-yellow-200 hover:to-orange-200 rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    <Edit className="w-4 h-4" /> Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(ord.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-100 to-pink-100 text-red-700 hover:from-red-200 hover:to-pink-200 rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    <Trash className="w-4 h-4" /> Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal de modification */}
        {selectedOrdonnance && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-[#1D10FA] to-purple-600 text-white p-6 rounded-t-2xl">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <Edit className="w-6 h-6" />
                  Modifier l'ordonnance N°{selectedOrdonnance.id}
                </h2>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nom du patient</label>
                    <input
                      value={editData.nom || ""}
                      onChange={(e) => setEditData({ ...editData, nom: e.target.value })}
                      placeholder="Nom"
                      className="w-full px-4 py-3 border-2 border-gray-200 focus:border-[#1D10FA] transition-colors duration-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D10FA]/20"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Prénom du patient</label>
                    <input
                      value={editData.prenom || ""}
                      onChange={(e) => setEditData({ ...editData, prenom: e.target.value })}
                      placeholder="Prénom"
                      className="w-full px-4 py-3 border-2 border-gray-200 focus:border-[#1D10FA] transition-colors duration-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D10FA]/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Numéro CIN</label>
                  <input
                    value={editData.cin || ""}
                    onChange={(e) => setEditData({ ...editData, cin: e.target.value })}
                    placeholder="CIN"
                    className="w-full px-4 py-3 border-2 border-gray-200 focus:border-[#1D10FA] transition-colors duration-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D10FA]/20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Prescription</label>
                  <textarea
                    value={editData.ordonnance || ""}
                    onChange={(e) => setEditData({ ...editData, ordonnance: e.target.value })}
                    placeholder="Texte de l'ordonnance"
                    rows={8}
                    className="w-full px-4 py-3 border-2 border-gray-200 focus:border-[#1D10FA] transition-colors duration-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D10FA]/20 font-mono text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 p-6 bg-gray-50 rounded-b-2xl">
                <button
                  onClick={() => {
                    setSelectedOrdonnance(null)
                    setEditData({})
                  }}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-all duration-200"
                >
                  Annuler
                </button>
                <button
                  onClick={handleEdit}
                  className="px-6 py-3 bg-gradient-to-r from-[#1D10FA] to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all duration-200"
                >
                  Enregistrer les modifications
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

export default OrdonnancesPage

