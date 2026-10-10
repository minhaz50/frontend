import type { Metadata } from "next";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Register",
  description:
    "Create a parceloHub account to start booking shipments and tracking parcels.",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
