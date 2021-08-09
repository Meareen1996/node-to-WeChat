const rp = require("request-promise-native"); //发送请求
const menuData=require('../wechat/menu.json')


class Menu {
  constructor() {}
  deleteMenu(access_token) {
    const url = `https://api.weixin.qq.com/cgi-bin/menu/delete?access_token=${access_token}`;
    return new Promise((resolve, reject) => {
      rp({ method: "GET", url, json: true })
        .then((result) => {
          console.log("删除菜单成功");
          console.log(result);
          resolve();
        })
        .catch((err) => {
          console.log("删除菜单失败");
          console.log(err);
          reject(err);
        });
    });
  }
  createMenu(access_token) {
    const url = `https://api.weixin.qq.com/cgi-bin/menu/create?access_token=${access_token}`;
    const options = {
      url,
      method: "POST",
      json: true,
      headers: {
        "content-type": "application/json",
      },
      body: menuData,
    };

    return new Promise((resolve, reject) => {
      rp(options)
        .then((result) => {
          console.log("创建菜单成功");
          console.log(result);
          resolve();
        })
        .catch((err) => {
          console.log("创建菜单失败");
          console.log(err);
          reject(err);
        });
    });
  }
}

const menu = new Menu();

module.exports = menu;
