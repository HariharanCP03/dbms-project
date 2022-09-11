import { Client } from "pg";

export async function init(client: Client) {
  client.query(
    `start transaction;
	create table if not exists "User"(
        username varchar(40) primary key,
        password varchar(20),
        order_name varchar(30),
        delivery_address text,
        age int,
        payment_method varchar(20)
    );
	create table if not exists "Order" (
        id serial primary key,
        booking_time varchar(30) default NOW(),
        eta varchar(30),
        username varchar(40),
        foreign key(username) references "User"(username) on delete cascade
    );
    create table if not exists hotel(
        id serial primary key,
        branch varchar(24),
        email varchar(30),
        description text,
        food_type varchar(2) check (food_type in ('V', 'NV')),
        address text
    );
    create table if not exists hotel_contact(
        hotel_id int, contact numeric(11),
        constraint pk_hc primary key(hotel_id, contact),
        constraint fk_hc foreign key (hotel_id) references hotel(id)
    );
    create table if not exists menu(
        item_id varchar(30),
        hotel_id int,
        price numeric(8,2),
        foreign key (hotel_id) references hotel(id),
        primary key(item_id, hotel_id),
        description text
    );
    create table if not exists delivery_guy(
        id serial,
        name varchar(20),
        rating numeric(2,2),
        phone numeric(10),
        vnumber varchar(10) unique,
        vmodel varchar(20),
        order_id int unique,
        foreign key (order_id) references "Order"(id)
    );
    create table if not exists order_item(
        order_id int,
        item_id varchar(30),
        hotel_id int,
        quantity int,
        foreign key(item_id, hotel_id) references menu(item_id, hotel_id) on delete set null,
        foreign key(order_id) references "Order"(id) on delete cascade,
        primary key(order_id, item_id, hotel_id)
    );
    create table if not exists hotel_like (
        username varchar(40),
        hotel_id int,
        rating numeric(2,2),
        primary key(username, hotel_id),
        foreign key(username) references "User"(username),
        foreign key(hotel_id) references hotel(id)
    );
    create table if not exists item_like (
        username varchar(40),
        hotel_id int,
        item_id varchar(30),
        rating numeric(2,2),
        primary key(username, hotel_id, item_id),
        foreign key(username) references "User"(username),
        foreign key(item_id,hotel_id) references menu(item_id, hotel_id)
    );

    create table if not exists bill(
        price numeric(8,2),
        payment_method varchar(20),
        order_id int unique,
        dispatch_time timestamp default now(),
        foreign key(order_id) references "Order"(id)
    );
	
    commit
    `,
    (err, res) => {
      if (err) {
        console.log(err.message + " at " + err.stack + err.name);
      } else {
        console.log("tables created");
      }
    }
  );
}
