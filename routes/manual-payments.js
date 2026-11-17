import { orderItemSummary, orderListingMedia } from "../services/catalogue/order-media.js";
import { manualNotice, proofUrl } from "../services/manual-checkout.js";
import express from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { Op } from "sequelize";
import db from "../models/index.js";
import Submission from "../models/PaymentSubmission.js";
import { authenticate, authorizeRoles } from "../middleware/auth.js";
import {
    paymentInstructions,
    receiptType,
    cents,
    money,
} from "../services/manual-payment-policy.js";
import { settleManualOrder } from "../services/manual-payment-settlement.js";
const router = express.Router();
const fail = (message, status = 400) =>
    Object.assign(new Error(message), { status });
const wrap = (fn) => async (req, res, next) => {
    try {
        await fn(req, res);
    } catch (e) {
        next(e);
    }
};
const dto = (row) => ({
    id: row.id,
    order_ids: row.order_ids,
    order_references: row.order_references,
    amount: row.amount,
    currency: row.currency,
    payer_name: row.payer_name,
    payment_reference: row.payment_reference,
    payment_date: row.payment_date,
    status: row.status,
    rejection_reason: row.rejection_reason,
    reviewed_at: row.reviewed_at,
    created_at: row.createdAt,
    ...(paymentInstructions().enabled
        ? {
              whatsapp_url: `https://wa.me/${paymentInstructions().whatsapp}?text=${encodeURIComponent(`Hello Techaven, I submitted payment proof.\nSubmission: ${row.id}\nOrders: ${row.order_references.join(", ")}\nAmount: MWK ${row.amount}\nPayer: ${row.payer_name}\nTransaction: ${row.payment_reference}\nPayment date: ${row.payment_date}`)}`,
          }
        : {}),
});
const receiptRoot = () => {
    const dest = path.resolve(
        process.env.PAYMENT_PROOF_DIR || "private/payment-proofs",
    );
    const publicDir = path.resolve("uploads");
    if (dest === publicDir || dest.startsWith(publicDir + path.sep))
        throw fail("Receipt storage must be private", 503);
    return dest;
};
const audits = (req, row, action, transaction) =>
    db.AuditLog.create(
        {
            action,
            actor_user_id: req.user.id,
            target_type: "payment_submission",
            target_id: row.id,
            metadata: { order_ids: row.order_ids, status: row.status },
            ip_address: req.ip,
        },
        { transaction },
    );
