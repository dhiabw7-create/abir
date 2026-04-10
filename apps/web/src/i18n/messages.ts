export const messages = {
  fr: {
    common: {
      dashboard: "Tableau de bord",
      patients: "Patients",
      agenda: "Agenda",
      waitingRoom: "Salle d'attente",
      consultations: "Consultations",
      prescriptions: "Ordonnances",
      documents: "Documents",
      cnam: "CNAM",
      finance: "Finance",
      reports: "Rapports",
      settings: "Parametres",
      admin: "Administration",
      logout: "Deconnexion"
    }
  },
  ar: {
    common: {
      dashboard: "لوحة التحكم",
      patients: "المرضى",
      agenda: "المواعيد",
      waitingRoom: "قاعة الانتظار",
      consultations: "الاستشارات",
      prescriptions: "الوصفات",
      documents: "الوثائق",
      cnam: "CNAM",
      finance: "المالية",
      reports: "التقارير",
      settings: "الإعدادات",
      admin: "الإدارة",
      logout: "تسجيل الخروج"
    }
  }
} as const;

export type AppLanguage = keyof typeof messages;
