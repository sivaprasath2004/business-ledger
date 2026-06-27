import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useCurrency } from "@/lib/auth";
import { PageHeader } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table2, Filter, ChevronDown, Download, Search, ArrowUpDown,
  ArrowUp, ArrowDown, CalendarRange, X, Plus, Minus, BarChart3,
  ChevronLeft, ChevronRight, Copy, Clipboard,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/excel")({
  head: () => ({ meta: [{ title: "Excel View — LedgerFlow Pro" }] }),
  component: ExcelView,
});

// ─── Column definitions ────────────────────────────────────────────────────
const ALL_COLUMNS = [
  { key: "entry_date", label: "Date", type: "date", width: 110 },
  { key: "ledger_number", label: "Ledger #", type: "text", width: 100 },
  { key: "type", label: "Type", type: "badge", width: 90 },
  { key: "description", label: "Description", type: "text", width: 220 },
  { key: "category", label: "Category", type: "badge", width: 120 },
  { key: "amount", label: "Amount", type: "currency", width: 120 },
  { key: "tax", label: "Tax", type: "currency", width: 90 },
  { key: "total_with_tax", label: "Total incl. Tax", type: "currency", width: 130 },
  { key: "currency", label: "Currency", type: "text", width: 80 },
  { key: "payment_method", label: "Payment Method", type: "text", width: 140 },
  { key: "reference_number", label: "Reference #", type: "text", width: 120 },
  { key: "customer_name", label: "Customer / Vendor", type: "text", width: 160 },
  { key: "notes", label: "Notes", type: "text", width: 200 },
  { key: "status", label: "Status", type: "badge", width: 90 },
];

type SortDir = "asc" | "desc" | null;
type SortState = { key: string; dir: SortDir };

// ─── Helpers ───────────────────────────────────────────────────────────────
function MultiSelectFilter({ label, options, selected, onChange }: { label: string; options: string[]; selected: string[]; onChange: (v: string[]) => void }) {
  const toggle = (v: string) => onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={`gap-1.5 h-8 text-xs ${selected.length ? "border-primary text-primary" : ""}`}>
          {label}
          {selected.length > 0 && <Badge className="bg-primary text-primary-foreground h-4 px-1 text-[9px]">{selected.length}</Badge>}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2">
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {options.map((o) => (
            <label key={o} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-sm">
              <Checkbox checked={selected.includes(o)} onCheckedChange={() => toggle(o)} />{o || "(blank)"}
            </label>
          ))}
        </div>
        {selected.length > 0 && <Button variant="ghost" size="sm" className="w-full mt-1 text-xs" onClick={() => onChange([])}>Clear</Button>}
      </PopoverContent>
    </Popover>
  );
}

