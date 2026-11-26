export function paymentInstructions(env = process.env) {
    const destinations = [
        { provider: "NBS Bank", account_name: "Chifundo Chiwaya", account_number: "23521482", brand: "nbs-bank" },
        { provider: "National Bank", account_name: "Techaven", account_number: "1013820728", brand: "national-bank-malawi" },
        { provider: "Standard Bank", account_name: "Cc investments", account_number: "9100006871094", brand: "standard-bank" },
        { provider: "Standard Bank", account_name: "Chifundo Chiwaya", account_number: "9100006001421", brand: "standard-bank" },
        { provider: "Ecobank", account_name: "Chifundo Chiwaya", account_number: "5475000006684", brand: "ecobank" },
        { provider: "Airtel Money", account_name: "Chifundo Chiwaya", account_number: "3554899", brand: "airtel-money" },
        { provider: "FDH Bank", account_name: "TECHAVEN", account_number: "1920100270922", brand: "fdh-bank" },
    ];
    const fields = {
        provider: env.MANUAL_PAYMENT_PROVIDER,
        account_name: env.MANUAL_PAYMENT_ACCOUNT_NAME,
        account_number: env.MANUAL_PAYMENT_ACCOUNT_NUMBER,
    };
    const supplied = Object.values(fields).some(value => value != null && value !== '');
    const configured = Object.values(fields).every(value => typeof value === 'string' && value.trim() && !/placeholder|example|replace|todo|^0+$/i.test(value));
    if (supplied && !configured) return { enabled: false };
    const selected = configured ? [fields] : destinations;
    const whatsapp = env.MANUAL_PAYMENT_WHATSAPP;
    const enabled = env.MANUAL_PAYMENTS_ENABLED === "true" &&
        env.MANUAL_PAYMENT_REVIEW_READY === "true" &&
        /^https?:\/\/[^\s]+$/i.test(env.FRONTEND_URL || "") &&
        /^\d{10,15}$/.test(whatsapp || "") && !/^0+$/.test(whatsapp);
    // Both storefront destination lists and the portal's single-account contract.
    return enabled ? { enabled: true, ...selected[0], destinations: selected, whatsapp } : { enabled: false };
}
export function cents(value) {
    const text = String(value);
    if (!/^\d+(\.\d{1,2})?$/.test(text))
        throw Object.assign(new Error("Invalid monetary amount"), {
            status: 409,
        });
    const [whole, fraction = ""] = text.split(".");
    const result = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
    if (!Number.isSafeInteger(result))
        throw Object.assign(new Error("Amount out of range"), { status: 409 });
    return result;
}
export const money = (value) => (value / 100).toFixed(2);
export function receiptType(buffer) {
    if (
        buffer?.length >= 3 &&
        buffer[0] === 255 &&
        buffer[1] === 216 &&
        buffer[2] === 255
    )
        return "image/jpeg";
    if (
        buffer
            ?.subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    )
        return "image/png";
    if (buffer?.subarray(0, 5).toString() === "%PDF-") return "application/pdf";
    throw Object.assign(new Error("Upload a JPEG, PNG or PDF receipt"), {
        status: 400,
    });
}
export function addressLocation(body) {
    const values = {};
    for (const key of ["latitude", "longitude", "location_accuracy"])
        if (key in body) values[key] = body[key];
    const hasLat = body.latitude != null,
        hasLon = body.longitude != null;
    if (
        hasLat !== hasLon ||
        (hasLat &&
            (typeof body.latitude !== "number" ||
                typeof body.longitude !== "number" ||
                !Number.isFinite(body.latitude) ||
                !Number.isFinite(body.longitude) ||
                Math.abs(body.latitude) > 90 ||
                Math.abs(body.longitude) > 180))
    )
        throw Object.assign(
            new Error("Provide valid latitude and longitude together"),
            { status: 400 },
        );
    if (
        body.location_accuracy != null &&
        (typeof body.location_accuracy !== "number" ||
            !Number.isFinite(body.location_accuracy) ||
            body.location_accuracy < 0)
    )
        throw Object.assign(new Error("Invalid location accuracy"), {
            status: 400,
        });
    if ("delivery_notes" in body) {
        if (
            body.delivery_notes != null &&
            (typeof body.delivery_notes !== "string" ||
                body.delivery_notes.length > 1000)
        )
            throw Object.assign(
                new Error("Delivery notes must be at most 1000 characters"),
                { status: 400 },
            );
        values.delivery_notes = body.delivery_notes;
    }
    return values;
}
