import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import db from "../../models/index.js";
import router from "../../routes/manual-payments.js";
import orderRouter from "../../routes/orders.js";
import addressRouter from "../../routes/shipping-addresses.js";
import Submission from "../../models/PaymentSubmission.js";
import { up } from "../../database/migrations-js/202611060001-mobile-commerce.js";

if (process.env.DB_NAME !== "techaven_mobile_commerce_test")
    throw new Error("This test requires the isolated scratch database");
Object.assign(process.env, {
    MANUAL_PAYMENTS_ENABLED: "true",
    MANUAL_PAYMENT_REVIEW_READY: "true",
    MANUAL_PAYMENT_PROVIDER: "Fixture Bank",
    MANUAL_PAYMENT_ACCOUNT_NAME: "Techaven Fixture",
    MANUAL_PAYMENT_ACCOUNT_NUMBER: "123456789",
    MANUAL_PAYMENT_WHATSAPP: "265991234567",
    PAYMENT_PROOF_DIR: "/tmp/techaven-private-test",
    JWT_SECRET: "isolated-local-payment-fixture-secret",
});

test("private proof submission and transactional multi-order review", async (t) => {
    let server;
    try {
        await up({ sequelize: db.sequelize });
        await up({ sequelize: db.sequelize });
        const admin = await db.User.create({
            name: "Test administrator",
            role: "admin",
        });
        const customer = await db.User.create({
            name: "Test shopper",
            role: "customer",
        });
        const stranger = await db.User.create({
            name: "Other shopper",
            role: "customer",
        });
        const seller = await db.User.create({
            name: "Test seller",
            role: "seller",
        });
        const group = randomUUID();
        const makeOrder = async (total, escrow, checkout = group) =>
            db.Order.create({
                user_id: customer.id,
                seller_id: seller.id,
                order_number: "TEST-" + randomUUID(),
                checkout_group_id: checkout,
                total_amount: total,
                shipping_address: "Fixture address",
                shipping_phone: "000",
                escrow_amount: escrow,
                status: "pending",
                payment_status: "pending",
            });
        const one = await makeOrder("10.00", "8.00"),
            two = await makeOrder("20.00", "16.00");
        const app = express();
        app.use(express.json());
        app.use("/api", router);
        app.use("/api/orders", orderRouter);
    app.use("/api/shipping-addresses", addressRouter);
        server = app.listen(0, "0.0.0.0");
        await new Promise((resolve) => server.once("listening", resolve));
        const base = `http://127.0.0.1:${server.address().port}/api`;
        const call = async (user, url, opts = {}) =>
            fetch(base + url, {
                ...opts,
                headers: {
                    ...opts.headers,
                    ...(user
                        ? {
                              Authorization:
                                  "Bearer " +
                                  jwt.sign(
                                      { id: user.id },
                                      process.env.JWT_SECRET,
                                  ),
                          }
                        : {}),
                },
            });
        const submit = async (
            user,
            ids,
            key = randomUUID(),
            content = "%PDF-1.7\nfixture",
        ) => {
            const body = new FormData();
            body.set("submission_key", key);
            body.set("order_ids", JSON.stringify(ids));
            body.set("payer_name", "Fixture payer");
            body.set("payment_reference", "TX-FIXTURE");
            body.set("payment_date", "2026-01-01");
            body.set(
                "receipt",
                new Blob([content], { type: "application/pdf" }),
                "receipt.pdf",
            );
            return call(user, "/payment-submissions", { method: "POST", body });
        };
        let record;
        await t.test(
            "ownership, all checkout orders and file signatures are enforced",
            async () => {
                assert.equal(
                    (await submit(stranger, [one.id, two.id])).status,
                    404,
                );
                assert.equal((await submit(customer, [one.id])).status, 400);
                assert.equal(
                    (
                        await submit(
                            customer,
                            [one.id, two.id],
                            randomUUID(),
                            "<html>fake</html>",
                        )
                    ).status,
                    400,
                );
                assert.equal(
                    (await call(null, `/orders/${one.id}/payment-context`))
                        .status,
                    401,
                );
            },
        );
        const key = randomUUID();
        await t.test(
            "submission persists privately without marking orders paid, with retry safety",
            async () => {
                const response = await submit(customer, [one.id, two.id], key);
                assert.equal(
                    response.status,
                    201,
                    await response.clone().text(),
                );
                record = (await response.json()).data;
                assert.equal(record.status, "pending_review");
                assert.equal(record.amount, "30.00");
                assert.match(record.whatsapp_url, /wa.me\/265991234567/);
                assert.equal("receipt_file" in record, false);
                assert.equal(
                    (await db.Order.findByPk(one.id)).payment_status,
                    "pending",
                );
                const again = (
                    await (await submit(customer, [one.id, two.id], key)).json()
                ).data;
                assert.equal(again.id, record.id);
                assert.equal(
                    (await submit(customer, [one.id, two.id])).status,
                    409,
                );
                assert.equal(
                    (
                        await call(
                            stranger,
                            `/payment-submissions/${record.id}/receipt`,
                        )
                    ).status,
                    404,
                );
                const receipt = await call(
                    customer,
                    `/payment-submissions/${record.id}/receipt`,
                );
                assert.equal(receipt.status, 200);
                assert.match(receipt.headers.get("cache-control"), /no-store/);
                assert.equal(
                    (
                        await call(
                            customer,
                            `/orders/${one.id}/payment/complete`,
                            {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: "{}",
                            },
                        )
                    ).status,
                    403,
                );
            },
        );
        const review = (id, decision, body = {}) =>
            call(admin, `/admin/payment-submissions/${id}/${decision}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
        await t.test(
            "approval is admin-only and concurrent repeats credit escrow only once",
            async () => {
                assert.equal(
                    (
                        await call(
                            customer,
                            `/admin/payment-submissions/${record.id}/approve`,
                            { method: "POST" },
                        )
                    ).status,
                    403,
                );
                const responses = await Promise.all([
                    review(record.id, "approve"),
                    review(record.id, "approve"),
                ]);
                for (const response of responses)
                    assert.equal(response.status, 200, await response.text());
                assert.equal(await db.Escrow.count(), 2);
                assert.equal(
                    await db.WalletTransaction.count({
                        where: { user_id: admin.id, type: "credit" },
                    }),
                    2,
                );
                assert.equal(
                    String(
                        (
                            await db.Wallet.findOne({
                                where: { user_id: admin.id },
                            })
                        ).balance,
                    ),
                    "24.00",
                );
                assert.equal(
                    (await db.Order.findByPk(two.id)).payment_status,
                    "paid",
                );
                assert.equal(
                    (
                        await review(record.id, "reject", {
                            reason: "Already approved",
                        })
                    ).status,
                    409,
                );
            },
        );
        await t.test(
            "rejection requires a reason, preserves history and permits corrected proof",
            async () => {
                const order = await makeOrder("5.00", "4.00", randomUUID());
                const first = (
                    await (await submit(customer, [order.id])).json()
                ).data;
                assert.equal((await review(first.id, "reject")).status, 400);
                assert.equal(
                    (
                        await review(first.id, "reject", {
                            reason: "Transaction reference does not match",
                        })
                    ).status,
                    200,
                );
                const second = await submit(customer, [order.id]);
                assert.equal(second.status, 201);
                assert.notEqual((await second.json()).data.id, first.id);
                assert.equal(
                    (await db.Order.findByPk(order.id)).payment_status,
                    "pending",
                );
            },
        );
        await t.test(
            "failed settlement rolls back order changes and leaves proof pending",
            async () => {
                const order = await makeOrder("8.00", "7.00", randomUUID());
                await order.update({ seller_id: null });
                const proof = (
                    await (await submit(customer, [order.id])).json()
                ).data;
                assert.equal((await review(proof.id, "approve")).status, 409);
                assert.equal(
                    (await Submission.findByPk(proof.id)).status,
                    "pending_review",
                );
                assert.equal(
                    (await db.Order.findByPk(order.id)).payment_status,
                    "pending",
                );
                assert.equal(await db.Escrow.count(), 2);
            },
        );
        await t.test("address API validates coordinate pairs and preserves notes", async () => {
            const post = body => call(customer, '/shipping-addresses', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
            const body = {name:'Fixture recipient',phone:'000',address:'Street',city:'Lilongwe',latitude:-13.9626,longitude:33.7741,delivery_notes:'Blue gate'};
            assert.equal((await post({...body,latitude:100})).status,400);
            const response=await post(body);assert.equal(response.status,201,await response.clone().text());
            const address=(await response.json()).data;assert.equal(address.latitude,-13.9626);assert.equal(address.delivery_notes,'Blue gate');
            assert.equal((await call(customer,'/location/reverse?lat=-13&lon=33')).status,503);
            assert.equal((await call(customer,'/location/reverse?lat=100&lon=33')).status,400);
            assert.equal((await call(stranger,'/admin/payment-submissions')).status,403);
        });
        await t.test(
            "geographic fields survive database round trips",
            async () => {
                const address = await db.ShippingAddress.create({
                    user_id: customer.id,
                    name: "Fixture",
                    phone: "000",
                    address: "Street",
                    city: "Lilongwe",
                    latitude: -13.9626,
                    longitude: 33.7741,
                    location_accuracy: 12,
                    delivery_notes: "Blue gate",
                });
                const saved = await db.ShippingAddress.findByPk(address.id);
                assert.equal(Number(saved.latitude), -13.9626);
                assert.equal(saved.delivery_notes, "Blue gate");
            },
        );
    } finally {
        if (server) await new Promise((resolve) => server.close(resolve));
        await db.sequelize.close();
        await fs.rm("/tmp/techaven-private-test", {
            recursive: true,
            force: true,
        });
    }
});