// ─── Cell renderers ────────────────────────────────────────────────────────
function CellValue({ col, row, locale }: { col: any; row: any; locale: string }) {
  const val = col.key === "total_with_tax"
    ? Number(row.amount || 0) + Number(row.tax || 0)
    : col.key === "customer_name"
    ? (row.customers?.name ?? row.vendors?.name ?? row.customer_name ?? "")
    : row[col.key];

  if (val === null || val === undefined || val === "") return <span className="text-slate-400 dark:text-slate-600">—</span>;

  if (col.type === "date") return <span className="tabular-nums whitespace-nowrap">{formatDate(val)}</span>;
  if (col.type === "currency") return (
    <span className={`tabular-nums font-medium ${col.key === "amount" ? (row.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400") : ""}`}>
      {col.key === "amount" && (row.type === "income" ? "+" : "−")}
      {formatCurrency(val, row.currency || "USD", locale)}
    </span>
  );
  if (col.type === "badge") return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
      val === "income" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
      val === "expense" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
    }`}>{val}</span>
  );
  return <span className="truncate block">{String(val)}</span>;
}

// ─── Formula bar ───────────────────────────────────────────────────────────
function FormulaBar({ selected, rows, columns }: { selected: { row: number; col: number } | null; rows: any[]; columns: any[] }) {
  if (!selected) return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 border-b border-border text-xs text-muted-foreground font-mono">
      <span className="w-16 border-r border-border pr-2 text-center">—</span>
      <span>Select a cell to view its value</span>
    </div>
  );
  const row = rows[selected.row];
  const col = columns[selected.col];
  if (!row || !col) return null;
  const val = col.key === "total_with_tax"
    ? Number(row.amount || 0) + Number(row.tax || 0)
    : col.key === "customer_name"
    ? (row.customers?.name ?? row.vendors?.name ?? row.customer_name ?? "")
    : row[col.key];

  const cellAddr = `${String.fromCharCode(65 + selected.col)}${selected.row + 2}`;
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 border-b border-border text-xs font-mono">
      <span className="w-16 border-r border-border pr-2 text-center text-muted-foreground shrink-0">{cellAddr}</span>
      <span className="text-foreground">{val === null || val === undefined ? "" : String(val)}</span>
    </div>
  );
}

// ─── Column visibility panel ───────────────────────────────────────────────
function ColumnToggle({ visibleCols, onChange }: { visibleCols: string[]; onChange: (v: string[]) => void }) {
  const toggle = (k: string) => onChange(visibleCols.includes(k) ? visibleCols.filter((x) => x !== k) : [...visibleCols, k]);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <Table2 className="h-3.5 w-3.5" /> Columns <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-2">
        <div className="text-xs font-medium text-muted-foreground mb-2 px-1">Show / Hide Columns</div>
        <div className="space-y-1">
          {ALL_COLUMNS.map((c) => (
            <label key={c.key} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-sm">
              <Checkbox checked={visibleCols.includes(c.key)} onCheckedChange={() => toggle(c.key)} />
              {c.label}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Status bar ───────────────────────────────────────────────────────────
function StatusBar({ rows, selected, locale }: { rows: any[]; selected: Set<number>; locale: string }) {
  const selRows = selected.size > 0 ? [...selected].map((i) => rows[i]).filter(Boolean) : rows;
  const sum = selRows.reduce((a, r) => {
    const sign = r.type === "income" ? 1 : -1;
    return a + sign * Number(r.amount || 0);
  }, 0);
  const count = selRows.length;
  const avg = count > 0 ? sum / count : 0;
  return (
    <div className="flex items-center gap-6 px-4 py-1.5 bg-muted/30 border-t border-border text-xs text-muted-foreground font-mono shrink-0">
      <span>Rows: <strong className="text-foreground">{rows.length}</strong></span>
      {selected.size > 0 && <span>Selected: <strong className="text-foreground">{selected.size}</strong></span>}
      <span>Sum: <strong className={sum >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}>{formatCurrency(Math.abs(sum), "USD", locale)}</strong></span>
      <span>Avg: <strong className="text-foreground">{formatCurrency(Math.abs(avg), "USD", locale)}</strong></span>
      <span>Count: <strong className="text-foreground">{count}</strong></span>
    </div>
  );
}

// ─── Main Excel View ───────────────────────────────────────────────────────
function ExcelView() {
  const { user } = useAuth();
  const { locale } = useCurrency();

  // Data
  const { data: rawEntries, isLoading } = useQuery({
    queryKey: ["ledger-excel", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("ledger_entries")
        .select("*, customers(name), vendors(name)")
        .eq("archived", false)
        .order("entry_date", { ascending: false });
      return (data ?? []) as any[];
    },
  });

  // UI state
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [catFilter, setCatFilter] = useState<string[]>([]);
  const [methodFilter, setMethodFilter] = useState<string[]>([]);
  const [custFilter, setCustFilter] = useState<string[]>([]);
  const [sort, setSort] = useState<SortState>({ key: "entry_date", dir: "desc" });
  const [visibleCols, setVisibleCols] = useState(ALL_COLUMNS.map((c) => c.key));
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [frozenCol, setFrozenCol] = useState(1); // freeze first col (date)
  const tableRef = useRef<HTMLDivElement>(null);
  const [groupBy, setGroupBy] = useState<string>("none");
  const [showGroupSummary, setShowGroupSummary] = useState(true);

  const columns = useMemo(() => ALL_COLUMNS.filter((c) => visibleCols.includes(c.key)), [visibleCols]);

  const allCategories = useMemo(() => [...new Set((rawEntries ?? []).map((e) => e.category).filter(Boolean))].sort() as string[], [rawEntries]);
  const allMethods = useMemo(() => [...new Set((rawEntries ?? []).map((e) => e.payment_method).filter(Boolean))].sort() as string[], [rawEntries]);
  const allCustomers = useMemo(() => [...new Set((rawEntries ?? []).map((e) => e.customers?.name ?? e.vendors?.name).filter(Boolean))].sort() as string[], [rawEntries]);

  // Filter
  const filtered = useMemo(() => {
    let rows = (rawEntries ?? []);
    if (typeFilter.length) rows = rows.filter((e) => typeFilter.includes(e.type));
    if (catFilter.length) rows = rows.filter((e) => catFilter.includes(e.category));
    if (methodFilter.length) rows = rows.filter((e) => methodFilter.includes(e.payment_method));
    if (custFilter.length) rows = rows.filter((e) => custFilter.includes(e.customers?.name ?? e.vendors?.name ?? ""));
    if (dateFrom) rows = rows.filter((e) => e.entry_date >= dateFrom);
    if (dateTo) rows = rows.filter((e) => e.entry_date <= dateTo);
    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter((e) =>
        [e.description, e.category, e.reference_number, e.ledger_number, e.notes, e.customers?.name, e.vendors?.name]
          .some((v) => v?.toLowerCase().includes(s))
      );
    }
    return rows;
  }, [rawEntries, typeFilter, catFilter, methodFilter, custFilter, dateFrom, dateTo, search]);

  // Sort
  const sorted = useMemo(() => {
    if (!sort.key || !sort.dir) return filtered;
    return [...filtered].sort((a, b) => {
      let av = sort.key === "customer_name" ? (a.customers?.name ?? a.vendors?.name ?? "") : a[sort.key];
      let bv = sort.key === "customer_name" ? (b.customers?.name ?? b.vendors?.name ?? "") : b[sort.key];
      if (av === null || av === undefined) av = "";
      if (bv === null || bv === undefined) bv = "";
      const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sort]);

  // Group
  const groupedRows = useMemo(() => {
    if (groupBy === "none") return null;
    const groups: Record<string, any[]> = {};
    for (const row of sorted) {
      const key = groupBy === "customer_name"
        ? (row.customers?.name ?? row.vendors?.name ?? "(none)")
        : (row[groupBy] ?? "(none)");
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    }
    return groups;
  }, [sorted, groupBy]);

  // Pagination
  const totalPages = Math.ceil(sorted.length / pageSize);
  const paginatedRows = useMemo(() =>
    groupBy === "none" ? sorted.slice(page * pageSize, (page + 1) * pageSize) : sorted,
    [sorted, page, pageSize, groupBy]
  );

  function toggleSort(key: string) {
    setSort((s) => s.key === key ? { key, dir: s.dir === "asc" ? "desc" : s.dir === "desc" ? null : "asc" } : { key, dir: "asc" });
  }

  function toggleRow(idx: number, shift = false) {
    const next = new Set(selectedRows);
    if (shift && selectedCell) {
      const min = Math.min(selectedCell.row, idx);
      const max = Math.max(selectedCell.row, idx);
      for (let i = min; i <= max; i++) next.add(i);
    } else {
      if (next.has(idx)) next.delete(idx); else next.add(idx);
    }
    setSelectedRows(next);
  }

  function selectAll() {
    if (selectedRows.size === paginatedRows.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(paginatedRows.map((_, i) => i)));
    }
  }

  function exportCSV() {
    const rows = selectedRows.size > 0
      ? [...selectedRows].map((i) => paginatedRows[i]).filter(Boolean)
      : sorted;
    if (!rows.length) return toast.error("Nothing to export");
    const headers = columns.map((c) => c.label).join(",");
    const body = rows.map((row) =>
      columns.map((col) => {
        const val = col.key === "customer_name" ? (row.customers?.name ?? row.vendors?.name ?? "") : row[col.key];
        return `"${val === null || val === undefined ? "" : String(val).replace(/"/g, '""')}"`;
      }).join(",")
    ).join("\n");
    const blob = new Blob([headers + "\n" + body], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ledger-excel-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    toast.success(`Exported ${rows.length} rows`);
  }

  function copyCells() {
    const rows = selectedRows.size > 0
      ? [...selectedRows].map((i) => paginatedRows[i]).filter(Boolean)
      : selectedCell ? [paginatedRows[selectedCell.row]] : [];
    if (!rows.length) return;
    const text = rows.map((row) =>
      columns.map((col) => {
        const val = col.key === "customer_name" ? (row.customers?.name ?? row.vendors?.name ?? "") : row[col.key];
        return val === null || val === undefined ? "" : String(val);
      }).join("\t")
    ).join("\n");
    navigator.clipboard.writeText(text).then(() => toast.success("Copied to clipboard"));
  }

  const activeFilters = [typeFilter, catFilter, methodFilter, custFilter].flatMap((x) => x).length + (dateFrom || dateTo ? 1 : 0) + (search ? 1 : 0);

  function clearFilters() {
    setTypeFilter([]); setCatFilter([]); setMethodFilter([]); setCustFilter([]);
    setDateFrom(""); setDateTo(""); setSearch("");
  }

  // Keyboard nav
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!selectedCell) return;
      const { row, col } = selectedCell;
      if (e.key === "ArrowDown") { e.preventDefault(); setSelectedCell({ row: Math.min(row + 1, paginatedRows.length - 1), col }); }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelectedCell({ row: Math.max(row - 1, 0), col }); }
      if (e.key === "ArrowRight") { e.preventDefault(); setSelectedCell({ row, col: Math.min(col + 1, columns.length - 1) }); }
      if (e.key === "ArrowLeft") { e.preventDefault(); setSelectedCell({ row, col: Math.max(col - 1, 0) }); }
      if ((e.ctrlKey || e.metaKey) && e.key === "c") copyCells();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedCell, paginatedRows, columns]);

  // Render grouped rows
  function renderGroupedTable() {
    if (!groupedRows) return null;
    return Object.entries(groupedRows).map(([groupKey, groupRows]) => {
      const groupTotal = groupRows.reduce((a, r) => a + (r.type === "income" ? 1 : -1) * Number(r.amount || 0), 0);
      return (
        <tbody key={groupKey}>
          <tr className="bg-muted/60 sticky">
            <td colSpan={columns.length + 2} className="px-4 py-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">{groupKey}</span>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{groupRows.length} entries</span>
                  <span className={`font-semibold ${groupTotal >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                    Net: {groupTotal >= 0 ? "+" : ""}{formatCurrency(Math.abs(groupTotal), "USD", locale)}
                  </span>
                </div>
              </div>
            </td>
          </tr>
          {groupRows.map((row, localIdx) => {
            const globalIdx = sorted.indexOf(row);
            const isSelected = selectedRows.has(globalIdx);
            const isCellSelected = (colIdx: number) => selectedCell?.row === globalIdx && selectedCell?.col === colIdx;
            return (
              <tr
                key={row.id}
                className={`border-b border-slate-200 dark:border-slate-700 transition-colors cursor-pointer
                  ${isSelected ? "bg-blue-50 dark:bg-blue-900/20" : localIdx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50/50 dark:bg-slate-800/30"}
                  hover:bg-blue-50/60 dark:hover:bg-blue-900/10`}
                onClick={(e) => { setSelectedCell({ row: globalIdx, col: selectedCell?.col ?? 0 }); toggleRow(globalIdx, e.shiftKey); }}
              >
                <td className="w-8 px-2 text-center border-r border-slate-200 dark:border-slate-700">
                  <Checkbox checked={isSelected} onCheckedChange={() => toggleRow(globalIdx)} />
                </td>
                <td className="px-2 py-1.5 text-xs text-slate-400 dark:text-slate-600 border-r border-slate-200 dark:border-slate-700 w-12 text-center tabular-nums select-none">
                  {globalIdx + 2}
                </td>
                {columns.map((col, colIdx) => (
                  <td
                    key={col.key}
                    style={{ minWidth: col.width, maxWidth: col.width * 1.5 }}
                    className={`px-3 py-1.5 text-sm border-r border-slate-200 dark:border-slate-700 overflow-hidden
                      ${isCellSelected(colIdx) ? "outline outline-2 outline-blue-500 outline-offset-[-2px] bg-blue-50 dark:bg-blue-900/20" : ""}`}
                    onClick={(e) => { e.stopPropagation(); setSelectedCell({ row: globalIdx, col: colIdx }); }}
                  >
                    <CellValue col={col} row={row} locale={locale} />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      );
    });
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -mx-4 sm:-mx-6 lg:-mx-8 -mt-0">
      {/* Toolbar */}
      <div className="px-4 sm:px-6 py-3 border-b border-border bg-background shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 mr-2">
            <Table2 className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Excel View</span>
            <Badge variant="secondary" className="text-xs">{sorted.length} rows</Badge>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="pl-8 h-8 w-44 text-xs" />
          </div>

          {/* Date range */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={`h-8 gap-1 text-xs ${dateFrom || dateTo ? "border-primary text-primary" : ""}`}>
                <CalendarRange className="h-3.5 w-3.5" />
                {dateFrom || dateTo ? `${dateFrom || "…"} → ${dateTo || "…"}` : "Dates"}
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-3 space-y-2">
              <div><Label className="text-xs text-muted-foreground">From</Label><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="mt-1 h-8 text-xs" /></div>
              <div><Label className="text-xs text-muted-foreground">To</Label><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="mt-1 h-8 text-xs" /></div>
              {(dateFrom || dateTo) && <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => { setDateFrom(""); setDateTo(""); }}>Clear</Button>}
            </PopoverContent>
          </Popover>

          <MultiSelectFilter label="Type" options={["income", "expense"]} selected={typeFilter} onChange={setTypeFilter} />
          <MultiSelectFilter label="Customer" options={allCustomers} selected={custFilter} onChange={setCustFilter} />
          <MultiSelectFilter label="Category" options={allCategories} selected={catFilter} onChange={setCatFilter} />
          <MultiSelectFilter label="Payment" options={allMethods} selected={methodFilter} onChange={setMethodFilter} />

          {activeFilters > 0 && (
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-muted-foreground" onClick={clearFilters}>
              <X className="h-3 w-3" /> Clear ({activeFilters})
            </Button>
          )}

          <div className="ml-auto flex items-center gap-2">
            {/* Group by */}
            <Select value={groupBy} onValueChange={setGroupBy}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Group by…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No grouping</SelectItem>
                <SelectItem value="type">Type</SelectItem>
                <SelectItem value="category">Category</SelectItem>
                <SelectItem value="payment_method">Payment method</SelectItem>
                <SelectItem value="customer_name">Customer / Vendor</SelectItem>
                <SelectItem value="entry_date">Date</SelectItem>
              </SelectContent>
            </Select>

            <ColumnToggle visibleCols={visibleCols} onChange={setVisibleCols} />

            <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={copyCells}>
              <Copy className="h-3.5 w-3.5" /> Copy
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={exportCSV}>
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
          </div>
        </div>
      </div>

      {/* Formula bar */}
      <FormulaBar selected={selectedCell} rows={paginatedRows} columns={columns} />

      {/* Spreadsheet grid */}
      <div ref={tableRef} className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Loading spreadsheet…</div>
        ) : (
          <table className="border-collapse text-sm" style={{ minWidth: "max-content" }}>
            {/* Header row */}
            <thead className="sticky top-0 z-20">
              <tr className="bg-slate-100 dark:bg-slate-800 border-b-2 border-slate-300 dark:border-slate-600">
                {/* Row number header */}
                <th className="w-8 px-2 border-r border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800">
                  <Checkbox
                    checked={selectedRows.size === paginatedRows.length && paginatedRows.length > 0}
                    onCheckedChange={selectAll}
                  />
                </th>
                <th className="w-12 text-center px-2 border-r border-slate-300 dark:border-slate-600 text-xs text-slate-400 dark:text-slate-500 select-none">#</th>
                {columns.map((col, colIdx) => (
                  <th
                    key={col.key}
                    style={{ minWidth: col.width }}
                    className="px-3 py-2 text-left border-r border-slate-300 dark:border-slate-600 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider select-none cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700"
                    onClick={() => toggleSort(col.key)}
                  >
                    <div className="flex items-center gap-1.5">
                      {col.label}
                      {sort.key === col.key ? (
                        sort.dir === "asc" ? <ArrowUp className="h-3 w-3 text-primary shrink-0" /> : <ArrowDown className="h-3 w-3 text-primary shrink-0" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-20 shrink-0" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Rows */}
            {groupBy !== "none" ? (
              renderGroupedTable()
            ) : (
              <tbody>
                {paginatedRows.map((row, rowIdx) => {
                  const isSelected = selectedRows.has(rowIdx);
                  const isCellInRow = selectedCell?.row === rowIdx;
                  return (
                    <tr
                      key={row.id}
                      className={`border-b border-slate-200 dark:border-slate-700 transition-colors cursor-pointer
                        ${isSelected ? "bg-blue-50 dark:bg-blue-900/20" : rowIdx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50/50 dark:bg-slate-800/30"}
                        hover:bg-blue-50/60 dark:hover:bg-blue-900/10`}
                      onClick={(e) => { setSelectedCell({ row: rowIdx, col: selectedCell?.col ?? 0 }); toggleRow(rowIdx, e.shiftKey); }}
                    >
                      <td className="w-8 px-2 text-center border-r border-slate-200 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={isSelected} onCheckedChange={(c) => { toggleRow(rowIdx); }} />
                      </td>
                      <td className="px-2 py-1.5 text-xs text-slate-400 dark:text-slate-600 border-r border-slate-200 dark:border-slate-700 w-12 text-center tabular-nums select-none">
                        {page * pageSize + rowIdx + 2}
                      </td>
                      {columns.map((col, colIdx) => {
                        const isCellSel = isCellInRow && selectedCell?.col === colIdx;
                        return (
                          <td
                            key={col.key}
                            style={{ minWidth: col.width, maxWidth: col.width * 1.5 }}
                            className={`px-3 py-1.5 text-sm border-r border-slate-200 dark:border-slate-700 overflow-hidden
                              ${isCellSel ? "outline outline-2 outline-blue-500 outline-offset-[-2px] bg-blue-50 dark:bg-blue-900/20 z-10 relative" : ""}`}
                            onClick={(e) => { e.stopPropagation(); setSelectedCell({ row: rowIdx, col: colIdx }); }}
                          >
                            <CellValue col={col} row={row} locale={locale} />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {paginatedRows.length === 0 && (
                  <tr>
                    <td colSpan={columns.length + 2} className="px-4 py-16 text-center text-muted-foreground text-sm">
                      No data matches the current filters
                    </td>
                  </tr>
                )}
              </tbody>
            )}

            {/* Totals row */}
            {sorted.length > 0 && groupBy === "none" && (
              <tfoot>
                <tr className="bg-slate-100 dark:bg-slate-800 border-t-2 border-slate-300 dark:border-slate-600 font-semibold">
                  <td className="w-8 border-r border-slate-300 dark:border-slate-600" />
                  <td className="px-2 py-2 text-xs text-slate-500 border-r border-slate-300 dark:border-slate-600 text-center">Σ</td>
                  {columns.map((col) => {
                    const rows = selectedRows.size > 0 ? [...selectedRows].map((i) => paginatedRows[i]).filter(Boolean) : sorted;
                    if (col.type === "currency" || col.key === "amount") {
                      const sum = rows.reduce((a, r) => {
                        if (col.key === "amount") return a + (r.type === "income" ? 1 : -1) * Number(r.amount || 0);
                        if (col.key === "tax") return a + Number(r.tax || 0);
                        if (col.key === "total_with_tax") return a + Number(r.amount || 0) + Number(r.tax || 0);
                        return a;
                      }, 0);
                      return (
                        <td key={col.key} className="px-3 py-2 text-xs border-r border-slate-300 dark:border-slate-600 tabular-nums"
                          style={{ minWidth: col.width }}>
                          <span className={sum >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}>
                            {sum >= 0 ? "+" : ""}{formatCurrency(Math.abs(sum), "USD", locale)}
                          </span>
                        </td>
                      );
                    }
                    if (col.key === "entry_date") return <td key={col.key} className="px-3 py-2 text-xs text-slate-500 border-r border-slate-300 dark:border-slate-600" style={{ minWidth: col.width }}>TOTAL</td>;
                    return <td key={col.key} className="border-r border-slate-300 dark:border-slate-600" style={{ minWidth: col.width }} />;
                  })}
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>

      {/* Pagination */}
      {groupBy === "none" && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 bg-background border-t border-border shrink-0 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>Rows per page:</span>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(0); }}>
              <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[25, 50, 100, 200, 500].map((n) => <SelectItem key={n} value={String(n)} className="text-xs">{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Page {page + 1} of {totalPages}</span>
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === 0} onClick={() => setPage(0)}>
              <ChevronLeft className="h-3 w-3" /><ChevronLeft className="h-3 w-3 -ml-2" />
            </Button>
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)}>
              <ChevronRight className="h-3 w-3" /><ChevronRight className="h-3 w-3 -ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Status bar */}
      <StatusBar rows={sorted} selected={selectedRows} locale={locale} />
    </div>
  );
}
