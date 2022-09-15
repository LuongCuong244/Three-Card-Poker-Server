const User = require('../models/User');
const Room = require('../models/Room');
const Statistical = require('../models/Statistical');
const jwtHelpers = require('../helpers/jwt.helpers');

const bcrypt = require("bcryptjs");

exports.createNewUser = async (req, res) => {
    const { userName, email } = req.body;

    const newUser = {
        userName: userName,
        email: email,
        avatar: 'https://media.viezone.vn/prod/2021/10/25/image_976fcc8867.png',
        coin: 10000,
        diamond: 100,
    }

    const accessToken = await jwtHelpers.generateToken({ userName, email }, process.env.ACCESS_TOKEN_SECRET, process.env.ACCESS_TOKEN_LIFE);
    const refreshToken = await jwtHelpers.generateToken({ userName, email }, process.env.REFRESH_TOKEN_SECRET, process.env.REFRESH_TOKEN_LIFE);
    if (!accessToken || !refreshToken) {
        return res.json({
            error: "Chưa thể đăng nhập vào lúc này!",
        })
    }

    await User.create({
        ...newUser,
        refreshToken: refreshToken,
        password: (await bcrypt.hash(`abc${email}xyz${process.env.ACCESS_TOKEN_SECRET}`, 8)).toString(),
        roles: ['user'],
    }, (error) => {
        if (error) console.log(error);
    })
    // let newStatistical = {
    //     userName: userName,
    //     numberOfGamesPlayed: 0,
    //     numberOfGamesWon: 0,
    //     numberOfGamesDraw: 0,
    //     currentWinStreak: 0,
    //     longestWinStreak: 0,
    //     getTenScore: 0,
    //     getOneScore: 0,
    // }
    // await Statistical.create(newStatistical, (error) => {
    //     if (error) console.log(error);
    // })

    res.json({
        accessToken,
        refreshToken,
        user: newUser
    })


}

exports.getUser = (req, res) => {
    User.find({ userName: req.userName })  // get req.userName from verifyToken function
        .then((user) => {
            if (user.length === 1) {
                res.status(200).json({
                    userName: req.userName,
                    coin: user[0].coin,
                    avatar: user[0].avatar,
                    diamond: user[0].diamond,
                });
            } else {
                res.json({ error: "Lỗi khi lấy dữ liệu!" });
            }
        })
        .catch(error => console.log(error))
}

exports._getStatisticalAndInformation = (req, res) => {
    if (!req.body) {
        res.json({ error: 'Lỗi khi lấy dữ liệu!' });
        return;
    }
    User.find({ userName: req.body.userName })
        .then((user) => {
            if (user.length === 1) {
                Statistical.find({ userName: req.body.userName })
                    .then((statistical) => {
                        if (statistical.length === 1) {
                            res.json({
                                information: {
                                    userName: req.body.userName,
                                    coin: user[0].coin,
                                    avatar: user[0].avatar,
                                    diamond: user[0].diamond,
                                },
                                statistical: {
                                    numberOfGamesPlayed: statistical[0].numberOfGamesPlayed,
                                    numberOfGamesWon: statistical[0].numberOfGamesWon,
                                    numberOfGamesDraw: statistical[0].numberOfGamesDraw,
                                    currentWinStreak: statistical[0].currentWinStreak,
                                    longestWinStreak: statistical[0].longestWinStreak,
                                    getTenScore: statistical[0].getTenScore,
                                    getOneScore: statistical[0].getOneScore,
                                }
                            });
                        } else {
                            res.json({ error: "Lỗi khi lấy dữ liệu!" });
                        }
                    })
                    .catch(error => console.log(error))

            } else {
                res.json({ error: "Lỗi khi lấy dữ liệu!" });
            }
        })
        .catch(error => console.log(error))
}

exports._changeAvatar = async (req, res) => {
    if (!req.body.base64String) {
        return res.status(403).send({
            mes: "Không có ảnh nào được gửi lên!"
        });
    }
    await User.updateOne({ userName: req.userName }, {
        avatar: req.body.base64String,
    })
    res.status(200).send({
        status: 200,
    })
}

exports._checkIfUserIsPlaying = async (req, res) => {
    if (!req.body.userName) {
        return res.status(403).send({
            mes: "Người dùng không tồn tại!"
        });
    }

    let userName = req.body.userName;

    await User.updateOne({ userName: userName }, {
        connected: true,
    })
    //kiểm tra xem có đang trong phòng nào không, nếu có thì update,
    try {
        Room.find({})
            .then((rooms) => {
                let i;
                let size = rooms.length;
                for (i = 0; i < size; i++) {
                    if (rooms[i].playersInRoom.indexOf(userName) !== -1) {
                        let roomName = rooms[i].roomName;
                        console.log("Người chơi đang ở trong phòng:", roomName);
                        return res.status(200).send({
                            userIsPlaying: true,
                            roomData: rooms[i],
                        });
                    }
                }
                return res.status(200).send({
                    userIsPlaying: false,
                })
            })
            .catch(err => {
                console.log(err);
                return res.status(500).send({
                    userIsPlaying: false,
                })
            })
    } catch (error) {
        console.log(error);
    }
}