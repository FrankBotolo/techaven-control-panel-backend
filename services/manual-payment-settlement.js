import db from "../models/index.js";
import { cents, money } from "./manual-payment-policy.js";
export async function settleManualOrder(order, reference, transaction) {
    const options = { transaction };
    if (order.payment_status === "paid") return;
    if (order.payment_status !== "pending" || order.status === "cancelled")
        throw Object.assign(new Error("Order cannot accept payment"), {
            status: 409,
        });
    if (!order.seller_id)
        throw Object.assign(
            new Error("Assign this order to a seller before approval"),
            { status: 409 },
        );
    const escrowAmount = cents(order.escrow_amount);
    const [existing] = await db.sequelize.query(
        "SELECT id FROM escrows WHERE order_id=:id LIMIT 1 FOR UPDATE",
        { replacements: { id: order.id }, transaction },
    );
    if (existing.length)
        throw Object.assign(
            new Error(
                "Order already has an escrow record; reconcile before approval",
            ),
            { status: 409 },
        );
    const admin = await db.User.findOne({
        where: { role: "admin" },
        order: [["id", "ASC"]],
        transaction,
        lock: transaction.LOCK.UPDATE,
    });
    if (!admin)
        throw Object.assign(
            new Error("A holding-account administrator is required"),
            { status: 409 },
        );
    let wallet = await db.Wallet.findOne({
        where: { user_id: admin.id },
        transaction,
        lock: transaction.LOCK.UPDATE,
    });
    if (!wallet)
        wallet = await db.Wallet.create(
            { user_id: admin.id, balance: "0.00", currency: "MWK" },
            options,
        );
    const balance = money(cents(wallet.balance) + escrowAmount);
    await wallet.update({ balance }, options);
    await db.Escrow.create(
        {
            order_id: order.id,
            seller_id: order.seller_id,
            amount: money(escrowAmount),
            currency: "MWK",
            status: "held",
            held_at: new Date(),
        },
        options,
    );
    await db.WalletTransaction.create(
        {
            wallet_id: wallet.id,
            user_id: admin.id,
            type: "credit",
            amount: money(escrowAmount),
            currency: "MWK",
            reference,
            description: `Escrow hold for ${order.order_number}`,
            status: "completed",
            balance_after: balance,
        },
        options,
    );
    await db.WalletTransaction.update(
        { status: "processing" },
        {
            where: {
                user_id: order.seller_id,
                reference: `order_${order.id}`,
                status: "pending",
            },
            transaction,
        },
    );
    await order.update(
        { payment_status: "paid", paid_at: new Date(), escrow_status: "held" },
        options,
    );
    for (const userId of new Set([order.user_id, order.seller_id, admin.id]))
        await db.Notification.create(
            {
                user_id: userId,
                title: "Payment approved",
                message: `Payment for ${order.order_number} has been approved.`,
                type: "payment",
                order_id: order.id,
                read: false,
            },
            options,
        );
}
