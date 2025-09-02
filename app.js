const express = require("express");
const app = express();
const UserModel = require("./models/user");
const TodoModel = require("./models/todo");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

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
app.get("/todos", isLoggedIn, async (req, res) => {
  const loggedInUser = await UserModel.find({ _id: req.user.userId });
  const todos = await TodoModel.find({ user: loggedInUser[0]._id }).populate(
    "user"
  );
  res.render("todos", { todos, userName: loggedInUser[0].name });
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
  res.render("login");
});
app.get("/logout", (req, res) => {
  res.cookie("token", "");
  res.redirect("/");
});
app.get("/signup", (req, res) => {
  res.render("signup");
});
app.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;
  bcrypt.genSalt(10, function (err, salt) {
    bcrypt.hash(password, salt, async function (err, hashPassword) {
      const newUser = new UserModel({
        name,
        email,
        password: hashPassword,
      });
      await newUser.save();
      res.redirect("/");
    });
  });
});
app.post("/login", async (req, res) => {
  const { email } = req.body;
  let UserPresent = await UserModel.findOne({ email });
  if (!UserPresent) {
    console.log("User Not Present");
    res.redirect("/signup");
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
          console.log("PassWord Wrong!");
        }
      }
    );
  }
});
app.get("/delete/:todoId",isLoggedIn, async (req, res) => {
  const todoId = req.params.todoId;
  const deletedTodo = await TodoModel.findOneAndDelete({ _id: todoId });
  res.redirect("/todos");
});
app.get("/edit/:todoId", isLoggedIn, async (req, res) => {
  const loggedInUser = await UserModel.find({ _id: req.user.userId });

  const todoId = req.params.todoId;
  const editTodo = await TodoModel.findOne({ _id: todoId });
  const todos = await TodoModel.find({ user: loggedInUser[0]._id }).populate(
    "user"
  );
  res.render("todos", { editTodo, todos, userName: loggedInUser[0].name });
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