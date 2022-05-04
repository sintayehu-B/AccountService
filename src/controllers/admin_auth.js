const Admin = require("../models/AdminModel/UserAdmin");
const bcrypt = require("bcrypt");
// const moment = require("moment");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const { SECRET } = require("../config");
const moment = require("moment");
/**
 * It takes in the user details, role, and response object, validates the email, hashes the password,
 * creates a new user object, saves the user to the database and returns a response to the user
 * @param admin_dets - This is the object containing the user details.
 * @param role - The role of the user.
 * @param res - The response object.
 * @returns a promise.
 */

const user_register = async (admin_dets, role, res) => {
  try {
    // //Validate username
    /* Checking if the username is already taken. */
    let email_not_taken = await validate_email(admin_dets.email);
    if (!email_not_taken) {
      return res.status(400).json({
        message: "email already taken.",
        success: false,
      });
    }

    /* Hashing the password. */
    const password = await bcrypt.hash(admin_dets.password, 12);

    /* Creating a new user object with the user details, role, password, description, phoneNumber and
  location. */
    const new_user = new Admin({
      ...admin_dets,
      role,
      password,
    });
    /* Saving the user to the database and returning a response to the user. */
    let resp = await new_user.save();
    return res.status(201).json({
      message: "Registration successful.",
      success: true,
      user: serialize_user(resp),
    });
  } catch (e) {
    /* A try catch block. */
    console.log(e);
    return res.status(500).json({
      message: `unable to create your account`,
      success: false,
    });
    // TODO Logging with winston
  }
};
/**
 * It checks if the user exists in the database, if it does, it checks if the password matches, if it
 * does, it returns a token.
 * </code>
 * @param admin_creds - {
 * @param res - response object
 * @returns a promise.
 */

const user_login = async (admin_creds, res) => {
  let { name, password, email } = admin_creds;
  // Check username or email
  const user = await Admin.findOne({
    $or: [{ name: name }, { email: email }],
  });
  if (!user) {
    return res.status(404).json({
      message: `There is not an account with this email or username`,
      success: false,
    });
  }
  let password_match = await bcrypt.compare(password, user.password);
  if (password_match) {
    let token = jwt.sign(
      {
        user_id: user._id,
        role: user.role,
        name: user.name,
        email: user.email,
      },
      SECRET,
      { expiresIn: "15 days" }
    );
    let result = {
      name: user.name,
      role: user.role,
      email: user.email,
      // password:user.password,
      token: `Bearer ${token}`,
      expiryDate: moment().add(200, "hours"),
    };
    return res.status(200).json({
      ...result,
      message: `login successful`,
      success: true,
    });
  } else {
    return res.status(403).json({
      message: `Invalid credentials!`,
      success: false,
    });
  }
};

/**
 * If a user is found, return false, otherwise return true.
 * @param name - The name of the user
 * @returns A promise that resolves to a boolean.
 */
const validate_username = async (name) => {
  let user = await Admin.findOne({ name });
  return user ? false : true;
};
/**
 * If a user is found with the email provided, return false, otherwise return true.
 * @param email - The email address to validate
 * @returns A boolean value.
 */
const validate_email = async (email) => {
  let user = await Admin.findOne({ email });
  return user ? false : true;
};
/**
 * Passport middleware
 */
/* A middleware that checks if the user is authenticated. */
const user_auth = passport.authenticate("jwt", { session: false });

/**
 * It updates a user's profile.
 * @param id - The id of the user you want to update
 * @param _user - The user object that you want to update
 * @param res - The response object
 * @returns a promise.
 */

const update_user = async (id, _user, res) => {
  try {
    let user = await Admin.findById(id);
    //Validate username
    let username_not_taken = await validate_username(_user.name);
    if (!username_not_taken && user._id === id) {
      return res.status(400).json({
        message: "Username already taken.",
        success: false,
      });
    }
    //Validate email
    let email_not_taken = await validate_email(_user.email);
    if (!email_not_taken && user._id === id) {
      return res.status(400).json({
        message: "email already taken.",
        success: false,
      });
    }

    user.email = _user.email || user.email;
    user.name = _user.name || user.name;

    //...Add the rest like this
    await user.save();
    return res.status(200).json({
      message: `Records updated successfully.`,
      success: true,
      user: user,
    });
  } catch (e) {
    console.log(e);
    return res.status(500).json({
      message: `unable to update your account`,
      success: false,
    });
    // TODO Logging with winston
  }
};

/**
 * Change Password
 */
/**
 * It takes in a user id, old password, new password and a response object. It then checks if the old
 * password matches the one in the database. If it does, it updates the password with the new one
 * @param id - The id of the user
 * @param old_password - The current password of the user
 * @param new_password - The new password that the user wants to change to.
 * @param res - response object
 * @returns a promise.
 */
const change_password = async (id, old_password, new_password, res) => {
  // TODO Check password strength
  try {
    const user = await Admin.findById(id);
    let password_match = await bcrypt.compare(old_password, user.password);
    if (!password_match && new_password) {
      //TODO Change this later on password strength check
      return res.status(403).json({
        message: `Incorrect Password.`,
        success: false,
      });
    } else {
      user.password = await bcrypt.hash(new_password, 12);
      await user.save();
      return res.status(200).json({
        message: `Password updated successfully.`,
        success: true,
      });
    }
  } catch (e) {
    console.log(e);
    return res.status(500).json({
      message: `unable to change your password.`,
      success: false,
    });
    // TODO Logging with winston
  }
};

/**
 * Check role middleware
 */
/**
 * If the user's role is included in the roles array, then return next() to continue the request,
 * otherwise return a 401 error.
 * @param roles - An array of roles that are allowed to access the route.
 * @returns A function that takes in a roles array and returns a function that takes in a request,
 * response, and next function.
 */
const role_auth = (roles) => (req, res, next) => {
  if (roles.includes(req.user.role)) {
    return next();
  }
  return res.status(401).json({
    message: `Unauthorized.`,
    success: false,
  });
};
/**
 * It takes a user object and returns a new object with only the properties that you want to expose to
 * the client.
 * @param user - The user object that is being serialized.
 * @returns The user object is being returned.
 */
const serialize_user = (user) => {
  return {
    role: user.role,
    verified: user.verified,
    _id: user._id,
    name: user.name,
    email: user.email,
  };
};
module.exports = {
  update_user,
  change_password,
  user_register,
  user_login,
  user_auth,
  serialize_user,
  role_auth,
};