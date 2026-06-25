import { createFileRoute } from "@tanstack/react-router";
import { PartyView } from "@/components/app/PartyView";

export const Route = createFileRoute("/_authenticated/customers")({
  head: () => ({ meta: [{ title: "Customers — LedgerFlow Pro" }] }),
  component: () => <PartyView table="customers" kind="Customer" title="Customers" description="Your client roster — link them to invoices and income entries." />,
});