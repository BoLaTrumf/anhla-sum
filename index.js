// server.js
import express from 'express';
import fetch from 'node-fetch'; // node-fetch v3, dùng ESM
import cors from 'cors';

const app = express();
app.use(cors());

const TARGET_API = 'https://taixiu1.gsum01.com/api/luckydice1/GetSoiCau';

// Danh sách proxy để thử (nếu direct bị chặn).
// Bạn có thể thay/sắp xếp lại proxy theo nhu cầu.
// Lưu ý: public proxy có thể không ổn định; nếu bạn có proxy riêng hãy dùng.
const PROXIES = [
  'https://api.codetabs.com/v1/proxy/?quest=',
  'https://cors-anywhere.herokuapp.com/',
  // thêm proxy của bạn ở đây: 'https://your-proxy.example/?url='
];

// Pattern lưu tối đa 20 kết quả gần nhất
let patternHistory = "";

// Hàm xác định Tài / Xỉu
function getTaiXiu(sum) {
  return sum >= 11 ? 'Tài' : 'Xỉu';
}

// Dự đoán Markov bậc 1 từ mảng ['t','x',...]
function predictMarkov(history) {
  if (!history || history.length < 2) return 'x';
  const transitions = {};
  for (let i = 0; i < history.length - 1; i++) {
    const curr = history[i];
    const next = history[i + 1];
    if (!transitions[curr]) transitions[curr] = {};
    transitions[curr][next] = (transitions[curr][next] || 0) + 1;
  }
  const last = history[history.length - 1];
  const nextMap = transitions[last] || {};
  const prediction = Object.entries(nextMap).sort((a, b) => b[1] - a[1])[0];
  return prediction ? prediction[0] : 'x';
}

// Dự đoán theo N-pattern (tìm pattern cuối và lấy phần tử theo sau pattern)
function predictNPattern(history, minLength = 3, maxLength = 6) {
  if (!history || history.length < minLength) return 'x';
  for (let len = Math.min(maxLength, history.length); len >= minLength; len--) {
    const pattern = history.slice(-len).join('');
    const matches = [];
    for (let i = 0; i <= history.length - len - 1; i++) {
      const window = history.slice(i, i + len).join('');
      if (window === pattern && history[i + len]) {
        matches.push(history[i + len]);
      }
    }
    if (matches.length > 0) {
      const counts = matches.reduce((acc, val) => {
        acc[val] = (acc[val] || 0) + 1;
        return acc;
      }, {});
      return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    }
  }
  return 'x';
}

// Cập nhật pattern (t/x)
function updatePatternHistory(char) {
  if (patternHistory.length >= 20) {
    patternHistory = patternHistory.slice(1);
  }
  patternHistory += char;
}

// Header giả lập trình duyệt để tránh bị server chặn
function browserHeaders() {
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127 Safari/537.36',
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'Accept-Language': 'en-US,en;q=0.9,vi;q=0.8',
    'Referer': 'https://taixiu1.gsum01.com/',
    'X-Requested-With': 'XMLHttpRequest'
    // Nếu bạn muốn sử dụng cookie từ trình duyệt:
    // 'Cookie': 'name=value; ...'
  };
}

// Thử fetch và parse JSON an toàn (trả về { ok: true, data } hoặc { ok:false, preview })
async function tryFetchJson(url, options = {}) {
  try {
    const resp = await fetch(url, options);
    const text = await resp.text();
    // thử parse JSON
    try {
      const data = JSON.parse(text);
      return { ok: true, data };
    } catch (err) {
      // không phải JSON
      return { ok: false, preview: text.slice(0, 1000), status: resp.status };
    }
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// Fetch với fallback: direct -> proxies[]
async function fetchWithFallback() {
  // 1) Thử direct
  const direct = await tryFetchJson(TARGET_API, { headers: browserHeaders() });
  if (direct.ok) return { source: 'direct', data: direct.data };

  // 2) Thử qua proxy lần lượt
  for (const p of PROXIES) {
    // một số proxy thêm param khác nhau, ta build URL tương thích: 
    // - codetabs: base + encodeURIComponent(target)
    // - cors-anywhere: base + target
    let proxyUrl;
    if (p.includes('codetabs')) {
      proxyUrl = p + encodeURIComponent(TARGET_API);
    } else {
      proxyUrl = p + TARGET_API;
    }
    const viaProxy = await tryFetchJson(proxyUrl, { headers: browserHeaders() });
    if (viaProxy.ok) return { source: proxyUrl, data: viaProxy.data };
    // nếu proxy trả preview, tiếp tục thử proxy khác
  }

  // 3) tất cả fail -> trả preview từ direct nếu có, ngược lại trả lỗi
  if (direct.preview) {
    return { source: 'direct-preview', preview: direct.preview, status: direct.status || 502 };
  }
  return { source: 'error', error: direct.error || 'Không lấy được dữ liệu từ API hoặc proxy' };
}

// API chính
app.get('/api/taixiu/lucky', async (req, res) => {
  try {
    const result = await fetchWithFallback();

    if (result.data) {
      const data = result.data;
      if (!Array.isArray(data) || data.length === 0) {
        return res.status(500).json({ error: 'Dữ liệu không hợp lệ từ nguồn', source: result.source });
      }

      const sorted = data.sort((a, b) => b.SessionId - a.SessionId);
      const latest = sorted[0];

      const sum = (typeof latest.DiceSum === 'number') 
        ? latest.DiceSum 
        : (Number(latest.FirstDice || 0) + Number(latest.SecondDice || 0) + Number(latest.ThirdDice || 0));

      const ket_qua = getTaiXiu(sum);
      const patternChar = ket_qua === "Tài" ? "t" : "x";
      updatePatternHistory(patternChar);

      // Lưu ý: historyPatternArray là mảng có phần tử gần nhất ở cuối trước khi reverse
      const historyPatternArray = sorted.map(i => (i.DiceSum >= 11 ? 't' : 'x')).reverse();

      const markov = predictMarkov(historyPatternArray);
      const npattern = predictNPattern(historyPatternArray);

      const du_doan = (markov === npattern)
        ? (markov === 't' ? "Tài" : "Xỉu")
        : (npattern === 't' ? "Tài" : "Xỉu");

      return res.json({
        id: "binhtool90",
        source: result.source,
        Phien: latest.SessionId,
        Xuc_xac_1: latest.FirstDice,
        Xuc_xac_2: latest.SecondDice,
        Xuc_xac_3: latest.ThirdDice,
        Tong: sum,
        Ket_qua: ket_qua,
        Pattern: patternHistory,
        Du_doan: du_doan,
        MD5: latest.MD5Key || latest.MD5 || ""
      });
    }

    // Nếu không có data, trả preview hoặc lỗi chi tiết
    if (result.preview) {
      return res.status(result.status || 502).json({
        error: 'API gốc không trả JSON hợp lệ',
        source: result.source,
        preview: result.preview
      });
    }

    return res.status(500).json({ error: 'Không lấy được dữ liệu', details: result.error || result });

  } catch (err) {
    return res.status(500).json({ error: 'Lỗi nội bộ máy chủ', details: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server chạy tại http://localhost:${PORT}`);
});
