"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FolderHeart,
  Scale,
  Wallet,
  Files,
  Calculator,
  Database,
  CircleHelp,
  Settings,
  ChevronDown,
  ArrowUpRight,
  ArrowRight,
  Plus,
  Download,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Search,
  CalendarDays,
  Check,
  Clock3,
  CircleAlert,
  FileText,
  ChevronRight,
  Leaf,
  Bell,
  SlidersHorizontal,
  BookOpen,
} from "lucide-react";
import { useWorkspace } from "./workspace-provider";
import { Badge, Empty, PageHeading, ExternalLink } from "./ui";
import { RecordDialog, type DialogKind } from "./record-dialog";
import { buildLedger, dateLabel, downloadJson, money } from "@/lib/ledger";
import type { LedgerRow, SourceRecord } from "@/lib/types";
import {
  CalculatorView,
  DataReviewView,
  HelpView,
  LoginView,
  SettingsView,
} from "./workspace-extras";

const nav = [
  { id: "dashboard", title: "Overview", icon: LayoutDashboard },
  { id: "cases", title: "My cases", icon: FolderHeart },
  { id: "orders", title: "Court orders", icon: Scale },
  { id: "payments", title: "Maintenance", icon: Wallet },
  { id: "documents", title: "Documents", icon: Files },
  { id: "calculator", title: "Planning calculator", icon: Calculator },
];
const pageTitles: Record<string, string> = {
  dashboard: "Overview",
  cases: "My cases",
  orders: "Court orders",
  payments: "Maintenance",
  documents: "Documents",
  calculator: "Planning calculator",
  "data-review": "Data workspace",
  help: "Help & legal aid",
  settings: "Settings",
};

