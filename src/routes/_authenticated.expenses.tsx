import { createFileRoute } from "@tanstack/react-router";
import { LedgerView } from "./_authenticated.ledger";

export const Route = createFileRoute("/_authenticated/expenses")({
  head: () => ({ meta: [{ title: "Expenses — LedgerFlow Pro" }] }),
  component: () => <LedgerView fixedType="expense" title="Expenses" description="Every expense you've recorded — categorized and searchable." />,
});