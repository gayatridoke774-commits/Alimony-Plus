const setRlsUser = async (tx, db, userId) => {
    const query = db.raw.sql`
        SELECT set_config(
            'app.current_user_id',
            ${String(userId)},
            true
        ) AS "value"
    `
        .returnsRow({
            value: "pg/text@1"
        })
        .build();

    await tx.query(query);
};

export default setRlsUser;