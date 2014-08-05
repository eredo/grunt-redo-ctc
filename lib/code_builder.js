/**
 * @fileOverview The CodeBuilder is responsible for the transformation of any kind of declaration or calls.
 * TODO: Rewrite the most function to be static functions and only add the links to the CodeBuilder class.
 */

var util = require('util');
var utils = require('./utils');

/**
 * It's possible to use the CodeBuilder as some kind of StringBuffer. The most functions are
 * static. The methods just call those static variables and add the results to a string which
 * can be received by calling CodeBuilder#getCode().
 * @constructor
 */
function CodeBuilder() {
  /**
   * @type {string}
   * @private
   */
  this.code_ = '';

}

/**
 * The modifiers of attribute values.
 * @type {Array.<{{attribute:string,modifier:function(string):string}}>}
 */
CodeBuilder.AttributeModifiers = [];

/**
 * The modifier functions called on a closure component by dom attibutes.
 * @type {Map.<string,Array.<function(ComponentElement)>>}
 */
CodeBuilder.ClosureAttributeModifiers = {};

/**
 * Registers an attribute modifier to the global scope.
 * @param {string} attrName The name of the attribute.
 * @param {function(string):string} modifier The modifier function. It receives the value as string and returns
 *  the modified string.
 */
CodeBuilder.registerAttributeModifier = function(attrName, modifier) {
  CodeBuilder.AttributeModifiers.push({attribute: attrName, modifier: modifier});
};

CodeBuilder.registerClosureAttributeModifier = function(attrName, modifier) {
  CodeBuilder.ClosureAttributeModifiers[attrName] = CodeBuilder.ClosureAttributeModifiers[attrName] || [];
  CodeBuilder.ClosureAttributeModifiers[attrName].push(modifier);
};

/**
 * Checks the content of the dom and rewrites it if required.
 * @param {string} content
 * @returns {string}
 */
CodeBuilder.prepareDomContent = function(content) {
  return "'" + CodeBuilder.descapeJS(content.replace(/^\s\s*/, '')
    .replace(/\s\s*$/, '').replace("'", "\\'")) + "'";
};

CodeBuilder.descapeJS = function(content) {
  return content.replace(/\{\{/g, "' + (").replace(/\}\}/g, ") + '");
};

/**
 * The prefix which is used in the dom to define caller attributes.
 * For example:
 * <code>
 *  <r4:ui:Button closure:caption="test" />
 * </code>
 * Will be rewritten is something like:
 * <code>
 *  var r4uibutton1 = new r4.ui.Button();
 *  r4uibutton1.setCaption('test');
 * </code>
 * @type {string}
 */
CodeBuilder.closureCallerPrefix = 'closure:';

/**
 * Generates a function name by a specific key. It can transform attribute functions ('closure:FUNC') or
 * for getters which can be placed inside: @closure:CLASS.FUNC() (this feature is currently not implemented but is
 * placed on the roadmap. Currently strings will be decoded that way: "closure:on-test-func" to "
 *
 * @param {string} key The string which needs to be transformed.
 * @param {string=} opt_type The type of a function (undefined = void, 'getter', 'setter'). That way the name will contain
 *    "closure:on-test-func" => undefined: onTestFunc => set: setOnTestFunc => get: getOnTestFunc.
 * @returns {string} The name of the function.
 */
CodeBuilder.closureFunctionName = function(key, opt_type) {
  // remove the prefix
  key = key.replace(CodeBuilder.closureCallerPrefix, '');

  var name = '';

  for (var i = 0, len = key.length; i < len; i++) {
    if (key[i] === '-') {
      i++;
      name += key[i].toUpperCase();
    } else {
      name += key[i];
    }
  }

  if (opt_type) {
    name = opt_type + name[0].toUpperCase() + name.substr(1, name.length - 1);
  }
  return name;
};

/**
 * Returns a function call to a closure component as far as the [key] does match the correct format.
 * If it's not a function call it returns null.
 * @param {string} key The name of the function / attribute key.
 * @param {string} val The value of the attribute or whatever value.
 * @returns {string?} The correct function call or null if it's not a function.
 */
