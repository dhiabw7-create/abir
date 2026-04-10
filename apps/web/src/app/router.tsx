import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/app-layout";
import { LoginPage } from "@/features/auth/login-page";
import { ForgotPasswordPage } from "@/features/auth/forgot-password-page";
import { RequireAuth, RequireRole } from "@/features/auth/route-guards";
import { DashboardPage } from "@/features/dashboard/dashboard-page";
import { PatientsPage } from "@/features/patients/patients-page";
import { PatientDetailPage } from "@/features/patients/patient-detail-page";
import { PatientCreatePage } from "@/features/patients/patient-create-page";
import { AgendaPage } from "@/features/agenda/agenda-page";
import { WaitingRoomPage } from "@/features/waiting-room/waiting-room-page";
import { ConsultationsPage } from "@/features/consultations/consultations-page";
import { PrescriptionsPage } from "@/features/prescriptions/prescriptions-page";
import { DocumentsPage } from "@/features/documents/documents-page";
import { CnamVerificationPage } from "@/features/cnam/cnam-verification-page";
import { CnamBordereauxPage } from "@/features/cnam/cnam-bordereaux-page";
import { CnamArchivePage } from "@/features/cnam/cnam-archive-page";
import { CnamCorrectifsPage } from "@/features/cnam/cnam-correctifs-page";
import { CnamPlafondPage } from "@/features/cnam/cnam-plafond-page";
import { CnamCarnetsPage } from "@/features/cnam/cnam-carnets-page";
import { FinancePage } from "@/features/finance/finance-page";
import { ReportsPage } from "@/features/reports/reports-page";
import { SettingsPage } from "@/features/settings/settings-page";
import { AdminPage } from "@/features/admin/admin-page";

export function AppRouter(): JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />

      <Route element={<RequireAuth />}>
        <Route path="/app" element={<AppLayout />}>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="patients" element={<PatientsPage />} />
          <Route path="patients/new" element={<PatientCreatePage />} />
          <Route path="patients/:id" element={<PatientDetailPage />} />
          <Route path="agenda" element={<AgendaPage />} />
          <Route path="waiting-room" element={<WaitingRoomPage />} />

          <Route element={<RequireRole roles={["SUPER_ADMIN", "DOCTOR"]} />}>
            <Route path="consultations" element={<ConsultationsPage />} />
            <Route path="prescriptions" element={<PrescriptionsPage />} />
          </Route>

          <Route path="documents" element={<DocumentsPage />} />

          <Route element={<RequireRole roles={["SUPER_ADMIN", "DOCTOR"]} />}>
            <Route path="cnam/verification" element={<CnamVerificationPage />} />
            <Route path="cnam/bordereaux" element={<CnamBordereauxPage />} />
            <Route path="cnam/archive" element={<CnamArchivePage />} />
            <Route path="cnam/correctifs" element={<CnamCorrectifsPage />} />
            <Route path="cnam/plafond" element={<CnamPlafondPage />} />
            <Route path="cnam/carnets" element={<CnamCarnetsPage />} />
          </Route>

          <Route element={<RequireRole roles={["SUPER_ADMIN", "DOCTOR"]} />}>
            <Route path="finance" element={<FinancePage />} />
            <Route path="reports" element={<ReportsPage />} />
          </Route>

          <Route path="settings" element={<SettingsPage />} />

          <Route element={<RequireRole roles={["SUPER_ADMIN"]} />}>
            <Route path="admin" element={<AdminPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/auth/login" replace />} />
    </Routes>
  );
}
