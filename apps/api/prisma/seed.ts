import { PrismaClient, RoleName, AppointmentStatus, WaitingRoomStatus, BordereauStatus, CNAMRecordStatus, DocumentLanguage, DocumentTemplateType, PaymentMethod } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  await reset();

  const starterPlan = await prisma.plan.create({
    data: {
      name: "Starter",
      code: "STARTER",
      monthlyPrice: 129,
      yearlyPrice: 1290,
      maxDoctors: 3,
      maxStaff: 8
    }
  });

  const proPlan = await prisma.plan.create({
    data: {
      name: "Pro",
      code: "PRO",
      monthlyPrice: 289,
      yearlyPrice: 2890,
      maxDoctors: 12,
      maxStaff: 40
    }
  });

  const platformTenant = await prisma.tenant.create({
    data: {
      name: "Platform",
      slug: "platform",
      locale: "fr",
      timezone: "Africa/Tunis",
      planId: proPlan.id
    }
  });

  const clinicTenant = await prisma.tenant.create({
    data: {
      name: "Clinique El Amal",
      slug: "clinique-el-amal",
      locale: "fr",
      timezone: "Africa/Tunis",
      planId: starterPlan.id
    }
  });

  const [platformSuperRole, platformDoctorRole, platformSecretaryRole] = await Promise.all([
    prisma.role.create({ data: { tenantId: platformTenant.id, name: RoleName.SUPER_ADMIN, description: "Platform admin" } }),
    prisma.role.create({ data: { tenantId: platformTenant.id, name: RoleName.DOCTOR, description: "Platform doctor" } }),
    prisma.role.create({ data: { tenantId: platformTenant.id, name: RoleName.SECRETARY, description: "Platform secretary" } })
  ]);

  const [clinicSuperRole, clinicDoctorRole, clinicSecretaryRole] = await Promise.all([
    prisma.role.create({ data: { tenantId: clinicTenant.id, name: RoleName.SUPER_ADMIN, description: "Clinic owner" } }),
    prisma.role.create({ data: { tenantId: clinicTenant.id, name: RoleName.DOCTOR, description: "Clinic doctor" } }),
    prisma.role.create({ data: { tenantId: clinicTenant.id, name: RoleName.SECRETARY, description: "Clinic secretary" } })
  ]);

  const passwordHash = await bcrypt.hash("Password123!", 10);

  const superAdmin = await prisma.user.create({
    data: {
      tenantId: platformTenant.id,
      roleId: platformSuperRole.id,
      firstName: "Sara",
      lastName: "Admin",
      email: "superadmin@medflow.dev",
      phone: "+21650000001",
      passwordHash,
      isActive: true
    }
  });

  const doctor = await prisma.user.create({
    data: {
      tenantId: clinicTenant.id,
      roleId: clinicDoctorRole.id,
      firstName: "Youssef",
      lastName: "Ben Salah",
      email: "doctor@medflow.dev",
      phone: "+21650000002",
      passwordHash,
      isActive: true
    }
  });

  const secretary = await prisma.user.create({
    data: {
      tenantId: clinicTenant.id,
      roleId: clinicSecretaryRole.id,
      firstName: "Rim",
      lastName: "Khaldi",
      email: "secretary@medflow.dev",
      phone: "+21650000003",
      passwordHash,
      isActive: true
    }
  });

  await prisma.tenantSetting.createMany({
    data: [
      {
        tenantId: platformTenant.id,
        clinicName: "MedFlow Platform",
        language: "fr",
        theme: "system",
        documentFooter: "This software does not provide medical advice."
      },
      {
        tenantId: clinicTenant.id,
        clinicName: "Clinique El Amal",
        clinicAddress: "12 Avenue de la Liberte, Tunis",
        clinicPhone: "+216 71 000 000",
        language: "fr",
        theme: "system",
        documentFooter: "This software does not provide medical advice."
      }
    ]
  });

  const diagnosisList = [
    { code: "J06.9", label: "Infection aigue des voies respiratoires" },
    { code: "I10", label: "Hypertension essentielle" },
    { code: "E11", label: "Diabete type 2" },
    { code: "M54.5", label: "Lombalgie" },
    { code: "K29.7", label: "Gastrite" }
  ];

  const diagnoses = await Promise.all(
    diagnosisList.map((item) =>
      prisma.diagnosis.create({
        data: {
          tenantId: clinicTenant.id,
          code: item.code,
          label: item.label
        }
      })
    )
  );

  const patients = [] as Array<{ id: string; firstName: string; lastName: string; ficheNumber: string }>;

  for (let i = 1; i <= 12; i += 1) {
    const patient = await prisma.patient.create({
      data: {
        tenantId: clinicTenant.id,
        ficheNumber: `F-${1000 + i}`,
        cnamNumber: `CNAM-${88000 + i}`,
        nationalId: `CIN-${12000000 + i}`,
        firstName: `Patient${i}`,
        lastName: `Demo${i}`,
        dateOfBirth: new Date(1985 + (i % 20), (i % 11), 10 + (i % 12)),
        phone: `+21650000${(100 + i).toString().slice(-3)}`,
        address: `Rue ${i}, Tunis`,
        insuranceProvider: "CNAM",
        insurancePolicyNumber: `POL-${5000 + i}`,
        lastVisitAt: new Date()
      }
    });

    await prisma.medicalHistory.create({
      data: {
        tenantId: clinicTenant.id,
        patientId: patient.id,
        notes: i % 2 === 0 ? "ATCD: HTA" : "ATCD: none"
      }
    });

    await prisma.allergy.createMany({
      data: [
        { tenantId: clinicTenant.id, patientId: patient.id, name: "Penicilline", severity: i % 2 === 0 ? "HIGH" : "LOW" }
      ]
    });

    await prisma.chronicTreatment.createMany({
      data: [
        { tenantId: clinicTenant.id, patientId: patient.id, label: "Metformin", dosage: "500mg" }
      ]
    });

    patients.push({
      id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      ficheNumber: patient.ficheNumber
    });
  }

  const appointments = [] as Array<{ id: string; patientId: string; startAt: Date }>;

  for (let i = 0; i < patients.length; i += 1) {
    const start = new Date();
    start.setDate(start.getDate() + (i % 5) - 2);
    start.setHours(8 + (i % 8), 0, 0, 0);

    const end = new Date(start);
    end.setMinutes(end.getMinutes() + 30);

    const status = i % 6 === 0 ? AppointmentStatus.NO_SHOW : i % 3 === 0 ? AppointmentStatus.DONE : AppointmentStatus.SCHEDULED;

    const appointment = await prisma.appointment.create({
      data: {
        tenantId: clinicTenant.id,
        patientId: patients[i].id,
        doctorId: doctor.id,
        startAt: start,
        endAt: end,
        status,
        reason: "Consultation generale"
      }
    });

    appointments.push({ id: appointment.id, patientId: appointment.patientId, startAt: appointment.startAt });
  }

  const waitingEntries = await Promise.all(
    appointments.slice(0, 5).map((appointment, index) =>
      prisma.waitingRoomEntry.create({
        data: {
          tenantId: clinicTenant.id,
          appointmentId: appointment.id,
          patientId: appointment.patientId,
          handledByUserId: secretary.id,
          status: index === 0 ? WaitingRoomStatus.CALLED : WaitingRoomStatus.WAITING,
          isUrgent: index === 2,
          arrivalTime: new Date(Date.now() - (index + 1) * 8 * 60000),
          calledAt: index === 0 ? new Date(Date.now() - 3 * 60000) : null,
          priorityScore: index === 2 ? 10 : 0
        }
      })
    )
  );

  const consultations = [] as Array<{ id: string; patientId: string }>;

  for (let i = 0; i < 8; i += 1) {
    const consultation = await prisma.consultation.create({
      data: {
        tenantId: clinicTenant.id,
        patientId: patients[i].id,
        doctorId: doctor.id,
        appointmentId: appointments[i].id,
        diagnosisId: diagnoses[i % diagnoses.length].id,
        symptoms: "Fievre, toux et fatigue",
        notes: "Hydratation + repos",
        doctorPrivateNote: "Follow-up in 3 days",
        createdAt: new Date(Date.now() - i * 86400000)
      }
    });

    await prisma.vitalSigns.create({
      data: {
        tenantId: clinicTenant.id,
        consultationId: consultation.id,
        bloodPressure: "120/80",
        pulseBpm: 75 + i,
        temperatureC: 37.2 + i * 0.1,
        weightKg: 70 + i,
        heightCm: 170
      }
    });

    consultations.push({ id: consultation.id, patientId: consultation.patientId });
  }

  const demoCatalog = await prisma.medicationCatalog.create({
    data: {
      tenantId: clinicTenant.id,
      importedByUserId: superAdmin.id,
      source: "DEMO_DATASET",
      catalogVersion: "DEMO-2026-01",
      sourceMetadata: {
        note: "DEMO only, not an official Tunisia medication list"
      },
      isDemo: true
    }
  });

  const medicationSeed = [
    { code: "D001", brandName: "Dolocet", dciName: "Paracetamol", dosageForm: "Comprime", strength: "500mg", familyClass: "Analgesique", reimbursable: true, cnamCode: "CN001", price: 2.8 },
    { code: "D002", brandName: "Amoxiclav", dciName: "Amoxicilline + Acide clavulanique", dosageForm: "Comprime", strength: "1g", familyClass: "Antibiotique", reimbursable: true, cnamCode: "CN002", price: 18.9 },
    { code: "D003", brandName: "Glucophage", dciName: "Metformine", dosageForm: "Comprime", strength: "850mg", familyClass: "Antidiabetique", reimbursable: true, cnamCode: "CN003", price: 5.7 },
    { code: "D004", brandName: "Atenolol", dciName: "Atenolol", dosageForm: "Comprime", strength: "50mg", familyClass: "Cardiologie", reimbursable: true, cnamCode: "CN004", price: 4.2 },
    { code: "D005", brandName: "Omepra", dciName: "Omeprazole", dosageForm: "Gelule", strength: "20mg", familyClass: "Gastro", reimbursable: false, cnamCode: "CN005", price: 7.3 },
    { code: "D006", brandName: "Ibucalm", dciName: "Ibuprofene", dosageForm: "Comprime", strength: "400mg", familyClass: "Anti-inflammatoire", reimbursable: false, cnamCode: "CN006", price: 4.8 },
    { code: "D007", brandName: "Ventolair", dciName: "Salbutamol", dosageForm: "Spray", strength: "100mcg", familyClass: "Respiratoire", reimbursable: true, cnamCode: "CN007", price: 15.0 },
    { code: "D008", brandName: "Loratine", dciName: "Loratadine", dosageForm: "Comprime", strength: "10mg", familyClass: "Allergologie", reimbursable: false, cnamCode: "CN008", price: 3.9 }
  ];

  const medicationItems = [] as Array<{ id: string; brandName: string }>;

  for (const item of medicationSeed) {
    const created = await prisma.medicationItem.create({
      data: {
        tenantId: clinicTenant.id,
        catalogId: demoCatalog.id,
        code: item.code,
        brandName: item.brandName,
        dciName: item.dciName,
        dosageForm: item.dosageForm,
        strength: item.strength,
        familyClass: item.familyClass,
        reimbursable: item.reimbursable,
        cnamCode: item.cnamCode
      }
    });

    await prisma.medicationPrice.create({
      data: {
        tenantId: clinicTenant.id,
        medicationItemId: created.id,
        unitPrice: item.price,
        reimbursementInfo: item.reimbursable ? "CNAM demo eligible" : "Non remboursable"
      }
    });

    medicationItems.push({ id: created.id, brandName: created.brandName });
  }

  await prisma.medicationInteraction.createMany({
    data: [
      {
        tenantId: clinicTenant.id,
        medicationAId: medicationItems[1].id,
        medicationBId: medicationItems[5].id,
        severity: "MODERATE",
        description: "Risque digestif accru avec association antibiotique + AINS (DEMO)."
      },
      {
        tenantId: clinicTenant.id,
        medicationAId: medicationItems[2].id,
        medicationBId: medicationItems[4].id,
        severity: "LOW",
        description: "Surveiller le controle glycemique (DEMO)."
      },
      {
        tenantId: clinicTenant.id,
        medicationAId: medicationItems[3].id,
        medicationBId: medicationItems[6].id,
        severity: "HIGH",
        description: "Beta-bloquant peut reduire la reponse bronchodilatatrice (DEMO)."
      }
    ]
  });

  await prisma.catalogImportLog.create({
    data: {
      tenantId: clinicTenant.id,
      catalogId: demoCatalog.id,
      importedByUserId: superAdmin.id,
      fileName: "demo_medications.csv",
      status: "SUCCESS",
      rowCount: medicationSeed.length,
      successCount: medicationSeed.length,
      failedCount: 0,
      metadata: { demo: true }
    }
  });

  for (let i = 0; i < consultations.length; i += 1) {
    const line1 = medicationItems[i % medicationItems.length];
    const line2 = medicationItems[(i + 1) % medicationItems.length];

    const price1 = Number((await prisma.medicationPrice.findFirstOrThrow({ where: { medicationItemId: line1.id } })).unitPrice);
    const price2 = Number((await prisma.medicationPrice.findFirstOrThrow({ where: { medicationItemId: line2.id } })).unitPrice);

    const quantity1 = 2;
    const quantity2 = 1;

    const prescription = await prisma.prescription.create({
      data: {
        tenantId: clinicTenant.id,
        patientId: consultations[i].patientId,
        doctorId: doctor.id,
        consultationId: consultations[i].id,
        notes: "Hydratation + prise reguliere",
        estimatedTotal: price1 * quantity1 + price2 * quantity2
      }
    });

    await prisma.prescriptionLine.createMany({
      data: [
        {
          tenantId: clinicTenant.id,
          prescriptionId: prescription.id,
          medicationItemId: line1.id,
          medicationLabel: line1.brandName,
          dose: "1 cp",
          frequency: "3 fois/jour",
          durationDays: 5,
          instructions: "Apres repas",
          quantity: quantity1,
          unitPrice: price1,
          lineTotal: price1 * quantity1
        },
        {
          tenantId: clinicTenant.id,
          prescriptionId: prescription.id,
          medicationItemId: line2.id,
          medicationLabel: line2.brandName,
          dose: "1 cp",
          frequency: "2 fois/jour",
          durationDays: 7,
          instructions: "Matin et soir",
          quantity: quantity2,
          unitPrice: price2,
          lineTotal: price2 * quantity2
        }
      ]
    });
  }

  const templateSeed = [
    { name: "Certificat Medical General", type: DocumentTemplateType.MEDICAL_CERTIFICATE, language: DocumentLanguage.FR, body: "Je soussigne Dr {{doctor.lastName}} certifie que {{patient.firstName}} {{patient.lastName}} a ete consulte le {{date}}.", footer: "Document genere via MedFlow" },
    { name: "Arret de Travail", type: DocumentTemplateType.SICK_LEAVE, language: DocumentLanguage.FR, body: "Le patient {{patient.firstName}} {{patient.lastName}} necessite un repos de {{payload.days}} jours a partir du {{date}}.", footer: "Document genere via MedFlow" },
    { name: "Certificat Scolaire", type: DocumentTemplateType.SCHOOL_CERTIFICATE, language: DocumentLanguage.FR, body: "Certifie que {{patient.firstName}} {{patient.lastName}} est apte a reprendre les etudes le {{date}}.", footer: "Document genere via MedFlow" },
    { name: "Certificat Aptitude Sportive", type: DocumentTemplateType.FITNESS_CERTIFICATE, language: DocumentLanguage.FR, body: "Certifie apte aux activites sportives apres examen du {{date}}.", footer: "Document genere via MedFlow" },
    { name: "Lettre Orientation", type: DocumentTemplateType.REFERRAL, language: DocumentLanguage.BILINGUAL, body: "Orientation de {{patient.firstName}} {{patient.lastName}} vers specialite demandee. Notes: {{payload.notes}}", footer: "Document genere via MedFlow" },
    { name: "Demande Imagerie", type: DocumentTemplateType.IMAGING_REQUEST, language: DocumentLanguage.FR, body: "Veuillez realiser l'examen d'imagerie pour {{patient.firstName}} {{patient.lastName}}. Motif: {{payload.notes}}", footer: "Document genere via MedFlow" },
    { name: "Demande Analyse", type: DocumentTemplateType.LAB_REQUEST, language: DocumentLanguage.FR, body: "Prescription d'analyses biologiques pour {{patient.firstName}} {{patient.lastName}}.", footer: "Document genere via MedFlow" },
    { name: "Facture Standard", type: DocumentTemplateType.INVOICE, language: DocumentLanguage.FR, body: "Facture pour {{patient.firstName}} {{patient.lastName}} date du {{date}}.", footer: "Document genere via MedFlow" },
    { name: "Recu Paiement", type: DocumentTemplateType.RECEIPT, language: DocumentLanguage.FR, body: "Recu de paiement emis pour {{patient.firstName}} {{patient.lastName}}.", footer: "Document genere via MedFlow" },
    { name: "CNAM Attestation Generic", type: DocumentTemplateType.CNAM_GENERIC, language: DocumentLanguage.BILINGUAL, body: "Attestation CNAM pour {{patient.firstName}} {{patient.lastName}}, code {{payload.code}}.", footer: "Document genere via MedFlow" },
    { name: "Medical Certificate Arabic Generic", type: DocumentTemplateType.MEDICAL_CERTIFICATE, language: DocumentLanguage.AR, body: "يشهد الدكتور أن {{patient.firstName}} {{patient.lastName}} تم فحصه بتاريخ {{date}}.", footer: "Generated by MedFlow" }
  ];

  const templates = await Promise.all(
    templateSeed.map((item, index) =>
      prisma.documentTemplate.create({
        data: {
          tenantId: clinicTenant.id,
          name: item.name,
          type: item.type,
          language: item.language,
          body: item.body,
          footer: item.footer,
          isGlobalLibrary: index < 5
        }
      })
    )
  );

  for (let i = 0; i < 5; i += 1) {
    await prisma.generatedDocument.create({
      data: {
        tenantId: clinicTenant.id,
        patientId: patients[i].id,
        doctorId: doctor.id,
        templateId: templates[i].id,
        consultationId: consultations[i].id,
        title: `${templates[i].name} - ${patients[i].lastName}`,
        payload: {
          days: 3,
          notes: "demo payload",
          date: new Date().toLocaleDateString("fr-TN")
        },
        filePath: `uploads/documents/demo-${i + 1}.pdf`
      }
    });
  }

  const cnamRecords = [] as Array<{ id: string; amount: number }>;

  for (let i = 0; i < consultations.length; i += 1) {
    const record = await prisma.cNAMConsultationRecord.create({
      data: {
        tenantId: clinicTenant.id,
        patientId: consultations[i].patientId,
        consultationId: consultations[i].id,
        cnamCode: `CNAM-C${100 + i}`,
        eligible: true,
        amount: 24 + i,
        status: i < 3 ? CNAMRecordStatus.EXPORTED : CNAMRecordStatus.PENDING,
        notes: "Demo CNAM tracking"
      }
    });

    cnamRecords.push({ id: record.id, amount: Number(record.amount) });
  }

  const bordereau = await prisma.bordereau.create({
    data: {
      tenantId: clinicTenant.id,
      doctorId: doctor.id,
      reference: `BRD-DEMO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`,
      periodStart: new Date(Date.now() - 7 * 86400000),
      periodEnd: new Date(),
      status: BordereauStatus.EXPORTED,
      totalAmount: cnamRecords.slice(0, 3).reduce((sum, row) => sum + row.amount, 0)
    }
  });

  await prisma.bordereauItem.createMany({
    data: cnamRecords.slice(0, 3).map((record) => ({
      tenantId: clinicTenant.id,
      bordereauId: bordereau.id,
      cnamRecordId: record.id,
      amount: record.amount
    }))
  });

  await prisma.bordereauExport.create({
    data: {
      tenantId: clinicTenant.id,
      bordereauId: bordereau.id,
      format: "TXT",
      filePath: "uploads/cnam/demo-bordereau.txt",
      checksum: "demo-checksum"
    }
  });

  const rejectedItem = await prisma.bordereauItem.findFirstOrThrow({
    where: { bordereauId: bordereau.id }
  });

  await prisma.bordereauRejection.create({
    data: {
      tenantId: clinicTenant.id,
      bordereauItemId: rejectedItem.id,
      reason: "Code CNAM invalide (DEMO)",
      resolved: false
    }
  });

  await prisma.cNAMConsultationRecord.update({
    where: { id: rejectedItem.cnamRecordId },
    data: { status: CNAMRecordStatus.REJECTED }
  });

  for (let i = 0; i < consultations.length; i += 1) {
    await prisma.payment.create({
      data: {
        tenantId: clinicTenant.id,
        patientId: consultations[i].patientId,
        consultationId: consultations[i].id,
        amount: 45 + i * 2,
        method: i % 2 === 0 ? PaymentMethod.CASH : PaymentMethod.CARD,
        paidAt: new Date(Date.now() - i * 86400000)
      }
    });
  }

  for (let i = 0; i < patients.length; i += 1) {
    await prisma.invoice.create({
      data: {
        tenantId: clinicTenant.id,
        patientId: patients[i].id,
        createdByUserId: secretary.id,
        invoiceNumber: `INV-${2026}${(1000 + i).toString()}`,
        amount: 60 + i * 3,
        issuedAt: new Date(Date.now() - i * 86400000),
        notes: "Invoice demo"
      }
    });
  }

  await prisma.workingHour.createMany({
    data: [
      { tenantId: clinicTenant.id, doctorId: doctor.id, dayOfWeek: 1, startTime: "08:00", endTime: "12:00", isActive: true },
      { tenantId: clinicTenant.id, doctorId: doctor.id, dayOfWeek: 1, startTime: "14:00", endTime: "18:00", isActive: true },
      { tenantId: clinicTenant.id, doctorId: doctor.id, dayOfWeek: 2, startTime: "08:00", endTime: "12:00", isActive: true },
      { tenantId: clinicTenant.id, doctorId: doctor.id, dayOfWeek: 3, startTime: "08:00", endTime: "12:00", isActive: true },
      { tenantId: clinicTenant.id, doctorId: doctor.id, dayOfWeek: 4, startTime: "08:00", endTime: "12:00", isActive: true },
      { tenantId: clinicTenant.id, doctorId: doctor.id, dayOfWeek: 5, startTime: "08:00", endTime: "12:00", isActive: true }
    ]
  });

  await prisma.notificationLog.createMany({
    data: [
      {
        tenantId: clinicTenant.id,
        userId: doctor.id,
        title: "Waiting room alert",
        message: "Patient Demo2 arrived",
        channel: "IN_APP",
        status: "SENT"
      },
      {
        tenantId: clinicTenant.id,
        userId: secretary.id,
        title: "Reminder scheduled",
        message: "SMS placeholder queued",
        channel: "IN_APP",
        status: "SENT"
      }
    ]
  });

  await prisma.reminderJob.createMany({
    data: [
      {
        tenantId: clinicTenant.id,
        appointmentId: appointments[0].id,
        patientId: appointments[0].patientId,
        createdByUserId: secretary.id,
        channel: "SMS",
        payload: { message: "Reminder DEMO" },
        scheduledFor: new Date(Date.now() + 2 * 3600000),
        status: "PENDING"
      },
      {
        tenantId: clinicTenant.id,
        appointmentId: appointments[1].id,
        patientId: appointments[1].patientId,
        createdByUserId: secretary.id,
        channel: "EMAIL",
        payload: { message: "Reminder DEMO email" },
        scheduledFor: new Date(Date.now() + 3 * 3600000),
        status: "PENDING"
      }
    ]
  });

  await prisma.auditLog.createMany({
    data: [
      {
        tenantId: clinicTenant.id,
        actorUserId: doctor.id,
        action: "SEED",
        entity: "Consultation",
        entityId: consultations[0].id,
        afterData: { seeded: true }
      },
      {
        tenantId: clinicTenant.id,
        actorUserId: secretary.id,
        action: "SEED",
        entity: "Appointment",
        entityId: appointments[0].id,
        afterData: { seeded: true }
      }
    ]
  });

  await prisma.backupLog.create({
    data: {
      tenantId: clinicTenant.id,
      triggeredByUserId: superAdmin.id,
      status: "SUCCESS",
      filePath: "uploads/backups/demo-backup.json",
      message: "Initial demo backup"
    }
  });

  console.log("Seed complete:");
  console.log("SUPER_ADMIN login: superadmin@medflow.dev / Password123!");
  console.log("DOCTOR login: doctor@medflow.dev / Password123!");
  console.log("SECRETARY login: secretary@medflow.dev / Password123!");
  console.log("DEMO medication catalog loaded (non-official data).");
}

async function reset(): Promise<void> {
  await prisma.bordereauRejection.deleteMany();
  await prisma.bordereauExport.deleteMany();
  await prisma.bordereauItem.deleteMany();
  await prisma.bordereau.deleteMany();
  await prisma.cNAMConsultationRecord.deleteMany();
  await prisma.generatedDocument.deleteMany();
  await prisma.documentTemplate.deleteMany();
  await prisma.prescriptionLine.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.medicationInteraction.deleteMany();
  await prisma.medicationPrice.deleteMany();
  await prisma.catalogImportLog.deleteMany();
  await prisma.medicationItem.deleteMany();
  await prisma.medicationCatalog.deleteMany();
  await prisma.vitalSigns.deleteMany();
  await prisma.fileAttachment.deleteMany();
  await prisma.consultation.deleteMany();
  await prisma.waitingRoomEntry.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.notificationLog.deleteMany();
  await prisma.reminderJob.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.patientInsurance.deleteMany();
  await prisma.allergy.deleteMany();
  await prisma.chronicTreatment.deleteMany();
  await prisma.medicalHistory.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.workingHour.deleteMany();
  await prisma.diagnosis.deleteMany();
  await prisma.backupLog.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.userPermission.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.tenantSetting.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.plan.deleteMany();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
