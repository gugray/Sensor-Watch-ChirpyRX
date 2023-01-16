const fs = require("fs");
const path = require("path");
const md5 = require('md5')

async function getHash(fn) {
  let content = await fs.promises.readFile(fn, "utf8");
  return md5(content);
}

exports = (options = {}) => {
  return {
    name: 'customTasks',
    setup(build) {

      // In production build, just exclude everything ending in "test.js"
      if (options.prod) {
        build.onLoad({filter: /.*test\.js/}, async (args) => {
          console.log(args.path);
          return {contents: ''};
        });
      }

      // Before build, clean up maps in target folder
      build.onStart(async () => {
        if (!options.prod) return;
        try { fs.unlinkSync("public/app.js.map"); } catch {}
        try { fs.unlinkSync("public/app.css.map"); } catch {}
      });

      // When build is done, infuse cache busting hashes in index.html,
      // and also save them in version.html
      build.onEnd(async result => {
        let appJsHash = await getHash("public/app.js");
        let appCssHash = await getHash("public/app.css");
        let indexHtml = await fs.promises.readFile("src/index.html", "utf8");
        if (options.prod) {
          indexHtml = indexHtml.replace("./app.js", "./app.js?v=" + appJsHash);
          indexHtml = indexHtml.replace("./app.css", "./app.css?v=" + appCssHash);
          indexHtml = indexHtml.replace(/<!--LiveReload-->.*<!--LiveReload-->/is, "");
        }
        await fs.promises.writeFile("public/index.html", indexHtml);
        let hashesTogether = appJsHash + "\n" + appCssHash;
        if (hashesTogether.length != 65) throw "wrong combined hash length";
        await fs.promises.writeFile("public/version.html", hashesTogether);
      });
    }
  };
}
module.exports = exports;
