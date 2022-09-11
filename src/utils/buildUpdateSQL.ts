import { Request } from "express";

export const buildUpdateSQL = (req: Request) => {
  let UPDATE_SQL = `update "User" set `;
  for (const property in req.query) {
    UPDATE_SQL +=
      property +
      ` = ${
        Number.isNaN(Number.parseFloat(req.query[property] as string))
          ? `'${req.query[property]}'`
          : Number.parseFloat(req.query[property] as string)
      }, `;
  }
  UPDATE_SQL =
    UPDATE_SQL.slice(0, UPDATE_SQL.length - 2) +
    ` where username = '${req.params.username}' and password = '${req.query.password}'`;
  return UPDATE_SQL;
};
