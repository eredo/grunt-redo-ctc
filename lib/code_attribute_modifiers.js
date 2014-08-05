/**
 * @fileOverview This file contains the default dom attribute modifiers.
 */

if(!String.prototype.trim) {
  String.prototype.trim = function () {
    return this.replace(/^\s+|\s+$/g,'');
  };
}

/**
 * The data binding modifier activates the binding behavior which will cause
 * the compiler to no longer turn {{...}} into a variable placement. Instead
 * it will setup NodeBind based on the polymer platform.
 *
 * Usage:
 *
 *     <div data-binding>
 *       <span>{{value}}</span>
 *     </div>
 *
 * The data-binding attribute will set Component#useDataBinding to true which
 * will be passed along all children.
 *
 * @param {ComponentElement} component
 * @param {string} value Is always empty because it's a simple boolean
 *  attribute.
 */
function dataBindingModifier(component, value) {
  component.useDataBinding = true;
}

/**
 * Wraps all classes written in the goog.getCssName function.
 * @param {string} val The value of the class attribute.
 * @returns {string}
 */
var classModifier = function(val) {
  var nvals = [];
  var classes = val.split(' ');

  for (var i = 0, clazz; clazz = classes[i]; i++) {
    if (clazz.substr(0, 2) === '{{') {
      nvals.push(clazz.substr(2, clazz.length - 4));
    } else {
      nvals.push('goog.getCssName(\'' + clazz + '\')');
    }
  }

  return nvals.join(' + \' \' + ');
};

/**
 *
 * @param {ComponentClosure} component The closure component.
 * @param {string} value The value of class attribute.
 */
var closureClassModifier = function(component, value) {
  component.context.addRequire('goog.dom.classes');

  var classes = value.split(' ');
  var nvals = [];

  for (var i = 0, clazz; clazz = classes[i]; i++) {
    if (clazz.substr(0, 2) === '{{') {
      nvals.push(clazz.substr(2, clazz.length - 4));
    } else {
      nvals.push('goog.getCssName(\'' + clazz + '\')');
    }
  }

  return 'goog.dom.classes.add(' + component.getVar(true) + ',' + nvals.join(',') + ');';
};

/**
 *
 * @param {ComponentClosure} component The closure component.
 * @param {string} value The value of class attribute.
 */
var closureStyleModifier = function(component, value) {
  component.context.addRequire('goog.style');

  // parse styles and add each property. We can't override the hole style string. This
  // may cause problems by components.
  var styles = {};
  var ctx = [];
  var ctxParam = ['{', '('];
  var ctxClose = ['}', ')'];
  var styleName = '';
  var styleValue = null;

  for (var i = 0, s; s = value[i]; i++) {
    // check if we are in a context
    if (ctxParam.indexOf(s) !== -1) {
      ctx.push(1);
    } else if (ctxClose.indexOf(s) !== -1) {
      ctx.pop();
    }

    // there's a ; and we are not in a context so a style value is completed
    if (s === ';' && !ctx.length) {
      styles[styleName] = styleValue + '';
      styleValue = null;
      styleName = '';
      continue;
    }

    // check if now the declaration starts
    if (s === ':' && !ctx.length) {
      styleValue = '';
      continue;
    }

    // we are not in a context and not declaring the style value
    if (styleValue === null) {
      styleName += s;
    } else {
      styleValue += s;
    }
  }
  // add the last style
  if (styleValue !== null) {
    styles[styleName] = styleValue;
  }

  var code = "";
  for (var style in styles) {
    code += 'goog.style.setStyle(' + component.getVar(true) + ',\'' + style.trim() + '\', \'' +
      styles[style].replace("'", "\\'").trim() + '\');';
  }

  return code;
};

var tpCt = 0;

var closureTooltipModifier = function(component, value) {
  component.context.addRequire('r4.ui.Tooltip');
  var tp = 'tooltip' + tpCt++;
  return 'new r4.ui.Tooltip(' + component.getVar(true) + ', \'' + value + '\');';
};

/**
 *
 * @param {CodeBuilder} CodeBuilder The code Builder Constructor.
 */
module.exports = function(CodeBuilder) {
  CodeBuilder.registerAttributeModifier('class', classModifier);
  CodeBuilder.registerAttributeModifier('data-binding', dataBindingModifier);
  CodeBuilder.registerClosureAttributeModifier('class', closureClassModifier);
  CodeBuilder.registerClosureAttributeModifier('style', closureStyleModifier);
  CodeBuilder.registerClosureAttributeModifier('r4:tooltip', closureTooltipModifier);
};
