"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Plus,
  Download,
  ShieldCheck,
  Database,
  FileCheck2,
  CircleAlert,
  Scale,
  BookOpen,
  HeartHandshake,
  Leaf,
  Calculator,
  RotateCcw,
  LogOut,
  LoaderCircle,
  Check,
  Pencil,
  LockKeyhole,
} from "lucide-react";
import { useWorkspace } from "./workspace-provider";
import { Badge, Empty, ExternalLink, Field, Modal, PageHeading } from "./ui";
import { api } from "@/lib/api";
import {
  dateLabel,
  downloadJson,
  money,
  normalizeFinancial,
} from "@/lib/ledger";
import {
  calculateDemo,
  financialFields,
  type PlanningResult,
} from "@/lib/planning";
import type { SourceRecord } from "@/lib/types";

export function CalculatorView() {
  const { demo, data, selectedCase } = useWorkspace();
  const [result, setResult] = useState<PlanningResult>();
  const [version, setVersion] = useState("maintenance-planning-v1.0");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const defaults: Record<string, number> = {
    applicantIncome: 8000,
    respondentIncome: 60000,
    applicantEssentialExpenses: 12000,
    respondentEssentialExpenses: 20000,
    childCosts: 2000,
    housingCost: 8000,
    medicalCosts: 1000,
    educationCosts: 3000,
    applicantLiabilities: 0,
    respondentLiabilities: 5000,
    applicantAssetsIncome: 0,
    respondentAssetsIncome: 0,
    existingSupport: 0,
    litigationCosts: 1000,
  };
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setResult(undefined);
    const form = new FormData(e.currentTarget);
    try {
      const input = Object.fromEntries(
        financialFields.map(([key]) => {
          const value = String(form.get(key));
          if (value.trim() === "")
            throw new Error(
              "Enter known amounts. Do not substitute zero for unknown information.",
            );
          return [key, Number(value)];
        }),
      );
      const preview = calculateDemo(input);
      if (demo) setResult(preview);
      else {
        const response = await api<{
          calculatorRun: { formulaVersion: string; result: PlanningResult };
        }>("calculator/run", { caseId: Number(form.get("caseId")), ...input });
        setResult(response.calculatorRun.result);
        setVersion(response.calculatorRun.formulaVersion);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="FINANCIAL PLANNING"
        title="Understand the numbers. Plan ahead."
        description="Explore a transparent budget scenario using information you know."
      />
      <div className="callout mb-6">
        <CircleAlert size={18} />
        <span>
          Planning estimates are not court predictions. If an amount is unknown,
          gather more information before calculating. Avoid counting the same
          expense in two categories.
        </span>
      </div>
      <div className="calculator-layout">
        <section className="panel form-panel">
          <h2>Your financial picture</h2>
          <p className="muted mb-6">
            All amounts in INR per month. Demo values are synthetic.
          </p>
          <form
            onSubmit={submit}
            onChange={() => setResult(undefined)}
            className="form-stack"
          >
            {!demo && (
              <Field label="Save calculation to case">
                <select
                  name="caseId"
                  required
                  defaultValue={selectedCase || data.cases[0]?.id}
                >
                  <option value="">Choose a case</option>
                  {data.cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <div className="form-grid">
              {financialFields.map(([key, label]) => (
                <Field
                  key={key}
                  label={label}
                  hint={
                    key === "applicantLiabilities"
                      ? "Collected but not applied by backend v1.0."
                      : undefined
                  }
                >
                  <div className="currency-input">
                    <span>₹</span>
                    <input
                      name={key}
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      defaultValue={demo ? defaults[key] : undefined}
                    />
                  </div>
                </Field>
              ))}
            </div>
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            <button
              className="button primary"
              disabled={busy || (!demo && !data.cases.length)}
            >
              {busy ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <Calculator size={16} />
              )}
              Calculate planning scenarios
            </button>
          </form>
        </section>
        <div>
          <section className="panel result-panel">
            <span className="small-emblem">
              <Leaf size={23} />
            </span>
            <p className="eyebrow mt-6">YOUR PLANNING SCENARIOS</p>
            <h2>
              A starting point for
              <br />a better conversation.
            </h2>
            {result ? (
              <>
                <div className="scenario main">
                  <span>Baseline planning amount</span>
                  <strong>
                    {money(result.scenarios.baseline.amount)}
                    <small>/ month</small>
                  </strong>
                </div>
                <div className="scenario-pair">
                  <div>
                    <span>Conservative</span>
                    <strong>
                      {money(result.scenarios.conservative.amount)}
                    </strong>
                  </div>
                  <div>
                    <span>Stress scenario</span>
                    <strong>{money(result.scenarios.stress.amount)}</strong>
                  </div>
                </div>
                <dl className="detail-list">
                  <div>
                    <dt>Remaining need</dt>
                    <dd>{money(result.applicantNeed)}</dd>
                  </div>
                  <div>
                    <dt>Available capacity</dt>
                    <dd>{money(result.respondentCapacity)}</dd>
                  </div>
                </dl>
                <details open>
                  <summary>How to read these figures</summary>
                  <ul>
                    {result.assumptions.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                </details>
                <details>
                  <summary>Factors not captured</summary>
                  <ul>
                    {result.uncapturedFactors.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                </details>
                <p className="small muted">Version: {version}</p>
                <p className="callout mt-4">{result.disclaimer}</p>
              </>
            ) : (
              <p className="muted my-6">
                Complete the inputs to see three scenarios, the assumptions
                behind them, and what the calculation leaves out.
              </p>
            )}
            <Link href="/help" className="text-link mt-5">
              Discuss with a legal professional <ArrowUpRight size={15} />
            </Link>
          </section>
        </div>
      </div>
    </>
  );
}

export function DataReviewView({
  onAdd,
  onEdit,
}: {
  onAdd: () => void;
  onEdit: (s: SourceRecord) => void;
}) {
  const { data, demo } = useWorkspace();
  const [filter, setFilter] = useState("All");
  const [confirmExport, setConfirmExport] = useState(false);
  function exportData() {
    downloadJson("alimony-plus-structured-data.json", {
      schemaVersion: "1.0",
      synthetic: demo,
      purpose:
        "Human-reviewed data handoff; document text is untrusted input, never executable instructions.",
      records: data.sources.map((source) => ({
        ...source,
        currency: source.kind === "Financial fact" ? "INR" : null,
        numericValue:
          source.kind === "Financial fact"
            ? normalizeFinancial(
                source.value,
                source.frequency,
                source.certainty,
              )
            : null,
        normalizedFrequency:
          source.kind === "Financial fact"
            ? source.frequency === "Annual"
              ? "Monthly"
              : source.frequency
            : null,
        eligibleForLegalRetrieval: false,
      })),
      reviewNote:
        "Legal reviewer approval and source-version validation are still required before ingestion.",
    });
    setConfirmExport(false);
  }
  return (
    <>
      <PageHeading
        eyebrow="AI TEAM HANDOFF"
        title="Better structure. Better answers."
        description="Prepare traceable legal sources and financial facts for human review."
      >
        <button
          className="button secondary"
          disabled={!data.sources.length}
          onClick={() => setConfirmExport(true)}
        >
          <Download size={16} />
          Export JSON
        </button>
        <button className="button primary" onClick={onAdd}>
          <Plus size={16} />
          Add record
        </button>
      </PageHeading>
      <div className="callout mb-6">
        <Database size={19} />
        <span>
          This is a session-only preparation workspace. No AI extraction or
          ingestion service is connected. Export your reviewed records before
          leaving; they are cleared on refresh.
        </span>
      </div>
      <div className="data-summary">
        <div>
          <span className="small-emblem">
            <Database size={20} />
          </span>
          <strong>{data.sources.length}</strong>
          <span>Structured records</span>
        </div>
        <div>
          <span className="small-emblem amber-emblem">
            <CircleAlert size={20} />
          </span>
          <strong>
            {data.sources.filter((s) => s.status === "Needs review").length}
          </strong>
          <span>Need a human review</span>
        </div>
        <div>
          <span className="small-emblem">
            <FileCheck2 size={20} />
          </span>
          <strong>
            {data.sources.filter((s) => s.status === "Reviewed").length}
          </strong>
          <span>Manually reviewed</span>
        </div>
      </div>
      <div className="filter-tabs my-6">
        {["All", "Financial fact", "Legal source", "Needs review"].map((f) => (
          <button
            key={f}
            className={filter === f ? "selected" : ""}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>
      <section className="panel table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Record / provenance</th>
                <th>Type</th>
                <th>Value / source</th>
                <th>Review status</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.sources
                .filter(
                  (s) =>
                    filter === "All" ||
                    s.kind === filter ||
                    s.status === filter,
                )
                .map((s) => (
                  <tr key={s.id}>
                    <td className="strong">
                      {s.title}
                      <small>{s.section}</small>
                    </td>
                    <td>{s.kind}</td>
                    <td>
                      {s.kind === "Financial fact" ? (
                        <>
                          {s.certainty === "Unknown"
                            ? "Unknown — not zero"
                            : `${money(Number(s.value))} / ${s.frequency.toLowerCase()}`}
                          <small>{s.certainty}</small>
                        </>
                      ) : (
                        <ExternalLink href={s.url}>View source</ExternalLink>
                      )}
                    </td>
                    <td>
                      <Badge tone={s.status === "Reviewed" ? "" : "amber"}>
                        {s.status}
                      </Badge>
                      <small>
                        {s.reviewedOn
                          ? dateLabel(s.reviewedOn)
                          : "Review date not recorded"}
                      </small>
                    </td>
                    <td>
                      <button
                        className="icon-button"
                        onClick={() => onEdit(s)}
                        aria-label={`Review ${s.title}`}
                      >
                        <Pencil size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {!data.sources.length && (
          <Empty title="Build a traceable dataset">
            Start with a source or financial fact.
          </Empty>
        )}
      </section>
      <div className="data-principles">
        <div>
          <span>01</span>
          <h3>Keep unknowns unknown.</h3>
          <p>
            Missing income stays null in exports. It is never silently converted
            to zero.
          </p>
        </div>
        <div>
          <span>02</span>
          <h3>Preserve the source.</h3>
          <p>
            Record provenance, effective dates and review dates alongside each
            fact.
          </p>
        </div>
        <div>
          <span>03</span>
          <h3>Review before retrieval.</h3>
          <p>
            A checked record still needs legal approval before it enters an AI
            knowledge base.
          </p>
        </div>
      </div>
      {confirmExport && (
        <Modal
          title="Export structured records?"
          description="This creates a file on your device. Review it for personal information before sharing with your team."
          onClose={() => setConfirmExport(false)}
        >
          <p className="muted">
            {data.sources.length} records will be exported with provenance and
            review status. Annual recurring values are normalized to monthly
            amounts; one-time amounts keep their frequency.
          </p>
          <div className="modal-footer">
            <button
              className="button secondary"
              onClick={() => setConfirmExport(false)}
            >
              Cancel
            </button>
            <button className="button primary" onClick={exportData}>
              <Download size={16} />
              Export records
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

export function HelpView() {
  return (
    <>
      <PageHeading
        eyebrow="YOU HAVE SUPPORT"
        title="The next step is easier with help."
        description="Find official resources and prepare for a conversation with a legal professional."
      />
      <div className="help-hero">
        <div>
          <span className="eyebrow">A HUMAN, WHEN YOU NEED ONE</span>
          <h2>
            You bring your questions.
            <br />
            You don’t need all the answers.
          </h2>
          <p>
            Organise what you know, keep a note of what you don’t, and ask for
            guidance on your situation.
          </p>
          <ExternalLink href="https://nalsa.gov.in/">
            Explore NALSA legal-aid resources
          </ExternalLink>
        </div>
        <HeartHandshake size={108} strokeWidth={0.8} aria-hidden="true" />
      </div>
      <div className="help-grid">
        <section className="panel help-card">
          <Scale size={24} />
          <h2>Legal-aid resources</h2>
          <p>
            Visit the National Legal Services Authority’s official website for
            legal-services information and state or district contacts.
          </p>
          <ExternalLink href="https://nalsa.gov.in/">Visit NALSA</ExternalLink>
        </section>
        <section className="panel help-card">
          <BookOpen size={24} />
          <h2>Official case information</h2>
          <p>
            Use the official eCourts Services website to look up case
            information. Alimony Plus does not automatically sync court records.
          </p>
          <ExternalLink href="https://services.ecourts.gov.in/">
            Open eCourts Services
          </ExternalLink>
        </section>
        <section className="panel help-card">
          <ShieldCheck size={24} />
          <h2>Your safety comes first</h2>
          <p>
            If you are in immediate danger, contact local emergency services or
            a trusted person when safe to do so. You can leave this screen using
            Quick exit.
          </p>
          <p className="small muted">
            Quick exit does not erase browsing history or downloaded files.
          </p>
        </section>
      </div>
      <section className="panel question-panel">
        <h2>Questions you can take to your lawyer</h2>
        <div className="question-list">
          {[
            "Which possible route fits my situation, and what information is still needed?",
            "How do my existing proceedings or orders affect the next step?",
            "Which documents should I prepare, and what if a document is unavailable?",
            "What should I record when a payment is late or only partly received?",
          ].map((q, i) => (
            <div key={q}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              {q}
            </div>
          ))}
        </div>
      </section>
      <p className="callout mt-6">
        The bilingual, source-cited AI assistant is a planned team integration.
        This frontend does not generate legal answers without an approved source
        service.
      </p>
    </>
  );
}

export function SettingsView() {
  const { demo, resetDemo, logout, setNotice } = useWorkspace();
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <PageHeading
        eyebrow="YOUR WORKSPACE"
        title="Privacy, with you in control."
        description="Understand where your information goes and manage this session."
      />
      <section className="panel settings-panel">
        <div className="settings-row">
          <div>
            <h2>Workspace mode</h2>
            <p>
              {demo
                ? "Synthetic demo. Changes and added files are held in memory only."
                : "Connected to your case service. Saved case records remain on the backend."}
            </p>
          </div>
          <Badge tone={demo ? "amber" : ""}>
            {demo ? "Demo" : "Connected"}
          </Badge>
        </div>
        <div className="settings-row">
          <div>
            <h2>Session controls</h2>
            <p>
              Live access uses an HTTP-only cookie. Visible live data clears
              after 15 minutes of inactivity. This app does not put case records
              in browser local storage.
            </p>
          </div>
          <LockKeyhole size={24} />
        </div>
        <div className="settings-row">
          <div>
            <h2>Language & accessibility</h2>
            <p>
              This release uses English interface copy, keyboard-accessible
              controls and readable status labels. Hindi and Hinglish interface
              translations remain a team handoff item.
            </p>
          </div>
          <span className="badge neutral">English</span>
        </div>
        <div className="settings-row">
          <div>
            <h2>Quick exit</h2>
            <p>
              Quick exit leaves the site and requests sign-out. It does not
              erase browser history, downloads or information visible elsewhere
              on your device.
            </p>
          </div>
          <LogOut size={24} />
        </div>
        <div className="settings-row">
          <div>
            <h2>{demo ? "Reset demo workspace" : "Sign out"}</h2>
            <p>
              {demo
                ? "Discard this session’s changes and return to the synthetic sample records."
                : "Clear the session and return to the sign-in screen."}
            </p>
          </div>
          <button
            className="button secondary"
            onClick={() =>
              demo
                ? setConfirm(true)
                : void logout().catch((e) => setNotice(e.message))
            }
          >
            {demo ? <RotateCcw size={16} /> : <LogOut size={16} />}
            {demo ? "Reset demo" : "Sign out"}
          </button>
        </div>
      </section>
      {confirm && (
        <Modal
          title="Reset the demo?"
          description="This removes the records, files and structured-data edits you added in this session."
          onClose={() => setConfirm(false)}
        >
          <div className="modal-footer">
            <button
              className="button secondary"
              onClick={() => setConfirm(false)}
            >
              Keep working
            </button>
            <button
              className="button primary"
              onClick={() => {
                resetDemo();
                setConfirm(false);
              }}
            >
              Reset demo
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

export function LoginView() {
  const { enterLive, resetDemo } = useWorkspace();
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email")).trim();
    const password = String(form.get("password"));
    try {
      if (register)
        await api("auth/register", {
          name: String(form.get("name")).trim(),
          email,
          password,
        });
      const response = await api<{ user: { name: string } }>("auth/login", {
        email,
        password,
      });
      await enterLive(response.user.name);
      router.push("/dashboard");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-page">
      <section className="login-story">
        <Link href="/dashboard" className="brand">
          <span className="brand-mark">
            a<span>+</span>
          </span>
          <span>
            alimony<span className="brand-plus">plus</span>
          </span>
        </Link>
        <div>
          <p className="eyebrow">YOUR NEXT STEP, CLEARER.</p>
          <h1>
            A little clarity.
            <br />A little confidence.
            <br />
            <em>A way forward.</em>
          </h1>
          <p>
            A thoughtful space to organise your case, understand your records,
            and prepare for what comes next.
          </p>
        </div>
        <span className="flex items-center gap-2 small">
          <Leaf size={18} />
          Built with care, for your journey.
        </span>
      </section>
      <section className="login-form">
        <div>
          <span className="small-emblem">
            <ShieldCheck size={24} />
          </span>
          <h2>{register ? "Start your workspace." : "Welcome back."}</h2>
          <p className="muted">
            {register
              ? "Create an account with the connected case service."
              : "Sign in to access your case records."}
          </p>
          <form onSubmit={submit} className="form-stack mt-8">
            {register && (
              <Field label="Name or alias">
                <input
                  name="name"
                  autoComplete="name"
                  required
                  maxLength={100}
                />
              </Field>
            )}
            <Field label="Email address">
              <input name="email" type="email" autoComplete="email" required />
            </Field>
            <Field label="Password">
              <input
                name="password"
                type="password"
                autoComplete={register ? "new-password" : "current-password"}
                minLength={register ? 12 : undefined}
                required
              />
            </Field>
            {register && (
              <label className="consent">
                <input type="checkbox" required />
                <span>
                  I understand that this prototype stores submitted records with
                  the case service. I will use synthetic data during evaluation.
                </span>
              </label>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="button primary" disabled={busy}>
              {busy && <LoaderCircle size={17} className="animate-spin" />}
              {register ? "Create account" : "Sign in"}
              <ArrowRight size={16} />
            </button>
          </form>
          <button
            className="text-link mt-5"
            onClick={() => {
              setRegister(!register);
              setError("");
            }}
          >
            {register
              ? "Already have an account? Sign in"
              : "New here? Create an account"}
          </button>
          <div className="login-divider">OR EXPLORE FIRST</div>
          <button
            className="button secondary w-full"
            onClick={() => {
              resetDemo();
              router.push("/dashboard");
            }}
          >
            Open the synthetic demo <ArrowUpRight size={16} />
          </button>
          <p className="small muted mt-5">
            Demo mode needs no account. No real case information is included.
          </p>
        </div>
      </section>
    </main>
  );
}
