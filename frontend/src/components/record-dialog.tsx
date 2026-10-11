"use client";
import { useState, type FormEvent } from "react";
import { LoaderCircle } from "lucide-react";
import { useWorkspace } from "./workspace-provider";
import { Field, Modal } from "./ui";
import { api } from "@/lib/api";
import { normalizeFinancial } from "@/lib/ledger";
import type { DocumentRecord, SourceRecord } from "@/lib/types";
export type DialogKind =
  | "case"
  | "proceeding"
  | "order"
  | "payment"
  | "hearing"
  | "document"
  | "source";
const titles = {
  case: "Start a case record",
  proceeding: "Add a proceeding",
  order: "Record a court order",
  payment: "Log a payment",
  hearing: "Add an upcoming event",
  document: "Add a document",
  source: "Structure a source or fact",
};
export function RecordDialog({
  kind,
  onClose,
  source,
}: {
  kind: DialogKind;
  onClose: () => void;
  source?: SourceRecord;
}) {
  const { data, demo, asOf, create, setData, setNotice, selectedCase } =
    useWorkspace();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [sourceKind, setSourceKind] = useState(
    source?.kind || "Financial fact",
  );
  const [certainty, setCertainty] = useState(source?.certainty || "Known");
  const noParent =
    (["proceeding", "document", "hearing"].includes(kind) &&
      !data.cases.length) ||
    (kind === "order" && !data.proceedings.length) ||
    (kind === "payment" && !data.orders.length);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const str = (key: string) => String(form.get(key) || "").trim();
    const num = (key: string) => Number(str(key));
    try {
      if (kind === "case") {
        if (!str("title")) throw new Error("Enter a case title.");
        await create("cases", { title: str("title") });
      }
      if (kind === "proceeding")
        await create("proceedings", {
          caseId: num("caseId"),
          courtName: str("courtName"),
          caseNumber: str("caseNumber"),
          proceedingType: str("proceedingType"),
          filedAt: str("filedAt"),
          status: "ONGOING",
        });
      if (kind === "order") {
        if (!Number.isFinite(num("amount")) || num("amount") <= 0)
          throw new Error("Enter an amount greater than zero.");
        await create("orders", {
          proceedingId: num("proceedingId"),
          orderType: str("orderType"),
          orderDate: str("orderDate"),
          amount: num("amount"),
          description: str("description"),
          ...(demo
            ? { effectiveDate: str("effectiveDate"), dueDay: num("dueDay") }
            : {}),
        });
      }
      if (kind === "payment") {
        if (!Number.isFinite(num("amount")) || num("amount") <= 0)
          throw new Error("Enter an amount greater than zero.");
        if (str("paymentDate") > asOf)
          throw new Error("A received payment cannot have a future date.");
        await create("payments", {
          orderId: num("orderId"),
          amount: num("amount"),
          paymentDate: str("paymentDate"),
          status: "RECEIVED",
          reference: str("reference"),
          notes: str("notes"),
          ...(demo ? { period: str("period") } : {}),
        });
      }
      if (kind === "hearing") {
        setData((prev) => ({
          ...prev,
          hearings: [
            ...prev.hearings,
            {
              id: Date.now(),
              caseId: num("caseId"),
              title: str("title"),
              date: str("date"),
              location: str("location"),
            },
          ],
        }));
        setNotice("Event added to this demo session.");
      }
      if (kind === "document") {
        const file = form.get("document") as File;
        if (!file?.size) throw new Error("Choose a file to upload.");
        if (file.size > 10 * 1024 * 1024)
          throw new Error("Choose a file smaller than 10 MB.");
        if (
          ![
            "application/pdf",
            "image/png",
            "image/jpeg",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          ].includes(file.type)
        )
          throw new Error("Choose a PDF, PNG, JPG, DOC or DOCX file.");
        let record: DocumentRecord;
        if (demo)
          record = {
            id: Date.now(),
            caseId: num("caseId"),
            originalName: file.name,
            fileSize: file.size,
            documentType: str("documentType"),
            createdAt: asOf,
            file,
          };
        else {
          const result = await api<{ document: DocumentRecord }>(
            "documents/upload",
            form,
          );
          record = { ...result.document, caseId: num("caseId") };
        }
        setData((prev) => ({
          ...prev,
          documents: [...prev.documents, record],
        }));
        setNotice(
          demo
            ? "Demo file held in memory only. It has not been uploaded."
            : "Document uploaded.",
        );
      }
      if (kind === "source") {
        if (sourceKind === "Financial fact")
          normalizeFinancial(str("value"), str("frequency"), certainty);
        if (str("url") && !/^https:\/\//i.test(str("url")))
          throw new Error("Use an HTTPS source URL.");
        if (str("status") === "Reviewed" && !str("reviewedOn"))
          throw new Error("A reviewed record needs a review date.");
        if (str("reviewedOn") > asOf)
          throw new Error("Review date cannot be in the future.");
        const record: SourceRecord = {
          id: source?.id || Date.now(),
          title: str("title"),
          kind: sourceKind,
          url: str("url"),
          section: str("section"),
          reviewedOn: str("reviewedOn"),
          effectiveFrom: str("effectiveFrom"),
          status: str("status") as SourceRecord["status"],
          value: certainty === "Unknown" ? "" : str("value"),
          frequency:
            (str("frequency") as SourceRecord["frequency"]) || "Not applicable",
          certainty,
        };
        setData((prev) => ({
          ...prev,
          sources: [...prev.sources.filter((s) => s.id !== record.id), record],
        }));
        setNotice(
          "Structured record saved in this session. Export it for the AI team.",
        );
      }
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal
      title={titles[kind]}
      description={
        demo
          ? "Demo workspace · use synthetic information only. Changes last until you refresh."
          : "Only information supported by the connected service will be saved."
      }
      onClose={onClose}
    >
      <form onSubmit={submit} className="form-stack">
        {noParent && (
          <div className="callout warning" role="alert">
            First create{" "}
            {kind === "order"
              ? "a proceeding"
              : kind === "payment"
                ? "an order"
                : "a case"}{" "}
            before adding this record.
          </div>
        )}
        {["proceeding", "hearing", "document"].includes(kind) && (
          <Field label="Case">
            <select
              name="caseId"
              required
              defaultValue={selectedCase || data.cases[0]?.id}
            >
              {data.cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </Field>
        )}
        {["case", "hearing"].includes(kind) && (
          <Field
            label={kind === "case" ? "Case title" : "Event title"}
            hint={
              kind === "case"
                ? "An alias is enough. Avoid full names when not needed."
                : undefined
            }
          >
            <input
              name="title"
              required
              maxLength={120}
              placeholder={
                kind === "case"
                  ? "e.g. My maintenance case"
                  : "e.g. Review hearing"
              }
            />
          </Field>
        )}
        {kind === "proceeding" && (
          <>
            <Field label="Court / forum">
              <input name="courtName" required maxLength={150} />
            </Field>
            <Field label="Case number / CNR">
              <input name="caseNumber" maxLength={80} />
            </Field>
            <Field label="Proceeding type">
              <input
                name="proceedingType"
                required
                placeholder="As recorded in your documents"
                maxLength={100}
              />
            </Field>
            <Field label="Filing date">
              <input name="filedAt" type="date" max={asOf} required />
            </Field>
          </>
        )}
        {kind === "order" && (
          <>
            <Field label="Proceeding">
              <select name="proceedingId" required>
                {data.proceedings.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.caseNumber || `Proceeding ${p.id}`} · {p.courtName}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Order type">
              <input
                name="orderType"
                required
                placeholder="e.g. Interim maintenance"
              />
            </Field>
            <div className="form-grid">
              <Field label="Order date">
                <input name="orderDate" type="date" max={asOf} required />
              </Field>
              <Field label="Ordered amount (₹)">
                <input
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                />
              </Field>
            </div>
            {demo ? (
              <div className="form-grid">
                <Field label="Monthly schedule starts">
                  <input
                    name="effectiveDate"
                    type="date"
                    required
                    defaultValue="2026-10-01"
                  />
                </Field>
                <Field label="Due day of month">
                  <input
                    name="dueDay"
                    type="number"
                    min="1"
                    max="31"
                    required
                    defaultValue="5"
                  />
                </Field>
              </div>
            ) : (
              <p className="callout">
                Payment schedules are not yet supported by the connected
                service. This records the order only.
              </p>
            )}
            <Field label="Notes">
              <textarea name="description" rows={3} maxLength={1000} />
            </Field>
          </>
        )}
        {kind === "payment" && (
          <>
            <Field label="Court order">
              <select name="orderId" required>
                {data.orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    Order #{o.id} · {o.orderType}
                  </option>
                ))}
              </select>
            </Field>
            <div className="form-grid">
              <Field label="Amount received (₹)">
                <input
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                />
              </Field>
              <Field label="Received on">
                <input
                  name="paymentDate"
                  type="date"
                  max={asOf}
                  defaultValue={asOf}
                  required
                />
              </Field>
            </div>
            {demo && (
              <Field
                label="Payment covers"
                hint="Choose the month this payment belongs to, even if it arrived late."
              >
                <input
                  name="period"
                  type="month"
                  defaultValue={asOf.slice(0, 7)}
                  required
                />
              </Field>
            )}
            <Field label="Transaction reference (optional)">
              <input name="reference" maxLength={100} />
            </Field>
            <Field label="Notes (optional)">
              <textarea name="notes" rows={2} maxLength={1000} />
            </Field>
            {!demo && (
              <p className="callout">
                This saves a received payment. Period allocation and arrears
                calculations require a backend update.
              </p>
            )}
          </>
        )}
        {kind === "hearing" && (
          <>
            <Field label="Date">
              <input name="date" type="date" required />
            </Field>
            <Field label="Location / meeting details">
              <input name="location" required maxLength={200} />
            </Field>
          </>
        )}
        {kind === "document" && (
          <>
            <Field label="Document category">
              <select name="documentType">
                <option>Court order</option>
                <option>Payment proof</option>
                <option>Financial record</option>
                <option>Identity / relationship</option>
                <option>Other</option>
              </select>
            </Field>
            <Field
              label="Choose a document"
              hint="PDF, JPG, PNG, DOC or DOCX · up to 10 MB"
            >
              <input
                name="document"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                required
              />
            </Field>
            <p className="callout">
              Keep the original file. Adding a document does not verify its
              contents or submit it to a court.
            </p>
          </>
        )}
        {kind === "source" && (
          <>
            <Field label="Record type">
              <select
                value={sourceKind}
                onChange={(e) =>
                  setSourceKind(e.target.value as SourceRecord["kind"])
                }
              >
                <option>Financial fact</option>
                <option>Legal source</option>
              </select>
            </Field>
            <Field label="Title">
              <input
                name="title"
                defaultValue={source?.title}
                required
                maxLength={160}
              />
            </Field>
            <Field
              label={
                sourceKind === "Legal source"
                  ? "Act / section / case reference"
                  : "Evidence / provenance"
              }
            >
              <input name="section" defaultValue={source?.section} required />
            </Field>
            <Field
              label="Source URL"
              hint="Use the primary source when available."
            >
              <input
                name="url"
                type="url"
                defaultValue={source?.url}
                required={sourceKind === "Legal source"}
                placeholder="https://"
              />
            </Field>
            {sourceKind === "Financial fact" && (
              <>
                <Field label="Certainty">
                  <select
                    value={certainty}
                    onChange={(e) =>
                      setCertainty(e.target.value as SourceRecord["certainty"])
                    }
                  >
                    <option>Known</option>
                    <option>Estimated</option>
                    <option>Unknown</option>
                  </select>
                </Field>
                <div className="form-grid">
                  <Field label="Amount (₹)">
                    <input
                      name="value"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={source?.value}
                      disabled={certainty === "Unknown"}
                      required={certainty !== "Unknown"}
                    />
                  </Field>
                  <Field label="Frequency">
                    <select
                      name="frequency"
                      defaultValue={source?.frequency || "Monthly"}
                    >
                      <option>Monthly</option>
                      <option>Annual</option>
                      <option>One-time</option>
                    </select>
                  </Field>
                </div>
              </>
            )}
            <div className="form-grid">
              <Field label="Effective from">
                <input
                  name="effectiveFrom"
                  type="date"
                  defaultValue={source?.effectiveFrom}
                />
              </Field>
              <Field label="Reviewed on">
                <input
                  name="reviewedOn"
                  type="date"
                  max={asOf}
                  defaultValue={source?.reviewedOn}
                />
              </Field>
            </div>
            <Field label="Review status">
              <select
                name="status"
                defaultValue={source?.status || "Needs review"}
              >
                <option>Needs review</option>
                <option>Reviewed</option>
              </select>
            </Field>
            <p className="callout">
              Review labels record a manual check; they do not constitute legal
              approval. Uploaded text is data, never an instruction to the AI.
            </p>
          </>
        )}
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="modal-footer">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={saving || noParent}>
            {saving && <LoaderCircle size={16} className="animate-spin" />}
            {kind === "source" ? "Save structured record" : "Save record"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
