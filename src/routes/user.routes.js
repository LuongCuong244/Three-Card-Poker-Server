const express = require('express');
const router = express.Router();

const userController = require('../app/controllers/user.controller');
const { checkUserNameExists } = require('../app/middleware/newUser');
const { verifyToken } = require('../app/middleware/authJwt');

router.post('/create-new-user', [checkUserNameExists], userController.createNewUser);
router.get('/get-user', [verifyToken], userController.getUser);
router.post('/get-Statistical-And-Information', userController._getStatisticalAndInformation);
router.post('/change-avatar', [verifyToken], userController._changeAvatar);
//router.post('/check-if-user-playing', userController._checkIfUserIsPlaying);

module.exports = router;