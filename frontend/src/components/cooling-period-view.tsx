"use client";

import { useState } from "react";
import { CalendarDays, Clock3, ShieldCheck } from "lucide-react";
import { PageHeading } from "./ui";
import {
  calendarDaysBetween,
  getCoolingPeriodProgress,
} from "@/lib/cooling-period";

function localDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function displayDate(date: Date) {
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function CoolingPeriodView() {
  const [firstMotionDate, setFirstMotionDate] = useState("");
  const [asOfDate, setAsOfDate] = useState(
    localDateString(new Date()),
  );

  const start = firstMotionDate
    ? new Date(`${firstMotionDate}T00:00:00`)
    : null;
  const asOf = new Date(`${asOfDate}T00:00:00`);

  const validDates =
    start !== null &&
    !Number.isNaN(start.getTime()) &&
    !Number.isNaN(asOf.getTime()) &&
    asOf >= start;

  const progress = validDates && start
    ? getCoolingPeriodProgress(start, asOf)
    : null;

  return (
    <div className="cooling-view">
      <PageHeading
        eyebrow="MUTUAL CONSENT DIVORCE · SECTION 13B"
        title="Cooling period tracker"
        description="Organise key dates and monitor the six-calendar-month milestone."
      />

      <section className="panel cooling-intro">
        <div className="cooling-icon">
          <CalendarDays size={24} />
        </div>
        <div>
          <h2>Track your timeline</h2>
          <p className="muted">
            Enter the first-motion date and the date you want to
            calculate progress through. The result is an organisational
            estimate, not a court decision.
          </p>
        </div>
      </section>

      <section className="panel cooling-panel">
        <div className="panel-heading">
          <div>
            <h2>Timeline details</h2>
            <p>Dates are calculated using calendar months, not a fixed 180 days.</p>
          </div>
        </div>

        <div className="cooling-fields">
          <div className="field">
            <label htmlFor="first-motion-date">First-motion date</label>
            <input
              id="first-motion-date"
              type="date"
              value={firstMotionDate}
              max={asOfDate}
              onChange={(event) => setFirstMotionDate(event.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="as-of-date">Calculate progress as of</label>
            <input
              id="as-of-date"
              type="date"
              value={asOfDate}
              min={firstMotionDate || undefined}
              onChange={(event) => setAsOfDate(event.target.value)}
            />
          </div>
        </div>

        {!firstMotionDate && (
          <p className="cooling-empty">
            Choose a first-motion date to calculate your timeline.
          </p>
        )}

        {firstMotionDate && !validDates && (
          <p className="cooling-error" role="alert">
            Please enter valid dates, with the calculation date on or
            after the first-motion date.
          </p>
        )}

        {progress && start && (
          <>
            <div className="cooling-milestone">
              <div>
                <span className="cooling-label">Six-month milestone</span>
                <h3>{displayDate(progress.milestoneDate)}</h3>
              </div>
              <span
                className={`badge ${
                  progress.milestoneReached ? "neutral" : "amber"
                }`}
              >
                {progress.milestoneReached
                  ? "Milestone reached"
                  : "Period in progress"}
              </span>
            </div>

            <div className="cooling-stats">
              <div className="stat-card">
                <span className="stat-top">Days elapsed</span>
                <strong className="stat-value">
                  {calendarDaysBetween(start, asOf)}
                </strong>
              </div>
              <div className="stat-card">
                <span className="stat-top">Days remaining</span>
                <strong className="stat-value">
                  {progress.remainingDays}
                </strong>
              </div>
              <div className="stat-card">
                <span className="stat-top">Calendar-day span</span>
                <strong className="stat-value">
                  {progress.totalDays}
                </strong>
              </div>
            </div>

            <div
              className="cooling-progress-track"
              role="progressbar"
              aria-label="Cooling period progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress.progressPercent)}
            >
              <div
                className="cooling-progress-fill"
                style={{ width: `${progress.progressPercent}%` }}
              />
            </div>
            <p className="muted cooling-progress-caption">
              {Math.round(progress.progressPercent)}% of the calculated
              calendar period elapsed
            </p>
          </>
        )}
      </section>

      <section className="panel cooling-legal-note">
        <ShieldCheck size={21} />
        <div>
          <h3>Legal information</h3>
          <p>
            Section 13B of the Hindu Marriage Act generally provides a
            six-month period between the first and second motions.
            Under <em>Amardeep Singh v. Harveen Kaur</em>, the Supreme
            Court recognised that a court may waive this period in
            appropriate cases, subject to judicial discretion and the
            applicable conditions. Reaching this date does not itself
            grant a divorce or guarantee a second-motion hearing.
          </p>
        </div>
      </section>

      <p className="cooling-disclaimer">
        For organisation only. Confirm applicable law, dates, and
        procedural requirements with a qualified legal professional.
      </p>
    </div>
  );
}