CodeBuilder.closureAttrFunctionCall = function(key, val) {
  if (key.substr(0, CodeBuilder.closureCallerPrefix.length) === CodeBuilder.closureCallerPrefix) {
    var caller = CodeBuilder.closureFunctionName(key);
    var val = val;
    var params = [];

    // check if this is js code
    // TODO: Export this functionality to a function CodeBuilder.closureParamEncode();
    if (val.substr(0,2) === '{{' || val === 'true' || val === 'false' ) {

      val = val.substr(2, val.length - 2);
      var inCtx = [];
      var lastIndex = 0;

      for (var i = 0, vi; vi = val[i]; i++) {
        if (vi === '{' || vi === '(' || vi === '[') {
          inCtx.push(1);
        }

        if (vi === '}' || vi === ')' || vi === ']') {
          inCtx.pop();
        }

        if ((vi === ',' && inCtx.length === 0) || i + 1 == val.length) {
          params.push(val.substr(lastIndex, i - 1 - lastIndex));
          lastIndex = i;
        }
      }

    } else {
      // when it's only a string we escape it in the params
      params.push('\'' + CodeBuilder.descapeJS(val) + '\'');
    }

    return CodeBuilder.prototype.getCall(caller, params);
  }

  return null;
};

/**
 * Generates setter calls for the attributes. In order to prevent problems with the eventlisteners do not use
 * functions named like: 'setOn...' this may cause problems.
 * @param {ComponentElement} component The component.
 * @returns {string}
 */
CodeBuilder.getAttributeCallers = function(component) {
  var code = '';
  var attrs = utils.getAttributeMap(component.getElement());
  for (var attr in attrs) {
    // running through the attributes and generate functions calls on the component
    // for more information {@see CodeBuilder.closureAttrFunctionCall}
    var call = CodeBuilder.closureAttrFunctionCall(attr, attrs[attr]);

    // call is null when the attribute is not a function call
    if (call !== null) {
      code += component.getVar() + '.' + call;
    }
  }

  return code;
};

/**
 * This function generates the code for attribute modifiers which are called on a closure component.
 * It's called by the ComponentClosure object after it's added to a parent element. That way we make
 * sure that the element is rendered and no DOM Exception get's fired. The code of this functions
 * can be added in the map CodeBuilder.ClosureAttributeModifiers.
 * @param {ComponentElement} component The component.
 * @returns {string}
 */
CodeBuilder.closureDomModificators = function(component) {
  var code = '';
  var attrs = utils.getAttributeMap(component.getElement());

  for (var attr in attrs) {
    // check if there are function registered
    if (typeof CodeBuilder.ClosureAttributeModifiers[attr] !== 'undefined' ?
      CodeBuilder.ClosureAttributeModifiers[attr].length !== 0 : false) {

      for (var i = 0, call, callList = CodeBuilder.ClosureAttributeModifiers[attr]; call = callList[i]; i++) {
        code += call(component, attrs[attr]);
      }
    }
  }

  return code;
};

// register the default attribute listener
require('./code_attribute_modifiers.js')(CodeBuilder);

