ALTER TABLE "Document"
ENABLE ROW LEVEL SECURITY;

CREATE POLICY document_case_owner_policy
ON "Document"
USING (
    EXISTS (
        SELECT 1
        FROM "Case" c
        WHERE c.id = "Document"."caseId"
        AND c."userId" =
            current_setting('app.current_user_id', true)::integer
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM "Case" c
        WHERE c.id = "Document"."caseId"
        AND c."userId" =
            current_setting('app.current_user_id', true)::integer
    )
);