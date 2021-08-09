const sha1 = require("sha1");
const parseString = require("xml2js").parseString;
const msg = require("../common/msg");
const request = require("request");
const path = require("path");
const fs = require("fs");
const util = require("util");
const accessTokenJson = require("../config/access_token.json");
const menu = require("./menu.json"); //自定义菜单
const { deleteMenu, createMenu } = require("../common/menu");

//构造函数
function Wechat(config) {
  this.config = config;
  this.token = config.wechat.token;
  this.appID = config.wechat.appID;
  this.appScrect = config.wechat.appsecret;
  this.prefix = config.wechat.prefix;
  this.diyApi = config.wechat.diyApi;
}

//一、微信授权验证方法
Wechat.prototype.auth = function (req, res, next) {
  // 获取微信服务器发送的数据
  let signature = req.query.signature,
    timestamp = req.query.timestamp,
    nonce = req.query.nonce,
    echostr = req.query.echostr;
  //token、timestamp、nonce三个参数进行字典序排序
  let arr = [this.token, timestamp, nonce].sort().join("");
  let result = sha1(arr);
  if (result === signature) {
    res.send(echostr);
  } else {
    res.send("mismatch");
  }
};

// 二、Node开发微信公众号--微信回复
//   思路：当用户关注或者发送消息的时候，微信服务器会给我们发送一个post请求，把用户的信息以及发送信息返回给我们，我们根据用户发送的信息再把相应的内容发送到微信服务器
//   困难：微信返回和接受的数据格式都是xml，所以我们要对xml进行转化。所以需要引入几个新的模块
Wechat.prototype.autoMsg = (req, res, next) => {
  let buffer = [];
  req.on("data", function (data) {
    buffer.push(data);
  });
  req.on("end", function () {
    let msgXml = Buffer.concat(buffer).toString("utf-8");
    parseString(msgXml, { explicitArray: false }, (err, result) => {
      console.log("result", result);
      //如果有错误直接抛出
      if (err) throw err;
      const {
        ToUserName,
        FromUserName,
        CreateTime,
        MsgType,
        Event,
        EventKey,
        Content,
      } = result.xml;
      // 接收普通消息：当普通微信用户向公众账号发消息时，微信服务器将POST消息的XML数据包发到开发者填写的URL上，
      // 当服务器接收到消息，服务器如果没有做出回应，会断开连接并重新发起请求，重复三次操作，若还未作出回应便回复：该公众号提供的服务出现故障，请稍后再试

      //判断消息类型
      if (MsgType == "text") {
        let resultXml = msg.textMsg(FromUserName, ToUserName, Content);
        res.send(resultXml);
      } else if (MsgType === "image") {
        //回复图片
        //在这里图片相当于素材，用户发送的素材只是临时素材，只能在微信服务器保存三天，回复思路：
        //先上传素材---先封装一个post请求，然后通过素材接口获取media_id来获取素材
        //上传素材就需要封装post get以及素材上传的api
        //注意在上传素材时需要access_token所以也需要封装获取access_token的api
        // let urlPath = path.join(__dirname, "../material/timg.jpg");
        // this.uploadFile(urlPath, "image").then( (mdeia_id) =>{
        //   resultXml = msg.imgMsg(fromUser, toUser, mdeia_id);
        //   res.send(resultXml);
        // })
      }
    });
  });
};

// 三、获取access_token
// access_token是公众号的全局唯一接口调用凭据，公众号调用各接口时都需要使用access_token。所以说这个access_token是很重要的，
// 而且这个票据只能保存2个小时,2个小时后就失效了,需要重新获取
// 先将请求地址配到config上，因为微信上的请求接口他们的前缀都是一样的，所以我们可以把前缀提取出来
Wechat.prototype.getAccessTokenRes = function () {
  return new Promise((resolve, reject) => {
    let currentTime = new Date().getTime();
    //格式化请求地址，把刚才的%s按顺序替换
    let url = util.format(
      this.diyApi.getAccessToken,
      this.prefix,
      this.appID,
      this.appScrect
    );

    //判断本地存储的access_token是否有效
    if (
      accessTokenJson.access_token === "" ||
      accessTokenJson.expires_time < currentTime
    ) {
      this.requestGet(url)
        .then((data) => {
          let res = JSON.parse(data);
          console.log("当前的access_token", res);
          if (data.indexOf("errcode") < 0) {
            accessTokenJson.access_token = res.access_token;
            accessTokenJson.expires_time =
              new Date().getTime() + parseInt(res.expires_in) * 1000;
            console.log(accessTokenJson);
            //更新本地存储的
            fs.writeFile(
              `${path.join(__dirname, "./../config/access_token.json")}`,
              JSON.stringify(accessTokenJson),
              (err) => {
                if (err) {
                  throw err;
                } else {
                  console.log("access_token失效,重新写入成功");
                }
              }
            );
            resolve(accessTokenJson.access_token);
          }
        })
        .catch((err) => {
          console.log("err", err);
        });
    } else {
      //将本地存储的access_token 返回
      // console.log('有已存的tokEventKey')
      resolve(accessTokenJson.access_token);
    }
  });
};

Wechat.prototype.setMenu = async function () {
  try {
    const access_token = await this.getAccessTokenRes();
    console.log("创建菜单前获取到的access_token", this.getAccessTokenRes());
    // 一定要记得创建前先删除菜单
    await deleteMenu(access_token);
    // 创建菜单
    await createMenu(access_token);
    // console.log('创建菜单成功')
  } catch (error) {
    console.log("自定义菜单创建失败：" + error);
    next(error);
  }
};

// 四、封装get请求方法
Wechat.prototype.requestGet = (url) => {
  return new Promise((resolve, reject) => {
    request(url, (error, response, body) => {
      resolve(body);
    });
  });
};

// 五、封装post请求方法
Wechat.prototype.requestPost = (url, data) => {
  return new Promise((resolve, reject) => {
    request.post({ url, formData: data }, (error, httpResponse, body) => {
      resolve(body);
    });
  });
};

// 六、封装上传素材请求方法
Wechat.prototype.uploadFile = (urlPath, type) => {
  return new Promise((resolve, reject) => {
    this.getAccessToken().then((data) => {
      //data====access_token
      let form = {
        media: fs.createReadStream(urlPath),
      };
      let url = util.format(this.diyApi.uploadFile, this.prefix, data, type);
      this.requestPost(url, form).then((result) => {
        resolve(JSON.parse(result).media_id);
      });
    });
  });
};

// 暴露WeChat对象
module.exports = Wechat;
