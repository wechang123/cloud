const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config();

const authRoutes = require('./routes/auth');
const fileRoutes = require('./routes/files');

const app = express();
app.use(cors());
app.use(express.json());

// 🔹 프론트엔드 HTML 제공 (public/index.html)
app.use('/', express.static(path.join(__dirname, 'public')));

// 🔹 API 라우팅
app.use('/api', authRoutes);
app.use('/api', fileRoutes);

// 🔹 기본 루트 응답 (선택적으로 유지)
app.get('/ping', (req, res) => {
  res.send('Object Storage API is running!');
});

// 🔹 서버 실행
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