export function WorkspaceApp({ section }: { section: string }) {
  const store = useWorkspace();
  const {
    data,
    demo,
    asOf,
    name,
    notice,
    setNotice,
    selectedCase,
    setSelectedCase,
  } = store;
  const sidebarRef = useRef<HTMLElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const [editSource, setEditSource] = useState<SourceRecord>();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const router = useRouter();
  useEffect(() => {
    setSearch("");
    setFilter("All");
    setMenuOpen(false);
  }, [section]);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(""), 6500);
    return () => clearTimeout(id);
  }, [notice, setNotice]);
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.activeElement as HTMLElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const links = () =>
      Array.from(
        sidebarRef.current?.querySelectorAll<HTMLElement>(
          "a[href],button:not([disabled])",
        ) || [],
      );
    links()[0]?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
      if (event.key === "Tab") {
        const items = links();
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [menuOpen]);
  const cases = data.cases.filter(
    (c) => !selectedCase || c.id === selectedCase,
  );
  const proceedings = data.proceedings.filter((p) =>
    cases.some((c) => c.id === p.caseId),
  );
  const orders = data.orders.filter((o) =>
    proceedings.some((p) => p.id === o.proceedingId),
  );
  const payments = data.payments.filter((p) =>
    orders.some((o) => o.id === p.orderId),
  );
  const ledger = buildLedger(orders, payments, asOf);
  const overdue = ledger
    .filter((r) => r.dueDate < asOf)
    .reduce((sum, r) => sum + r.outstanding, 0);
  const received = payments
    .filter((p) => p.status === "RECEIVED")
    .reduce((sum, p) => sum + p.amount, 0);
  const hearings = data.hearings
    .filter((h) => cases.some((c) => c.id === h.caseId) && h.date >= asOf)
    .sort((a, b) => a.date.localeCompare(b.date));
  const documents = data.documents.filter((d) =>
    cases.some((c) => c.id === d.caseId),
  );
  const open = (kind: DialogKind) => {
    setEditSource(undefined);
    setDialog(kind);
  };
  const exportSummary = () =>
    downloadJson("alimony-plus-case-summary.json", {
      schemaVersion: "1.0",
      synthetic: demo,
      asOf,
      cases,
      proceedings,
      orders,
      payments,
      ledger: demo ? ledger : null,
      limitations: demo
        ? ["Synthetic demonstration data; not a legal record."]
        : [
            "Payment schedules and hearing data are not available from the current backend.",
          ],
      documents: documents.map(({ file: _file, ...d }) => d),
    });
  const safeExit = () => {
    document.body.style.visibility = "hidden";
    if (!demo)
      void fetch("/api/backend/auth/logout", {
        method: "POST",
        keepalive: true,
      });
    window.location.replace("https://www.google.com");
  };
  if (section === "login") return <LoginView />;
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      {menuOpen && (
        <button
          className="mobile-scrim"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside
        ref={sidebarRef}
        className={`sidebar ${menuOpen ? "is-open" : ""}`}
        aria-label="Main navigation"
      >
        <button
          className="icon-button mobile-nav-close"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        >
          <X size={18} />
        </button>
        <Link href="/dashboard" className="brand">
          <span className="brand-mark">
            a<span>+</span>
          </span>
          <span>
            alimony<span className="brand-plus">plus</span>
            <small>CLARITY. CONFIDENCE. CARE.</small>
          </span>
        </Link>
        <div className="workspace-label">
          <span className="workspace-avatar">
            <Leaf size={16} />
          </span>
          <div>
            My workspace
            <small>{demo ? "Personal · Demo" : "Personal · Connected"}</small>
          </div>
          <ChevronDown size={14} />
        </div>
        <p className="nav-caption">YOUR JOURNEY</p>
        <nav>
          {nav.map((item) => (
            <Link
              key={item.id}
              href={`/${item.id}`}
              className={`nav-link ${section === item.id ? "active" : ""}`}
              aria-current={section === item.id ? "page" : undefined}
            >
              <item.icon size={19} strokeWidth={1.7} />
              {item.title}
              {item.id === "cases" && (
                <span className="nav-count">{data.cases.length}</span>
              )}
            </Link>
          ))}
        </nav>
        <p className="nav-caption second">RESOURCES</p>
        <nav>
          <Link
            href="/data-review"
            className={`nav-link ${section === "data-review" ? "active" : ""}`}
            aria-current={section === "data-review" ? "page" : undefined}
          >
            <Database size={18} />
            Data workspace
          </Link>
          <Link
            href="/help"
            className={`nav-link ${section === "help" ? "active" : ""}`}
            aria-current={section === "help" ? "page" : undefined}
          >
            <CircleHelp size={18} />
            Help & legal aid
          </Link>
        </nav>
        <div className="sidebar-bottom">
          <div className="support-note">
            <span className="small-emblem">
              <Leaf size={20} />
            </span>
            <h3>
              You don’t have to
              <br />
              figure it out alone.
            </h3>
            <p>
              Find the right support for
              <br />
              your next step.
            </p>
            <Link href="/help">
              Explore legal aid <ArrowUpRight size={15} />
            </Link>
          </div>
          <Link
            href="/settings"
            className={`nav-link ${section === "settings" ? "active" : ""}`}
          >
            <Settings size={18} />
            Settings & privacy
          </Link>
          <button
            className="profile"
            onClick={() => router.push(demo ? "/login" : "/settings")}
          >
            <span className="avatar">{name.slice(0, 1).toUpperCase()}</span>
            <span>
              {demo ? "Meera Sharma" : name}
              <small>{demo ? "Demo account" : "Personal account"}</small>
            </span>
            <ChevronRight size={16} />
          </button>
        </div>
      </aside>
      <div className="main-shell" inert={menuOpen}>
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={21} />
            </button>
            <span>My workspace</span>
            <ChevronRight size={13} />
            <strong>{pageTitles[section]}</strong>
          </div>
          <div className="topbar-actions">
            <span className="privacy-label">
              <ShieldCheck size={15} />
              {demo ? "Synthetic demo" : "Private workspace"}
            </span>
            <button className="button exit-button" onClick={safeExit}>
              <LogOut size={15} />
              Quick exit
            </button>
          </div>
        </header>
        <div className="mode-banner">
          <span>
            <span className="live-dot" />
            {demo ? (
              <>
                Demo workspace <span className="banner-separator">/</span>{" "}
                Synthetic records · As of 9 Oct 2026 · Changes clear on refresh
              </>
            ) : (
              <>
                Connected workspace <span className="banner-separator">/</span>{" "}
                Records from your case service
              </>
            )}
          </span>
          {demo ? (
            <Link href="/login">
              Connect your account <ArrowRight size={13} />
            </Link>
          ) : (
            <button
              onClick={() =>
                void store.logout().catch((e) => setNotice(e.message))
              }
            >
              Sign out <LogOut size={13} />
            </button>
          )}
        </div>
        <main id="main-content" className="main-content">
          {store.error && (
            <div
              className="callout warning flex items-center justify-between gap-4"
              role="alert"
            >
              <span>{store.error}</span>
              <button
                className="button secondary"
                onClick={() => void store.refresh()}
              >
                Retry
              </button>
            </div>
          )}
          {store.loading && (
            <div role="status" className="loading-strip">
              Loading your case records…
            </div>
          )}
          {section === "dashboard" && (
            <>
              <PageHeading
                eyebrow="A LITTLE CLARITY, EVERY DAY"
                title={`Good morning, ${name.split(" ")[0]}.`}
                description="Your journey, a little more organised. Here’s where things stand."
              >
                <button className="button secondary" onClick={exportSummary}>
                  <Download size={16} />
                  Export summary
                </button>
                <button className="button primary" onClick={() => open("case")}>
                  <Plus size={17} />
                  New case
                </button>
              </PageHeading>
              <div className="overview-toolbar">
                <div className="tab-label">
                  <span />
                  Your overview
                </div>
                <CaseSelector
                  selected={selectedCase}
                  setSelected={setSelectedCase}
                />
              </div>
              <div className="stats-grid">
                <Stat
                  label="Active cases"
                  value={String(
                    cases.filter((c) => c.status === "ACTIVE").length,
                  ).padStart(2, "0")}
                  detail="A clearer view of your progress"
                  icon={<FolderHeart size={20} />}
                />
                <Stat
                  label="Maintenance received"
                  value={money(received)}
                  detail={
                    demo
                      ? "Across recorded demo periods"
                      : "Across recorded payments"
                  }
                  icon={<Wallet size={20} />}
                />
                <Stat
                  label="Outstanding balance"
                  value={demo ? money(overdue) : "—"}
                  detail={
                    demo
                      ? `${ledger.filter((r) => r.dueDate < asOf && r.outstanding > 0).length} periods need your attention`
                      : "Payment schedule not available"
                  }
                  icon={<CircleAlert size={20} />}
                  warn={overdue > 0}
                />
                <Stat
                  label="Next hearing"
                  value={
                    hearings[0]
                      ? dateLabel(hearings[0].date).replace(" 2026", "")
                      : "Not scheduled"
                  }
                  detail={
                    hearings[0]
                      ? "Your next step is on the calendar"
                      : demo
                        ? "Add an event to stay organised"
                        : "Not yet available from the service"
                  }
                  icon={<CalendarDays size={20} />}
                />
              </div>
              <div className="dashboard-middle">
                <section className="panel chart-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Maintenance at a glance</h2>
                      <p>Every payment. A little more peace of mind.</p>
                    </div>
                    <span className="period-label">
                      {demo ? "Jun – Oct 2026" : "Recorded history"}
                    </span>
                  </div>
                  {demo && ledger.length ? (
                    <PaymentChart ledger={ledger} />
                  ) : (
                    <Empty title="Your payment picture starts here">
                      {demo
                        ? "Add an order with a schedule to see expected and received payments."
                        : "Monthly charts need payment schedules and period allocations from the backend."}
                    </Empty>
                  )}
                  <div className="chart-footer">
                    <span>
                      <span className="legend-dot received" />
                      Received <span className="legend-dot expected" />
                      Expected
                    </span>
                    <Link href="/payments" className="text-link">
                      View payment history <ArrowRight size={15} />
                    </Link>
                  </div>
                </section>
                <section className="next-step-card">
                  <div className="next-step-top">
                    <span>
                      <span className="pulse-dot" /> YOUR NEXT STEP
                    </span>
                    <CalendarDays size={19} />
                  </div>
                  <p className="next-step-date">
                    {hearings[0]
                      ? dateLabel(hearings[0].date)
                      : "One step at a time"}
                  </p>
                  <h2>{hearings[0]?.title || "Prepare your case record"}</h2>
                  <p>
                    {hearings[0]?.location ||
                      "Organise your details and documents in one place before your next conversation."}
                  </p>
                  <div className="next-step-divider" />
                  <span className="next-step-hint">
                    <FileText size={16} /> Keep your documents ready
                  </span>
                  <Link
                    href={hearings[0] ? "/cases" : "/documents"}
                    className="button light"
                  >
                    {hearings[0] ? "View case details" : "Prepare documents"}
                    <ArrowUpRight size={17} />
                  </Link>
                  <div className="decorative-ring" aria-hidden="true" />
                </section>
              </div>
              <div className="dashboard-bottom">
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Your cases</h2>
                      <p>Small steps. Meaningful progress.</p>
                    </div>
                    <Link href="/cases" className="text-link">
                      View all <ArrowRight size={15} />
                    </Link>
                  </div>
                  {cases.length ? (
                    cases.slice(0, 3).map((c) => (
                      <button
                        key={c.id}
                        className="case-preview"
                        onClick={() => {
                          setSelectedCase(c.id);
                          router.push("/cases");
                        }}
                      >
                        <span className="case-icon">
                          <FolderHeart size={23} strokeWidth={1.5} />
                        </span>
                        <span className="case-preview-text">
                          <strong>{c.title}</strong>
                          <small>
                            {data.proceedings.find((p) => p.caseId === c.id)
                              ?.courtName || "Proceeding not yet added"}
                          </small>
                          <span className="case-meta">
                            Opened {dateLabel(c.createdAt)}
                            <span>·</span>
                            {
                              data.proceedings.filter((p) => p.caseId === c.id)
                                .length
                            }{" "}
                            proceeding(s)
                          </span>
                        </span>
                        <Badge>
                          {c.status === "ACTIVE" ? "Active" : c.status}
                        </Badge>
                        <ChevronRight size={17} />
                      </button>
                    ))
                  ) : (
                    <Empty
                      title="Your first step starts here"
                      action={
                        <button
                          className="button primary"
                          onClick={() => open("case")}
                        >
                          Create a case
                        </button>
                      }
                    >
                      Add a case to start organising your journey.
                    </Empty>
                  )}
                </section>
                <section className="panel activity-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Recent activity</h2>
                      <p>A record of the steps you’ve taken.</p>
                    </div>
                    <Clock3 size={17} className="muted" />
                  </div>
                  {payments.length ? (
                    <div className="activity-list">
                      {[...payments]
                        .sort((a, b) =>
                          b.paymentDate.localeCompare(a.paymentDate),
                        )
                        .slice(0, 3)
                        .map((p) => (
                          <div className="activity-item" key={p.id}>
                            <span className="activity-dot">
                              <Check size={12} />
                            </span>
                            <div>
                              <strong>
                                {p.status === "RECEIVED"
                                  ? "Payment received"
                                  : `Payment ${p.status.toLowerCase()}`}
                              </strong>
                              <p>
                                {money(p.amount)} · Order #{p.orderId}
                              </p>
                              <small>{dateLabel(p.paymentDate)}</small>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <Empty title="A fresh start">
                      Your recorded payments will appear here.
                    </Empty>
                  )}
                </section>
              </div>
              <div className="gentle-note">
                <Leaf size={17} />
                <span>
                  Progress doesn’t have to happen all at once. You’re taking the
                  next step.
                </span>
                <Link href="/help">
                  We’re here to help <ArrowUpRight size={14} />
                </Link>
              </div>
            </>
          )}
          {section === "cases" && (
            <>
              <PageHeading
                eyebrow="YOUR JOURNEY"
                title="Every case. One clear view."
                description="Keep proceedings, important dates and your next steps together."
              >
                <button
                  className="button secondary"
                  onClick={() => open("proceeding")}
                >
                  <Plus size={16} />
                  Add proceeding
                </button>
                <button className="button primary" onClick={() => open("case")}>
                  <Plus size={16} />
                  New case
                </button>
              </PageHeading>
              <ListToolbar
                search={search}
                setSearch={setSearch}
                placeholder="Search cases"
                selected={selectedCase}
                setSelected={setSelectedCase}
              />
              <div className="case-grid">
                {cases
                  .filter((c) =>
                    c.title.toLowerCase().includes(search.toLowerCase()),
                  )
                  .map((c) => {
                    const ps = data.proceedings.filter(
                      (p) => p.caseId === c.id,
                    );
                    return (
                      <section className="panel case-detail" key={c.id}>
                        <div className="flex items-center justify-between">
                          <span className="case-icon">
                            <FolderHeart size={24} />
                          </span>
                          <Badge>
                            {c.status === "ACTIVE" ? "Active" : c.status}
                          </Badge>
                        </div>
                        <h2>{c.title}</h2>
                        <p className="muted">
                          Opened {dateLabel(c.createdAt)} · Case #{c.id}
                        </p>
                        <div className="case-section">
                          <p className="eyebrow">PROCEEDINGS</p>
                          {ps.length ? (
                            ps.map((p) => (
                              <div className="proceeding" key={p.id}>
                                <Scale size={17} />
                                <div>
                                  <strong>
                                    {p.proceedingType || "Proceeding"}
                                  </strong>
                                  <p>{p.courtName}</p>
                                  <small>
                                    {p.caseNumber || "No case number recorded"}{" "}
                                    · Filed {dateLabel(p.filedAt)}
                                  </small>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="muted">No proceeding recorded yet.</p>
                          )}
                          {ps.length > 1 && (
                            <p className="callout warning">
                              Multiple proceedings recorded. Ask your legal
                              professional to review any overlap between orders.
                            </p>
                          )}
                        </div>
                        <div className="case-section">
                          <p className="eyebrow">CASE TIMELINE</p>
                          <div className="timeline-row">
                            <span className="timeline-dot" />
                            <div>
                              <strong>Case record created</strong>
                              <small>{dateLabel(c.createdAt)}</small>
                            </div>
                          </div>
                          {ps.map((p) => (
                            <div className="timeline-row" key={p.id}>
                              <span className="timeline-dot" />
                              <div>
                                <strong>Proceeding recorded</strong>
                                <small>{dateLabel(p.filedAt)}</small>
                              </div>
                            </div>
                          ))}
                          {data.orders
                            .filter((o) =>
                              ps.some((p) => p.id === o.proceedingId),
                            )
                            .map((o) => (
                              <div className="timeline-row" key={o.id}>
                                <span className="timeline-dot" />
                                <div>
                                  <strong>
                                    {o.orderType || "Court order"} ·{" "}
                                    {money(o.amount)}
                                  </strong>
                                  <small>{dateLabel(o.orderDate)}</small>
                                </div>
                              </div>
                            ))}
                          {data.hearings
                            .filter((h) => h.caseId === c.id)
                            .map((h) => (
                              <div className="timeline-row upcoming" key={h.id}>
                                <span className="timeline-dot" />
                                <div>
                                  <strong>{h.title}</strong>
                                  <small>
                                    {dateLabel(h.date)} · {h.location}
                                  </small>
                                </div>
                              </div>
                            ))}
                        </div>
                        <div className="case-actions">
                          <button
                            className="text-link"
                            onClick={() => {
                              setSelectedCase(c.id);
                              router.push("/orders");
                            }}
                          >
                            View orders <ArrowRight size={15} />
                          </button>
                          {demo && (
                            <button
                              className="button secondary compact"
                              onClick={() => {
                                setSelectedCase(c.id);
                                open("hearing");
                              }}
                            >
                              <CalendarDays size={14} />
                              Add event
                            </button>
                          )}
                        </div>
                      </section>
                    );
                  })}
              </div>
              {!cases.filter((c) =>
                c.title.toLowerCase().includes(search.toLowerCase()),
              ).length && (
                <Empty title="No matching cases">
                  Try a different search or create a new case.
                </Empty>
              )}
              {!demo && (
                <p className="callout mt-6">
                  Hearing dates and reminders will appear here when the case
                  service supports them.
                </p>
              )}
            </>
          )}
          {section === "orders" && (
            <>
              <PageHeading
                eyebrow="COURT RECORDS"
                title="Your orders, organised."
                description="Keep a clear record of what was ordered and when."
              >
                <button
                  className="button primary"
                  onClick={() => open("order")}
                >
                  <Plus size={16} />
                  Record order
                </button>
              </PageHeading>
              <ListToolbar
                search={search}
                setSearch={setSearch}
                placeholder="Search order type or notes"
                selected={selectedCase}
                setSelected={setSelectedCase}
              />
              <div className="order-grid">
                {orders
                  .filter((o) =>
                    `${o.orderType} ${o.description}`
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                  )
                  .map((o) => (
                    <section className="panel order-card" key={o.id}>
                      <div className="flex justify-between items-center">
                        <span className="case-icon">
                          <Scale size={24} />
                        </span>
                        <span className="overline">ORDER #{o.id}</span>
                      </div>
                      <h2>{o.orderType || "Court order"}</h2>
                      <p className="muted">
                        {
                          proceedings.find((p) => p.id === o.proceedingId)
                            ?.courtName
                        }
                      </p>
                      <div className="order-amount">
                        {money(o.amount)}
                        <span>
                          {o.effectiveDate ? "/ month" : "ordered amount"}
                        </span>
                      </div>
                      <dl className="detail-list">
                        <div>
                          <dt>Order date</dt>
                          <dd>{dateLabel(o.orderDate)}</dd>
                        </div>
                        <div>
                          <dt>Effective from</dt>
                          <dd>{dateLabel(o.effectiveDate)}</dd>
                        </div>
                        <div>
                          <dt>Payment due</dt>
                          <dd>
                            {o.dueDay
                              ? `Day ${o.dueDay} of each month`
                              : "Schedule not available"}
                          </dd>
                        </div>
                      </dl>
                      <p className="order-note">
                        {o.description || "No additional notes recorded."}
                      </p>
                      <Link href="/payments" className="text-link">
                        View maintenance records <ArrowRight size={15} />
                      </Link>
                    </section>
                  ))}
              </div>
              {!orders.length && (
                <Empty
                  title="No court orders yet"
                  action={
                    <button
                      className="button primary"
                      onClick={() => open("order")}
                    >
                      Record an order
                    </button>
                  }
                >
                  Add a proceeding first, then record the details from your
                  order.
                </Empty>
              )}
            </>
          )}
          {section === "payments" && (
            <>
              <PageHeading
                eyebrow="MAINTENANCE TRACKER"
                title="A clearer picture of your support."
                description="Record payments, understand what’s outstanding, and prepare your next step."
              >
                <button className="button secondary" onClick={exportSummary}>
                  <Download size={16} />
                  Export ledger
                </button>
                <button
                  className="button primary"
                  onClick={() => open("payment")}
                >
                  <Plus size={16} />
                  Log payment
                </button>
              </PageHeading>
              <div className="stats-grid three">
                <Stat
                  label="Recorded receipts"
                  value={money(received)}
                  detail="Payments marked received"
                  icon={<Wallet size={20} />}
                />
                <Stat
                  label="Overdue balance"
                  value={demo ? money(overdue) : "Unavailable"}
                  detail={
                    demo
                      ? `Through ${dateLabel(asOf)}`
                      : "Requires a verified payment schedule"
                  }
                  icon={<CircleAlert size={20} />}
                  warn={overdue > 0}
                />
                <Stat
                  label="Court orders"
                  value={String(orders.length).padStart(2, "0")}
                  detail="In the selected case view"
                  icon={<Scale size={20} />}
                />
              </div>
              {overdue > 0 && (
                <div className="arrears-banner">
                  <span className="warning-symbol">
                    <CircleAlert size={21} />
                  </span>
                  <div>
                    <strong>
                      {money(overdue)} is outstanding across overdue periods.
                    </strong>
                    <p>
                      Keep your payment evidence together and discuss the next
                      step with your lawyer or legal-aid provider.
                    </p>
                  </div>
                  <Link href="/help" className="button secondary compact">
                    Find support <ArrowUpRight size={15} />
                  </Link>
                </div>
              )}
              <div className="table-toolbar">
                <div className="filter-tabs">
                  {["All", "Overdue", "Partially paid", "Paid", "Upcoming"].map(
                    (f) => (
                      <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={filter === f ? "selected" : ""}
                      >
                        {f}
                      </button>
                    ),
                  )}
                </div>
                <CaseSelector
                  selected={selectedCase}
                  setSelected={setSelectedCase}
                />
              </div>
              <section className="panel table-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Monthly ledger</h2>
                    <p>
                      {demo
                        ? "Monthly obligations compared with explicitly allocated receipts."
                        : "Schedules and period allocations are not yet available."}
                    </p>
                  </div>
                  <span className="overline">INR (₹)</span>
                </div>
                {demo ? (
                  <LedgerTable
                    rows={ledger.filter(
                      (r) => filter === "All" || r.status === filter,
                    )}
                  />
                ) : (
                  <Empty title="Monthly reconciliation is not available yet">
                    You can record and view individual payments below. Missing
                    payment records are not treated as confirmed arrears.
                  </Empty>
                )}
              </section>
              <section className="panel table-panel mt-6">
                <div className="panel-heading">
                  <div>
                    <h2>Payment history</h2>
                    <p>Your individual payment records and references.</p>
                  </div>
                </div>
                {payments.length ? (
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Received on</th>
                          <th>Order</th>
                          <th>Reference</th>
                          <th>Amount</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...payments]
                          .sort((a, b) =>
                            b.paymentDate.localeCompare(a.paymentDate),
                          )
                          .map((p) => (
                            <tr key={p.id}>
                              <td>{dateLabel(p.paymentDate)}</td>
                              <td>#{p.orderId}</td>
                              <td>{p.reference || "Not recorded"}</td>
                              <td className="numeric strong">
                                {money(p.amount)}
                              </td>
                              <td>
                                <Badge
                                  tone={p.status === "RECEIVED" ? "" : "amber"}
                                >
                                  {p.status.toLowerCase()}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty title="No payments recorded">
                    Use “Log payment” when you receive a payment.
                  </Empty>
                )}
              </section>
            </>
          )}
          {section === "documents" && (
            <>
              <PageHeading
                eyebrow="DOCUMENT READINESS"
                title="Prepared, one document at a time."
                description="Organise your evidence and keep the original records close at hand."
              >
                <button
                  className="button primary"
                  onClick={() => open("document")}
                >
                  <Plus size={16} />
                  Add document
                </button>
              </PageHeading>
              <div className="document-layout">
                <section className="panel table-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Your documents</h2>
                      <p>
                        {demo
                          ? "Illustrative records. Add a synthetic file to try the workflow."
                          : "Files uploaded in this session. The service has no document-list endpoint yet."}
                      </p>
                    </div>
                    <CaseSelector
                      selected={selectedCase}
                      setSelected={setSelectedCase}
                    />
                  </div>
                  {documents.length ? (
                    documents.map((doc) => (
                      <div className="document-row" key={doc.id}>
                        <span className="file-icon">
                          <FileText size={23} strokeWidth={1.5} />
                        </span>
                        <div>
                          <strong>{doc.originalName}</strong>
                          <small>
                            {doc.documentType} ·{" "}
                            {Math.ceil(doc.fileSize / 1024)} KB ·{" "}
                            {dateLabel(doc.createdAt)}
                          </small>
                        </div>
                        <button
                          className="icon-button"
                          disabled={demo && !doc.file}
                          aria-label={`Download ${doc.originalName}`}
                          title={
                            demo && !doc.file
                              ? "Illustrative record; no file attached"
                              : "Download document"
                          }
                          onClick={() => {
                            if (doc.file) {
                              const url = URL.createObjectURL(doc.file);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = doc.originalName;
                              a.click();
                              setTimeout(() => URL.revokeObjectURL(url), 1000);
                            } else
                              window.location.assign(
                                `/api/backend/documents/${doc.id}/download`,
                              );
                          }}
                        >
                          <Download size={17} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <Empty title="No documents in this view">
                      Add relevant records when you’re ready.
                    </Empty>
                  )}
                  <div className="panel-footnote">
                    <ShieldCheck size={15} />
                    {demo
                      ? "Demo files stay in memory and clear on refresh."
                      : "Downloads require your authenticated session."}
                  </div>
                </section>
                <section className="panel readiness-panel">
                  <span className="small-emblem">
                    <Files size={21} />
                  </span>
                  <h2>
                    A little preparation
                    <br />
                    goes a long way.
                  </h2>
                  <p className="muted">
                    A starting checklist to discuss with your legal
                    professional.
                  </p>
                  {[
                    "Identity / relationship",
                    "Financial record",
                    "Court order",
                    "Payment proof",
                  ].map((category) => {
                    const done = documents.some(
                      (d) => d.documentType === category,
                    );
                    return (
                      <div className="checklist-item" key={category}>
                        <span
                          className={
                            done ? "check-circle done" : "check-circle"
                          }
                        >
                          {done && <Check size={12} />}
                        </span>
                        <div>
                          <strong>{category}</strong>
                          <small>
                            {done
                              ? "Record added · not verified"
                              : "Add if relevant and available"}
                          </small>
                        </div>
                      </div>
                    );
                  })}
                  <p className="small muted mt-5">
                    Missing information is okay. Only provide what is needed and
                    available.
                  </p>
                </section>
              </div>
            </>
          )}
          {section === "calculator" && <CalculatorView />}
          {section === "data-review" && (
            <DataReviewView
              onAdd={() => open("source")}
              onEdit={(source) => {
                setEditSource(source);
                setDialog("source");
              }}
            />
          )}
          {section === "help" && <HelpView />}
          {section === "settings" && <SettingsView />}
          <footer className="footer">
            <span className="flex items-center gap-2">
              <span className="mini-brand">a+</span>A little clarity. A little
              confidence.
            </span>
            <span>
              Information & organisation tools · A qualified professional guides
              legal decisions.
            </span>
          </footer>
        </main>
      </div>
      {notice && (
        <div className="toast" role="status">
          <Check size={18} />
          <span>{notice}</span>
          <button
            className="icon-button"
            onClick={() => setNotice("")}
            aria-label="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>
      )}
      {dialog && (
        <RecordDialog
          kind={dialog}
          source={editSource}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
function CaseSelector({
  selected,
  setSelected,
}: {
  selected: number;
  setSelected: (id: number) => void;
}) {
  const { data } = useWorkspace();
  return (
    <label className="case-selector">
      <FolderHeart size={15} />
      <select
        aria-label="Filter by case"
        value={selected}
        onChange={(e) => setSelected(Number(e.target.value))}
      >
        <option value={0}>All cases</option>
        {data.cases.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title}
          </option>
        ))}
      </select>
    </label>
  );
}
function ListToolbar({
  search,
  setSearch,
  placeholder,
  selected,
  setSelected,
}: {
  search: string;
  setSearch: (s: string) => void;
  placeholder: string;
  selected: number;
  setSelected: (id: number) => void;
}) {
  return (
    <div className="list-toolbar">
      <label className="search-input">
        <Search size={17} />
        <input
          aria-label={placeholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={placeholder}
        />
      </label>
      <CaseSelector selected={selected} setSelected={setSelected} />
    </div>
  );
}
function Stat({
  label,
  value,
  detail,
  icon,
  warn,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  warn?: boolean;
}) {
  return (
    <section className={`stat-card ${warn ? "stat-warning" : ""}`}>
      <div className="stat-top">
        <span>{label}</span>
        <span className="stat-icon">{icon}</span>
      </div>
      <p className="stat-value">{value}</p>
      <p className="stat-detail">
        {warn && <span className="tiny-dot" />}
        {detail}
      </p>
    </section>
  );
}
function PaymentChart({ ledger }: { ledger: LedgerRow[] }) {
  const periods = [...new Set(ledger.map((r) => r.period))].sort().slice(-5);
  const totals = periods.map((period) => ({
    period,
    expected: ledger
      .filter((r) => r.period === period)
      .reduce((s, r) => s + r.expected, 0),
    received: ledger
      .filter((r) => r.period === period)
      .reduce((s, r) => s + r.received, 0),
  }));
  const max =
    Math.max(...totals.flatMap((t) => [t.expected, t.received]), 1) * 1.15;
  return (
    <div
      className="payment-chart"
      role="img"
      aria-label={`Monthly payments in INR: ${totals.map((t) => `${t.period}, expected ${t.expected}, received ${t.received}`).join("; ")}`}
    >
      <div className="chart-y">
        <span>{money(max).replace(".00", "")}</span>
        <span>{money(max / 2)}</span>
        <span>₹0</span>
      </div>
      <div className="plot">
        <div className="grid-line top" />
        <div className="grid-line middle" />
        <div className="grid-line bottom" />
        {totals.map((t) => (
          <div className="chart-column" key={t.period}>
            <div className="bars">
              <div
                className="bar expected-bar"
                style={{ height: `${(t.expected / max) * 100}%` }}
                title={`Expected ${money(t.expected)}`}
              />
              <div
                className="bar received-bar"
                style={{ height: `${(t.received / max) * 100}%` }}
                title={`Received ${money(t.received)}`}
              />
            </div>
            <span className="chart-x">
              {new Date(`${t.period}-01T12:00:00Z`).toLocaleDateString(
                "en-IN",
                { month: "short", timeZone: "UTC" },
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
function LedgerTable({ rows }: { rows: LedgerRow[] }) {
  return rows.length ? (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Period / order</th>
            <th>Due date</th>
            <th>Expected</th>
            <th>Received</th>
            <th>Outstanding</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.orderId}-${r.period}`}>
              <td className="strong">
                {new Date(`${r.period}-01T12:00:00Z`).toLocaleDateString(
                  "en-IN",
                  { month: "long", year: "numeric", timeZone: "UTC" },
                )}
                <small>Order #{r.orderId}</small>
              </td>
              <td>{dateLabel(r.dueDate)}</td>
              <td className="numeric">{money(r.expected)}</td>
              <td className="numeric">
                {money(r.received)}
                {r.credit > 0 && <small>Credit: {money(r.credit)}</small>}
              </td>
              <td
                className={`numeric strong ${r.outstanding && r.status !== "Upcoming" ? "text-amber" : ""}`}
              >
                {money(r.outstanding)}
              </td>
              <td>
                <Badge
                  tone={
                    r.status === "Paid"
                      ? ""
                      : r.status === "Upcoming"
                        ? "neutral"
                        : "amber"
                  }
                >
                  {r.status}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <Empty title="No periods in this view">
      Try a different status or add an order with a payment schedule.
    </Empty>
  );
}
