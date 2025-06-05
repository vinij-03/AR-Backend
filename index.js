const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");


const ModelFile = require("./models/ModelFile");
const User = require("./models/model");
const { default: nodemon } = require("nodemon");
dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MonogUrl);
    console.log("DB connected");
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};
connectDB();

const jwtsecret = process.env.JWT_SECRET;
const bcryptSalt = bcrypt.genSaltSync(10);

const app = express();
app.use(express.json());
app.use(
  cors({
    credentials: true,
    origin: [process.env.clientURL, "http://10.140.1.29:5173"],
  })
);
app.options("*", cors());
app.use(cookieParser());

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Make sure this folder exists
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage: storage });


app.get("/test", (req, res) => {
  res.json("Hello World!");
});

app.get("/profile", (req, res) => {
  
  const token = req.cookies?.token;
  if (token) {
    jwt.verify(token, jwtsecret, {}, (err, userData) => {
      if (err) throw err;
      // const { id, usernmae } = userData;
      res.json(userData);
    });
  } else {
    res.status(401).json("Unauthorized Check");
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const foundUser = await User.findOne({ username });
  if (foundUser) {
    const match = bcrypt.compareSync(password, foundUser.password);
    if (match) {
      jwt.sign(
        { userId: foundUser._id, username },
        jwtsecret,
        {},
        (err, token) => {
          if (err) throw err;
          res.cookie("token", token).json({
            id: foundUser._id,
            username: username,
          });
        }
      );
    }
  }
});

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const createdUser = await User.create({
      username: username,
      password: bcrypt.hashSync(password, bcryptSalt),
    });
    jwt.sign(
      { userId: createdUser._id, username },
      jwtsecret,
      {},
      (err, token) => {
        if (err) throw err;
        res
          .cookie("token", token, { sameSite: "none", secure: true })
          .status(201)
          .json({
            id: createdUser._id,
            username,
          });
      }
    );
  } catch (err) {
    if (err) throw err;
    res.status(500).json("Error");
  }
});

app.post("/logout", (req, res) => {
  res.cookie("token", "", {
    expires: new Date(0), // Set expiration to past date
    sameSite: "none",
    secure: true,
    httpOnly: true, // Helps prevent client-side access
  });
  res.status(200).json({ message: "Logged out successfully" });
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const newFile = await ModelFile.create({
    name: req.file.originalname,
    filePath: `/uploads/${req.file.filename}`,
  });
  res.status(201).json(newFile);
});


app.get("/models", async (req, res) => {
  const models = await ModelFile.find();
  res.json(models);
});


app.listen(3000, () => {
  console.log("Server said hello world");
});
