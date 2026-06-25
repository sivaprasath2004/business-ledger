import { createFileRoute } from "@tanstack/react-router";
import { LedgerView } from "./_authenticated.ledger";

export const Route = createFileRoute("/_authenticated/income")({
  head: () => ({ meta: [{ title: "Income — LedgerFlow Pro" }] }),
  component: () => <LedgerView fixedType="income" title="Income" description="All money flowing into your business." />,
});