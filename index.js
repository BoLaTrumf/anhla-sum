import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());

const MAIN_API = "https://taixiu1.gsum01.com/api/luckydice1/GetSoiCau";
const BACKUP_APIS = [
    `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(MAIN_API)}`,
    `https://cors-anywhere.herokuapp.com/${MAIN_API}`
];

async function fetchWithBypass(url) {
    const res = await fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            "Accept": "application/json,text/plain,*/*",
            "Accept-Language": "en-US,en;q=0.9"
        }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

app.get("/data", async (req, res) => {
    try {
        // Thử API chính
        try {
            const data = await fetchWithBypass(MAIN_API);
            return res.json(data);
        } catch (e) {
            console.warn("⚠ API chính lỗi:", e.message);
        }

        // Thử backup
        for (const proxyUrl of BACKUP_APIS) {
            try {
                const data = await fetchWithBypass(proxyUrl);
                return res.json(data);
            } catch (e) {
                console.warn(`⚠ Proxy lỗi (${proxyUrl}):`, e.message);
            }
        }

        // Nếu tất cả thất bại
        res.status(500).json({
            error: "Không thể lấy dữ liệu từ API gốc và proxy",
        });

    } catch (err) {
        res.status(500).json({
            error: "Lỗi không xác định",
            details: err.message
        });
    }
});

app.listen(3000, () => {
    console.log("✅ Server chạy tại http://localhost:3000/data");
});
