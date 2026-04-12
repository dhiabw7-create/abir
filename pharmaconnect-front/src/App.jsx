import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';

import LoginPage from './pages/auth/LoginPage';

import DashboardPage from './pages/pharmacist/DashboardPage';
import OrdonnancesPage from './pages/pharmacist/OrdonnancesPage';
import PharmacistSupplierPage from './pages/pharmacist/PharmacistSupplierPage';

import PharmacyManagementPage from './pages/admin/PharmacyManagementPage';
import DashboardAdminPage from './pages/admin/DashboardAdminPage';
import DocteurPage from './pages/admin/DocteurPage';
import PationManagementPage from './pages/admin/PationManagementPage';

import NewPrescription from './pages/doctor/NewPrescription';
import DoctorsOrdonnancesPage from './pages/doctor/DoctorsOrdonnancesPage';

import PharmaciesListPage from './pages/supplier/PharmaciesListPage';
import NotificationsPage from './pages/supplier/NotificationsPage';

import PationDashboardPage from './pages/pation/DashboardPage';
import PationOrdonnancesPage from './pages/pation/OrdonnancesPage';

import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';

import AdminLayout from './components/layout/AdminLayout';
import PharmacistLayout from './components/layout/PharmacistLayout';
import SupplierLayout from './components/layout/SupplierLayout';
import DoctorLayout from './components/layout/DoctorLayout';
import PationLayout from './components/layout/PationLayout';
import MainLayout from './components/layout/MainLayout';

import ProtectedRoute from './components/auth/ProtectedRoute';

const RoleBasedRedirect = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  switch (user?.role) {
    case 'admin':
      return <Navigate to="/admin/dashboard" replace />;
    case 'pharmacist':
      return <Navigate to="/pharmacy/dashboard" replace />;
    case 'doctor':
      return <Navigate to="/docteur" replace />;
    case 'supplier':
      return <Navigate to="/supplier" replace />;
    case 'pation':
      return <Navigate to="/pation/dashboard" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<RoleBasedRedirect />} />

          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin/dashboard" element={<DashboardAdminPage />} />
              <Route path="/pharmacies" element={<PharmacyManagementPage />} />
              <Route path="/admin/pharmacies" element={<PharmacyManagementPage />} />
              <Route path="/admin/doctors" element={<DocteurPage />} />
              <Route path="/admin/pations" element={<PationManagementPage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['pharmacist']} />}>
            <Route element={<PharmacistLayout />}>
              <Route path="/pharmacy/dashboard" element={<DashboardPage />} />
              <Route path="/pharmacy/ordonnances" element={<OrdonnancesPage />} />
              <Route path="/pharmacy/supplier" element={<PharmacistSupplierPage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['supplier']} />}>
            <Route element={<SupplierLayout />}>
              <Route path="/supplier" element={<PharmaciesListPage />} />
              <Route path="/supplier/notifications" element={<NotificationsPage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['doctor']} />}>
            <Route element={<DoctorLayout />}>
              <Route path="/docteur" element={<NewPrescription />} />
              <Route path="/docteur/ordonnances" element={<DoctorsOrdonnancesPage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['pation']} />}>
            <Route element={<PationLayout />}>
              <Route path="/pation/dashboard" element={<PationDashboardPage />} />
              <Route path="/pation/ordonnances" element={<PationOrdonnancesPage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['admin', 'pharmacist', 'doctor', 'supplier', 'pation']} />}>
            <Route element={<MainLayout />}>
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
