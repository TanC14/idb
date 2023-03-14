const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer');
const crypto = require('crypto')
const User = require('../models/user')
const EmailVerificationToken = require('../models/emailVerificationToken');
const { isValidObjectId } = require('mongoose');

const { sendError} = require('../utils/helper');
const PasswordResetToken = require('../models/passwordResetToken');

exports.create = async (req, res) => {
  const { name, email, password } = req.body

  const oldUser = await User.findOne({ email });

  if (oldUser) return sendError(res, "This email is already in use!")

  const newUser = new User({ name, email, password })
  await newUser.save()

  // generate 6 digit otp
  let OTP = "";
  for (let i = 1; i <= 6; i++) {
      const randomVal = Math.round(Math.random() * 9);
      OTP += randomVal;
  }


  // store otp inside our db
  const newEmailVerificationToken = new EmailVerificationToken({ owner: newUser._id, token: OTP })

  await newEmailVerificationToken.save()

  // send that otp to our user

  var transport =
  nodemailer.createTransport({
      host: "smtp.mailtrap.io",
      port: 587,
      auth: {
          user: "f74fef37600ddb",
          pass: "2205e982d72fcb"
      }
  });

  transport.sendMail({
    from: 'verification@reviewapp.com',
    to: newUser.email,
    subject: 'Email Verification',
    html: `
      <p>You verification OTP</p>
      <h1>${OTP}</h1>
    `
  })

  res.status(201).json({
    user: {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
    },
  });
};

exports.verifyEmail = async (req, res) => {
  const { userId, OTP } = req.body;

  if (!isValidObjectId(userId)) return sendError(res, "Invalid user!");

  const user = await User.findById(userId);
  if (!user) return sendError(res, "user not found!", 404);

  if (user.isVerified) return sendError(res, "user is already verified!");

  const token = await EmailVerificationToken.findOne({ owner: userId });
  if (!token) return sendError(res, "token not found!");

  const isMatched = await token.compareToken(OTP);
  if (!isMatched) return sendError(res, "Please submit a valid OTP!");

  user.isVerified = true;
  await user.save();

  await EmailVerificationToken.findByIdAndDelete(token._id);

  var transport = nodemailer.createTransport({
    host: "smtp.mailtrap.io",
    port: 587,
    auth: {
      user: "f74fef37600ddb",
      pass: "2205e982d72fcb",
    },
  });
  transport.sendMail({
    from: "verification@reviewapp.com",
    to: user.email,
    subject: "Welcome Email",
    html: "<h1>Welcome to our app and thanks for choosing us.</h1>",
  });
  const jwtToken = jwt.sign({ userId: user._id }, "fjaksdkflKFAFkfajdsfh");
  res.json({
    user: { id: user._id, name: user.name, email: user.email, token: jwtToken, role: user.role },
    message: "Your email is verified.",
  });
}

exports.resendEmailVerificationToken = async (req, res) => {
  const { userId } = req.body;

  const user = await User.findById(userId);
  if (!user) return sendError(res, "user not found!");

  if (user.isVerified)
    return sendError(res, "This email id is already verified!");

  const alreadyHasToken = await EmailVerificationToken.findOne({
    owner: userId,
  });
  if (alreadyHasToken)
    return sendError(res, "Only after one hour you can request for another token!");

  // generate 6 digit otp
  let OTP = "";
  for (let i = 1; i <= 6; i++) {
      const randomVal = Math.round(Math.random() * 9);
      OTP += randomVal;
  }


  // store otp inside our db
  const newEmailVerificationToken = new EmailVerificationToken({ owner: user._id, token: OTP })

  await newEmailVerificationToken.save()

  // send that otp to our user

  var transport =
  nodemailer.createTransport({
      host: "smtp.mailtrap.io",
      port: 587,
      auth: {
          user: "f74fef37600ddb",
          pass: "2205e982d72fcb"
      }
  });

  transport.sendMail({
    from: 'verification@reviewapp.com',
    to: user.email,
    subject: 'Email Verification',
    html: `
      <p>You verification OTP</p>
      <h1>${OTP}</h1>
    `
  })

  res.json({
    message: "New OTP has been sent to your registered email accout.",
  });
};
//Forget password
exports.forgetPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) return sendError(res, "email is missing!");

  const user = await User.findOne({ email });
  if (!user) return sendError(res, "User not found!", 404);

  const alreadyHasToken = await PasswordResetToken.findOne({ owner: user._id });
  if (alreadyHasToken)
    return sendError(
      res,
      "Only after one hour you can request for another token!"
    );

    const generate = generateRandomByte = () => {
      return new Promise((resolve, reject) => {
          crypto.randomBytes(30, (err, buff) => {
              if (err) reject(err);
              const buffString = buff.toString("hex");
  
              resolve(buffString);
          });
      });
  };
  const token = await generate();
  const newPasswordResetToken = await PasswordResetToken({
    owner: user._id,
    token,
  });
  await newPasswordResetToken.save();

  const resetPasswordUrl = `http://localhost:3000/auth/reset-password?token=${token}&id=${user._id}`;

  var transport =
  nodemailer.createTransport({
      host: "smtp.mailtrap.io",
      port: 587,
      auth: {
          user: "f74fef37600ddb",
          pass: "2205e982d72fcb"
      }
  });

  transport.sendMail({
    from: "security@reviewapp.com",
    to: user.email,
    subject: "Reset Password Link",
    html: `
      <p>Click here to reset password</p>
      <a href='${resetPasswordUrl}'>Change Password</a>
    `,
  });

  res.json({ message: "Link sent to your email!" });
};

exports.sendResetPasswordTokenStatus = (req, res) => {
  res.json({ valid: true })
}

exports.resetPassword = async (req, res) => {
  const { newPassword, userId } = req.body;

  const user = await User.findById(userId);
  const matched = await user.comparePassword(newPassword);
  if (matched)
    return sendError(
      res,
      "The new password must be different from the old one!"
    );

  user.password = newPassword;
  await user.save();

  await PasswordResetToken.findByIdAndDelete(req.resetToken._id);

  var transport =
  nodemailer.createTransport({
      host: "smtp.mailtrap.io",
      port: 587,
      auth: {
          user: "f74fef37600ddb",
          pass: "2205e982d72fcb"
      }
  });
  transport.sendMail({
    from: "security@reviewapp.com",
    to: user.email,
    subject: "Password Reset Successfully",
    html: `
      <h1>Password Reset Successfully</h1>
      <p>Now you can use new password.</p>

    `,
  });

  res.json({
    message: "Password reset successfully, now you can use new password.",
  });
}

exports.signIn = async (req, res,) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return sendError(res, "Email/Password mismatch!");

  const matched = await user.comparePassword(password);
  if (!matched) return sendError(res, "Email/Password mismatch!");

  const { _id, name ,role,  isVerified } = user;

  const jwtToken = jwt.sign({ userId: _id }, 'fjaksdkflKFAFkfajdsfh');

  res.json({
    user: { id: _id, name, email, token: jwtToken,role, isVerified },
  });
};

