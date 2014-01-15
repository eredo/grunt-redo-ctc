
var argv = require('optimist')
  .alias('w', 'workspace')
  .argv;
var mkdirp = require('mkdirp');


var cjenConfig = require(process.env.CONFIG).get();
var globalConfig = cjenConfig['closure-web-components'];
var path = require('path');
var projectConf = require(path.join(process.cwd(), argv.w, 'cjen.json'));
var config = projectConf.web_components;
var fs = require('fs');
var exec = require('child_process').exec;

var fileRenderer = require('./file_renderer.js');

if (!config) {
  console.log('No configuration for closure-web-components found');
  process.exit(1);
}

var exportFolder = path.join(process.cwd(), argv.w, config.out);
var componentFolder = path.join(process.cwd(), argv.w, config.folder);

/**
 * @param directory
 * @param callback
 */
var readFiles = function(directory, callback) {
  var allFiles = [];

  /**
   * Reads a file structur.
   * @param {string} dir The directory.
   * @param {function(Array.<string>} cb Callback function after finish.
   */
  var getFileStructure = function(dir, cb) {
    fs.readdir(dir, function(err, files) {
      if (err) {
        console.error("Unable to read directory: " + directory);
        process.exit(6);
      }

      parseFiles(dir, files, cb);
    });
  };

  /**
   * Parses all files.
   * @param {Array.<string>} files
   * @param {function} cb Callback function after finish.
   */
  var parseFiles = function(dir, files, cb) {
    var iter = 0;

    var processFile = function() {
      var file = files[iter++];

      if (!file) {
        cb();
        return;
      }

      var filepath = path.join(dir, file);
      fs.stat(filepath, function(err, stats) {
         if (stats.isDirectory()) {
           if (file !== '.' && file !== '..') {
             getFileStructure(filepath, processFile);
             return;
           }
         } else if (stats.isFile()) {
           if (path.extname(file) === '.html') {
             allFiles.push(filepath);
           }
         }

         processFile();
      });
    };

    processFile();
  };

  getFileStructure(directory, function() {
    callback(allFiles);
  });
};

/**
 * Generates the export file name.
 * @param {{name:string,namespace:string}} globals
 */
var generateExportName = function(globals) {
  var name = '' + exportFolder;
  var work = '' + exportFolder;
  var reg = /\{\{([^\}\}]+)\}\}/ig;
  var index = 0;
  var ex;

  while((ex = reg.exec(work)) !== null) {
    var val;
    eval('val = ' + ex[1] + ';');

    name = name.replace(ex[0], val);
  }

  return name;
};

var renderFile = function(file, cb) {
  fs.readFile(file, function(err, data) {
    if (err) {
      console.error('Unable to read file:', file, err);
      process.exit(8);
    }

    var data = fileRenderer(data.toString());

    // prepare the export folder
    var exportPath = generateExportName(data.variables);
    console.log(exportPath);

    mkdirp(path.dirname(exportPath), function(err) {
      if (err) {
        console.error('Unable to create export directory:', path.dirname(exportPath), err);
        process.exit(10);
      }

      fs.writeFile(exportPath, data.code, function(err) {
        if (err) {
          console.error('Unable to write file:', exportPath, err);
          process.exit(9);
        }

        if (globalConfig['closureLinter']) {
          exec('fixjsstyle ' + exportPath, function(err) {
            if (err) {
              console.error('Unable to use fixjsstyle. If closure linter is not installed please disable the closureLinter' +
                'option in your r4cjen configuration.', err);
            }
            cb(exportPath);
          });
        } else {
          cb(exportPath);
        }
      });
    });

  });

};

readFiles(componentFolder, function(files) {
  var iter = 0;
  var runTrough = function() {
    var file = files[iter++];

    if (!file) {
      return;
    }
    renderFile(file, function(f) {
       console.log('Rendered file: ' + f);
       runTrough();
    });
  };

  runTrough();
});
