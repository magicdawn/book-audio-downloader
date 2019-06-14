# book-audio-downloader

> 读书下载器

- [x] 樊登读书会
- [x] 路上读书会

## Install

```sh
$ cnpm i book-audio-downloader -g
```

## 使用

### 樊登读书

```sh
# 下载所有
DEBUG=app:* fandeng all --token <token>
```

### 路上读书

```sh
# 单本
DEBUG=app:* lushang book <id> [--session-id some-session-id]

# 书单
DEBUG=app:* lushang list <id> [--session-id some-session-id]
```

## Changelog

[CHANGELOG.md](CHANGELOG.md)

## License

the MIT License http://magicdawn.mit-license.org
