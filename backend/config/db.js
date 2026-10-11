import "temporal-polyfill/full/global";

import  postgres  from "@prisma/orm-postgres/runtime";
import contractJson  from "../prisma/contract.json" with { type: "json" };

const db = postgres({
    contractJson,
    url: process.env.DATABASE_URL
});

export default db;