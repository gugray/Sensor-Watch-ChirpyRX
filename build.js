const esbuild = require('esbuild');
const livereload = require("livereload");
const { lessLoader } = require("esbuild-plugin-less");
const customTasks = require("./build-custom-tasks");
const StaticServer = require('static-server');

const args = (argList => {
  let res = {};
  let opt, thisOpt, curOpt;
  for (let i = 0; i < argList.length; i++) {
    thisOpt = argList[i].trim();
    opt = thisOpt.replace(/^\-+/, '');
    if (opt === thisOpt) {
      // argument value
      if (curOpt) res[curOpt] = opt;
      curOpt = null;
    }
    else {
      // argument name
      curOpt = opt;
      res[curOpt] = true;
    }
  }
  //console.log(res);
  return res;
})(process.argv);

let watch = false;
let prod = args.prod ? true : false;

if (args.watch) {
  watch = {
    onRebuild(error) {
      const dstr = "[" + new Date().toLocaleTimeString() + "] ";
      if (error) {
        console.error(dstr + 'Change detected; rebuild failed:', error);
        return;
      }
      console.log(dstr + 'Change detected; rebuild OK');
    },
  };
}

esbuild.build({
  entryPoints: ["src/app.js", "src/app.less"],
  outdir: "public",
  bundle: true,
  sourcemap: !args.prod,
  minify: args.prod,
  plugins: [
    customTasks({prod}),
    lessLoader(),
  ],
  watch: watch,
}).catch(err => {
  console.error("Unexpected error; quitting.");
  if (err) console.error(err);
  process.exit(1);
}).then(() => {
  console.log("Build finished.");
  if (args.watch) {
    livereload.createServer().watch("./public");
    console.log("Watching changes, with livereload...");
    var server = new StaticServer({
      rootPath: './public',
      port: 8080,
    });
    server.start(function () {
      console.log('Server listening at ' + server.port);
    });
  }
});


