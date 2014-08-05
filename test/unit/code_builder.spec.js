'use strict';

var CodeBuilder = require('../../lib/code_builder'),
    expect = require('chai').expect;

describe('CodeBuilder', function() {
  var builder = new CodeBuilder();

  describe('#getCreateDom', function() {

    describe('with binding', function() {
      var requires = [];
      var code = builder.getCreateDom('test', 'div', null, null,
        'test {{hallo}} content', {useDataBinding: true,
          context: {addRequire: function(r) { requires.push(r); }}});

      it('should create 3 text nodes', function() {
        expect(code).to.be.equal('var test = this.getDomHelper()' +
          '.createDom(goog.dom.TagName.DIV);\nvar t1 = this.getDomHelper()' +
          '.createTextNode("test ");\nvar t2 = this.getDomHelper()' +
          '.createTextNode("");\ncdb.bind(t2, "textContent", this, "hallo");\n' +
          'var t3 = this.getDomHelper().createTextNode(" content");\n' +
          'goog.dom.appendChild(test, t1);\n' +
          'goog.dom.appendChild(test, t2);\n' +
          'goog.dom.appendChild(test, t3);\n');
      });

      it('should add cdb to the requirements', function() {
        expect(requires).to.deep.equal(['cdb']);
      });
    });

    describe('attribute data binding', function() {
      var requires = [];
      var code = builder.getCreateDom('test', 'input', null, {value: '{{test.val}}'},
        null, {
          useDataBinding: true,
          context: {
            addRequire: function(r) { requires.push(r); }
          }
        });

      it('should add a value binder', function() {
        expect(code).to.be.equal('var test = this.getDomHelper()' +
          '.createDom(goog.dom.TagName.INPUT, {});\n' +
          'cdb.bind(test, "value", this, "test.val");\n');
      });

      it('should add cdb to the requirements', function() {
        expect(requires).to.deep.equal(['cdb']);
      });
    });

  });

});
