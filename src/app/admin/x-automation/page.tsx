import type { Metadata } from "next";
import { XAutomationAdmin } from "./x-automation-admin";

export const metadata: Metadata = {
  title: "X Automation Admin | Macro Signal",
  robots: { index: false, follow: false },
};

export default function XAutomationAdminPage() {
  return <XAutomationAdmin />;
}

