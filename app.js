const express = require("express");
const app = express();
const UserModel = require("./models/user");
const TodoModel = require("./models/todo");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { check, validationResult } = require("express-validator");

const cookieParser = require("cookie-parser");
require("dotenv").config();

mongoose.connect(process.env.MONGO_URI);

app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.render("home");
});
app.get("/terms", (req, res) => {
  res.render("terms");
});
app.get("/todos", isLoggedIn, async (req, res) => {
  const loggedInUser = await UserModel.find({ _id: req.user.userId });
  const todos = await TodoModel.find({ user: loggedInUser[0]._id }).populate(
    "user"
  );
  res.render("todos", { todos, userFristName: loggedInUser[0].firstName });
});
app.post("/addtodo", isLoggedIn, async (req, res) => {
  const { todo, date } = req.body;
  const user = await UserModel.find({ _id: req.user.userId });
  const newTodo = new TodoModel({
    todo,
    date,
    user: user[0]._id,
  });
  await newTodo.save();
  res.redirect("/todos");
});
app.get("/login", (req, res) => {
  res.render("login", { errorMag: null, email: "" });
});

app.get("/logout", (req, res) => {
  res.cookie("token", "");
  res.redirect("/");
});
app.get("/signup", (req, res) => {
  res.render("signup", { errors: [], oldInput: {} });
});

app.post(
  "/signup",

  // Validation chain
  check("firstName")
    .trim()
    .isLength({ min: 2 })
    .withMessage("First Name should be at least 2 characters long")
    .matches(/^[A-Za-z\s]+$/)
    .withMessage("First Name should contain only alphabets"),

  check("lastName")
    .matches(/^[A-Za-z\s]*$/)
    .withMessage("Last Name should contain only alphabets"),

  check("email")
    .isEmail()
    .withMessage("Please enter a valid email")
    .normalizeEmail(),

  check("password")
    .isLength({ min: 8 })
    .withMessage("Password should be at least 8 characters long")
    .matches(/[A-Z]/)
    .withMessage("Password should contain at least one uppercase letter")
    .matches(/[a-z]/)
    .withMessage("Password should contain at least one lowercase letter")
    .matches(/[0-9]/)
    .withMessage("Password should contain at least one number")
    .matches(/[!@&]/)
    .withMessage("Password should contain at least one special character")
    .trim(),

  check("confirmPassword")
    .trim()
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Passwords do not match");
      }
      return true;
    }),

  check("terms")
    .notEmpty()
    .withMessage("Please accept the terms and conditions")
    .custom((value) => {
      if (value !== "on") {
        throw new Error("Please accept the terms and conditions");
      }
      return true;
    }),

  // Request handler
  async (req, res) => {
    const { firstName, lastName, email, password, terms } = req.body;
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(422).render("signup", {
        errors: errors.array().map((err) => err.msg),
        oldInput: { firstName, lastName, email },
        user: {},
      });
    }

    try {
      const termsAccepted = terms === "on";

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashPassword = await bcrypt.hash(password, salt);

      // Save user
      const newUser = new UserModel({
        firstName,
        lastName,
        email,
        password: hashPassword,
        termsAccepted,
      });

      await newUser.save();
      res.redirect("/");
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  }
);
app.post("/login", async (req, res) => {
  const { email } = req.body;
  let UserPresent = await UserModel.findOne({ email });
  if (!UserPresent) {
    console.error("User Not Present");
    res.render("login", {
      errorMag: "User not found. Please check your email or sign up.",
    });
  } else {
    bcrypt.compare(
      req.body.password,
      UserPresent.password,
      function (err, result) {
        if (result) {
          const token = jwt.sign(
            { userId: UserPresent._id, email: UserPresent.email },
            process.env.JWT_SECRET
            // { expiresIn: "1h" } // token expiry
          );
          res.cookie("token", token);
          return res.redirect("/todos");
        } else {
          console.error("PassWord Wrong!");
          // return res.redirect("/login");
          res.render("login", {
            errorMag: "Password is worng",
            email,
          });
        }
      }
    );
  }
});
app.get("/delete/:todoId", isLoggedIn, async (req, res) => {
  const todoId = req.params.todoId;
  await TodoModel.findOneAndDelete({ _id: todoId });
  res.redirect("/todos");
});
app.get("/edit/:todoId", isLoggedIn, async (req, res) => {
  const loggedInUser = await UserModel.find({ _id: req.user.userId });

  const todoId = req.params.todoId;
  const editTodo = await TodoModel.findOne({ _id: todoId });
  const todos = await TodoModel.find({ user: loggedInUser[0]._id }).populate(
    "user"
  );
  res.render("todos", {
    editTodo,
    todos,
    userFristName: loggedInUser[0].firstName,
  });
});
app.post("/edit-todo/:todoId", async (req, res) => {
  const { todo, date } = req.body;
  const todoId = req.params.todoId;
  await TodoModel.findOneAndUpdate(
    { _id: todoId },
    { todo, date },
    { new: true, runValidators: true }
  );
  res.redirect("/todos");
});

app.use("", (req, res) => {
  res.render("404");
});

function isLoggedIn(req, res, next) {
  if (!req.cookies.token) {
    return res.redirect("/"); // stop execution
  }
  const token = req.cookies.token;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.user = decoded;
  next();
}

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
  console.log(`Your App is running on => http://localhost:${PORT}`);
});
