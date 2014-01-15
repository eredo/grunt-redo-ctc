goog.provide('ctc.test.SimpleElement');
goog.require('goog.dom');
goog.require('goog.dom.TagName');
goog.require('goog.dom.classes');
goog.require('goog.dom.query');
goog.require('goog.ui.Component');
/**
 * @constructor 
 * @extends {goog.ui.Component}
 */
ctc.test.SimpleElement = function() {
    var args = Array.prototype.slice.apply(arguments);
    goog.ui.Component.prototype.constructor.apply(this, args);
};
goog.inherits(ctc.test.SimpleElement, goog.ui.Component);

/**
 * @override 
 */
ctc.test.SimpleElement.prototype.createDom = function() {
    var domHelper = this.getDomHelper();
    this.element_ = domHelper.createDom(goog.dom.TagName.DIV, {
        'name': 'SimpleElement'
    }, '');
    var div2 = domHelper.createDom(goog.dom.TagName.DIV, {});
    var h10 = this.getDomHelper().createDom(goog.dom.TagName.H1, {}, 'Simple Element');
    var p1 = this.getDomHelper().createDom(goog.dom.TagName.P, {}, 'This is a simple component.');
    goog.dom.appendChild(div2, h10);
    goog.dom.appendChild(div2, p1);
    goog.dom.appendChild(this.getElement(), div2);
    if (goog.isDef(this.afterCreate_)) {
        this.afterCreate_()
    }
};
/**
 * @inheritDoc 
 */
ctc.test.SimpleElement.prototype.enterDocument = function() {
    goog.base(this, 'enterDocument');
    if (goog.isDef(this.onEnterDocument)) {
        this.onEnterDocument();
    }
};