const express = require("express");
const app = express();
const config = require("./config/config.json");
const Wechat = require("./wechat/wechat");
let wechat = new Wechat(config); //实例化一个Wechat对象

app.get("/", (req, res, next) => {
  res.send('hello,欢迎来到我的node测试项目')
  wechat.auth(req, res, next);
  wechat.setMenu();
});

app.post("/", (req, res, next) => {
  wechat.autoMsg(req, res, next);
});

app.get("/dream", (req, res, next) => {
  res.send('hello,欢迎来到梦商城')
});
app.get("/dragon", (req, res, next) => {
  res.send('hello,欢迎来到龙之梦大酒店')
});
app.get("/moutain", (req, res, next) => {
  res.send('hello,欢迎来到瑞峰国际酒店')
});
app.get("/elegant", (req, res, next) => {
  res.send('hello,欢迎来到雅仕商务酒店')
});
app.get("/partment", (req, res, next) => {
  res.send('hello,瑞峰公寓酒店')
});


app.listen(3000, () => {
  console.log("端口3000服务已启动");
});
