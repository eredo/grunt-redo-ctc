
var utils = require('./utils.js');
var ComponentElement = require('./component_element.js');
var CodeBuilder = require('./code_builder.js');

/**
 * @implements {ComponentClass}
 * @constructor
 */
var ComponentTemplate = function() {
  this.children = [];
};

/**
 * @param {Node} element
 * @param {Context} context
 * @returns {ComponentTemplate}
 */
ComponentTemplate.Parse = function(element, context, opt_parent) {
  var temp = new ComponentTemplate();
  temp.attributes = utils.getAttributeMap(element);
  temp.context = context;
  temp.parentElement = opt_parent;
  context.addRequire('goog.dom.query');
  return temp;
};

ComponentTemplate.templateContainerId = 0;

/**
 * @type {boolean}
 */
ComponentTemplate.prototype.useDataBinding = false;

ComponentTemplate.prototype.generateIds = function() {
  if (!this.containerId) {
    this.containerId = 'tc' + ComponentTemplate.templateContainerId++;
  }
};

ComponentTemplate.prototype.isClosure = function () {
  return false;
};

ComponentTemplate.prototype.getCodes = function () {
  if (this.codes) {
    return this.codes;
  }

  var functionCode = new CodeBuilder();
  var declareCode = new CodeBuilder();
  this.generateIds();

  var firstChild = null;

  if (this.attributes.name) {
    // The template function needs to grab the container and remove all children
    declareCode.add('var container = goog.dom.query(\'[data-template-renderer="' + this.containerId + '"]\', this.getElement())[0];');
    declareCode.add('goog.dom.removeChildren(container);');
  }

  // check if it's an iteration template
  if (this.attributes.iterate) {
    var itParts = this.attributes.iterate.split(' in ');
    var itKey = 'i';
    var itVal = itParts[0].replace(' ', '');

    if (itVal.match(/\,/) !== null) {
      var itt = itVal.split(',');
      itKey = itt[0];
      itVal = itt[1];
    }

    var itFrom = itParts[1].replace(' ', '');

    //declareCode.add('for (var _ix = 0, _iv; _iv = ' + itFrom + '[_ix]; _ix++) {');
    // to make sure that variables stay the same
    //declareCode.add('goog.bind(function(' + itKey + ', ' + itVal + ') {');
    declareCode.add('goog.array.forEach(' + itFrom + ', function(' + itVal + ', index) { try {');
    this.context.addRequire('goog.array');
  }

  if (this.attributes.if) {
    declareCode.add('if (' + this.attributes.if + ') {');
  }

  var mainChilds = [];

  // render all children in the same context
  for (var i = 0, child, children = this.children; child = children[i]; i++) {
    var childCodes =  child.getCodes();

    for (var c = 0, code; code = childCodes[c]; c++) {
      switch (code.placement) {
        case ComponentElement.Placement.CREATEDOM:
          declareCode.add(code.code);

          if (child.parentElement === this) {
            mainChilds.push(child);
          }
          break;
      }
    }
  }

  if (this.attributes.name) {
    mainChilds.forEach(function(child) {
      declareCode.add(child.beforeAddedToParent(this));
      declareCode.add('goog.dom.appendChild(container, ' + child.getVar(true) + ');');
      declareCode.add(child.onAddedToParent());
    }.bind(this));
  } else {
    mainChilds.forEach(function(child) {
      declareCode.add(child.beforeAddedToParent(this));
      declareCode.add('goog.dom.appendChild(' + this.parentElement.getVar(true) + ', ' + child.getVar(true) + ');');
      declareCode.add(child.onAddedToParent());
    }.bind(this));
  }

  if (this.attributes.iterate) {
    // declareCode.add('}, this)(_ix, _iv);')
    // declareCode.add('}');
    declareCode.add('} catch (ex) { console.error(ex.stack); }}, this);');
  }

  if (this.attributes.if) {
    declareCode.add('}');
  }

  if (this.attributes.name) {
    functionCode.func(this.attributes.name, this.context.variables.namespace + '.' + this.context.variables.name + '.prototype',
      null, declareCode.getCode());

    return this.codes = [{
      placement: ComponentElement.Placement.MAIN,
      code: functionCode.getCode()
    }];
  } else {
    return this.codes = [{
      placement: ComponentElement.Placement.CREATEDOM,
      code: declareCode.getCode()
    }];
  }
};

ComponentTemplate.prototype.getPlacement = function () {
  return ComponentElement.Placement.MAIN;
};

ComponentTemplate.prototype.isChildElement = function() {
  return false;
};

ComponentTemplate.prototype.addChild = function () {
  return '';
};

ComponentTemplate.prototype.getVar = function () {
  return this.var;
};

ComponentTemplate.prototype.beforeAddedToParent = function (parent) {
  return this.attributes.name ? (
    parent.getVar(true) + '.setAttribute(\'data-template-renderer\', \'' + this.containerId + '\');') : '';
};

ComponentTemplate.prototype.onAddedToParent = function () {
  return '';
};

module.exports = ComponentTemplate;

