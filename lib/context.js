
var ScriptClass = require('./script_class');
var ComponentClass = require('./component_class');
var CodeBuilder = require('./code_builder');
var ComponentElement = require('./component_element');
var ComponentClosure = require('./component_closure');
var ComponentTemplate = require('./component_template.js');
var DomClass = require('./dom_class');
var utils = require('./utils');

/**
 * The Context contains all global required settings. Like which tags are compiled to which elements.
 * @constructor
 */
var Context = function() {

  this.htmlTags = ['a','b','i','u', 'p', 'li','ul','div','ol','label','input','textarea', 'select', 'option',
    'form', 'h1', 'img', 'h2', 'h3', 'h4', 'h5', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'span'];

  /**
   * Contains the classes for specific tags.
   * @type {{}}
   */
  this.tagMap = {
    'element': ComponentClass,
    'script': ScriptClass,
    'template': ComponentTemplate
  };

  this.variables = {};

  this.closureComponents = {

  };

  /**
   * Required packages by the scope.
   * @type {Map.<string,boolean>}
   */
  this.requirements = ['goog.dom.classes'];

  /**
   * Provided packages by the scope.
   * @type {Map.<string,boolean>}
   */
  this.provides = {};

  this.mainComponents = [];
};

/**
 * The Context is parsed by the HTML Head.
 * @param {Node} header The header node.
 * @returns {Context}
 */
Context.Parse = function(header) {
  var context = new Context();

  for (var i = 0, child; child = header.childNodes[i]; i++) {
    if (child._tagName) {
      var tag = child._tagName.toLowerCase();

      if (tag === 'link') {
        var attrs = utils.getAttributeMap(child);

        if (attrs.rel === 'closure-component') {
          context.addClosureComponent(attrs.href);
        }
      }
    }
  }

  return context;
};

Context.prototype = {

  /**
   * @param {string} package The package which is provided.
   */
  addProvide: function(package) {
    this.provides[package] = true;
  },

  /**
   * @param {string} require The package which is required.
   */
  addRequire: function(require) {
    if (this.requirements.indexOf(require) === -1) {
      this.requirements.push(require);
    }
  },

  /**
   * Adds a class constructor for a specific class.
   * @param tagName
   * @param constr
   */
  addTagClass: function(tagName, constr) {
    this.tagMap[tagName] = constr;
  },

  addClosureComponent: function(package) {
    this.addRequire(package);
    var tagName = package.toLowerCase().replace(/\./g, ':');

    this.closureComponents[tagName] = package;
    this.tagMap[tagName] = ComponentClosure;
  },

  /**
   * Returns the correct upper / lower case version of the closure component.
   * @param {string} tag The tag name.
   * @returns {string}
   */
  getClosureClass: function(tag) {
    return this.closureComponents[tag.toLowerCase()];
  },

  /**
   * @param {ComponentElement} component A component which requires to be placed in the main.
   */
  addMainComponent: function(component) {
    this.mainComponents.push(component);
  },

  /**
   * @returns {string} The code of the context.
   */
  getCode: function() {
    var builder = new CodeBuilder();

    for (var pack in this.provides) {
      builder.provide(pack);
    }


    this.requirements.sort();
    for (var i = 0, pack; pack = this.requirements[i]; i++) {
      builder.require(pack);
    }

    var components = this.mainComponents;

    for (var i = 0, comp; comp = components[i]; i++) {
      var codes = comp.getCodes();

      for (var c = 0, code; code = codes[c]; c++) {
        if (code.placement === ComponentElement.Placement.MAIN) {
          builder.add(code.code);
        }
      }
    }

    return builder.getCode();
  },

  /**
   * Returns the correct constructor function for a elemnet.
   * @param {Node} element The html node.
   */
  getClass: function(element) {
    var tag = element._tagName.toLowerCase();

    if (typeof this.tagMap[tag] !== 'undefined') {
      return this.tagMap[tag];
    }

    if (this.htmlTags.indexOf(tag) !== -1) {
      return DomClass;
    }

    return null;
  }

};


module.exports = Context;
