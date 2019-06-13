# 路上读书

## App

所有字段都加密了

## 小程序

适合做抓取

POST /v3/xcx/code-login

```
Set-Cookie: JSESSIONID=0EA155EBA30AE71FDD80BC93813085F5; Path=/; HttpOnly
Access-Control-Allow-Origin: *
Connection: Keep-alive
```

res

```json
{
  "meta": {
    "success": true,
    "code": 0,
    "message": "操作成功",
    "enMessage": "ok"
  },
  "data": {
    "userId": 1809308,
    "loginName": "Tada",
    "tel": "15128208955",
    "sex": 0,
    "userName": null,
    "recommendPeople": null,
    "recommendCode": "78736836",
    "coin": 0,
    "expired": "2019.07.12",
    "rank": "64%",
    "sessionId": "1809308,d1a474a8-de07-4a6f-b74e-b1ccd27863b6",
    "faceUrl": "http://thirdwx.qlogo.cn/mmopen/vi_32/DYAIOgq83epzTO7ewgJhomnDBG4LgeoGvswIicYE435vibK2iaDh6Mhw9rUQZ3v01cZI2Qv9dAwNDeKnOMQiaQBWgg/132",
    "bookNum": 2,
    "userGrade": "秀才",
    "isBindTel": 2,
    "isBindWeixin": 2,
    "isBindQq": 2,
    "isBindCompany": 1
  }
}
```

## Web

透出的 html 里直接包含了 audio 信息, 做的比较简单
