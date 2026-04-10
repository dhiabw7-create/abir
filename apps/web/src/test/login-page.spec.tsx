import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LoginPage } from "@/features/auth/login-page";
import { ThemeProvider } from "@/lib/theme-context";
import { I18nProvider } from "@/lib/i18n-context";
import { AuthProvider } from "@/features/auth/auth-context";

describe("LoginPage", () => {
  it("renders sign-in form", () => {
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ThemeProvider>
            <I18nProvider>
              <AuthProvider>
                <LoginPage />
              </AuthProvider>
            </I18nProvider>
          </ThemeProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText("MedFlow")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("doctor@clinic.tn")).toBeInTheDocument();
  });
});
