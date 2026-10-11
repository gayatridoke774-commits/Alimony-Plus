import db from "../config/db.js";
import { Temporal } from "@js-temporal/polyfill";

const createProceeding = async (req, res) => {
  try {
    const { caseId, courtName, caseNumber, proceedingType, status, filedAt } =
      req.body;

    if (!caseId) {
      return res.status(400).json({
        success: false,
        message: "Case ID is required",
      });
    }

    const caseData = await db.orm.public.Case.where((c) =>
      c.id.eq(Number(caseId)),
    ).first();

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: "Case not found",
      });
    }

    if (caseData.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const proceeding = await db.orm.public.Proceeding.create({
      caseId: Number(caseId),
      courtName: courtName || null,
      caseNumber: caseNumber || null,
      proceedingType: proceedingType || null,
      status: status || "ONGOING",
      filedAt: filedAt ? Temporal.Instant.from(`${filedAt}T00:00:00Z`) : null,
    });

    res.status(201).json({
      success: true,
      message: "Proceeding created successfully",
      proceeding,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Proceeding creation failed",
    });
  }
};

export default createProceeding;
