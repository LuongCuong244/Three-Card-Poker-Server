const runSocket = require('./connect/socket.connect')

const startSocketIO = (io) => {
    runSocket(io);
}

module.exports = startSocketIO