const socketController = require('../controllers/socket.controller')

const runSocket = (io) => {

    io.on('connection', (socket) => {

        let userID;

        socket.on('player_Has_Connected', (userName) => {
            console.log(userName, "đã kết nối!");
            userID = userName;
            //socketController._updateState(io, socket, userName);
        })

        // socket.on('user_reconnect', (roomName, userName, playerKey) => {
        //     socketController._userReconnect(io, socket, roomName, userName, playerKey);
        // })

        socket.on('update_Rooms', () => {  // update hiển thị tất cả phòng
            socketController._displayAllRooms(io);
        });

        socket.on('reset_Ready_Counter', (roomName, data) => { // update trạng thái của 1 phòng
            socketController._resetReadyCounter(io, socket, roomName, data);
        })

        socket.on('ready', (roomName, playerKey) => { // khi người dùng nhấn nút sẵn sàng vô game
            socketController._ready(io, roomName, playerKey);
        })

        socket.on('countdown_Of_New_Game', (roomName) => { // khi bắt đầu đếm ngược sẵn sàng
            socketController._countdownOfNewGame(io, roomName);
        })

        socket.on('join_Room', (roomName) => {
            socketController._joinRoom(socket, roomName);
        })

        socket.on('leave_Room', (roomName, userName) => {
            socketController._leaveRoom(io, socket, roomName, userName);
        })

        socket.on('start_Game', (roomName) => {
            socketController._startGame(io, roomName);
        })

        socket.on('flip_Card', (roomName, oderOfCard, playerKey) => {  // oderOfCard nhận các giá trị ( 'First','Second','Third','All' )
            socketController._flipCard(io, roomName, oderOfCard, playerKey);
        })

        socket.on('set_Owner_Room', (roomName, position) => {
            socketController._setOwnerRoom(io, roomName, position);
        })

        socket.on('update_Change_Bet', (roomName, playerKey) => {
            socketController._updateChangeBet(io, roomName, playerKey);
        })

        socket.on('get_messages_world_chat', () => {
            socketController._getMessagesWorldChat(socket);
        })

        socket.on('sending_message_to_world_chat', (message) => {
            socketController._sendingMessageToWorldChat(io, message);
        })

        socket.on('get_all_mes_chat_room', (roomName) => {
            socketController._getAllMesChatRoom(socket, roomName);
        })

        socket.on('sending_message_to_room', (message, roomName) => {
            socketController._sendingMessageToRoom(io, message, roomName);
        })

        socket.on('req_update_coin', (userName) => {
            socketController._updateCoin(socket, userName)
        })

        socket.on('disconnecting', (reason) => {
            let rooms = Object.keys(socket.rooms);
            console.log(rooms);
        });

        socket.on("disconnect", (reason) => {
            console.log('Reason: ', reason);
            console.log(userID, "đã ngắt kết nối!");
            socketController._userDisconnect(io, userID);
        });
    })
}

module.exports = runSocket