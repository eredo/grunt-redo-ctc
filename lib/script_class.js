
var ComponentElement = require('./component_element.js');

/**
 * @implements {ComponentElement}
 * @constructor
 */
var ScriptClass = function() {

};

ScriptClass.Parse = function(element, context) {
  var script = new ScriptClass();
  script.getElement = function() { return element; };
  script.context = context;
  return script;
};

ScriptClass.prototype.getCodes = function () {
  var name = this.context.variables.name;
  var namespace = this.context.variables.namespace;
  var className = (namespace ? namespace + '.' : '') + name;

  var regEx = new RegExp('\\s(' + name + ')', 'gm');
  var code = this.getElement().innerHTML.replace(regEx, className);
  return [{
    placement: ComponentElement.Placement.MAIN,
    code: code
  }];
};

ScriptClass.prototype.addChild = function () {
  return '';
};

ScriptClass.prototype.getPlacement = function () {
  return ComponentElement.Placement.MAIN;
};

ScriptClass.prototype.getVar = function () {
  return this.var;
};

ScriptClass.prototype.isChildElement = function () {
  return false;
};

ScriptClass.prototype.beforeAddedToParent = function (parent) {
  return '';
};

ScriptClass.prototype.onAddedToParent = function (parent) {
  return '';
};

ScriptClass.prototype.isClosure = function () {
  return false;
};

module.exports = ScriptClass;