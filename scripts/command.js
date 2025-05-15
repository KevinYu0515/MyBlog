hexo.extend.console.register(
  "new-note",
  "Create a new note post",
  {
    usage: "<title>",
    arguments: [{ name: "title", desc: "Post title" }],
  },
  function (args) {
    const fs = require("fs");
    const path = require("path");
    const title = args._[0];

    if (!title) {
      console.log("Please provide a title.");
      return;
    }

    const filename = `${title}.md`;
    const folder = path.join(hexo.source_dir, "_posts", "notes");
    const filepath = path.join(folder, filename);

    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }

    const content = `---
title: ${title}
date: ${new Date().toISOString()}
tags: ""
toc: true
categories: ""
excerpt: "This is example excerpt"
cover: /gallery/covers/default.jpg
---
`;

    fs.writeFileSync(filepath, content);
    console.log(`Note created: ${filepath}`);
  }
);
