const jwt = require('jsonwebtoken');
const User = require('../../../models/User');
const { NotFoundError, ForbiddenError } = require('../../../lib/errors');

/*
  POST /api/auth/login
*/

exports.login = async (req, res, next) => {
  try {
    const { facebookId, userName } = req.body;
    const secret = req.app.get('jwt-secret');

    const checkAndRegister = user => {
      return user ? user : register();
    };

    const register = () => {
      const newUser = new User({
        facebookId,
        userName,
        myPhotos: [],
        receivedPhotos: []
      });
      return newUser.save();
    };

    const login = userData => {
      const { _id, facebookId, userName } = userData;
      return new Promise((resolve, reject) => {
        jwt.sign(
          {
            _id,
            facebookId,
            userName
          },
          secret,
          {
            expiresIn: '7d',
            issuer: 'choinashil',
            subject: 'userInfo'
          }, (err, token) => {
            err ? reject(err) : resolve(token);
          }
        );
      });
    };

    const respond = accessToken => {
      res.json({
        message: 'logged in successfully',
        access_token: accessToken
      });
    };

    const user = await User.findOneByFacebookId(facebookId);
    const userData = await checkAndRegister(user);
    const accessToken = await login(userData);
    respond(accessToken);

  } catch(err) {
    const { name, message } = err;
    next(new NotFoundError(name, message));
  }
};


/*
  GET /api/auth/check
*/

exports.check = async (req, res, next) => {
  try {
    const secret = req.app.get('jwt-secret');
    const bearerHeader = req.headers['authorization'];

    if (typeof bearerHeader === 'undefined') {
      throw err;
    }

    const bearerToken = bearerHeader.split(' ')[1];

    const decode = () => {
      return new Promise((resolve, reject) => {
        jwt.verify(bearerToken, secret, (err, decoded) => {
          err ? reject(err) : resolve(decoded);
        });
      });
    };

    const respond = info => {
      const { userName } = info;
      info ? res.json({
        success: true,
        userName
      }) : res.json({success: false});
    };

    const userInfo = await decode();
    const userData = await User.findOneByFacebookId(userInfo.facebookId);
    respond(userData);

  } catch(err) {
    const { name, message } = err;
    next(new ForbiddenError(name, message));
  }
};
