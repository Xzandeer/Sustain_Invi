module.exports = [
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[project]/app/layout.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/app/layout.tsx [app-rsc] (ecmascript)"));
}),
"[project]/app/dashboard/page.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* ------------------------------------------------------------------ */ /* ---------------------------- TYPES -------------------------------- */ /* ------------------------------------------------------------------ */ __turbopack_context__.s([
    "default",
    ()=>DashboardPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
;
function DashboardPage() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(ProtectedRoute, {
        children: [
            "      ",
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(DashboardContent, {}, void 0, false, {
                fileName: "[project]/app/dashboard/page.tsx",
                lineNumber: 26,
                columnNumber: 7
            }, this),
            "    "
        ]
    }, void 0, true, {
        fileName: "[project]/app/dashboard/page.tsx",
        lineNumber: 25,
        columnNumber: 5
    }, this);
}
/* ------------------------------------------------------------------ */ /* ----------------------- DASHBOARD LOGIC (FIXED) ------------------- */ /* ------------------------------------------------------------------ */ function DashboardContent() {
    const [items, setItems] = useState([]);
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [overallChartData, setOverallChartData] = useState(null);
    const [categoryChartData, setCategoryChartData] = useState(null);
    const [aiForecast, setAiForecast] = useState([]);
    const [aiAnalysis, setAiAnalysis] = useState('');
    useEffect(()=>{
        const loadData = async ()=>{
            const itemsSnap = await getDocs(collection(db, "items"));
            const salesSnap = await getDocs(collection(db, "sales"));
            /* ------------ PARSE SALES SAFELY ------------ */ const salesList = salesSnap.docs.map((doc)=>{
                const d = doc.data();
                return {
                    id: doc.id,
                    amount: Number(d.amount ?? 0),
                    timestamp: d.timestamp ?? Date.now(),
                    date: d.date ?? new Date(d.timestamp ?? Date.now()).toISOString().split("T")[0],
                    category: d.category ?? "Uncategorized"
                };
            });
            /* ------------ PARSE ITEMS SAFELY ------------ */ const itemsList = itemsSnap.docs.map((doc)=>{
                const d = doc.data();
                return {
                    id: doc.id,
                    status: d.status ?? "In Stock"
                };
            });
            setItems(itemsList);
            setSales(salesList.sort((a, b)=>a.timestamp - b.timestamp));
            await generateAICharts(salesList);
            await generateCategoryChart(salesList);
            setLoading(false);
        };
        loadData();
    }, []);
    /* ------------------ AI FORECAST CALL (FIXED) ------------------ */ // Now accepts both total daily sales and category sales data
    async function callGeminiAI(salesData, categorySalesData) {
        try {
            const res = await fetch("/api/forecast", {
                method: "POST",
                // FIX: Send the complete body structure expected by the API
                body: JSON.stringify({
                    sales: salesData,
                    categorySales: categorySalesData
                }),
                headers: {
                    "Content-Type": "application/json"
                }
            });
            const data = await res.json();
            // Handle non-200 responses gracefully
            if (!res.ok) {
                console.error("AI API Error:", data.error || data.details);
                return {
                    overallForecast: [],
                    analysis: `AI forecast unavailable: ${data.error || 'Server error'}`
                };
            }
            return data;
        } catch (e) {
            console.error("Fetch or JSON Parse Error:", e);
            return {
                overallForecast: [],
                analysis: "AI forecast unavailable. Network error."
            };
        }
    }
    /* ------------------ OVERALL SALES CHART (FIXED) ------------------ */ async function generateAICharts(salesList) {
        // 1. Calculate Total Daily Sales
        const dailyTotals = {};
        // New: Temporary structure to hold category sales by date
        const dailyCategorySalesByDate = {};
        const allCategories = new Set();
        for (const s of salesList){
            // Total Sales
            dailyTotals[s.date] = (dailyTotals[s.date] || 0) + s.amount;
            // Category Sales by Date
            if (!dailyCategorySalesByDate[s.date]) {
                dailyCategorySalesByDate[s.date] = {};
            }
            dailyCategorySalesByDate[s.date][s.category] = (dailyCategorySalesByDate[s.date][s.category] || 0) + s.amount;
            allCategories.add(s.category);
        }
        const sortedDates = Object.keys(dailyTotals).sort();
        const salesAmounts = sortedDates.map((d)=>dailyTotals[d]);
        // 2. Structure Category Sales for the AI API
        const categorySalesForAPI = {};
        const categoryList = Array.from(allCategories);
        for (const category of categoryList){
            categorySalesForAPI[category] = sortedDates.map((date)=>{
                // Get sale amount for this category on this specific date, or 0 if none
                return dailyCategorySalesByDate[date]?.[category] || 0;
            });
        }
        // 3. Call AI with BOTH sales amounts and structured category sales
        const ai = await callGeminiAI(salesAmounts, categorySalesForAPI);
        // FIX: The backend response uses 'overallForecast', not 'forecast'
        setAiForecast(ai.overallForecast ?? []);
        setAiAnalysis(ai.analysis ?? "");
        const labels = sortedDates.map((date)=>new Date(date).toLocaleDateString("en-US", {
                month: "numeric",
                day: "numeric"
            }));
        const today = new Date();
        const futureLabels = ai.overallForecast?.map((_, i)=>{
            const d = new Date(today);
            // The forecast starts the day after the last date in sortedDates.
            // Since the full data handling is complex, for simple display, we'll offset by 1 day per forecast day.
            d.setDate(d.getDate() + i + 1);
            return d.toLocaleDateString("en-US", {
                month: "numeric",
                day: "numeric"
            });
        }) ?? [];
        setOverallChartData({
            labels: [
                ...labels,
                ...futureLabels
            ],
            datasets: [
                {
                    label: "Actual Sales (₱)",
                    data: [
                        ...salesAmounts,
                        ...Array(ai.overallForecast?.length ?? 0).fill(null)
                    ],
                    borderColor: "#16a34a",
                    backgroundColor: "rgba(22,163,74,0.15)",
                    borderWidth: 2,
                    tension: 0.3
                },
                {
                    label: "AI Forecast (₱)",
                    data: [
                        ...Array(salesAmounts.length).fill(null),
                        ...ai.overallForecast ?? []
                    ],
                    borderColor: "#3b82f6",
                    borderDash: [
                        6,
                        6
                    ],
                    borderWidth: 2,
                    tension: 0.3
                }
            ]
        });
    }
    /* -------------------- CATEGORY BAR CHART -------------------- */ async function generateCategoryChart(salesList) {
        const categoryTotals = {};
        for (const s of salesList){
            categoryTotals[s.category] = (categoryTotals[s.category] ?? 0) + 1;
        }
        const labels = Object.keys(categoryTotals);
        const values = Object.values(categoryTotals);
        const colors = [
            "#f59e0b",
            "#ec4899",
            "#8b5cf6",
            "#10b981",
            "#ef4444"
        ];
        setCategoryChartData({
            labels,
            datasets: [
                {
                    label: "Total Sold",
                    data: values,
                    backgroundColor: labels.map((_, i)=>colors[i % colors.length]),
                    borderRadius: 8
                }
            ]
        });
    }
    /* ----------------------- UI ----------------------- */ const totalItems = items.length;
    const inStock = items.filter((i)=>i.status === "In Stock").length;
    const totalSold = sales.length;
    const totalSalesAmount = sales.reduce((sum, s)=>sum + s.amount, 0);
    if (loading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex items-center justify-center h-screen",
            children: [
                "        ",
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    children: "Loading dashboard..."
                }, void 0, false, {
                    fileName: "[project]/app/dashboard/page.tsx",
                    lineNumber: 226,
                    columnNumber: 9
                }, this),
                "      "
            ]
        }, void 0, true, {
            fileName: "[project]/app/dashboard/page.tsx",
            lineNumber: 225,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
        className: "px-4 sm:px-6 lg:px-8 py-8",
        children: [
            "    ",
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                className: "text-3xl font-bold mb-8",
                children: "Dashboard"
            }, void 0, false, {
                fileName: "[project]/app/dashboard/page.tsx",
                lineNumber: 234,
                columnNumber: 5
            }, this),
            "    ",
            "    ",
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8",
                children: [
                    "      ",
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(KPICard, {
                        title: "Total Items",
                        value: totalItems,
                        icon: "📦",
                        color: "green"
                    }, void 0, false, {
                        fileName: "[project]/app/dashboard/page.tsx",
                        lineNumber: 238,
                        columnNumber: 7
                    }, this),
                    "      ",
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(KPICard, {
                        title: "In Stock",
                        value: inStock,
                        icon: "📍",
                        color: "blue"
                    }, void 0, false, {
                        fileName: "[project]/app/dashboard/page.tsx",
                        lineNumber: 239,
                        columnNumber: 7
                    }, this),
                    "      ",
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(KPICard, {
                        title: "Items Sold",
                        value: totalSold,
                        icon: "✔️",
                        color: "purple"
                    }, void 0, false, {
                        fileName: "[project]/app/dashboard/page.tsx",
                        lineNumber: 240,
                        columnNumber: 7
                    }, this),
                    "      ",
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(KPICard, {
                        title: "Total Sales",
                        value: `₱${totalSalesAmount.toFixed(2)}`,
                        icon: "💰",
                        color: "yellow"
                    }, void 0, false, {
                        fileName: "[project]/app/dashboard/page.tsx",
                        lineNumber: 241,
                        columnNumber: 7
                    }, this),
                    "    "
                ]
            }, void 0, true, {
                fileName: "[project]/app/dashboard/page.tsx",
                lineNumber: 237,
                columnNumber: 5
            }, this),
            "    ",
            "    ",
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid grid-cols-1 lg:grid-cols-3 gap-6",
                children: [
                    "      ",
                    "      ",
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "lg:col-span-2 space-y-6",
                        children: [
                            "        ",
                            "        ",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "bg-white dark:bg-slate-800 p-6 rounded-lg shadow",
                                children: [
                                    "          ",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                        className: "text-xl font-bold mb-4",
                                        children: "AI Sales Forecast"
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/page.tsx",
                                        lineNumber: 252,
                                        columnNumber: 11
                                    }, this),
                                    "          ",
                                    overallChartData ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(Line, {
                                        data: overallChartData
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/page.tsx",
                                        lineNumber: 253,
                                        columnNumber: 31
                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        children: "No data available"
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/page.tsx",
                                        lineNumber: 253,
                                        columnNumber: 66
                                    }, this),
                                    "        "
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/dashboard/page.tsx",
                                lineNumber: 251,
                                columnNumber: 9
                            }, this),
                            "        ",
                            "        ",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "bg-white dark:bg-slate-800 p-6 rounded-lg shadow",
                                children: [
                                    "          ",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                        className: "text-xl font-bold mb-4",
                                        children: "Category Performance"
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/page.tsx",
                                        lineNumber: 258,
                                        columnNumber: 11
                                    }, this),
                                    "          ",
                                    categoryChartData ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(Bar, {
                                        data: categoryChartData
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/page.tsx",
                                        lineNumber: 259,
                                        columnNumber: 32
                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        children: "No category data available"
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/page.tsx",
                                        lineNumber: 259,
                                        columnNumber: 67
                                    }, this),
                                    "        "
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/dashboard/page.tsx",
                                lineNumber: 257,
                                columnNumber: 9
                            }, this),
                            "      "
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/dashboard/page.tsx",
                        lineNumber: 248,
                        columnNumber: 7
                    }, this),
                    "      ",
                    "      ",
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            "        ",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "bg-blue-50 dark:bg-blue-900 p-5 rounded-lg shadow sticky top-4",
                                children: [
                                    "          ",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        className: "font-semibold text-blue-700 dark:text-blue-200 mb-2 text-lg",
                                        children: "            🤖 AI Insights           "
                                    }, void 0, false, {
                                        fileName: "[project]/app/dashboard/page.tsx",
                                        lineNumber: 267,
                                        columnNumber: 11
                                    }, this),
                                    "          ",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-sm leading-relaxed text-blue-800 dark:text-blue-100",
                                        children: [
                                            "            ",
                                            aiAnalysis || "AI is analyzing your sales trends...",
                                            "          "
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/app/dashboard/page.tsx",
                                        lineNumber: 270,
                                        columnNumber: 11
                                    }, this),
                                    "        "
                                ]
                            }, void 0, true, {
                                fileName: "[project]/app/dashboard/page.tsx",
                                lineNumber: 266,
                                columnNumber: 9
                            }, this),
                            "      "
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/dashboard/page.tsx",
                        lineNumber: 265,
                        columnNumber: 7
                    }, this),
                    "    "
                ]
            }, void 0, true, {
                fileName: "[project]/app/dashboard/page.tsx",
                lineNumber: 245,
                columnNumber: 5
            }, this),
            "  "
        ]
    }, void 0, true, {
        fileName: "[project]/app/dashboard/page.tsx",
        lineNumber: 232,
        columnNumber: 3
    }, this);
}
}),
"[project]/app/dashboard/page.tsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/app/dashboard/page.tsx [app-rsc] (ecmascript)"));
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__4f71cc02._.js.map