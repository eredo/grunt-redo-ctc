/*
 * grunt-redo-ctc
 * https://github.com/eredo/grunt-redo-ctc
 *
 * Copyright (c) 2014 Eric Schneller
 * Licensed under the MIT license.
 */

'use strict';

var util = require('util'),
    path = require('path'),
    fileRenderer = require('../lib/file_renderer');

module.exports = function(grunt) {

  grunt.registerMultiTask('ctc', 'Runs the closure template compiler.', function() {
    var options = this.options({
      path: '<%= namespace.toLowerCase().replace(".", "/") %>/<%= name.toLowerCase() %>.ctc.js'
    });
    var dest = this.data.dest;

    if (!util.isArray(this.data.src)) {
      this.data.src = [this.data.src];
    }

    this.data.src.forEach(function(src) {
      var files = grunt.file.expand(src);

      files.forEach(function(f) {
        var code = grunt.file.read(f);
        var data = fileRenderer(code);

        if (data === null) {
          grunt.log.warn('No code generate in: ' + f);
        } else {
          if (!data.variables.namespace || !data.variables.name) {
            grunt.log.warn('No namespace provided. Aborting.');
            return;
          }

          var fpath = grunt.template.process(options.path, {data: data.variables});
          fpath = path.join(dest, fpath);
          var fdir = path.dirname(fpath);
          grunt.file.mkdir(fdir);

          var success = grunt.file.write(fpath, data.code);
          if (!success) {
            grunt.log.error('Unable to write file: ' + fpath, success);
          } else {
            grunt.log.ok('Created component: ' + data.variables.namespace +
              '.' + data.variables.name + ' in file: ' + fpath);
          }
        }
      });
    });
  });
};
