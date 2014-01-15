# grunt-redo-ctc

> A google closure library template engine which converts HTML Dom into goog.ui.Components.

#### NOTICE: This plugin is in alpha status since I'm already working on a complete rework. I have been using the core functionality of the plugin for a long time in projects successfully.

## Getting Started
This plugin requires Grunt `~0.4.2`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-redo-ctc --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-redo-ctc');
```

## The "ctc" task

### Overview
In your project's Gruntfile, add a section named `ctc` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
  ctc: {
    options: {
      // the path of the exported files ([target.dest]/[path])
      path: '<%= namespace.toLowerCase().replace(".", "/") %>/<%= name.toLowerCase() %>.ctc.js'
    },
    build: {
      src: ['template/folder/**/*.html'],
      dest: 'export/folder/'
    },
  },
});
```

### Options

#### options.path
Type: `String`
Default value: `<%= namespace.toLowerCase().replace(".", "/") %>/<%= name.toLowerCase() %>.ctc.j`

A template string which will create the path and name of the exported template file.

### Usage Examples

#### Default Options

```js
grunt.initConfig({
  ctc: {
    build: {
      src: ['templates/**/*.html'],
      dest: 'export/'
    },
  },
});
```
## Release History
- 15/01/2014 - 0.1.0 - Initiale release

## Roadmap
- 0.2.0 - Support for angular.js in the template
- 0.5.0 - Complete restructure of the actual library code and move the source of the library in it's own repository
