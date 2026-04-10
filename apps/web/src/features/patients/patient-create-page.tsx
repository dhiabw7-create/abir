import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@medflow/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/features/auth/auth-context";
import { toast } from "sonner";

export function PatientCreatePage(): JSX.Element {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManageClinicalFields = user?.role !== "SECRETARY";

  const mutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const response = await api.post("/patients", payload);
      return response.data;
    },
    onSuccess: (patient) => {
      toast.success("Patient created");
      navigate(`/app/patients/${patient.id}`);
    },
    onError: () => {
      toast.error("Failed to create patient");
    }
  });

  const onSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const payload: Record<string, unknown> = {
      ficheNumber: String(formData.get("ficheNumber")),
      cnamNumber: String(formData.get("cnamNumber") || ""),
      firstName: String(formData.get("firstName")),
      lastName: String(formData.get("lastName")),
      dateOfBirth: String(formData.get("dateOfBirth")),
      phone: String(formData.get("phone")),
      address: String(formData.get("address") || ""),
      insuranceProvider: String(formData.get("insuranceProvider") || ""),
      insurancePolicyNumber: String(formData.get("insurancePolicyNumber") || ""),
      nationalId: String(formData.get("nationalId") || "")
    };

    if (canManageClinicalFields) {
      payload.medicalHistory = String(formData.get("medicalHistory") || "");
      payload.allergies = String(formData.get("allergies") || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      payload.chronicTreatments = String(formData.get("chronicTreatments") || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    mutation.mutate(payload);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Patient</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={onSubmit}>
          <Field name="ficheNumber" label="Fiche Number" required />
          <Field name="cnamNumber" label="CNAM Number" />
          <Field name="firstName" label="First Name" required />
          <Field name="lastName" label="Last Name" required />
          <Field name="dateOfBirth" label="Date of Birth" type="date" required />
          <Field name="phone" label="Phone" required />
          <Field name="nationalId" label="National ID (CIN)" />
          <Field name="address" label="Address" className="md:col-span-2" />
          <Field name="insuranceProvider" label="Insurance Provider" />
          <Field name="insurancePolicyNumber" label="Insurance Policy Number" />
          {canManageClinicalFields ? (
            <>
              <Field
                name="medicalHistory"
                label="Medical History"
                className="md:col-span-2"
              />
              <Field name="allergies" label="Allergies (comma separated)" className="md:col-span-2" />
              <Field
                name="chronicTreatments"
                label="Chronic Treatments (comma separated)"
                className="md:col-span-2"
              />
            </>
          ) : (
            <p className="md:col-span-2 rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500">
              Secretary mode: clinical fields are hidden.
            </p>
          )}

          <div className="md:col-span-2 flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => navigate("/app/patients")}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : "Create Patient"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
  className
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  className?: string;
}): JSX.Element {
  return (
    <label className={className}>
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <Input name={name} type={type} required={required} />
    </label>
  );
}