CodeBuilder.prototype = {
  /**
   *
   * @returns {string}
   */
  getCode: function() {
    return this.code_;
  },

  /**
   * Creates JSDoc block with the given data as object.
   * @param {Object} params The object params.
   * @returns {string}
   */
  createJSDoc: function(params) {
    var code = '/**\n';
    var createParamLine = function(pkey, pobj) {
      return ' * @' + pkey + ' ' + pobj + '\n';
    };

    for (var key in params) {
      if (util.isArray(params[key])) {
        for (var i = 0, param, ps = params[key]; param = ps[i]; i++) {
          code += createParamLine(key, param);
        }
      } else {
        code += createParamLine(key, params[key]);
      }
    }

    code += ' */\n';

    if (code === '/**\n' + ' */\n') {
      return '';
    }

    return code;
  },
  /**
   * Creates JSDoc block with the given data as object and adds it directly to the code.
   * @param {Object} params The object params.
   * @returns {CodeBuilder}
   */
  jsDoc: function(params) {
    this.code_ += this.createJSDoc(params);
    return this;
  },

  /**
   * Generates a goog.provide function call.
   * @param {Array.<string>|string} provides The package name(s).
   */
  getProvide: function(provides) {
    if (!util.isArray(provides)) {
      provides = [provides];
    }

    var code = '';
    for (var i = 0, prov; prov = provides[i]; i++) {
      code += 'goog.provide(\'' + prov + '\');\n';
    }

    return code;
  },
  /**
   * Generates a goog.provide function call.
   * @param {Array.<string>|string} provides The package name(s).
   * @returns {CodeBuilder}
   */
  provide: function(provides) {
    this.code_ += this.getProvide(provides);
    return this;
  },

  /**
   * Generates a goog.require function call.
   * @param {Array.<string>|string} requires The package name(s).
   */
  getRequire: function(requires) {
    if (!util.isArray(requires)) {
      requires = [requires];
    }

    var code = '';
    for (var i = 0, prov; prov = requires[i]; i++) {
      code += 'goog.require(\'' + prov + '\');\n';
    }

    return code;
  },
  /**
   * Generates a goog.require function call.
   * @param {Array.<string>|string} requires The package name(s).
   * @returns {CodeBuilder}
   */
  require: function(requires) {
    this.code_ += this.getRequire(requires);
    return this;
  },

  /**
   * Creates a google closure library constructor and inherits when required.
   * @param {string} name The name of a closure class.
   * @param {string=} opt_extends Extending class.
   * @param {Object=} opt_jsdoc The JSDoc attribute object.
   * @returns {string}
   */
  getConstructor: function(name, opt_extends, opt_jsdoc) {
    var docObj = opt_jsdoc || {};
    docObj['constructor'] = '';

    if (opt_extends) {
      docObj['extends'] = '{' + opt_extends + '}';
    }
    return this.createJSDoc(docObj) +
      name + ' = function() {\n' +
      (opt_extends ? '\tvar args = Array.prototype.slice.apply(arguments);\n\t' + opt_extends + '.prototype.constructor.apply(this, args);\n' : '') +
      '};\n' +
      (opt_extends ? 'goog.inherits(' + name + ', ' + opt_extends + ');\n\n' : '\n');
  },
  /**
   * Creates a google closure library constructor and inherits when required.
   * @param {string} name The name of a closure class.
   * @param {string=} opt_extends Extending class.
   * @param {Object=} opt_jsdoc The JSDoc attribute Object.
   * @returns {CodeBuilder}
   */
  constr: function(name, opt_extends, opt_jsdoc) {
    this.code_ += this.getConstructor(name, opt_extends, opt_jsdoc);
    return this;
  },

  /**
   * @param {string} name The name of the function.
   * @param {string=} opt_class The class name of the function.
   * @param {Object=} opt_jsDoc The documentation of the function.
   * @param {string=} opt_content The content of the function.
   * @param {Array.<string>=} opt_params The parameter for the function.
   * @returns {string}
   */
  getFunction: function(name, opt_class, opt_jsDoc, opt_content, opt_params) {
    var jsDoc = opt_jsDoc || {};

    return this.createJSDoc(jsDoc) +
      (opt_class ? opt_class + '.' : 'var ') +
      name + ' = function(' + (opt_params ? opt_params.join(',') : '') + ') {\n' +
      (opt_content ? '\t' + opt_content.replace('\n', '\n\t') : '') + '\n' +
      '};\n';
  },
  /**
   * @param {string} name The name of the function.
   * @param {string=} opt_class The class name of the function.
   * @param {Object=} opt_jsDoc The documentation of the function.
   * @param {string=} opt_content The content of the function.
   * @param {Array.<string>=} opt_params The parameter for the function.
   * @returns {CodeBuilder}
   */
  func: function(name, opt_class, opt_jsDoc, opt_content, opt_params) {
    this.code_ += this.getFunction(name, opt_class, opt_jsDoc, opt_content,
      opt_params);
    return this;
  },

  /**
   * Generates a function call. It can be stored in a variable.
   * @param {string} name The name of the function.
   * @param {Array.<string>=} opt_params The parameters for the function.
   * @param {string=} opt_saveIn The variable to save the result in.
   * @param {boolean=} opt_isConstr Whether this is a constructor.
   * @param {Object=} opt_jsDoc JSDoc for the variable.
   * @returns {string}
   */
  getCall: function(name, opt_params, opt_saveIn, opt_isConstr, opt_jsDoc) {
    return (opt_jsDoc ? this.createJSDoc(opt_jsDoc) : '') +
      (opt_saveIn ? opt_saveIn + ' = ': '') +
      (opt_isConstr ? 'new ' : '') + name + '(' +
      (opt_params ? opt_params.join(', ') : '') + ');\n';
  },

  /**
   * Generates a function call. It can be stored in a variable.
   * @param {string} name The name of the function.
   * @param {Array.<string>=} opt_params The parameters for the function.
   * @param {string=} opt_saveIn The variable to save the result in.
   * @param {boolean=} opt_isConstr Whether this is a constructor.
   * @param {Object=} opt_jsDoc JSDoc for the variable.
   * @returns {CodeBuilder}
   */
  doCall: function(name, opt_params, opt_saveIn, opt_isConstr, opt_jsDoc) {
    this.code_ += this.getCall(name, opt_params, opt_saveIn, opt_isConstr, opt_jsDoc);
    return this;
  },

  /**
   * Modifies the attribute value when a modifier is registered.
   * @param {string} attName The name of the attribute.
   * @param {string} attVal The value of the attribute.
   */
  getDomAttributeModifier: function(attName, attVal) {
    for (var i = 0, mod; mod = CodeBuilder.AttributeModifiers[i]; i++) {
      if (mod.attribute === attName) {
        return mod.modifier(attVal);
      }
    }

    // if there's no modifier we need to escape it
    return '\'' + CodeBuilder.descapeJS(attVal.replace("'", "\\'")) + '\'';
  },

  /**
   * Prepares an object to be placed in the attributes map for google closure goog.dom.createDom.
   * @param {Object} attributes The attributes object.
   * @param {ComponentElement=} opt_comp
   * @returns {Object} The prepared object. It doesn't contain on- / bind- elements and rewrites the css classes.
   */
  getDomAttributes: function(attributes, opt_comp) {
    var obj = {};

    for (var at in attributes) {
      if (at.match(/^on\-/) === null && at.match(/^bind\-/) === null &&
        (opt_comp && opt_comp.useDataBinding && attributes[at].indexOf('{{') === -1)) {
        obj[at] = this.getDomAttributeModifier(at, attributes[at]);
      }
    }

    // transform the object into a string
    var strParts = [];
    for (at in obj) {
      strParts.push('\'' + at + '\': ' + obj[at]);
    }

    return '{' + strParts.join(', ') + '}';
  },

  /**
   * @param {string} varname The name of the variable.
   * @param {string} tagName The name of the tag.
   * @param {string=} opt_domHelper The variable name of the dom helper.
   * @param {string|Object=} opt_class The css class of the tag.
   * @param {string=} opt_content The content of the dom.
   * @param {ComponentElement=} opt_comp
   * @returns {string}
   */
  getCreateDom: function(varname, tagName, opt_domHelper, opt_class,
                         opt_content, opt_comp) {
    if (opt_class) {
      if (typeof opt_class !== 'string') {
        var attrFilter = ['xmlns:r4', 'extends', 'namespace', 'constructor'];
        for (var i = 0, af; af = attrFilter[i]; i++) {
          delete opt_class[af];
        }
      }
    }

    if (opt_comp && opt_comp.useDataBinding) {
      opt_comp.context.addRequire('cdb');

      var code = (varname.substr(0, 5) !== 'this.' ? 'var ' : '') + varname + ' = ' +
        (opt_domHelper ? opt_domHelper : 'this.getDomHelper()') +
        '.createDom(goog.dom.TagName.' + tagName.toUpperCase() +
        (opt_class ? ', ' + (typeof opt_class === 'string' ? '\'' + opt_class + '\'' :
          this.getDomAttributes(opt_class, opt_comp)) : '') + ');\n';

      if (opt_content) {
        var parts = opt_content.split('{{');
        var strParts = [], e;
        parts.forEach(function (part) {
          var cc = part + '';
          if ((e = cc.indexOf('}}')) !== -1) {
            cc = cc.substr(0, e);
            strParts.push({c: cc, b: true});
            cc = part.substr(e + 2);
          }

          if (cc.length) {
            strParts.push({c: cc});
          }
        });

        var childs = [];
        // for data binding on text we need to add text nodes
        strParts.forEach(function (part) {
          var textNodeId = this.getUniqueId('t');
          childs.push(textNodeId);
          code += 'var ' + textNodeId + ' = ' + (opt_domHelper ? opt_domHelper : 'this.getDomHelper()') +
            '.createTextNode("' + (!part.b && part.c || '') + '");\n';

          if (part.b) {
            code += 'cdb.bind(' + textNodeId + ', "textContent", this, "' + part.c + '");\n';
          }
        }.bind(this));

        childs.forEach(function (c) {
          code += 'goog.dom.appendChild(' + varname + ', ' + c + ');\n';
        });
      }

      // check the attributes
      if (opt_class && typeof opt_class === 'object') {
        for (var key in opt_class) {
          if (opt_class.hasOwnProperty(key) && opt_class[key].indexOf('{{') !== -1) {
            code += 'cdb.bind(' + varname + ', "' + key + '", this, "' +
              opt_class[key].replace(/^\{\{(.*)}}$/, '$1') + '");\n';
          }
        }
      }

      return code;
    } else {
      return (varname.substr(0, 5) !== 'this.' ? 'var ' : '') + varname + ' = ' +
        (opt_domHelper ? opt_domHelper : 'this.getDomHelper()') +
        '.createDom(goog.dom.TagName.' + tagName.toUpperCase() +
        (opt_class ? ', ' + (typeof opt_class === 'string' ? '\'' + opt_class + '\'' :
          this.getDomAttributes(opt_class)) : '') +
        (opt_content ? ', ' + CodeBuilder.prepareDomContent(opt_content) : '') +
        ');\n';
    }
  },
  /**
   * @param {string} varname The name of the variable.
   * @param {string} tagName The name of the tag.
   * @param {string=} opt_domHelper The variable name of the dom helper.
   * @param {Object|string=} opt_class The css class of the tag if it's an object. It's used for the attributes.
   * @param {string=} opt_content The content of the dom.
   * @param {ComponentElement=} opt_comp
   * @returns {CodeBuilder}
   */
  createDom: function(varname, tagName, opt_domHelper, opt_class,
                      opt_content, opt_comp) {
    this.code_ += this.getCreateDom(varname, tagName, opt_domHelper,
      opt_class, opt_content, opt_comp);
    return this;
  },


  /**
   * @param {ComponentElement} parent
   * @param {ComponentElement|Array.<ComponentElement>} childs
   * @returns {string}
   */
  getAddChildren: function(parent, childs) {
    var code = '';

    if (!util.isArray(childs)) {
      childs = [childs];
    }

    for (var i = 0, child; child = childs[i]; i++) {
      code += child.beforeAddedToParent(parent);
      if (child.isChildElement()) {
        code += parent.addChild(child);
      }
      code += child.onAddedToParent(parent);
    }

    return code;
  },
  /**
   * @param {ComponentElement} parent
   * @param {ComponentElement|Array.<ComponentElement>} childs
   * @returns {CodeBuilder}
   */
  addChildren: function(parent, childs) {
    this.code_ += this.getAddChildren(parent, childs);
    return this;
  },

  /**
   * @param {string} variable The variable name.
   * @param {ComponentElement} component The component element.
   * @returns {string}
   */
  getValueListener: function(variable, component) {
    var code = '';
    var varParts = variable.split('.');

    for (var i = 1; i <= varParts.length; i++) {
      var vars = varParts.slice(0, i);
      code += 'this.elementListeners_.' + vars.join('.') + ' = this.elementListeners_.' + vars.join('.') + ' || {};\n';
    }

    return code;
  },
  /**
   * @param {string} variable The variable name.
   * @param {ComponentElement} component The component element.
   * @returns {CodeBuilder}
   */
  valueListener: function(variable, component) {
    this.code_ += this.getValueListener(variable, component);
    return this;
  },

  getEventListener: function(component) {
    var attr = utils.getAttributeMap(component.getElement());
    var code = '';
    for (var at in attr) {
      if (at.match(/^on\-/) !== null) {
        component.context.addRequire('goog.events');
        component.context.addRequire('goog.events.EventType');

        code += 'goog.events.listen(' + component.getVar(true) + ', \'' + at.replace('on-', '') + '\', function($event) {' + attr[at] + (attr[at].substr(attr[at].length - 2, 1) === ';' ? '' : ';') + '}, false, this);\n';
      }

      // google closure library listeners
      if (at.match(/^component:on\-/) !== null) {
        component.context.addRequire('goog.events');
        component.context.addRequire('goog.ui.Component.EventType');

        code += 'goog.events.listen(' + component.getVar() + ', goog.ui.Component.EventType.' + at.replace('component:on-', '').toUpperCase() +
          ', function($event) {' + attr[at] + (attr[at].substr(attr[at].length - 2, 1) === ';' ? '' : ';') + '}, false, this);\n';
      }
    }

    return code;
  },
  eventListener: function(component) {
    this.code_ += this.getEventListener(component);
    return this;
  },

  /**
   * Generates setter calls for the attributes. In order to prevent problems with the eventlisteners do not use
   * functions named like: 'setOn...' this may cause problems.
   * @param {ComponentElement} component The component.
   * @returns {CodeBuilder}
   */
  attributeCallers: function(component) {
    this.code_ += CodeBuilder.getAttributeCallers(component);
    return this;
  },

  closureDomMods: function(component) {
    this.code_ += CodeBuilder.closureDomModificators(component);
    return this;
  },

  /**
   * @param {string} code The code to add to the end of the builder.
   */
  add: function(code) {
    this.code_ += code;
  },

  getUniqueId: function(opt_prefix) {
    if (!this._uniqueKeys) {
      this._uniqueKeys = {};
    }

    var prefix = opt_prefix || '_';
    this._uniqueKeys[prefix] = this._uniqueKeys[prefix] || 1;
    return prefix + (this._uniqueKeys[prefix]++);
  }
};

module.exports = CodeBuilder;
