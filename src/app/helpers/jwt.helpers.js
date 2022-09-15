const jwt = require("jsonwebtoken");

let generateToken = (userData, secretSignature, tokenLife) => {
    return new Promise((resolve, reject) => {
        jwt.sign(
            { data: userData },
            secretSignature,
            {
                algorithm: process.env.ALGORITHM || "HS256",
                expiresIn: tokenLife,
            },
            (error, token) => {
                if (error) {
                    return reject(error);
                }
                resolve(token);
            });
    });
}

module.exports = {
    generateToken: generateToken,
};