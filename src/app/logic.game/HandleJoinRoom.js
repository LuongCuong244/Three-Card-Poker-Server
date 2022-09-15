const Room = require('../models/Room')

const handleJoinRoom = async (room, user, data, res) => {
    if (room.roomPassword !== '') {  // có mật khẩu
        if (room.roomPassword !== data.roomPassword) {
            res.json({ error: 'Sai mật khẩu!' });
            return;
        }
    }
    if (room.playersInRoom.length >= 10) {
        res.json({ error: 'Phòng đã kín chỗ. Bạn chỉ có thể vào xem!' });
        return;
    }
    if (user.coin < room.minBet) {
        res.json({ error: 'Bạn không đủ tiền cược để vào phòng này!' });
        return;
    }
    if (room.playersInRoom.indexOf(data.userName) !== -1) { // người dùng đã có trong bàn
        res.json({ error: 'Vui lòng đợi khi ván đấu kết thúc!' });
        return;
    }
    if (!room.ownerOfRoom) {
        res.json({ error: 'Hãy chờ vài giây để xác nhận chủ bàn!' });
        return;
    }

    let response = {}  // lưu trữ giá trị trả về
    const emptySeats = new Map();
    if (!room.firstPlayer) {
        emptySeats.set(1, 'firstPlayer')
    } else {
        response['firstPlayer'] = room.firstPlayer
    }
    if (!room.secondPlayer) {
        emptySeats.set(2, 'secondPlayer')
    } else {
        response['secondPlayer'] = room.secondPlayer
    }
    if (!room.thirdPlayer) {
        emptySeats.set(3, 'thirdPlayer')
    } else {
        response['thirdPlayer'] = room.thirdPlayer
    }
    if (!room.fourthPlayer) {
        emptySeats.set(4, 'fourthPlayer')
    } else {
        response['fourthPlayer'] = room.fourthPlayer
    }
    if (!room.fifthPlayer) {
        emptySeats.set(5, 'fifthPlayer')
    } else {
        response['fifthPlayer'] = room.fifthPlayer
    }
    if (!room.sixthPlayer) {
        emptySeats.set(6, 'sixthPlayer')
    } else {
        response['sixthPlayer'] = room.sixthPlayer
    }
    if (!room.seventhPlayer) {
        emptySeats.set(7, 'seventhPlayer')
    } else {
        response['seventhPlayer'] = room.seventhPlayer
    }
    if (!room.eighthPlayer) {
        emptySeats.set(8, 'eighthPlayer')
    } else {
        response['eighthPlayer'] = room.eighthPlayer
    }
    if (!room.ninthPlayer) {
        emptySeats.set(9, 'ninthPlayer')
    } else {
        response['ninthPlayer'] = room.ninthPlayer
    }
    response['ownerOfRoom'] = room.ownerOfRoom

    const listKeys = Array.from(emptySeats.keys())
    let index = Math.floor(Math.random() * listKeys.length);
    if (index >= listKeys.length) {
        index = listKeys.length - 1;
    }
    let player = {
        userName: user.userName,
        avatar: user.avatar,
        coin: user.coin,
        bet: 1000,
        newBet: 1000,
        firstCard: null,
        secondCard: null,
        thirdCard: null,
        flipFirstCard: false,
        flipSecondCard: false,
        flipThirdCard: false,
        confirmBet: false,
        isWaiting: room.isRunning,
        stillInTheRoom: true,
        status: 'No',
    }

    room.playersInRoom.push(user.userName);
    await Room.updateOne({ roomName: room.roomName }, {
        [emptySeats.get(listKeys[index])]: player,
        playersInRoom: room.playersInRoom,
    })

    res.json({
        ...response,
        roomName: room.roomName,
        [emptySeats.get(listKeys[index])]: player,
        position: listKeys[index],
        isRunning: room.isRunning,
        minBet: room.minBet,
    });
}

module.exports = handleJoinRoom;