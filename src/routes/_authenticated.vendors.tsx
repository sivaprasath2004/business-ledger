import { createFileRoute } from "@tanstack/react-router";
import { PartyView } from "@/components/app/PartyView";

export const Route = createFileRoute("/_authenticated/vendors")({
  head: () => ({ meta: [{ title: "Vendors — LedgerFlow Pro" }] }),
  component: () => <PartyView table="vendors" kind="Vendor" title="Vendors" description="Suppliers and contractors you pay — link them to expense entries." />,
});