
var fs = require('fs');
var path = require('path');
var fileRenderer = require('./file_renderer');
var mkdirp = require('mkdirp');

var ClosureWCMod = function() {
  this.name = 'ClosureWCMod';

  this.listeners = [
    ['.html', this.handleFile.bind(this)]
  ];

  this.folder;
  this.output;
  this.timer_ = null;
};

ClosureWCMod.prototype.onRegister = function(server) {
  this.server = server;

};

ClosureWCMod.prototype.onSetup = function() {
  var conf = this.server.getApp();
  this.conf = conf['web_components'];

  if (conf['web_components']) {
    this.folder = path.join(conf.dir, this.conf.folder);
    this.output = path.join(conf.dir, this.conf.out);

    this.server.getFileManager().addWorkspace(this.folder, true);
    this.server.registerFileListener('.html', this.handleFile.bind(this));
  }
};

ClosureWCMod.prototype.generateExportName = function(globals) {
  var name = '' + this.output;
  var work = '' + this.output;
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

ClosureWCMod.prototype.build_ = function(file) {
  var self = this;
  fs.readFile(file, function(err, data) {
    if (err) {
      console.error('Unable to read file:', file, err);
      return;
    }

    var data = fileRenderer(data.toString());
    // the template is not complete
    if (data === null) {
      return;
    }

    // prepare the export folder
    var exportPath = self.generateExportName(data.variables);

    mkdirp(path.dirname(exportPath), function(err) {
      if (err) {
        console.error('Unable to create export directory:', path.dirname(exportPath), err);
        return;
      }

      fs.writeFile(exportPath, data.code, function(err) {
        if (err) {
          console.error('Unable to write file:', exportPath, err);
          return;
        }
      });
    });

  });
};

ClosureWCMod.prototype.handleFile = function(file, next, event) {
  if (this.folder && file.substr(0, this.folder.length) === this.folder) {
    this.build_(file);
   // next();
  }
};



module.exports = ClosureWCMod;
