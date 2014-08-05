/**
 * Created with JetBrains RubyMine.
 * User: Eric
 * Date: 18.03.13
 * Time: 11:49
 * To change this template use File | Settings | File Templates.
 */
var CodeBuilder = require('./code_builder.js');
var ComponentElement = require('./component_element.js');
var ScriptClass = require('./script_class');
var DomClass = require('./dom_class.js');
var utils = require('./utils.js');

/**
 * @implements {ComponentElement}
 * @constructor
 */
var ComponentClass = function() {

  this.builder = new CodeBuilder();

  /**
   *
   * @type {Array.<ComponentElement>}
   */
  this.children = [];

  this.name = '';
  this.var = '';
};

/**
 * @param {Node} element The object which is used.
 * @returns {ComponentClass}
 */
ComponentClass.Parse = function(element, context) {
  var comp = new ComponentClass();

  var attributes = utils.getAttributeMap(element);
  var namespace = attributes.namespace;
  var name = attributes.name;

  comp.name = (namespace ? namespace + '.' : '') + name;
  comp.getElement = function() { return element; };
  comp.extends = attributes['extends-closure'] ? attributes['extends-closure'] : 'goog.ui.Component';
  comp.context = context;

  context.addProvide(comp.name);
  context.addRequire(comp.extends);

  // setup the globals
  context.variables.namespace = context.variables.namespace || namespace;
  context.variables.name = context.variables.name || name;

  return comp;
};

/**
 * @type {boolean}
 */
ComponentClass.prototype.useDataBinding = false;

ComponentClass.prototype.beforeAddedToParent = function () {
  return '';
};

ComponentClass.prototype.onAddedToParent = function () {
  return '';
};

ComponentClass.prototype.isClosure = function () {
  return true;
};

ComponentClass.prototype.addChild = function (component) {
  if (component.isClosure()) {
    return 'this.addChild(' + component.getVar() + ', true);\n';
  } else {
    return 'goog.dom.appendChild(' + this.getVar(true) + ', ' + component.getVar(true) + ');\n';
  }
};

ComponentClass.prototype.getVar = function (isDom) {
  return 'this' + (isDom ? '.getElement()' : '');
};

ComponentClass.prototype.getCodes = function () {
  var attributes = utils.getAttributeMap(this.getElement());

  // content of the createDom function
  var createDomContent = new CodeBuilder();
  createDomContent.add('var domHelper = this.getDomHelper();\n');

  var enterDoc = new CodeBuilder();
  enterDoc.add('goog.base(this, \'enterDocument\');\n');
  enterDoc.add('if (goog.isDef(this.onEnterDocument)) { this.onEnterDocument(); }');

  // It's possible to define whether the elements are created in createDom
  // or the decorateInternal function by adding a attribute closure:decoratable="true"
  // to the element tag.
  var decoratable = (typeof attributes['closure:decoratable'] !== 'undefined' ?
    attributes['closure:decoratable'] == 'true' : false);

  // Create the this.element_ as far this element doesn't support the decorate
  // method.
  // Add the this.element_ (protected from goog.ui.Component) as child
  // decorated classes don't need it however we need to pass the functions
  // on the dom element
  if (!decoratable) {
    var element = this.element_ = DomClass.Parse(this.getElement(), this.context);
    element.var = 'this.element_';

    // we need to add the element as the first child
    var childb = [element];
    Array.prototype.push.apply(childb, this.children);
    this.children = childb;
  } else {
    // emulate this.element_.var for CodeBuilder function on ComponentClosure
    this.element_ = {var: 'this.getElement()'};

    // call the dom modifier function on this.element_
    createDomContent.closureDomMods(this);
  }

  this.builder.constr(this.name, this.extends);

  for (var i = 0, child, children = this.children; child = children[i]; i++) {
    child.domHelper = 'domHelper';
    var codes = child.getCodes();

    for (var c = 0, code; code = codes[c]; c++) {
      switch(code.placement) {
        case ComponentElement.Placement.CREATEDOM:
          createDomContent.add(code.code);

          // we guess it's build
          if (child.var !== this.element_.var) {
            createDomContent.addChildren(this, child);
          }
          break;
        case ComponentElement.Placement.MAIN:
          this.builder.add(code.code);
          break;
        case ComponentElement.Placement.ENTERDOCUMENT:
          enterDoc.add(code.code);
      }
    }
  }

  createDomContent.add('if (goog.isDef(this.afterCreate_)) { this.afterCreate_() }');

  if (this.extends !== 'goog.ui.Component' && !decoratable) {
    createDomContent.add('this.decorateInternal(this.element_);');
  }

  // create the create dom function
  this.builder.func('prototype.' +
    (decoratable ? 'decorateInternal' : 'createDom'),
    this.name, {'override': ''},
    (decoratable ? 'goog.base(this, \'decorateInternal\', element);' : '') +
    createDomContent.getCode(), (decoratable ? ['element'] : null));

  this.builder.func('prototype.enterDocument',
    this.name, {'inheritDoc': ''}, enterDoc.getCode());

  var codePart = {
    placement: ComponentElement.Placement.MAIN,
    code: this.builder.getCode()
  };

  return [codePart];
};

ComponentClass.prototype.isChildElement = function() {
  return false;
};

ComponentClass.prototype.getPlacement = function () {
  return ComponentElement.Placement.MAIN;
};

module.exports = ComponentClass;
