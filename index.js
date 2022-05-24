const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bodyParse = require("body-parser");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
var hbs = require("hbs");
const path = require("path");
const async = require("hbs/lib/async");
const { log } = require("console");
const { v4: uuidv4 } = require("uuid");
const { redirect } = require("express/lib/response");
const app = express();
const port = 3000;
const fs = require("fs");
var fileDownload = require("js-file-download");
app.use(cors());
app.use(bodyParse());
app.use(cookieParser());
app.use(express.static(__dirname));
app.set("views", path.join(__dirname));
app.set("view engine", "hbs");

//Kết nối DataBase
try {
  mongoose.connect("mongodb://localhost:27017/ManagerAccount");
  console.log(`Kết nối thành công!`);
} catch (error) {
  console.log(`Kết nối thất bại!`);
}

//Tạo các bảng trong DataBase
///Tạo bảng Account
const account = new mongoose.Schema({ username: "string", password: "string" });
const Account = mongoose.model("account", account);
///Tạo bảng KeyMay
const keycomputer = new mongoose.Schema({
  keymay: {
    type: "String",
  },
});
const KeyComputer = mongoose.model("keycomputer", keycomputer);
///Tạo bảng Data
const data = new mongoose.Schema({
  keyComputer: {
    type: "String",
  },
  username: "string",
  password: "string",
  cookie: "string",
  ma2fa: "string",
  namehotmail: "string",
  passhotmail: "string",
  token: "string",
  time: "string",
  count: "string",
});
const Data = mongoose.model("data", data);

const count = new mongoose.Schema({ count: { type: "Number", default: 0 } });
const Count = mongoose.model("count", count);
//Tạo Router
///Tạo router get login
app.get("/login", (req, res) => {
  return res.render("login");
});
///Tạo router post login
app.post("/login", async (req, res) => {
  let userName = req.body.username;
  let passWord = req.body.password;
  const findUser = await Account.findOne({
    username: userName,
    password: passWord,
  });
  if (findUser) {
    const token = jwt.sign({ username: { userName } }, "vominhhieu");
    res.cookie("token", token);
    res.redirect("/");
  } else {
    res.render("login", { err: "Lỗi sai mật khẩu hoặc tên đăng nhập!" });
  }
});
///Tạo router get home
app.get("/", async (req, res) => {
  const token = req.cookies.token;
  try {
    jwt.verify(token, "vominhhieu");
    var today = new Date();
    const dayNow = today.getDate();
    const monthNow = today.getMonth() + 1;
    const yearNow = today.getFullYear();
    const data = await Data.find();
    const countDay = data.filter((data) => {
      if (data.time) {
        return data.time.slice(0, 2).includes(dayNow);
      }
    }).length;
    const countMonth = data.filter((data) => {
      if (data.time) {
        const start = data.time.indexOf(":");
        const end = data.time.lastIndexOf(":");
        return data.time.slice(start + 1, end).includes(monthNow);
      }
    }).length;
    const countYear = data.filter((data) => {
      if (data.time) {
        const end = data.time.lastIndexOf(":") + 1;
        return data.time.slice(end).includes(yearNow);
      }
    }).length;
    // const account = await Data.find().populate("keycomputer");
    // console.log(account);
    var listMaMay = await KeyComputer.find();
    var datas = [];
    for (const mamay of listMaMay) {
      var i = await Data.find({ keyComputer: mamay.keymay });
      datas.push({
        _id: mamay.keymay,
        data: i,
      });
    }
    // for (var dataOfDatas of datas) {
    //   var today = new Date();
    //   const getDay = today.getDate();
    //   const getMonth = today.getMonth() + 1;
    //   const getYear = today.getFullYear();
    //   for (var item of dataOfDatas) {
    //     console.log(item);
    //   }
    // }
    const result = [];
    for (let i = 0; i < datas.length; i++) {
      const getDay = today.getDate();
      const getMonth = today.getMonth() + 1;
      const getYear = today.getFullYear();
      const countDay = datas[i].data.filter((d) => {
        return d.time.slice(0, 2).includes(getDay);
      }).length;

      const countMonth = datas[i].data.filter((d) => {
        const start = d.time.indexOf(":");
        const end = d.time.lastIndexOf(":");
        return d.time.slice(start + 1, end).includes(getMonth);
      }).length;

      const countYear = datas[i].data.filter((d) => {
        const end = d.time.lastIndexOf(":") + 1;
        return d.time.slice(end).includes(getYear);
      }).length;
      result.push({
        _id: datas[i]._id,
        countDay: countDay,
        countMonth: countMonth,
        countYear: countYear,
      });
    }
    return res.render("home", {
      countDay: countDay,
      countMonth: countMonth,
      countYear: countYear,
      result: result,
    });
  } catch (error) {
    console.log(error);
    res.redirect("/login");
  }
});

