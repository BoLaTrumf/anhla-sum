import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
app.use(cors());

// Corrected API URL that returns JSON
const API_URL = 'https://taixiu1.gsum01.com/api/luckydice1/GetSoiCau?_t=1723223806935';

// Pattern lưu tối đa 20 kết quả gần nhất
let patternHistory = "";

// Hàm xác định Tài / Xỉu
function getTaiXiu(sum) {
  return sum >= 11 ? 'Tài' : 'Xỉu';
}

// Dự đoán Markov
function predictMarkov(history) {
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

// Dự đoán theo N-pattern
function predictNPattern(history, minLength = 3, maxLength = 6) {
  for (let len = maxLength; len >= minLength; len--) {
    const pattern = history.slice(-len).join('');
    const matches = [];
    for (let i = 0; i < history.length - len; i++) {
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

// Cập nhật pattern
function updatePatternHistory(char) {
  if (patternHistory.length >= 20) {
    patternHistory = patternHistory.slice(1);
  }
  patternHistory += char;
}

// API chính
app.get('/api/taixiu/lucky', async (req, res) => {
  try {
    const response = await fetch(API_URL);

    // Kiểm tra content-type
    const contentType = response.headers.get("content-type") || "";
    const rawData = await response.text(); // Lấy dạng text

    if (!contentType.includes("application/json")) {
      console.error("❌ API trả về HTML hoặc không phải JSON:", rawData.slice(0, 200));
      return res.status(502).json({
        error: "API gốc không trả JSON",
        preview: rawData.slice(0, 200)
      });
    }

    // Parse JSON
    const data = JSON.parse(rawData);

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(500).json({ error: 'Không có dữ liệu từ API gốc' });
    }

    const sorted = data.sort((a, b) => b.SessionId - a.SessionId);
    const latest = sorted[0];

    const dice = [latest.FirstDice, latest.SecondDice, latest.ThirdDice];
    const sum = latest.DiceSum || dice.reduce((a, b) => a + b, 0);
    const ket_qua = getTaiXiu(sum);
    const patternChar = ket_qua === "Tài" ? "t" : "x";

    updatePatternHistory(patternChar);

    const historyPatternArray = sorted.map(i => getTaiXiu(i.DiceSum) === 'Tài' ? 't' : 'x').reverse();
    const markov = predictMarkov(historyPatternArray);
    const npattern = predictNPattern(historyPatternArray);
    const du_doan = markov === npattern
      ? (markov === 't' ? "Tài" : "Xỉu")
      : (npattern === 't' ? "Tài" : "Xỉu");

    res.json({
      id: "binhtool90",
      Phien: latest.SessionId,
      Xuc_xac_1: latest.FirstDice,
      Xuc_xac_2: latest.SecondDice,
      Xuc_xac_3: latest.ThirdDice,
      Tong: sum,
      Ket_qua: ket_qua,
      Pattern: patternHistory,
      Du_doan: du_doan,
      MD5: latest.MD5Key || ""
    });

  } catch (error) {
    console.error('❌ Lỗi fetch hoặc xử lý:', error.message);
    res.status(500).json({ error: 'Lỗi nội bộ máy chủ', details: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server chạy tại http://localhost:${PORT}`);
});
