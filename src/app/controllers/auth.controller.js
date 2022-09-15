const User = require('../models/User');
const { OAuth2Client } = require('google-auth-library');
const jwt = require("jsonwebtoken");
const jwtHelpers = require('../helpers/jwt.helpers');

const client = new OAuth2Client('15255751602-svs4ft3d6965q37hui0rasggiiq22q1d.apps.googleusercontent.com');

exports.signInWithGoogle = (req, res) => {
    client.verifyIdToken({
        idToken: req.body.idToken,
        audience: '15255751602-svs4ft3d6965q37hui0rasggiiq22q1d.apps.googleusercontent.com',
    })
        .then((resFromGoogle) => {
            const { email_verified, email } = resFromGoogle.getPayload();
            if (email_verified) {
                User.findOne({ email })
                    .then(async (user) => {
                        if (user) {
                            let accessToken = await jwtHelpers.generateToken({ userName: user.userName, email: user.email }, process.env.ACCESS_TOKEN_SECRET, process.env.ACCESS_TOKEN_LIFE);
                            let refreshToken;
                            if (user.refreshToken) {
                                refreshToken = user.refreshToken
                            } else {
                                refreshToken = await jwtHelpers.generateToken({ userName: user.userName, email: user.email }, process.env.REFRESH_TOKEN_SECRET, process.env.REFRESH_TOKEN_LIFE);
                            }
                            if (!accessToken || !refreshToken) {
                                return res.json({
                                    error: "Chưa thể đăng nhập vào lúc này!",
                                })
                            }

                            delete user.password;
                            delete user.roles;
                            delete user.connecting;
                            delete user.refreshToken;
                            res.status(200).json({
                                accessToken,
                                refreshToken,
                                user
                            })
                        } else {
                            res.json({
                                email: email,
                                message: 'no_name',
                            })
                        }
                    })
                    .catch(() => {
                        return res.status(400).json({
                            error: "Something went wrong...",
                        })
                    })
            }
        })
        .catch(err => {
            console.log(err);
        })
};

exports.refreshToken = async (req, res) => {

    if (!req.body.refreshToken) {
        return res.status(403).send({
            message: "No token provided!"
        });
    }

    jwt.verify(req.body.refreshToken, process.env.REFRESH_TOKEN_SECRET, async (error, decoded) => {
        if (error) {
            console.log('Refesh token expired!');
            return res.status(401).send({
                message: "Refesh token expired!"
            })
        }

        const newAccessToken = await jwtHelpers.generateToken( decoded.data, process.env.ACCESS_TOKEN_SECRET, process.env.ACCESS_TOKEN_LIFE);

        return res.status(200).send({
            newAccessToken
        })
    })
}