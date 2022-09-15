const jwt = require("jsonwebtoken");
const User = require('../models/User');

verifyToken = async (req, res, next) => {
    try {
        let token = req.headers["x-access-token"];

        if (!token) {
            return res.status(403).send({
                message: "No token provided!"
            });
        }

        const payload = await jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        req.userName = payload.data.userName;

        return next();
    } catch (error) {
        if(error.name === 'TokenExpiredError'){
            console.log("Token expired!");
            return res.status(401).send({
                message: error.message
            })
        }
        console.log(error);
    }
};

isAdmin = (req, res, next) => {
    User.findOne({ userName: req.body.userName })
        .then(user => {
            for (let i = 0; i < user.roles.length; i++) {
                if (roles[i] === "admin") {
                    next();
                    return;
                }
            }

            res.status(403).send({
                message: "Require Admin Role!"
            });
            return;
        });
};

isModerator = (req, res, next) => {
    User.findOne({ userName: req.body.userName })
        .then(user => {
            for (let i = 0; i < user.roles.length; i++) {
                if (roles[i] === "moderator") {
                    next();
                    return;
                }
            }

            res.status(403).send({
                message: "Require Moderator Role!"
            });
            return;
        });
};

isModeratorOrAdmin = (req, res, next) => {
    User.findOne({ userName: req.body.userName })
        .then(user => {
            for (let i = 0; i < user.roles.length; i++) {
                if (roles[i] === "admin") {
                    next();
                    return;
                }

                if (roles[i] === "moderator") {
                    next();
                    return;
                }
            }

            res.status(403).send({
                message: "Require Admin Or Moderator Role!"
            });
            return;
        });
};

const authJwt = {
    verifyToken: verifyToken,
    isAdmin: isAdmin,
    isModerator: isModerator,
    isModeratorOrAdmin: isModeratorOrAdmin
};
module.exports = authJwt;
