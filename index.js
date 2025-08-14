import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
app.use(cors());

const API_URL = 'https://taixiu1.gsum01.com/api/luckydice1/GetSoiCau';

// Hàm xác định Tài / Xỉu
function getTaiXiu(sum) {
    return sum >= 11 ? 'Tài' : 'Xỉu';
}

// Hàm dự đoán Tài/Xỉu bằng Markov Chain bậc 1
function duDoanMarkov(history) {
    if (history.length < 2) return 'Không đủ dữ liệu';

    let counts = { 'Tài': { 'Tài': 0, 'Xỉu': 0 }, 'Xỉu': { 'Tài': 0, 'Xỉu': 0 } };

    for (let i = 0; i < history.length - 1; i++) {
        counts[history[i]][history[i + 1]]++;
    }

    let last = history[history.length - 1];
    return counts[last]['Tài'] > counts[last]['Xỉu'] ? 'Tài' : 'Xỉu';
}

app.get('/data', async (req, res) => {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();

        // Lấy lịch sử kết quả
        const history = data.map(item => getTaiXiu(item.DiceSum)).reverse(); // mới nhất ở cuối
        const duDoan = duDoanMarkov(history);

        const formatted = data.map(item => ({
            phien: item.SessionId,
            xuc_xac_1: item.FirstDice,
            xuc_xac_2: item.SecondDice,
            xuc_xac_3: item.ThirdDice,
            tong: item.DiceSum,
            ket_qua: getTaiXiu(item.DiceSum),
            du_doan: duDoan,
            pattern: history.map(kq => kq[0]).join('') // T hoặc X
        }));

        res.json(formatted);
    } catch (error) {
        res.status(500).json({ error: 'Lỗi lấy dữ liệu', details: error.message });
    }
});

app.listen(3000, () => {
    console.log('Server đang chạy tại http://localhost:3000/data');
});
