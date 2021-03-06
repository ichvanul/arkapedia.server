require('dotenv').config();
const Users = require('../models').user;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ErrorHandler } = require('../helper/error');
const sendEmail = require('../helper/sendEmail');

exports.signUp = (req, res, next) => {
  const salt = bcrypt.genSaltSync(10);
  Users
    .create({
      name: req.body.name,
      email: req.body.email,
      password: bcrypt.hashSync(req.body.password, salt),
      image: 'http://192.168.1.97:5000/uploads/default-user.jpg',
      birthdate: req.body.birthdate,
      sex: req.body.sex,
      phone: req.body.phone,
      isActive: 0,
      roleId: req.body.roleId || 3
    })
    .then(data => {
      const token = jwt.sign( {id: data.id}, process.env.SECRET_KEY );
      sendEmail.sendEmail(token, req.body.email);
      res.status(201).send({
        user: data,
        message: 'User has been created!'
      });
    })
    .catch((error) => {
      console.log(error);
    });
};

exports.signIn = async (req, res, next) => {
  try {
    const user = await Users.findOne({
      where: {
        email: req.body.email
      }
    });
    if (!user) {
      res.status(200).json({
        message: 'You are not registered! Please Signup',
        id: 0
      });
    } else {
      Users
        .findOne({
          where: {
            email: req.body.email
          }
        })
        .then(data => {
          if (data) {
            const authorized = bcrypt.compareSync(
              req.body.password,
              data.password
            );
            if (authorized) {
              const status = data.isActive;
              if (status == 1) {
                const token = jwt.sign( {
                  id: data.id
                }, process.env.SECRET_KEY );
                res.status(200).send({
                  user: data.id,
                  token: token,
                  role: data.role,
                  message: 'Login Successfuly!'
                });
              } else {
                res.status(200).json({
                  message: 'Please Activate Your Email',
                  isActive: 0
                });
              }
            } else {
              res.status(200).json({
                message: 'Wrong Password',
                status: 0
              });
            }
          }
        });
    }
  } catch(error) {
    next(error);
  }
};

exports.getAllUsers = (req, res, next) => {
  Users.findAndCountAll({
    exclude: ["createdAt", "updatedAt"],
  })
    .then(data => {
      res.status(200).send({
        users: data
      });
    })
    .catch(() => {
      throw new ErrorHandler(500, 'Internal server error');
    });
};

exports.checkUsers = async (req, res, next) => {
  // try {
    const user = await Users.findOne({
      where: {
        email: req.body.email
      }
    });
    if (!user) {
      res.status(200).json({
        message: 'Alhamdulillah',
        status: 1
      });
    } else {
      res.status(200).json({
        message: 'Astagfirullah',
        status: 0
      });
    }
  // } catch(error) {
  //   next(error);
  // }
};

exports.getUserById = async (req, res, next) => {
  const userId = req.params.userId;

  try {
    const user = await Users.findOne({
      where: {
        id: userId
      }
    });
    if (!user) {
      throw new ErrorHandler(404, 'User not found!');
    }
    else {
      Users
        .findOne({
          where: {
            id: userId
          },
          exclude: ["createdAt", "updatedAt"],
        })
        .then(data => {
          // const token = jwt.sign({
          //   id: data.id
          // }, process.env.SECRET_KEY);
          res.status(200).send({
            user: data,
            // token: token
          });
        });
    }
  } catch(error) {
    next(error);
  }
};

exports.userActivation = (req, res, next) => {
  const header = req.query.token;
  if(!header) {
    throw new ErrorHandler(400, 'Anda lupa baca bismillah.');
  } else {
    jwt.verify(header, process.env.SECRET_KEY, (err, decoded) => {
      if(err) {
        throw new ErrorHandler(401, 'Wrong token!');
      } else {
        req.userId = decoded.id;
        console.log(req.userId);
      }
    })
  }
  Users
    .update({
      isActive: 1
    }, {
      where: {
        id: req.userId
      }
    })
    .then(data => {
      res.status(200).send({
        user: data
      });
    })
    .catch(() => {
      throw new ErrorHandler(500, 'Internal server error');
    });
};

exports.updateUser = (req, res, next) => {
  const salt = bcrypt.genSaltSync(10);
  const userId = req.params.userId;

  const user = Users.findOne({
    id: userId
  });
  if (!user) {
    throw new ErrorHandler(404, 'User not found!')
  } else {
    if(req.body.password){
      Users
        .update({
          name: req.body.name,
          email: req.body.email,
          password: bcrypt.hashSync(req.body.password, salt),
          image: 'http://192.168.1.97:5000/uploads/default-user.jpg' ||
          `http://192.168.1.97:5000/uploads/${req.file.filename}`,
          birthdate: req.body.birthdate,
          sex: req.body.sex,
          phone: req.body.phone,
          isActive: 1,
          roleId: req.body.roleId || 3
        },
        {
          where: {
            id: userId
          }
        })
        .then(data => {
          res.status(200).send({
            message: 'User has been updated!',
            user: data
          });
        });
    } else {
      Users
        .update({
          name: req.body.name,
          email: req.body.email,
          image: 'http://192.168.1.97:5000/uploads/default-user.jpg' ||
          `http://192.168.1.97:5000/uploads/${req.file.filename}`,
          birthdate: req.body.birthdate,
          sex: req.body.sex,
          phone: req.body.phone,
          isActive: 1,
          roleId: req.body.roleId || 3
        },
        {
          where: {
            id: userId
          }
        })
        .then(data => {
          res.status(200).send({
            message: 'User has been updated!',
            user: data
          });
        });
    }
  }
};

exports.deleteUser = async (req, res, next) => {
  const userId = req.params.userId;

  try {
    const user = await Users.findOne({
      where: {
        id: userId
      }
    });
    if (!user) {
      throw new ErrorHandler(404, 'User not found!');
    } else {
      Users
        .destroy({
          where: {
            id: userId
          }
        })
        .then(data => {
          res.status(200).send({
            message: 'User has been deleted!',
            user: data
          });
        });
    }
  } catch(error) {
    next(error);
  }
};
