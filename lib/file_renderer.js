var dom = require('jsdom').jsdom;
var js_beautify = require('./js_beautify.js').js_beautify;

// required element classes
var ComponentClass = require('./component_class.js');
var ComponentElement = require('./component_element.js');
var DomClass = require('./dom_class.js');
var ScriptClass = require('./script_class.js');
var Context = require('./context');

/**
 *
 * @param {string} content
 * @returns {{code: string, variables: {{name:string,namespace:string}}}}
 */
module.exports = function(content) {

  var context;
  var code = '';

  var globals = {};
  process.COMPILER_GLOBALS = globals;

  var variables_ = 0;
  var getVarname = function(key) {
    return key.replace(/\:/g,'') + (variables_++);
  };

  /**
   * Contains all "element" tagged components.
   * @type {Map.<string,ComponentElement>}
   */
  var elementMap = {};

  /**
   * Tags in this Array generate a DomClass Component.
   * @type {Array}
   */
  var htmlTags = ['a','b','i','u','li','ul','div','ol','label','input','textarea',
    'form', 'h1', 'img', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'select', 'option'];

  /**
   * Map which describes links a tagName with it's constructor function.
   * @type {{element: *}}
   */
  var tagMap = {
    'element': ComponentClass,
    'script': ScriptClass
  };

  /**
   *
   * @param {Node} element The element to check.
   * @param {ComponentElement=} opt_parent
   */
  var parseElement = function(element, opt_parent) {
    /**
     * @type {ComponentElement}
     */
    var comp = null;

    // check if it's a tag
    if (element.tagName) {
      var Clazz = context.getClass(element);

      if (Clazz === null) {
        console.log('Unknown TAG: ' + element.tagName + ' will be ignored.');
      } else {
        comp = Clazz.Parse(element, context, opt_parent);
        comp.context = context;

        if (comp.getPlacement() === ComponentElement.Placement.MAIN) {
          context.addMainComponent(comp);
        }

        for (var i = 0, child, children = element.childNodes; child = children[i]; i++) {
          var c = parseElement(child, comp);
          if (c !== null) {
            comp.children.push(c);
          }
        }
        // TODO: getVarname should be part of the context
        comp.var = getVarname(element._tagName.toLowerCase());
      }
    }

    return comp;
  };

  /**
   * Builds the code of the elements in the elementMap.
   * @returns {string}
   */
  var buildCode = function() {
    /*var codeStr = '';
    for (var key in elementMap) {
      var codes = elementMap[key].getCodes();
      for (var c = 0, code; code = codes[c]; c++) {
        if (code.placement === ComponentElement.Placement.MAIN) {
          codeStr += code.code;
        }
      }
    }*/
    var codeStr = context.getCode();
    return js_beautify(codeStr);
  };

  var document = dom(content);
  // check if there is enought content
  if (!document.head || !document.body || !document.body.children.length > 0) {
    return null;
  }

  // builder the context
  context = Context.Parse(document.head);
  parseElement(document.body.children[0]);
  return {code: buildCode(), variables: context.variables};
};
