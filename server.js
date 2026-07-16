const express = require('express');
const cors = require('cors');
const { CFConfig, CFEnvironment, CFPaymentGateway } = require('cashfree-pg');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// 1. Cashfree Production/Live Configuration setup
const cfConfig = new CFConfig(
    CFEnvironment.PRODUCTION, // Live production environment
    "2023-08-01", 
    process.env.CASHFREE_APP_ID, 
    process.env.CASHFREE_SECRET_KEY
);
const cfPaymentGateway = new CFPaymentGateway(cfConfig);

// 2. Route: Order Create karne ke liye (Frontend isko call karega)
app.post('/create-order', async (req, res) => {
    try {
        const { amount, customerName, customerEmail, customerPhone } = req.body;

        const request = {
            order_amount: amount || 100.00, // Frontend se dynamic amount na aane par default 100
            order_currency: "INR",
            customer_details: {
                customer_id: "user_" + Date.now(), // Har user ke liye unique ID
                customer_name: customerName || "Test User",
                customer_email: customerEmail || "test@example.com",
                customer_phone: customerPhone || "9999999999"
            },
            order_meta: {
                // Live server par hone ke baad is URL ko badal kar apni real website ka domain dalein
                return_url: "http://localhost:5000/verify-payment?order_id={order_id}"
            }
        };

        const response = await cfPaymentGateway.cfOrderCreate(request);
        res.json({ payment_session_id: response.data.payment_session_id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. Route: Payment Status check karne ke liye (Verifying Payment)
app.get('/verify-payment', async (req, res) => {
    const { order_id } = req.query;
    try {
        const response = await cfPaymentGateway.cfOrderFetch(order_id);
        if (response.data.order_status === "PAID") {
            res.send("<h1>Payment Successful!</h1><p>Aapka order confirm ho gaya hai.</p>");
        } else {
            res.send("<h1>Payment Failed!</h1><p>Kripya dobara koshish karein.</p>");
        }
    } catch (error) {
        res.status(500).send("Verification Error: " + error.message);
    }
});

// Port jispar server chalega
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
