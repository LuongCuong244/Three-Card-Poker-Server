const express = require("express");
const app = express();
const httpServer = require('http').createServer(app);
//const io = require("socket.io")().listen(httpServer);
const io = require('socket.io')(httpServer, {'pingInterval': 5000, 'pingTimeout': 5000});

require('dotenv').config();
const PORT = process.env.PORT;

const db = require('./src/config/db');
db.connect();

const cors = require('cors');
app.use(cors());

app.use(express.urlencoded()); // midleware để server đọc được req.body từ phương thức POST  (express đã tích hợp sẵn thư viện body-parse);
app.use(express.json());

const route = require('./src/routes/index');
route(app);

// app.get('dd',(req,res) =>{
// 	req.
// 	res.send()
// })

const startSocketIO = require('./src/app/socketIO/startSocketIO');
startSocketIO(io);

httpServer.listen(PORT);