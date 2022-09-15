const express = require('express');
const router = express.Router();

const authController = require('../app/controllers/auth.controller');

router.post('/google', authController.signInWithGoogle);
router.post('/refresh-token', authController.refreshToken);

module.exports = router;