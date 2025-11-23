module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[project]/app/api/forecast/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$google$2f$generative$2d$ai$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@google/generative-ai/dist/index.mjs [app-route] (ecmascript)");
;
;
// Retry function to avoid Gemini model overload (503)
async function callWithRetry(fn, retries = 3) {
    for(let i = 0; i < retries; i++){
        try {
            return await fn();
        } catch (err) {
            if (i === retries - 1) throw err;
            await new Promise((res)=>setTimeout(res, 500));
        }
    }
}
async function POST(req) {
    try {
        const body = await req.json();
        const { sales, categorySales } = body;
        if (!process.env.GEMINI_API_KEY) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Gemini API key missing."
            }, {
                status: 500
            });
        }
        const genAI = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$google$2f$generative$2d$ai$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["GoogleGenerativeAI"](process.env.GEMINI_API_KEY);
        // ✔ Use a STABLE model!
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash"
        });
        const prompt = `
You are an expert AI specializing in demand forecasting for retail surplus shops.

DATA PROVIDED:
- TOTAL DAILY SALES (chronological): 
${JSON.stringify(sales)}

- CATEGORY SALES DATA (format: { category: [list of daily amounts] }):
${JSON.stringify(categorySales)}

You are an expert AI specializing in retail demand forecasting.

DATA:
- TOTAL DAILY SALES: ${JSON.stringify(sales)}
- CATEGORY SALES ({ category: [daily amounts] }): ${JSON.stringify(categorySales)}

TASKS:
1. Forecast the next 7 days of total sales.
2. Forecast the next 7 days of sales for EACH category.
3. Identify rising, falling, and unstable categories.
4. Provide a 3-5 sentence analysis covering: restocking advice, next week's priority category, and low-demand risk areas.
5. Make it organized and concise.

Return **VALID JSON ONLY** in this exact format:

{
  "overallForecast": [7 numbers],
  "categoryForecast": {
    "CategoryName": [7 numbers]
  },
  "analysis": "string"
    `;
        // GEMINI CALL WITH RETRY
        const result = await callWithRetry(()=>model.generateContent(prompt), 3);
        let raw = result.response.text().trim();
        // CLEAN JSON (remove ```json or ``` markers)
        raw = raw.replace(/```json/g, "").replace(/```/g, "").replace(/[\u0000-\u001F]+/g, "") // remove invisible chars
        .trim();
        // Parse JSON SAFELY
        let json;
        try {
            json = JSON.parse(raw);
        } catch (err) {
            console.error("Raw AI output was not valid JSON:", raw);
            throw new Error("Invalid AI JSON output");
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(json, {
            status: 200
        });
    } catch (e) {
        console.error("Forecast API error:", e);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "AI Forecasting failed",
            details: e.message
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__ea028212._.js.map