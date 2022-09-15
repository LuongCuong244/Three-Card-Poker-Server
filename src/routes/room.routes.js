const express = require('express');
const router = express.Router();

const roomController = require('../app/controllers/room.controller');

router.get('/get-all-rooms',roomController._getAllRooms);
router.post('/create-room',roomController._createRoom);
router.post('/join-room',roomController._joinRoom);
router.post('/get-data',roomController._getDataOfPlayerInRoom);
router.post('/change-bet',roomController._changeBet);
router.post('/find-room',roomController._findRoom);

module.exports = router;