///Tạo router get taikhoan
app.get("/taikhoan", async (req, res) => {
  const token = req.cookies.token;
  try {
    jwt.verify(token, "vominhhieu");
    var objectAccount = await Data.find();
    return res.render("taikhoan", { objectAccount: objectAccount });
  } catch (error) {
    res.redirect("/login");
  }
});
//Tạo router post taikhoan
app.post("/taikhoan/:key", async (req, res) => {
  var today = new Date();
  var isKey = await KeyComputer.find({ keymay: req.params.key });
  console.log(isKey);
  const taikhoan = {
    keyComputer: req.params.key,
    username: req.body.username,
    password: req.body.password,
    cookie: req.body.cookie,
    ma2fa: req.body.ma2fa,
    namehotmail: req.body.namehotmail,
    passhotmail: req.body.passhotmail,
    token: req.body.token,
    time:
      today.getDate() +
      ":" +
      (today.getMonth() + 1) +
      ":" +
      today.getFullYear(),
  };
  try {
    await Data.create(taikhoan);
    return res.json("Thành công!");
  } catch (error) {
    console.log(error);
    return res.json("Thất bại");
  }
});

///Tạo router get mamay
app.get("/mamay", async (req, res) => {
  const token = req.cookies.token;
  try {
    jwt.verify(token, "vominhhieu");
    var objectKey = await KeyComputer.find();
    return res.render("mamay", { objectKey: objectKey });
  } catch (error) {
    res.redirect("/login");
  }
});
///Tạo router post mamay
app.post("/mamay", async (req, res) => {
  try {
    await KeyComputer.create({ keymay: uuidv4() });
    return res.json({ status: 200 });
  } catch {
    return res.json({ status: 400 });
  }
});
//Tạo router delete mamay
app.delete("/delete/:key", async (req, res) => {
  try {
    const key = req.params.key;
    await KeyComputer.findByIdAndDelete(key);
    return res.json({ status: 200 });
  } catch (error) {
    return res.json({ status: 400 });
  }
});

///Tạo router get data
app.get("/getdata", (req, res) => {
  const token = req.cookies.token;
  try {
    // const data = [1, 2, 3, 4, 5, 6].join("\n")
    jwt.verify(token, "vominhhieu");

    return res.render("getdata");
  } catch (error) {
    console.log(error);
    res.redirect("/login");
  }
});
///Tạo router post data
app.post("/getdata", async (req, res) => {
  const listCount = await Count.find();
  const numberStart = listCount[0].count;
  const numberEnd = numberStart + Number.parseInt(req.body.number);
  var datas = await Data.find().skip(numberStart).limit(numberEnd);
  var listData = [];
  datas.forEach((element) => {
    const data =
      element.username +
      "|" +
      element.password +
      "|" +
      element.cookie +
      "|" +
      element.ma2fa +
      "|" +
      element.namehotmail +
      "|" +
      element.passhotmail +
      "|" +
      element.token;
    listData.push(data);
  });
  var stream = await fs.createWriteStream("Accounts.txt");
  stream.once("open", function (fd) {
    stream.write(listData.join("\n").toString());
    stream.end();
  });
  const file = `${__dirname}/Accounts.txt`;
  res.download(file);
  await Count.findByIdAndUpdate(listCount[0]._id, { count: numberEnd });
  // datas.forEach(async function (value) {
  //   await Data.findByIdAndDelete(value._id);
  // });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
hbs.registerHelper("eachData", function (context, options) {
  var fn = options.fn,
    inverse = options.inverse,
    ctx;
  var ret = "";

  if (context && context.length > 0) {
    for (var i = 0, j = context.length; i < j; i++) {
      ctx = Object.create(context[i]);
      ctx.index = i;
      ret = ret + fn(ctx);
    }
  } else {
    ret = inverse(this);
  }
  return ret;
});

hbs.registerHelper("math", function (lvalue, operator, rvalue, options) {
  lvalue = parseFloat(lvalue);
  rvalue = parseFloat(rvalue);

  return {
    "+": lvalue + rvalue,
  }[operator];
});
