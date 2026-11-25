import test from "node:test";
import assert from "node:assert/strict";
import {
    paymentInstructions,
    cents,
    money,
    receiptType,
    addressLocation,
} from "../../services/manual-payment-policy.js";
test("manual payment is gated by complete instructions and a ready reviewer", () => {
    const env = {
        MANUAL_PAYMENTS_ENABLED: "true",
        MANUAL_PAYMENT_REVIEW_READY: "true",
        FRONTEND_URL: "https://example.com",
        MANUAL_PAYMENT_WHATSAPP: "265991234567",
    };
    assert.equal(paymentInstructions(env).enabled, true);
    assert.equal(paymentInstructions(env).destinations.length, 7);
    assert.equal(
        paymentInstructions({
            ...env,
            FRONTEND_URL: "",
        }).enabled,
        false,
    );
    assert.equal(
        paymentInstructions({ ...env, MANUAL_PAYMENT_REVIEW_READY: "false" })
            .enabled,
        false,
    );
    assert.equal(paymentInstructions({}).enabled, false);
});
test("exact amounts and receipt signatures reject malformed input", () => {
    assert.equal(money(cents("12.34") + cents("0.01")), "12.35");
    assert.throws(() => cents("1e9"));
    assert.throws(() => cents("-1"));
    assert.throws(() => cents("1.234"));
    assert.equal(receiptType(Buffer.from("%PDF-1.7")), "application/pdf");
    assert.equal(
        receiptType(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
        "image/png",
    );
    assert.throws(() => receiptType(Buffer.from("<script>")));
});
test("coordinates are optional and notes survive a manual address", () => {
    assert.deepEqual(addressLocation({ delivery_notes: "Gate 2" }), {
        delivery_notes: "Gate 2",
    });
    assert.throws(() => addressLocation({ latitude: 12 }));
    assert.throws(() => addressLocation({ latitude: 91, longitude: 1 }));
    assert.throws(() => addressLocation({ latitude: "12", longitude: 1 }));
    assert.throws(() => addressLocation({ location_accuracy: -1 }));
    assert.deepEqual(addressLocation({ latitude: null, longitude: null }), {
        latitude: null,
        longitude: null,
    });
});


test("manual payment preserves configured portal accounts and exposes storefront destinations", () => {
    const env = {
        MANUAL_PAYMENTS_ENABLED: "true", MANUAL_PAYMENT_REVIEW_READY: "true",
        FRONTEND_URL: "https://shop.test", MANUAL_PAYMENT_WHATSAPP: "265991234567",
        MANUAL_PAYMENT_PROVIDER: "Configured Bank", MANUAL_PAYMENT_ACCOUNT_NAME: "Configured Merchant",
        MANUAL_PAYMENT_ACCOUNT_NUMBER: "123456789",
    };
    const result = paymentInstructions(env);
    assert.equal(result.enabled, true);
    assert.equal(result.provider, "Configured Bank");
    assert.equal(result.account_number, "123456789");
    assert.equal(result.destinations.length, 1);
    assert.equal(paymentInstructions({ ...env, MANUAL_PAYMENT_ACCOUNT_NUMBER: "" }).enabled, false);
});
