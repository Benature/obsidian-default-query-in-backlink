# Default query in backlinks

<div align="center">

![Obsidian Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=%23483699&label=downloads&query=%24%5B%22default-query-in-backlink%22%5D.downloads&url=https%3A%2F%2Fraw.githubusercontent.com%2Fobsidianmd%2Fobsidian-releases%2Fmaster%2Fcommunity-plugin-stats.json) ![GitHub stars](https://img.shields.io/github/stars/Benature/obsidian-default-query-in-backlink?style=flat) ![latest download](https://img.shields.io/github/downloads/Benature/obsidian-default-query-in-backlink/latest/total?style=plastic) 
[![Github release](https://img.shields.io/github/manifest-json/v/Benature/obsidian-default-query-in-backlink?color=blue)](https://github.com/Benature/obsidian-default-query-in-backlink/releases/latest) ![GitHub release (latest by date including pre-releases)](https://img.shields.io/github/v/release/Benature/obsidian-default-query-in-backlink?include_prereleases&label=BRAT%20beta)

[Click to install](https://obsidian.md/plugins?id=default-query-in-backlinks)

</div>


This plugin support set custom default navigation of backlinks, including search query, collapse results, show more context, sort order and expanding unlinked mentions.

You can also ask the plugin to remember the bottom backlinks panel display configuration for each file. (thanks to [remember-cursor-position](https://github.com/dy-sh/obsidian-remember-cursor-position))


> Chinese introduction: [公众号](https://mp.weixin.qq.com/s/kACkM88Or8JTPXGsOdeQcQ) / [小红书](http://xhslink.com/PxqQNE)
> 如有汉化需要请联系作者

## Features

Basic: Set default query for bottom backlinks panel.

- Automatically trigger query after file is opened.
- Custom query is preserved in the same leaf.
- Overwrite old default query if settings is updated.

<div align="center">

<img src="https://s2.loli.net/2024/03/04/N5yuQhaF3z6Anop.gif" />

</div>

Other demo videos: TBA

## My Story

I use the "backlinks in document" feature to explore connections with other notes. Meanwhile, many note files are linked from my daily notes, such as todo items or those automatically added by the [List Modified](https://obsidian.md/plugins?id=obsidian-list-modified) plugin.

However, since there are many daily notes linking to other notes, the backlinks view becomes cluttered, overwhelmed by daily notes that don't provide much useful information. 

To avoid displaying daily notes (for example, those located in the `Diary/` folder), I have to manually input the search query `-path:Diary` in the backlinks view each time. This is why I developed this plugin – to simplify the process of inputting search queries in the backlinks view.

## How to open backlinks in Obsidian?

- Settings - Options - Core plugins: Enable "Backlinks"
- Settings - Core plugins - Backlinks: Enable "Backlink in document"
- For specific file, there is a `···` at the top right corner, click it and select "Backlinks in document".

## Install

## Install from community plugins

### Install by [BRAT Plugin](https://obsidian.md/plugins?id=obsidian42-brat)

- First install [BRAT Plugin](https://obsidian.md/plugins?id=obsidian42-brat):
- In BRAT Plugin, click `Add Beta plugin`
- Enter https://github.com/Benature/obsidian-default-query-in-backlink
- Enable `Default query in backlinks` in `Community plugins`

### Manually install

- Download latest version in [Releases](https://github.com/Benature/obsidian-default-query-in-backlink/releases/latest)
- Copy over `main.js`, `manifest.json` to your vault `VaultFolder/.obsidian/plugins/default-query-in-backlink/`
- Reload plugins in `Community plugins` and enable `Default query in backlinks`

## How to build

- `git clone https://github.com/Benature/obsidian-default-query-in-backlink` clone this repo.
- `npm i`  install dependencies
- `npm run dev` to start compilation in watch mode.
- `npm run build`  to build production.

## Support

If you find this plugin useful and would like to support its development, you can sponsor me via [Buy Me a Coffee ☕️](https://www.buymeacoffee.com/benature), WeChat, Alipay or [AiFaDian](https://afdian.net/a/Benature-K). Any amount is welcome, thank you!

<p align="center">
<img src="https://s2.loli.net/2024/01/30/jQ9fTSyBxvXRoOM.png" width="500px">
</p>
