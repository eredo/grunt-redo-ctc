/**
 * @interface
 */
var ComponentElement = function() {};

/**
 * @enum {number}
 */
ComponentElement.Placement = {
  MAIN: 0x01,
  CREATEDOM: 0x02,
  ENTERDOCUMENT: 0x04,
  DECORATE: 0x08
};

/**
 * @typedef {{placement:ComponentElement.Placement,code:string}}
 */
ComponentElement.CodePart;

/**
 * @type {string}
 */
ComponentElement.prototype.var = '';

/**
 * @type {Context}
 */
ComponentElement.prototype.context;

/**
 * @type {Array.<ComponentElement>}
 */
ComponentElement.prototype.children;

/**
 * @returns {boolean} Whether this is a closure component.
 */
ComponentElement.prototype.isClosure = function() {};

/**
 * @returns {boolean} Whether this element is addable.
 */
ComponentElement.prototype.isChildElement = function() {};

/**
 * @param {boolean} isDom Whether the variable needs to be a dom element.
 * @returns {string} The variable name of that component.
 */
ComponentElement.prototype.getVar = function(isDom) {};

/**
 * @returns {Array.<ComponentElement.CodePart>} The code of the component.
 */
ComponentElement.prototype.getCodes = function() {};

/**
 * @returns {ComponentElement.Placement} The position of the code.
 */
ComponentElement.prototype.getPlacement = function() {};

/**
 * @param {ComponentElement} element The element which is added.
 * @returns {string}
 */
ComponentElement.prototype.addChild = function(element) {};

/**
 * This function is called after a element was added as a child.
 * @param {ComponentElement} parent The parent element.
 */
ComponentElement.prototype.onAddedToParent = function(parent) {};

/**
 * This function is called before an element is added to it's parent.
 * @param {ComponentElement} parent The parent element.
 */
ComponentElement.prototype.beforeAddedToParent = function(parent) {};

module.exports = ComponentElement;