import { createFileRoute } from "@tanstack/react-router";
import { CustomersVendorsView } from "@/components/app/PartyView";

export const Route = createFileRoute("/_authenticated/customers")({
  head: () => ({ meta: [{ title: "Customers & Vendors — LedgerFlow Pro" }] }),
  component: () => <CustomersVendorsView />,
});