const windows = new Map();
function rate(req, res, next) {
    const now = Date.now(),
        key = req.user.id,
        existing = windows.get(key),
        entry =
            existing && existing.until > now
                ? existing
                : { count: 0, until: now + 60000 };
    if (windows.size > 5000)
        for (const [id, v] of windows) if (v.until < now) windows.delete(id);
    windows.set(key, entry);
    if (++entry.count > 30)
        return res
            .status(429)
            .json({
                success: false,
                message: "Please wait a minute and try again",
            });
    next();
}
router.get("/commerce-config", (req, res) => {
    res.set("Cache-Control", "no-store").json({
        success: true,
        data: {
            legal: {
                privacy: process.env.TECHAVEN_PRIVACY_URL || "/help",
                terms: process.env.TECHAVEN_TERMS_URL || "/help",
            },
            manual_payment: paymentInstructions(),
            maps: { key: process.env.GEOAPIFY_BROWSER_KEY || null },
        },
    });
});
router.get(
    "/location/reverse",
    authenticate,
    rate,
    wrap(async (req, res) => {
        if (
            req.query.lat == null ||
            req.query.lon == null ||
            req.query.lat === "" ||
            req.query.lon === ""
        )
            throw fail("Coordinates are required");
        const lat = Number(req.query.lat),
            lon = Number(req.query.lon);
        if (
            !Number.isFinite(lat) ||
            !Number.isFinite(lon) ||
            Math.abs(lat) > 90 ||
            Math.abs(lon) > 180
        )
            throw fail("Invalid coordinates");
        if (!process.env.GEOAPIFY_SERVER_KEY)
            throw fail("Address lookup is unavailable", 503);
        const params = new URLSearchParams({
            lat: String(lat),
            lon: String(lon),
            apiKey: process.env.GEOAPIFY_SERVER_KEY,
            format: "json",
        });
        const response = await fetch(
            `https://api.geoapify.com/v1/geocode/reverse?${params}`,
            { signal: AbortSignal.timeout(6000) },
        );
        if (!response.ok) throw fail("Address lookup is unavailable", 503);
        const data = (await response.json()).results?.[0] || {};
        res.set("Cache-Control", "no-store").json({
            success: true,
            data: {
                city: data.city || data.town || data.village || "",
                area: data.suburb || data.district || "",
                street: [data.housenumber, data.street]
                    .filter(Boolean)
                    .join(" "),
            },
        });
    }),
);
router.get(
    "/orders/:id/payment-context",
    authenticate,
    wrap(async (req, res) => {
        const order = await db.Order.findOne({
            where: {
                id: Number(String(req.params.id).replace("ord_", "")),
                user_id: req.user.id,
            },
        });
        if (!order) throw fail("Order not found", 404);
        const orders = order.checkout_group_id
            ? await db.Order.findAll({
                  where: {
                      checkout_group_id: order.checkout_group_id,
                      user_id: req.user.id,
                  },
                  order: [["id", "ASC"]],
              })
            : [order];
        const notice = order.payment_method === "bank-transfer" ? await manualNotice(order.checkout_group_id) : null;
        const deadline = notice ? new Date(Number(notice.deadline_ms)) : null;
        const expired = Boolean(deadline && deadline.getTime() <= Date.now());
        const selected = orders.filter(
            (o) => o.payment_status === "pending" && o.status !== "cancelled",
        );
        const ids = orders.map((o) => o.id);
        const items = await db.OrderItem.findAll({
            where: { order_id: ids }, include: [orderListingMedia], order: [["id", "ASC"]],
        });
        const [submissionIds] = await db.sequelize.query(
            "SELECT id FROM payment_submissions WHERE user_id=:user AND JSON_OVERLAPS(order_ids, CAST(:ids AS JSON)) ORDER BY createdAt DESC LIMIT 30",
            { replacements: { user: req.user.id, ids: JSON.stringify(ids) } },
        );
        const submissions = await Submission.findAll({
            where: { id: submissionIds.map((s) => s.id) },
            order: [["createdAt", "DESC"]],
        });
        const related = submissions
            .filter((s) => s.order_ids.some((id) => ids.includes(id)))
            .map(dto);
        res.set("Cache-Control", "no-store").json({
            success: true,
            data: {
                orders: orders.map((o) => ({
                    id: o.id,
                    reference: o.order_number,
                    total: o.total_amount,
                    payment_status: o.payment_status,
                    status: o.status,
                })),
                payable_order_ids: expired ? [] : selected.map((o) => o.id),
                deadline: deadline?.toISOString() ?? null,
                proof_url: notice ? proofUrl(orders[0].order_number) : null,
                summary: notice?.summary ?? null,
                items: items.map(orderItemSummary),
                expired,
                amount: money(
                    selected.reduce((sum, o) => sum + cents(o.total_amount), 0),
                ),
                submissions: related,
            },
        });
    }),
);
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 1,
        fields: 6,
        fieldSize: 2000,
    },
}).single("receipt");
router.post(
    "/payment-submissions",
    authenticate,
    rate,
    (req, res, next) => {
        if (!paymentInstructions().enabled)
            return res
                .status(503)
                .json({
                    success: false,
                    message: "Manual payment is not available yet",
                });
        upload(req, res, next);
    },
    wrap(async (req, res) => {
        const key = String(req.body.submission_key || "");
        if (!/^[a-zA-Z0-9_-]{16,80}$/.test(key))
            throw fail("A valid submission key is required");
        for (const field of ["payer_name", "payment_reference"])
            if (
                typeof req.body[field] !== "string" ||
                !req.body[field].trim() ||
                req.body[field].length > 160
            )
                throw fail(`Invalid ${field}`);
        const date = req.body.payment_date;
        if (
            !/^\d{4}-\d{2}-\d{2}$/.test(date || "") ||
            !Number.isFinite(Date.parse(date)) ||
            new Date(date).toISOString().slice(0, 10) !== date ||
            date > new Date().toISOString().slice(0, 10)
        )
            throw fail("Enter a valid payment date");
        let ids;
        try {
            ids = JSON.parse(req.body.order_ids);
        } catch {
            throw fail("Invalid orders");
        }
        if (
            !Array.isArray(ids) ||
            !ids.length ||
            ids.length > 50 ||
            ids.some((id) => !Number.isSafeInteger(id) || id < 1) ||
            new Set(ids).size !== ids.length
        )
            throw fail("Invalid orders");
        if (!req.file?.buffer?.length) throw fail("A receipt is required");
        const type = receiptType(req.file.buffer),
            file = randomUUID();
        let saved = false;
        try {
            const row = await db.sequelize.transaction(async (transaction) => {
                await db.User.findByPk(req.user.id, {
                    transaction,
                    lock: transaction.LOCK.UPDATE,
                });
                const previous = await Submission.findOne({
                    where: { user_id: req.user.id, submission_key: key },
                    transaction,
                });
                if (previous) {
                    if (
                        JSON.stringify([...previous.order_ids].sort()) !==
                            JSON.stringify([...ids].sort()) ||
                        previous.payment_reference !==
                            req.body.payment_reference.trim() ||
                        previous.payer_name !== req.body.payer_name.trim() ||
                        previous.payment_date !== date
                    )
                        throw fail(
                            "Submission key was already used for different payment details",
                            409,
                        );
                    return previous;
                }
                const orders = await db.Order.findAll({
                    where: { id: ids, user_id: req.user.id },
                    order: [["id", "ASC"]],
                    transaction,
                    lock: transaction.LOCK.UPDATE,
                });
                if (orders.length !== ids.length)
                    throw fail("Orders not found", 404);
                const group = orders[0].checkout_group_id;
                const notice = orders.some(order => order.payment_method === "bank-transfer") ? await manualNotice(group, transaction) : null;
                if (notice && new Date(Number(notice.deadline_ms)).getTime() <= Date.now())
                    throw fail("The payment proof deadline has passed", 409);
                if (
                    orders.length > 1 &&
                    (!group ||
                        orders.some((o) => o.checkout_group_id !== group))
                )
                    throw fail("Orders must belong to one checkout");
                if (group) {
                    const groupOrders = await db.Order.findAll({
                        where: {
                            checkout_group_id: group,
                            user_id: req.user.id,
                            payment_status: "pending",
                            status: { [Op.ne]: "cancelled" },
                        },
                        transaction,
                    });
                    if (groupOrders.some((o) => !ids.includes(o.id)))
                        throw fail(
                            "Include every unpaid order from this checkout",
                        );
                }
                for (const order of orders) {
                    if (
                        order.payment_status !== "pending" ||
                        order.status === "cancelled"
                    )
                        throw fail("Order cannot accept payment proof", 409);
                    if (order.manual_payment_submission_id) {
                        const prior = await Submission.findByPk(
                            order.manual_payment_submission_id,
                            { transaction },
                        );
                        if (prior && prior.status !== "rejected")
                            throw fail(
                                "Payment proof is already awaiting review",
                                409,
                            );
                    }
                }
                const amount = money(
                    orders.reduce((sum, o) => sum + cents(o.total_amount), 0),
                );
                if (cents(amount) <= 0)
                    throw fail("Order amount must be positive", 409);
                await fs.mkdir(receiptRoot(), { recursive: true, mode: 0o700 });
                await fs.writeFile(
                    path.join(receiptRoot(), file),
                    req.file.buffer,
                    { flag: "wx", mode: 0o600 },
                );
                saved = true;
                const submission = await Submission.create(
                    {
                        id: randomUUID(),
                        user_id: req.user.id,
                        submission_key: key,
                        order_ids: ids,
                        order_references: orders.map((o) => o.order_number),
                        amount,
                        currency: "MWK",
                        payer_name: req.body.payer_name.trim(),
                        payment_reference: req.body.payment_reference.trim(),
                        payment_date: date,
                        receipt_file: file,
                        receipt_type: type,
                        status: "pending_review",
                    },
                    { transaction },
                );
                await db.Order.update(
                    {
                        manual_payment_submission_id: submission.id,
                        payment_method: "bank-transfer",
                    },
                    { where: { id: ids }, transaction },
                );
                await audits(
                    req,
                    submission,
                    "payment.proof.submitted",
                    transaction,
                );
                await db.Notification.create(
                    {
                        user_id: req.user.id,
                        title: "Payment proof received",
                        message:
                            "Your payment proof has been submitted for review. Techaven will contact you after checking it.",
                        type: "payment",
                        order_id: ids[0],
                        read: false,
                    },
                    { transaction },
                );
                const admins = await db.User.findAll({
                    where: { role: "admin" },
                    attributes: ["id"],
                    transaction,
                });
                for (const admin of admins)
                    await db.Notification.create(
                        {
                            user_id: admin.id,
                            title: "Payment proof awaiting review",
                            message: `Submission ${submission.id} is ready for review.`,
                            type: "payment",
                            order_id: ids[0],
                            read: false,
                        },
                        { transaction },
                    );
                return submission;
            });
            const config = paymentInstructions();
            const text = `Hello Techaven, I submitted payment proof.\nSubmission: ${row.id}\nOrders: ${row.order_references.join(", ")}\nAmount: MWK ${row.amount}\nPayer: ${row.payer_name}\nTransaction: ${row.payment_reference}\nPayment date: ${row.payment_date}`;
            res.status(201).json({
                success: true,
                data: {
                    ...dto(row),
                    whatsapp_url: `https://wa.me/${config.whatsapp}?text=${encodeURIComponent(text)}`,
                },
            });
        } catch (error) {
            if (saved)
                await fs.unlink(path.join(receiptRoot(), file)).catch(() => {});
            throw error;
        }
    }),
);
router.get(
    "/admin/payment-submissions",
    authenticate,
    authorizeRoles("admin"),
    wrap(async (req, res) => {
        const page = Math.max(1, Math.min(100000, Number(req.query.page) || 1));
        const status = ["pending_review", "approved", "rejected"].includes(
            req.query.status,
        )
            ? req.query.status
            : "pending_review";
        const { rows, count } = await Submission.findAndCountAll({
            where: { status },
            limit: 30,
            offset: (page - 1) * 30,
            order: [["createdAt", "ASC"]],
        });
        res.json({
            success: true,
            data: { submissions: rows.map(dto), total: count, page },
        });
    }),
);
router.get(
    "/payment-submissions/:id/receipt",
    authenticate,
    wrap(async (req, res) => {
        const row = await Submission.findByPk(req.params.id);
        if (!row || (row.user_id !== req.user.id && req.user.role !== "admin"))
            throw fail("Receipt not found", 404);
        res.set({
            "Cache-Control": "private, no-store",
            "Content-Type": row.receipt_type,
            "X-Content-Type-Options": "nosniff",
            "Content-Disposition":
                'attachment; filename="payment-receipt.' +
                (row.receipt_type === "application/pdf"
                    ? "pdf"
                    : row.receipt_type === "image/png"
                      ? "png"
                      : "jpg") +
                '"',
        });
        const buffer = await fs.readFile(
            path.join(receiptRoot(), path.basename(row.receipt_file)),
        );
        res.send(buffer);
    }),
);
router.post(
    "/admin/payment-submissions/:id/:decision",
    authenticate,
    authorizeRoles("admin"),
    wrap(async (req, res) => {
        const decision = req.params.decision;
        if (!["approve", "reject"].includes(decision))
            throw fail("Unknown review action", 404);
        const reason = String(req.body.reason || "").trim();
        if (decision === "reject" && (!reason || reason.length > 1000))
            throw fail(
                "A rejection reason is required (maximum 1000 characters)",
            );
        const result = await db.sequelize.transaction(async (transaction) => {
            const row = await Submission.findByPk(req.params.id, {
                transaction,
                lock: transaction.LOCK.UPDATE,
            });
            if (!row) throw fail("Submission not found", 404);
            const status = decision === "approve" ? "approved" : "rejected";
            if (row.status === status) return row;
            if (row.status !== "pending_review")
                throw fail("This submission has already been reviewed", 409);
            const orders = await db.Order.findAll({
                where: { id: row.order_ids },
                order: [["id", "ASC"]],
                transaction,
                lock: transaction.LOCK.UPDATE,
            });
            if (orders.length !== row.order_ids.length)
                throw fail("An order is missing; reconcile before review", 409);
            if (decision === "approve") {
                if (
                    money(
                        orders.reduce(
                            (sum, o) => sum + cents(o.total_amount),
                            0,
                        ),
                    ) !== String(row.amount)
                )
                    throw fail(
                        "Order amounts changed; reconcile before approval",
                        409,
                    );
                for (const order of orders) {
                    if (
                        order.manual_payment_submission_id !== row.id ||
                        order.payment_status !== "pending"
                    )
                        throw fail(
                            "Payment changed; reconcile before approval",
                            409,
                        );
                    await settleManualOrder(
                        order,
                        `manual_${row.id}_${order.id}`,
                        transaction,
                    );
                }
            } else
                await db.Notification.create(
                    {
                        user_id: row.user_id,
                        title: "Payment proof needs attention",
                        message: `Your payment proof was rejected: ${reason}`,
                        type: "payment",
                        order_id: row.order_ids[0],
                        read: false,
                    },
                    { transaction },
                );
            await row.update(
                {
                    status,
                    reviewed_by: req.user.id,
                    reviewed_at: new Date(),
                    rejection_reason: decision === "reject" ? reason : null,
                },
                { transaction },
            );
            await audits(req, row, `payment.proof.${status}`, transaction);
            return row;
        });
        res.json({ success: true, data: dto(result) });
    }),
);
router.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status =
        error.code === "LIMIT_FILE_SIZE"
            ? 413
            : error instanceof multer.MulterError
              ? 400
              : error.status || 500;
    res.status(status).json({
        success: false,
        message:
            status === 413
                ? "Receipt must be at most 10MB"
                : status < 500
                  ? error.message
                  : status === 503
                    ? error.message
                    : "Payment or location request could not be completed",
    });
});
export default router;
