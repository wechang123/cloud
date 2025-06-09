const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ message: '토큰 없음' });

  const token = authHeader.split(' ')[1]; // 'Bearer <token>'
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // userId, username 등 접근 가능
    next();
  } catch (err) {
    res.status(403).json({ message: '유효하지 않은 토큰' });
  }
};

module.exports = verifyToken;
