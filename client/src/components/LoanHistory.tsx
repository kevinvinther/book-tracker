import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LendCopyForm } from "@/components/LendCopyForm";
import { toDatePart } from "@/lib/dates";
import type { Loan } from "@/lib/types";

interface LoanHistoryProps {
  copySlug: string;
  loans: Loan[] | undefined;
  copyStatus: string;
  onSaved: () => void;
}

function isOverdue(loan: Loan): boolean {
  if (!loan.expected_return_date || loan.returned_date) return false;
  return loan.expected_return_date < toDatePart(new Date().toISOString());
}

function formatDate(str: string): string {
  return str.slice(0, 10);
}

export function LoanHistory({ copySlug, loans, copyStatus, onSaved }: LoanHistoryProps) {
  const [editingLoan, setEditingLoan] = useState<string | null>(null);
  const [editBorrower, setEditBorrower] = useState("");
  const [editLentDate, setEditLentDate] = useState("");
  const [editExpectedReturn, setEditExpectedReturn] = useState("");
  const [editReturned, setEditReturned] = useState("");
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);

  const loanList = loans ?? [];

  const outstanding = loanList.filter((l) => !l.returned_date);
  const returned = loanList.filter((l) => l.returned_date);

  const isLent = outstanding.length > 0;
  const canLend = copyStatus === "owned" && !isLent;

  function handleReturn(lentDate: string) {
    fetch(`/api/copies/${copySlug}/loans/${lentDate}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ returned_date: toDatePart(new Date().toISOString()) }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to return");
        onSaved();
      })
      .catch(console.error);
  }

  function startEdit(loan: Loan) {
    setEditingLoan(loan.lent_date);
    setEditBorrower(loan.borrower_name);
    setEditLentDate(toDatePart(loan.lent_date));
    setEditExpectedReturn(loan.expected_return_date ?? "");
    setEditReturned(loan.returned_date ? toDatePart(loan.returned_date) : "");
    setEditError("");
  }

  function cancelEdit() {
    setEditingLoan(null);
  }

  function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editBorrower.trim()) {
      setEditError("Borrower name is required");
      return;
    }
    setSaving(true);
    setEditError("");

    const body: Record<string, unknown> = { borrower_name: editBorrower.trim() };
    if (editLentDate) body.lent_date = editLentDate;
    body.expected_return_date = editExpectedReturn || null;
    body.returned_date = editReturned ? editReturned : null;

    fetch(`/api/copies/${copySlug}/loans/${editingLoan!}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to save");
        onSaved();
        setEditingLoan(null);
      })
      .catch((err) => setEditError(err instanceof Error ? err.message : "Failed"))
      .finally(() => setSaving(false));
  }

  function handleDelete(lentDate: string) {
    if (!confirm("Delete this loan record?")) return;
    fetch(`/api/copies/${copySlug}/loans/${lentDate}`, { method: "DELETE" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to delete");
        onSaved();
      })
      .catch(console.error);
  }

  function renderRow(loan: Loan, index: number, isOutstanding: boolean) {
    const lentKey = loan.lent_date;

    if (editingLoan === lentKey) {
      return (
        <tr key={lentKey} className="bg-muted/20">
          <td className="px-3 py-1.5">
            <input
              value={editBorrower}
              onChange={(e) => setEditBorrower(e.target.value)}
              className="w-full rounded-sm border border-rule bg-background px-1.5 py-0.5 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </td>
          <td className="px-3 py-1.5">
            <input
              type="date"
              value={editLentDate}
              onChange={(e) => setEditLentDate(e.target.value)}
              className="w-full rounded-sm border border-rule bg-background px-1.5 py-0.5 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </td>
          <td className="px-3 py-1.5">
            <input
              type="date"
              value={editExpectedReturn}
              onChange={(e) => setEditExpectedReturn(e.target.value)}
              className="w-full rounded-sm border border-rule bg-background px-1.5 py-0.5 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </td>
          <td className="px-3 py-1.5">
            <input
              type="date"
              value={editReturned}
              onChange={(e) => setEditReturned(e.target.value)}
              className="w-full rounded-sm border border-rule bg-background px-1.5 py-0.5 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </td>
          <td className="px-3 py-1.5 text-right">
            <div className="flex items-center justify-end gap-1">
              {editError && <span className="text-xs text-destructive">{editError}</span>}
              <Button size="xs" onClick={submitEdit} disabled={saving}>{saving ? "…" : "Save"}</Button>
              <button onClick={cancelEdit} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
            </div>
          </td>
        </tr>
      );
    }

    return (
      <tr key={lentKey} className={index === 0 ? "" : "border-t border-rule/30"}>
        <td className="px-3 py-1.5 text-xs">{loan.borrower_name}</td>
        <td className="px-3 py-1.5 text-xs text-muted-foreground tabular-nums">{formatDate(loan.lent_date)}</td>
        <td className={`px-3 py-1.5 text-xs tabular-nums ${isOverdue(loan) ? "text-destructive" : "text-muted-foreground"}`}>
          {loan.expected_return_date ? formatDate(loan.expected_return_date) : "—"}
        </td>
        <td className="px-3 py-1.5 text-xs text-muted-foreground tabular-nums">
          {loan.returned_date ? formatDate(loan.returned_date) : "—"}
        </td>
        <td className="px-3 py-1.5 text-right">
          <div className="flex items-center justify-end gap-1">
            {isOutstanding && (
              <Button size="xs" variant="outline" onClick={() => handleReturn(loan.lent_date)}>
                Return
              </Button>
            )}
            <button onClick={() => startEdit(loan)} className="text-xs text-muted-foreground hover:text-foreground">Edit</button>
            <button onClick={() => handleDelete(loan.lent_date)} className="text-xs text-muted-foreground hover:text-destructive">Del</button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground">Loan History</h2>
        {canLend && <LendCopyForm copySlug={copySlug} onSaved={onSaved} />}
        {!canLend && isLent && (
          <span className="text-xs text-muted-foreground">Currently lent — return before lending again</span>
        )}
        {!canLend && !isLent && copyStatus !== "owned" && (
          <span className="text-xs text-muted-foreground">Cannot lend a {copyStatus} copy</span>
        )}
      </div>

      {loanList.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No loans yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-rule">
                <th className="px-3 py-1.5 text-xs font-medium text-muted-foreground">Borrower</th>
                <th className="px-3 py-1.5 text-xs font-medium text-muted-foreground">Lent</th>
                <th className="px-3 py-1.5 text-xs font-medium text-muted-foreground">Expected</th>
                <th className="px-3 py-1.5 text-xs font-medium text-muted-foreground">Returned</th>
                <th className="px-3 py-1.5 text-xs font-medium text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {outstanding.map((l, i) => renderRow(l, i, true))}
              {returned.map((l, i) => renderRow(l, outstanding.length + i, false))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
