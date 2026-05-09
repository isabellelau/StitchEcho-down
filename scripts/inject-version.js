const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 生成版本号：1.提交次数
const count = execSync('git rev-list --count HEAD').toString().trim();
const version = `1.${count}`;

// 更新 index.html 的 <meta name="version">
const htmlPath = path.join(__dirname, '../index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

if (html.includes('<meta name="version"')) {
  // 已存在则替换
  html = html.replace(
    /<meta name="version" content=".*?">/,
    `<meta name="version" content="${version}">`
  );
} else {
  // 不存在则插入到 <head> 第一行后
  html = html.replace(
    '<head>',
    `<head>\n  <meta name="version" content="${version}">`
  );
}
fs.writeFileSync(htmlPath, html);

// 更新 sw.js 的 CACHE_NAME
const swPath = path.join(__dirname, '../sw.js');
let sw = fs.readFileSync(swPath, 'utf8');

sw = sw.replace(
  /const CACHE_NAME = ['"`].*?['"`]/,
  `const CACHE_NAME = 'crochet-${version}'`
);
fs.writeFileSync(swPath, sw);

console.log(`✅ 版本号已注入：v${version}`);
console.log(`   index.html meta: ${version}`);
console.log(`   sw.js CACHE_NAME: crochet-${version}`);
