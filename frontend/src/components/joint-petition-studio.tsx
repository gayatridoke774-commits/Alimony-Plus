
"use client";

import { useState } from "react";
import { PageHeading } from "@/components/ui";

export function JointPetitionStudio() {
  const [marriageDate, setMarriageDate] = useState("");
  const [separationDate, setSeparationDate] = useState("");
  const [firstMotionDate, setFirstMotionDate] = useState("");
  const [petitionerOne, setPetitionerOne] = useState("");
  const [petitionerTwo, setPetitionerTwo] = useState("");
  const [settlementConfirmed, setSettlementConfirmed] = useState(false);
  const [approvalOne, setApprovalOne] = useState(false);
  const [approvalTwo, setApprovalTwo] = useState(false);

  const missing: string[] = [];

  if (!petitionerOne.trim()) missing.push("Petitioner one's name");
  if (!petitionerTwo.trim()) missing.push("Petitioner two's name");
  if (!marriageDate) missing.push("Date of marriage");
  if (!separationDate) missing.push("Date of separation");
  if (!firstMotionDate) missing.push("First-motion date");
  if (!settlementConfirmed) missing.push("Settlement confirmation");
  if (!approvalOne) missing.push("Petitioner one's review");
  if (!approvalTwo) missing.push("Petitioner two's review");

  const readyForReview = missing.length === 0;

  return (
    <div className="cooling-view">
      <PageHeading
        eyebrow="SECTION 13B"
        title="Joint-petition verification studio"
        description="Review shared petition details and track each party's independent confirmation."
      />

      <section className="panel waiver-panel">
        <h2>Marriage and petition details</h2>

        <div className="cooling-fields">
          <label className="field">
            Petitioner one
            <input
              value={petitionerOne}
              onChange={(event) => setPetitionerOne(event.target.value)}
              placeholder="Enter first petitioner's name"
            />
          </label>

          <label className="field">
            Petitioner two
            <input
              value={petitionerTwo}
              onChange={(event) => setPetitionerTwo(event.target.value)}
              placeholder="Enter second petitioner's name"
            />
          </label>

          <label className="field">
            Date of marriage
            <input
              type="date"
              value={marriageDate}
              onChange={(event) => setMarriageDate(event.target.value)}
            />
          </label>

          <label className="field">
            Date of separation
            <input
              type="date"
              value={separationDate}
              onChange={(event) => setSeparationDate(event.target.value)}
            />
          </label>

          <label className="field">
            First-motion date
            <input
              type="date"
              value={firstMotionDate}
              onChange={(event) => setFirstMotionDate(event.target.value)}
            />
          </label>
        </div>
      </section>

      <div className="petition-split">
        <section className="panel waiver-panel">
          <h2>Petitioner one's review</h2>
          <p>Review the displayed details before recording confirmation.</p>

          <label className="waiver-check">
            <input
              type="checkbox"
              checked={approvalOne}
              onChange={(event) => setApprovalOne(event.target.checked)}
            />
            <span>
              Petitioner one confirms that they have reviewed the details.
            </span>
          </label>

          <p className="petition-status">
            Status: {approvalOne ? "Review recorded" : "Awaiting review"}
          </p>
        </section>

        <section className="panel waiver-panel">
          <h2>Petitioner two's review</h2>
          <p>Review the displayed details before recording confirmation.</p>

          <label className="waiver-check">
            <input
              type="checkbox"
              checked={approvalTwo}
              onChange={(event) => setApprovalTwo(event.target.checked)}
            />
            <span>
              Petitioner two confirms that they have reviewed the details.
            </span>
          </label>

          <p className="petition-status">
            Status: {approvalTwo ? "Review recorded" : "Awaiting review"}
          </p>
        </section>
      </div>

      <section className="panel waiver-panel">
        <h2>Settlement confirmation</h2>

        <label className="waiver-check">
          <input
            type="checkbox"
            checked={settlementConfirmed}
            onChange={(event) =>
              setSettlementConfirmed(event.target.checked)
            }
          />
          <span>
            The parties indicate that settlement terms have been reviewed
            and are ready for their legal representative to verify.
          </span>
        </label>
      </section>

      <section className="panel waiver-panel">
        <h2>Verification summary</h2>

        <p className="petition-status">
          {readyForReview
            ? "All prototype checks are complete — ready for legal review."
            : `${missing.length} item(s) still need attention.`}
        </p>

        {missing.length > 0 && (
          <ul>
            {missing.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}

        <h3>Petition preview</h3>
        <div className="petition-preview">
          <p>
            <strong>Petitioner one:</strong>{" "}
            {petitionerOne || "Not provided"}
          </p>
          <p>
            <strong>Petitioner two:</strong>{" "}
            {petitionerTwo || "Not provided"}
          </p>
          <p>
            <strong>Date of marriage:</strong>{" "}
            {marriageDate || "Not provided"}
          </p>
          <p>
            <strong>Date of separation:</strong>{" "}
            {separationDate || "Not provided"}
          </p>
          <p>
            <strong>First-motion date:</strong>{" "}
            {firstMotionDate || "Not provided"}
          </p>
          <p>
            <strong>Petitioner one review:</strong>{" "}
            {approvalOne ? "Confirmed in prototype" : "Pending"}
          </p>
          <p>
            <strong>Petitioner two review:</strong>{" "}
            {approvalTwo ? "Confirmed in prototype" : "Pending"}
          </p>
          <p>
            <strong>Settlement review:</strong>{" "}
            {settlementConfirmed ? "Confirmed in prototype" : "Pending"}
          </p>
        </div>

        <p className="waiver-notice">
          This is a UI prototype, not a legal filing system. Checkbox
          confirmations are not authenticated signatures or proof of
          independent consent. A qualified legal professional must review
          the information before any filing.
        </p>
      </section>
    </div>
  );
}
