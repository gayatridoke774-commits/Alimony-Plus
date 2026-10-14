
"use client";

import { useState } from "react";
import { PageHeading } from "@/components/ui";

const considerations = [
  "The statutory period has caused or may cause unnecessary hardship.",
  "Mediation and reconciliation efforts have been unsuccessful.",
  "Both parties have freely consented to the divorce.",
  "Issues involving alimony, child custody, and other settlements have been resolved.",
  "The court has considered whether further waiting would serve any useful purpose.",
];

export function WaiverApplicationView() {
  const [caseNumber, setCaseNumber] = useState("");
  const [court, setCourt] = useState("");
  const [petitionerOne, setPetitionerOne] = useState("");
  const [petitionerTwo, setPetitionerTwo] = useState("");
  const [firstMotionDate, setFirstMotionDate] = useState("");
  const [reasons, setReasons] = useState("");
  const [checked, setChecked] = useState<boolean[]>(
    considerations.map(() => false),
  );

  const allChecked = checked.every(Boolean);

  const draft = `DRAFT — FOR LEGAL REVIEW

BEFORE: ${court || "[Name of court]"}

Case number: ${caseNumber || "[Case number]"}

Petitioner 1: ${petitionerOne || "[Name]"}
Petitioner 2: ${petitionerTwo || "[Name]"}

APPLICATION SEEKING WAIVER OF THE STATUTORY WAITING PERIOD
UNDER SECTION 13B(2) OF THE HINDU MARRIAGE ACT, 1955

First-motion date: ${firstMotionDate || "[Date]"}

The petitioners respectfully request that this application be
considered in light of the principles discussed in
Amardeep Singh v. Harveen Kaur (2017).

Reasons submitted for consideration:
${reasons || "[Add case-specific reasons]"}

The petitioners understand that waiver is not automatic.
The decision rests with the competent court after considering
the applicable law and circumstances of the case.

This draft requires review by a qualified legal professional.`;

  return (
    <div className="cooling-view">
      <PageHeading
        eyebrow="LEGAL WORKSPACE"
        title="Cooling-period waiver builder"
        description="Prepare a structured draft for legal review under Section 13B(2)."
        />

      <section className="panel waiver-panel">
        <h2>Case details</h2>

        <div className="cooling-fields">
          <label className="field">
            Court name
            <input
              value={court}
              onChange={(e) => setCourt(e.target.value)}
              placeholder="Enter court name"
            />
          </label>

          <label className="field">
            Case number
            <input
              value={caseNumber}
              onChange={(e) => setCaseNumber(e.target.value)}
              placeholder="Enter case number"
            />
          </label>

          <label className="field">
            First petitioner's name
            <input
              value={petitionerOne}
              onChange={(e) => setPetitionerOne(e.target.value)}
              placeholder="Enter name"
            />
          </label>

          <label className="field">
            Second petitioner's name
            <input
              value={petitionerTwo}
              onChange={(e) => setPetitionerTwo(e.target.value)}
              placeholder="Enter name"
            />
          </label>

          <label className="field">
            First-motion date
            <input
              type="date"
              value={firstMotionDate}
              onChange={(e) => setFirstMotionDate(e.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="panel waiver-panel">
        <h2>Considerations for legal review</h2>
        <p>
          Use this checklist to organize facts for counsel. Checking an item
          does not establish legal eligibility or guarantee a waiver.
        </p>

        <div className="waiver-checklist">
          {considerations.map((item, index) => (
            <label className="waiver-check" key={item}>
              <input
                type="checkbox"
                checked={checked[index]}
                onChange={(e) =>
                  setChecked((previous) =>
                    previous.map((value, i) =>
                      i === index ? e.target.checked : value,
                    ),
                  )
                }
              />
              <span>{item}</span>
            </label>
          ))}
        </div>

        <label className="field">
          Case-specific reasons and supporting facts
          <textarea
            value={reasons}
            onChange={(e) => setReasons(e.target.value)}
            rows={5}
            placeholder="Describe the relevant facts for review by your lawyer..."
          />
        </label>

        <p className="waiver-notice">
          Important: In Amardeep Singh v. Harveen Kaur (2017), the Supreme
          Court explained that the six-month period under Section 13B(2)
          may be waived in appropriate cases. Waiver is discretionary,
          depends on the circumstances, and is not automatic.
        </p>
      </section>

      <section className="panel waiver-panel">
        <h2>Draft preview</h2>
        <p>
          {allChecked
            ? "All checklist items are marked. The draft still requires legal review."
            : "Review the checklist and complete the relevant case details."}
        </p>

        <textarea
          className="waiver-draft"
          aria-label="Editable waiver application draft"
          value={draft}
          readOnly
          rows={16}
        />

        <button
          type="button"
          className="button"
          onClick={() => {
            void navigator.clipboard.writeText(draft);
          }}
        >
          Copy draft
        </button>
      </section>
    </div>
  );
}
