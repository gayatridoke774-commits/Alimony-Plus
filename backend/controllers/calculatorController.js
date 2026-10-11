import db from "../config/db.js";
import createAuditLog from "../utils/auditLog.js";

const financialFields = [
    "applicantIncome",
    "respondentIncome",
    "applicantEssentialExpenses",
    "respondentEssentialExpenses",
    "childCosts",
    "housingCost",
    "medicalCosts",
    "educationCosts",
    "applicantLiabilities",
    "respondentLiabilities",
    "applicantAssetsIncome",
    "respondentAssetsIncome",
    "existingSupport",
    "litigationCosts"
];

const validateFinancialInputs = (input) => {
    for (const field of financialFields) {
        if (
            input[field] === undefined ||
            input[field] === null ||
            input[field] === ""
        ) {
            continue;
        }

        const value = Number(input[field]);

        if (!Number.isFinite(value) || value < 0) {
            return `${field} must be a valid non-negative number`;
        }
    }

    return null;
};

const calculatePlanning = (input) => {
    const {
        applicantIncome = 0,
        respondentIncome = 0,
        applicantEssentialExpenses = 0,
        respondentEssentialExpenses = 0,
        childCosts = 0,
        housingCost = 0,
        medicalCosts = 0,
        educationCosts = 0,
        applicantLiabilities = 0,
        respondentLiabilities = 0,
        applicantAssetsIncome = 0,
        respondentAssetsIncome = 0,
        existingSupport = 0,
        litigationCosts = 0
    } = input;

    const applicantNeed =
        Number(applicantEssentialExpenses) +
        Number(childCosts) +
        Number(housingCost) +
        Number(medicalCosts) +
        Number(educationCosts) +
        Number(litigationCosts) -
        Number(applicantIncome) -
        Number(applicantAssetsIncome) -
        Number(existingSupport);

    const respondentCapacity =
        Number(respondentIncome) +
        Number(respondentAssetsIncome) -
        Number(respondentEssentialExpenses) -
        Number(respondentLiabilities) -
        Number(existingSupport);

    const needGap = Math.max(0, applicantNeed);
    const availableCapacity = Math.max(0, respondentCapacity);

    const planningBase = Math.min(
        needGap,
        availableCapacity
    );

    const conservative = Math.round(
        Math.min(
            needGap * 0.75,
            availableCapacity
        )
    );

    const baseline = Math.round(planningBase);

    const stress = Math.round(
        Math.min(
            needGap * 1.25,
            availableCapacity
        )
    );

    return {
        applicantNeed: Math.round(needGap),
        respondentCapacity: Math.round(availableCapacity),
        scenarios: {
            conservative: {
                amount: conservative
            },
            baseline: {
                amount: baseline
            },
            stress: {
                amount: stress
            }
        },
        assumptions: [
            "This is an illustrative planning estimate, not a prediction of a court order.",
            "The calculation uses the financial information entered by the user.",
            "Actual maintenance may depend on facts, evidence, legal route, existing orders and court assessment.",
            "The model does not use a fixed percentage of the respondent's salary."
        ],
        uncapturedFactors: [
            "Court-specific considerations",
            "Quality and availability of supporting documents",
            "Existing proceedings and orders not entered here",
            "Future changes in income or expenses",
            "Other legal or factual circumstances"
        ],
        disclaimer:
            "This estimate is for planning and preparation only and is not legal advice or a prediction of the amount a court will order.",
        lawyerLegalAidCta:
            "For case-specific advice, consult a qualified lawyer or legal-aid professional."
    };
};

const calculatorController = async (req, res) => {
    try {
        const { caseId, ...input } = req.body;

        const numericCaseId = Number(caseId);

        if (!Number.isInteger(numericCaseId) || numericCaseId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid Case ID"
            });
        }

        const validationError = validateFinancialInputs(input);

        if (validationError) {
            return res.status(400).json({
                success: false,
                message: validationError
            });
        }

        const caseData = await db.orm.public.Case
            .where((c) => c.id.eq(numericCaseId))
            .first();

        if (!caseData) {
            return res.status(404).json({
                success: false,
                message: "Case not found"
            });
        }

        if (caseData.userId !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        const formulaVersion = "maintenance-planning-v1.0";

        const result = calculatePlanning(input);

        const calculatorRun = await db.orm.public.CalculatorRun.create({
            caseId: numericCaseId,
            userId: req.user.id,
            formulaVersion,
            inputData: JSON.stringify(input),
            resultData: JSON.stringify(result)
        });

        await createAuditLog({
            userId: req.user.id,
            action: "CALCULATOR_RUN",
            entityType: "CalculatorRun",
            entityId: calculatorRun.id,
            metadata: `caseId=${numericCaseId};formulaVersion=${formulaVersion}`
        });

        res.status(201).json({
            success: true,
            message: "Maintenance planning calculation completed",
            calculatorRun: {
                id: calculatorRun.id,
                caseId: calculatorRun.caseId,
                formulaVersion: calculatorRun.formulaVersion,
                result
            }
        });
    } catch (error) {
        console.log(error);

        res.status(500).json({
            success: false,
            message: "Calculator failed"
        });
    }
};

export default calculatorController;