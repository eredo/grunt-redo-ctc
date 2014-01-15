
var ComponentElement = require('./component_element.js');
var CodeBuilder = require('./code_builder.js');
var utils = require('./utils.js');

/**
 *
 * @constructor
 * @implements {ComponentElement}
 */
var DomClass = function() {
  this.var = '';
  this.children = [];
  this.domHelper = undefined;

  this.isIteration_ = false;
};

/**
 * @param {Node} element The element of the DomClass.
 * @param {Context} context The context.
 * @returns {DomClass}
 */
DomClass.Parse = function(element, context, opt_parent) {
  var dom = new DomClass();
  dom.getElement = function() {return element; };
  dom.context = context;
  dom.parentElement = opt_parent;

  // add requires for the doms
  context.addRequire('goog.dom');
  context.addRequire('goog.dom.TagName');
  context.addRequire('goog.dom.query');


  return dom;
};

DomClass.prototype.isChildElement = function() {
  return !this.isIteration_;
};

DomClass.prototype.isClosure = function() {
  return false;
};

DomClass.prototype.beforeAddedToParent = function () {
  return '';
};

DomClass.prototype.onAddedToParent = function () {
  return '';
};

DomClass.prototype.getCodes = function () {
  var element = this.getElement();

  var enterCode = new CodeBuilder();
  var declareCode = new CodeBuilder();
  var attributes = utils.getAttributeMap(element);
  var content = undefined;

  // when it's the element tag we need to get the extends attribute
  var tagName = element._tagName.toLowerCase();
  if (tagName === 'element') {
    tagName = attributes.extends;
  }

  // check if there's content and no other children
  if (this.children.length === 0 && element._childNodes.length !== 0) {
    // We got text
    content = element._childNodes[0].__nodeValue;
  }

  var name = this.var + (attributes['bind-property'] ? ' = this.' + attributes['bind-property'] : '');
  // check if it contains an iteration
  if (attributes.iterate) {
    this.isIteration_ = true;

    var itParts = attributes.iterate.split(' in ');
    var itKey = 'i';
    var itVal = itParts[0].replace(' ', '');

    if (itVal.match(/\,/) !== null) {
      var itt = itVal.split(',');
      itKey = itt[0];
      itVal = itt[1];
    }

    var itFrom = itParts[1].replace(' ', '');

    declareCode.add('goog.array.forEach(' + itFrom + ', function(' + itVal + ', index) { try {');
    this.context.addRequire('goog.array');
  }

  declareCode.createDom(name, tagName,
    this.domHelper, attributes, content);
  declareCode.eventListener(this);

  // render all children in the same context
  for (var i = 0, child, children = this.children; child = children[i]; i++) {
    var childCodes =  child.getCodes();

    for (var c = 0, code; code = childCodes[c]; c++) {
      switch (code.placement) {
        case ComponentElement.Placement.CREATEDOM:
          declareCode.add(code.code); break;
        case ComponentElement.Placement.ENTERDOCUMENT:
          enterCode.add(code.code); break;
      }
    }
  }

  declareCode.addChildren(this, this.children);

  if (attributes.iterate) {
    declareCode.add('goog.dom.appendChild(' + this.parentElement.getVar(true) + ', ' + this.var + ');');
//    this.parentElement.addChild(this);
    //declareCode.addChildren(this.parentElement, this);
    declareCode.add('} catch (ex) { console.error(ex.stack); }}, this);');
  }

  return [{
      placement: ComponentElement.Placement.CREATEDOM,
      code: declareCode.getCode()
    }, {
      placement: ComponentElement.Placement.ENTERDOCUMENT,
      code: enterCode.getCode()
    }];
};

/**
 *
 * @param {ComponentElement} child
 */
DomClass.prototype.addChild = function (child) {
  return 'goog.dom.appendChild(' + this.var + ', ' + child.getVar(true) + ');\n';
};

DomClass.prototype.getPlacement = function () {
};

DomClass.prototype.getVar = function () {
  return this.var;
};

module.exports = DomClass;