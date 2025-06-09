const express = require('express');
const multer = require('multer');
const uuid = require('uuid').v4;
const path = require('path');
const fs = require('fs');
const verifyToken = require('../middleware/auth');

const router = express.Router();
const uploads = require('../data/uploads'); // 메모리 저장소

// multer 업로드 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = `uploads/${req.user.userId}`;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${uuid()}${ext}`;
    cb(null, filename);
  }
});
const upload = multer({ storage });

/**
 * POST /upload - 파일 업로드
 */
router.post('/upload', verifyToken, upload.single('file'), (req, res) => {
  const fileInfo = {
    id: uuid(),
    owner: req.user.userId,
    originalName: req.file.originalname,
    savedName: req.file.filename,
    size: req.file.size,
    uploadedAt: new Date(),
    access: 'private',     // 기본: 비공개
    password: null,
    linkId: uuid()         // 다운로드용 공유 링크
  };

  uploads.push(fileInfo);
  res.status(201).json({ message: '파일 업로드 성공', file: fileInfo });
});

/**
 * GET /files - 내가 업로드한 파일 목록 조회
 */
router.get('/files', verifyToken, (req, res) => {
  const userFiles = uploads.filter(file => file.owner === req.user.userId);
  res.json(userFiles);
});

/**
 * GET /files/:id - 파일 메타데이터 조회
 */
router.get('/files/:id', verifyToken, (req, res) => {
  const file = uploads.find(f => f.id === req.params.id);
  if (!file) return res.status(404).json({ message: '파일 없음' });
  if (file.owner !== req.user.userId) return res.status(403).json({ message: '권한 없음' });

  res.json({
    originalName: file.originalName,
    size: file.size,
    uploadedAt: file.uploadedAt,
    owner: file.owner,
    access: file.access,
    linkId: file.linkId
  });
});

/**
 * PUT /files/:id/permission - 파일 접근 권한 설정
 */
router.put('/files/:id/permission', verifyToken, (req, res) => {
  const { id } = req.params;
  const { access, password } = req.body;

  const file = uploads.find(f => f.id === id);
  if (!file) return res.status(404).json({ message: '파일 없음' });
  if (file.owner !== req.user.userId)
    return res.status(403).json({ message: '권한 없음' });

  // 1. access 값 검증
  const validAccess = ['public', 'private', 'password'];
  if (!validAccess.includes(access)) {
    return res.status(400).json({
      message: 'access는 public, private, password 중 하나여야 합니다.'
    });
  }

  // 2. 비밀번호 보호일 경우 비밀번호 유효성 검증
  if (access === 'password') {
    if (
      typeof password !== 'string' ||
      password.trim() === '' ||
      password.length < 2
    ) {
      return res.status(400).json({ message: '유효한 비밀번호를 입력하세요.' });
    }
    file.password = password;
  } else {
    file.password = null; // 다른 경우엔 비번 제거
  }

  // 3. 접근 권한 설정
  file.access = access;

  // 4. 응답
  res.json({
    message: '권한 설정 완료',
    link: `http://localhost:4000/download/${file.linkId}`
  });
});


/**
 * GET /download/:linkId - 파일 다운로드
 */
router.get('/download/:linkId', (req, res) => {
  const { linkId } = req.params;
  const { password } = req.query;

  const file = uploads.find(f => f.linkId === linkId);
  if (!file) return res.status(404).json({ message: '파일을 찾을 수 없음' });

  if (file.access === 'private') {
    return res.status(401).json({ message: '로그인 필요: private 파일은 인증 필요' });
  }

  if (file.access === 'password') {
    if (!password || password !== file.password) {
      return res.status(403).json({ message: '비밀번호 불일치' });
    }
  }

  const filePath = path.join(__dirname, '..', 'uploads', String(file.owner), file.savedName);
  res.sendFile(filePath);
});

/**
 * DELETE /files/:id - 파일 삭제
 */
router.delete('/files/:id', verifyToken, (req, res) => {
  const fileIndex = uploads.findIndex(f => f.id === req.params.id);
  if (fileIndex === -1) return res.status(404).json({ message: '파일 없음' });

  const file = uploads[fileIndex];
  if (file.owner !== req.user.userId)
    return res.status(403).json({ message: '권한 없음' });

  // 실제 파일 삭제
  const filePath = path.join(__dirname, '..', 'uploads', String(file.owner), file.savedName);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  uploads.splice(fileIndex, 1); // 메타데이터 제거
  res.json({ message: '파일 삭제 완료' });
});

router.delete('/files/:id', verifyToken, (req, res) => {
  const fileIndex = uploads.findIndex(f => f.id === req.params.id);
  if (fileIndex === -1) return res.status(404).json({ message: '파일 없음' });

  const file = uploads[fileIndex];

  // 본인 파일만 삭제 가능
  if (file.owner !== req.user.userId)
    return res.status(403).json({ message: '권한 없음' });

  // 실제 파일 경로
  const filePath = path.join(__dirname, '..', 'uploads', String(file.owner), file.savedName);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  // 메모리에서 제거
  uploads.splice(fileIndex, 1);

  res.json({ message: '파일 삭제 완료' });
});


module.exports = router;
