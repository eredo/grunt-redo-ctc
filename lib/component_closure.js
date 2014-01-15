
var utils = require('./utils');
var ComponentElement = require('./component_element');
var ComponentClass = require('./component_class.js');
var CodeBuilder = require('./code_builder.js');

/**
 * @implements {ComponentElement}
 * @constructor
 */
var ComponentClosure = function() {
  this.children = [];
  this.rendered = false;

  /**
   * @type {Context}
   */
  this.context;

  /**
   * @type {string}
   */
  this.closureClass;
};

/**
 * @param {Node} element The DOM Element.
 * @param {Context} context The context of the compiler.
 * @returns {ComponentClosure}
 */
ComponentClosure.Parse = function(element, context, opt_parent) {
  var comp = new ComponentClosure();
  comp.closureClass = context.getClosureClass(element._tagName);
  comp.getElement = function() { return element; };
  comp.attributes = utils.getAttributeMap(element);
  comp.parentElement = opt_parent;
  comp.context = context;
  return comp;
};

ComponentClosure.prototype.isClosure = function () {
  return true;
};

ComponentClosure.prototype.getCodes = function () {
  var builder = new CodeBuilder();
  var varname = this.getVar();

  builder.doCall(this.closureClass,
    this.attributes['bind-constructor'] ? this.attributes['bind-constructor'].split(',') : null,
    varname.substr(0,5) === 'this.' ? varname : 'var ' + varname, true,
    {'type': '{' + this.getElement()._tagName + '}'});

  // render all children in the same context
  for (var i = 0, child, children = this.children; child = children[i]; i++) {
    var childCodes =  child.getCodes();

    for (var c = 0, code; code = childCodes[c]; c++) {
      switch (code.placement) {
        case ComponentElement.Placement.CREATEDOM:
          builder.add(code.code); break;
        // case ComponentElement.Placement.ENTERDOCUMENT:
        //  enterCode.add(code.code); break;
      }
    }

  }

  return [{
    placement: ComponentElement.Placement.CREATEDOM,
    code: builder.getCode()
  }];
};

ComponentClosure.prototype.isChildElement = function() {
  return true;
};

ComponentClosure.prototype.beforeAddedToParent = function (parent) {
  if (!this.rendered && !parent.isClosure()) {
    return this.getVar() + '.render(goog.global.document.body);';
  }

  return '';
};

ComponentClosure.prototype.onAddedToParent = function (parent) {
  this.rendered = true;
  var builder = new CodeBuilder();
  builder
    .addChildren(this, this.children)
    .eventListener(this)
    .attributeCallers(this)
    .closureDomMods(this);
  return builder.getCode();
};

ComponentClosure.prototype.addChild = function (component) {
  if (component.isClosure()) {
    return this.getVar() + '.addChild(' + component.getVar() + ', true);\n';
  } else {
    return 'goog.dom.appendChild(' + this.getVar(true) + ', ' + component.getVar(true) + ');\n';
  }
};

ComponentClosure.prototype.getPlacement = function () {
  return ComponentElement.Placement.CREATEDOM;
};

ComponentClosure.prototype.getVar = function (isDom) {
  if (this.attributes['bind-property']) {
    return 'this.' + this.attributes['bind-property'] + (isDom ? '.getElement()' : '');
  }
  return this.var + (isDom ? '.getElement()' : '');
};

module.exports = ComponentClosure;
