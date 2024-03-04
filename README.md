# Default query in backlinks

Automatically input default query in search input of backlinks in document.

- Automatically trigger query after file is opened.
- Custom query is preserved in the same leaf.
- Overwrite old default query if settings is updated.

<center>
<img src="https://s2.loli.net/2024/03/04/N5yuQhaF3z6Anop.gif" />
</center>

## My Story

I usually write todo items that link to other note files in my daily notes. Meanwhile, I open the "backlinks in document" feature to see what other notes are related to the current one. However, since there are many daily notes linking to other notes, the backlinks view becomes cluttered, overwhelmed by daily notes that don't provide much useful information. 

To avoid displaying daily notes (for example, those located in the `Diary/` folder), I have to manually input the search query `-path:Diary` in the backlinks view each time. This is why I developed this plugin – to simplify the process of inputting search queries in the backlinks view.


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
