const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const users = []; // 메모리 사용자 저장소

exports.register = async (req, res) => {
  const { username, password } = req.body;

  const exists = users.find(u => u.username === username);
  if (exists) return res.status(400).json({ message: '이미 존재하는 사용자입니다.' });

  const hashed = await bcrypt.hash(password, 10);
  const newUser = { id: users.length + 1, username, password: hashed };
  users.push(newUser);

  res.status(201).json({ message: '회원가입 성공' });
};

exports.login = async (req, res) => {
  const { username, password } = req.body;

  const user = users.find(u => u.username === username);
  if (!user) return res.status(401).json({ message: '사용자 없음' });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ message: '비밀번호 불일치' });

  const token = jwt.sign({ userId: user.id, username: user.username }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });

  res.json({ message: '로그인 성공', token });
};
