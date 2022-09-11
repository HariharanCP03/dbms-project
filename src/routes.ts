import { Client, DatabaseError } from "pg";
import { app } from ".";
import { buildUpdateSQL } from "./utils/buildUpdateSQL";

type Item = {
  item_id: string;
  hotel_id: number;
  quantity: number;
};

type Order = {
  orderId?: number;
  orderedBy?: string;
  orderedAt?: string;
  total: number;
};

type OrderSummary = {
  orderId?: number;
  orderedBy?: string;
  itemsOrdered?: Item[];
  total?: number;
  paymentMethod?: string;
  orderedAt?: string;
  dispatchedAt?: string;
  eta?: string;
};

export default function route(client: Client) {
  app.get("/", (req, res) => {
    res.send("The server is having no issues");
  });

  app.post("/user/new/", (req, res) => {
    // res.send(req.query);
    console.log(req.query);
    client.query(
      `select * from "User" where username='${req.query.username}'`,
      (err, queryRes) => {
        if (err) {
          res.send(err.message);
        } else {
          if (queryRes.rowCount == 0) {
            const insertSQL = `insert into "User" values('${req.query.username}', '${req.query.password}', '${req.query.orderName}', '${req.query.deliveryAddress}', ${req.query.age}, '${req.query.paymentMethod}')`;
            client.query(insertSQL, (err, result) => {
              if (err) {
                res.send("err message :: " + err.message + insertSQL);
              } else {
                res.send("user created successfully");
              }
            });
          } else {
            res.send("User already exists");
          }
        }
      }
    );
  });

  app.get("/user/:username/detail", (req, res) => {
    client.query(
      `select * from "User" where username='${req.params.username}'`,
      (err, queryRes) => {
        if (err) {
          res.send(err.message);
        } else {
          if (queryRes.rowCount == 0) {
            res.json({
              type: "not found",
              message: " the requested user does not exist",
            });
          } else {
            res.json(queryRes.rows[0]);
          }
        }
      }
    );
  });

  app.put("/user/:username/update", (req, res) => {
    client.query(
      `select * from "User" where username='${req.params.username}'`,
      (err, queryRes) => {
        if (err) {
          res.send(err.message);
        } else {
          if (queryRes.rowCount == 0) {
            res.json({
              type: "User not Found",
              message: "The user does not exist; Please check credentials",
            });
          } else {
            client.query(buildUpdateSQL(req), (err, result) => {
              if (!err) {
                if (result.rowCount === 0) {
                  res.json({
                    type: "unauthorized",
                    message: "Invalid credentials. Please recheck the details",
                  });
                } else {
                  res.json({
                    type: "success",
                    message: "User updated successfully",
                  });
                }
              } else {
                console.log("error :: ", err);
              }
            });
          }
        }
      }
    );
  });

  /*
    -- note:
    orders are obtained with the following query params:
    hotel id, items ordered - list of items (json), eta;

    for (const item of JSON.parse(req.query.items as string)) {
      client.query(`insert into order_item`);
    }
  */

  app.post("/order/new/:username", (req, res) => {
    console.log(req.query);
    const INSERT_SQL = `insert into "Order"(eta, username) values('${req.query.eta}', '${req.params.username}') returning *`;
    client.query("start transaction;");
    client.query(INSERT_SQL, (err, queryRes) => {
      if (!err) {
        console.log(queryRes);

        for (const item of JSON.parse(req.query.items as string)) {
          const i = item as Item;
          client.query(
            `insert into order_item values(${queryRes.rows[0].id}, '${i.item_id}', ${i.hotel_id}, ${i.quantity})`,
            (err, result) => {
              if (err) {
                res.json({
                  type: "error",
                  message: "Could not insert into order_item table",
                });
              } else {
                console.log("The item was inserted");
              }
            }
          );
        }
        client.query(
          `insert into bill(price,payment_method,order_id) values(${req.query.total}, '${req.query.payment_method}', ${queryRes.rows[0].id});
          commit;`,
          (err, result) => {
            if (!err) {
              res.json({
                type: "success",
                message: "The order was placed successfully",
              });
            } else {
              console.log(err);
            }
          }
        );
      } else {
        console.log(err);
        if (err instanceof DatabaseError)
          if (err.code === "23503") {
            res.json({
              type: "error",
              message: "Invalid username, the user does not exist.",
            });
          } else {
            res.json({
              type: "error",
              message: "Could not place order!",
            });
          }
      }
    });
  });

  app.get("/order/summary/:order_id", (req, res) => {
    client.query(
      `select * from "Order" where id = ${req.params.order_id}`,
      (err, orderRes) => {
        const result: OrderSummary = {};
        if (err) {
          console.log(err);
          res.json({
            type: "error",
            message: "Could not fetch details",
          });
        } else {
          const orderDetails = orderRes.rows[0];
          result.orderId = orderDetails.id;
          result.orderedBy = orderDetails.username;
          result.eta = orderDetails.eta;
          result.orderedAt = new Date(orderDetails.booking_time).toUTCString();

          client.query(
            `select item_id, hotel_id, quantity from order_item where order_id = ${req.params.order_id}`,
            (err, itemsRes) => {
              if (err) {
                console.log(err);
                res.json({
                  type: "error",
                  message: "Could not fetch details",
                });
              } else {
                result.itemsOrdered = itemsRes.rows as Item[];
                console.log(result);
              }
            }
          );
          client.query(
            `select * from bill where order_id = ${req.params.order_id}`,
            (err, billRes) => {
              if (err) {
                console.log(err);
                res.json({
                  type: "error",
                  message: "Could not fetch details",
                });
              } else {
                result.paymentMethod = billRes.rows[0].payment_method;
                result.dispatchedAt = new Date(
                  billRes.rows[0].dispatch_time
                ).toUTCString();
                result.total = billRes.rows[0].price;
                console.log(result);
                res.json(result);
              }
            }
          );
        }
      }
    );
  });

  app.get("/user/:username/orders/all", (req, res) => {
    client.query(
      `select id "orderId", username "orderedBy", booking_time "orderedAt", (select price from bill b where b.order_id = o.id) total from "Order" o where username='${req.params.username}'`,
      (err, queryRes) => {
        if (err) {
          console.log(err);
          res.json({
            type: "error",
            message: "Could not fetch details",
          });
        } else {
          const orders: Order[] = queryRes.rows.map(
            (item) =>
              ({
                ...item,
                orderedAt: new Date(item.orderedAt).toUTCString(),
              } as Order)
          );
          res.json(orders);
        }
      }
    );
  });
}
